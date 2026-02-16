import JSZip from 'jszip';
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from 'diff-match-patch';

export interface SentenceItem {
    id: string;        // 고유 ID (파일경로 + 인덱스 조합)
    text: string;      // 문장 텍스트
    filePath: string;  // EPUB zip 내의 파일 경로
    context: string;   // 문맥 (예: p 태그의 전체 텍스트, 검색 시 보여줄 내용)
}

export interface EpubData {
    fileName: string;
    sentences: SentenceItem[];
    zip: JSZip; // 수정 시 재사용을 위해 유지
    opfPath: string; // 나중에 필요할 수 있음
}

/**
 * EPUB 파일을 파싱하여 수정 가능한 문장 목록을 반환합니다.
 */
export async function parseEpub(file: File): Promise<EpubData> {
    const zip = await JSZip.loadAsync(file);

    // 1. container.xml 찾기
    const container = await zip.file('META-INF/container.xml')?.async('text');
    if (!container) throw new Error('Invalid EPUB: META-INF/container.xml not found');

    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(container, 'application/xml');
    const rootfile = containerDoc.querySelector('rootfile');
    const opfPath = rootfile?.getAttribute('full-path');

    if (!opfPath) throw new Error('Invalid EPUB: OPF path not found');

    // 2. OPF 파일 읽기
    const opfContent = await zip.file(opfPath)?.async('text');
    if (!opfContent) throw new Error(`Invalid EPUB: OPF file (${opfPath}) not found`);

    const opfDoc = parser.parseFromString(opfContent, 'application/xml');
    const manifest = opfDoc.querySelector('manifest');
    const spine = opfDoc.querySelector('spine');

    // 3. Spine(순서)에 따라 HTML 파일 경로 수집
    const spineItems = Array.from(spine?.children || []);
    const parsingList: string[] = [];

    // OPF 파일이 있는 디렉토리 경로 (상대 경로 해결용)
    const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/'));

    for (const item of spineItems) {
        const idref = item.getAttribute('idref');
        if (!idref) continue;

        // manifest에서 href 찾기
        const manifestItem = manifest?.querySelector(`[id="${idref}"]`);
        const href = manifestItem?.getAttribute('href');

        if (href) {
            // 절대 경로 계산 (zip 내부 경로)
            const fullPath = opfDir ? `${opfDir}/${href}` : href;
            parsingList.push(fullPath);
        }
    }

    // 4. 각 파일에서 문장 추출
    let allSentences: SentenceItem[] = [];

    for (const filePath of parsingList) {
        const content = await zip.file(filePath)?.async('text');
        if (!content) continue;

        const sentences = extractSentences(content, filePath);
        allSentences = [...allSentences, ...sentences];
    }

    return {
        fileName: file.name,
        sentences: allSentences,
        zip,
        opfPath
    };
}

/**
 * HTML 문자열에서 오탈자 수정 대상이 될 수 있는 문장들을 추출합니다.
 * 전략: P 태그 등 블록 요소 단위로 추출하되, 내부 텍스트만 가져옵니다.
 */
// Helper to split text into sentences
// Use Intl.Segmenter if available, otherwise simple regex
function splitIntoSentences(text: string): { segment: string; index: number; input: string }[] {
    if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
        const segmenter = new (Intl as any).Segmenter('ko', { granularity: 'sentence' });
        return Array.from(segmenter.segment(text));
    } else {
        // Fallback logic
        const regex = /[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g;
        const matches = text.match(regex) || [text];
        let index = 0;
        return matches.map(segment => {
            const item = { segment, index, input: text };
            index += segment.length;
            return item;
        });
    }
}

/**
 * HTML 문자열에서 오탈자 수정 대상이 될 수 있는 문장들을 추출합니다.
 */
function extractSentences(html: string, filePath: string): SentenceItem[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'application/xhtml+xml');

    const sentences: SentenceItem[] = [];
    const processedElements = new Set<Element>();

    const blocks = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div, span');

    // blockIndex is crucial for matching during reconstruction
    blocks.forEach((el, blockIndex) => {
        if (processedElements.has(el)) return;

        // Use textContent. Do NOT trim here, because we need to preserve spaces when splitting/joining.
        // However, if the element only contains whitespace, skip it.
        const text = el.textContent;

        if (!text || text.trim().length === 0) return;

        // 이 요소가 다른 블록 요소를 포함하고 있다면, 더 깊은 탐색을 위해 스킵 
        // (단, b, i, span 등 인라인은 허용)
        const hasBlockChild = Array.from(el.children).some(child =>
            ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'UL', 'OL', 'TABLE', 'BLOCKQUOTE', 'SECTION', 'ARTICLE', 'ASIDE', 'NAV', 'HEADER', 'FOOTER'].includes(child.tagName.toUpperCase())
        );

        if (hasBlockChild) return;

        // Mark this element and all its descendants as processed
        processedElements.add(el);
        el.querySelectorAll('*').forEach(child => processedElements.add(child));

        // Split into sentences
        const segments = splitIntoSentences(text);

        segments.forEach((seg, sentIndex) => {
            // Skip purely whitespace segments if any
            if (seg.segment.trim().length === 0) return;

            // ID: filePath # blockIndex - sentIndex
            const id = `${filePath}#${blockIndex}-${sentIndex}`;

            sentences.push({
                id,
                text: seg.segment.trim(), // Use trimmed text for display/search
                filePath,
                context: el.innerHTML // Keep block context
            });
        });
    });

    return sentences;
}

/**
 * 내부 구조(태그)를 유지하면서 DOM 요소의 텍스트 변경 사항을 적용합니다.
 * diff-match-patch를 사용하여 차이점을 계산하고 텍스트 노드에만 변경 사항을 반영합니다.
 */
function applyDiffToNode(element: Element, newText: string) {
    const originalText = element.textContent || '';
    if (originalText === newText) return;

    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(originalText, newText);
    dmp.diff_cleanupSemantic(diffs);

    // 모든 텍스트 노드를 방문하기 위한 TreeWalker 생성
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    let currentNode = walker.nextNode() as Text | null;
    let currentOffset = 0; // 현재 텍스트 노드 내의 오프셋

    for (const [op, text] of diffs) {
        if (!currentNode && op !== DIFF_INSERT) {
            // DOM의 텍스트 노드가 끝났는데 작업이 남은 경우 처리
            // 삭제(DELETE)나 유지(EQUAL)라면 무시하고, 
            // 삽입(INSERT)인 경우 마지막 부모 요소에 추가합니다.
            if (op === DIFF_INSERT) {
                element.appendChild(document.createTextNode(text));
            }
            continue;
        }

        if (op === DIFF_EQUAL) {
            // 변경 없음: DOM 텍스트 노드에서 해당 길이만큼 건너뜁니다.
            let remaining = text.length;
            while (remaining > 0 && currentNode) {
                const available = currentNode.length - currentOffset;
                if (available > remaining) {
                    currentOffset += remaining;
                    remaining = 0;
                } else {
                    remaining -= available;
                    currentNode = walker.nextNode() as Text | null;
                    currentOffset = 0;
                }
            }
        } else if (op === DIFF_INSERT) {
            // 삽입: 현재 위치에 텍스트를 삽입합니다.
            if (currentNode) {
                currentNode.insertData(currentOffset, text);
                currentOffset += text.length;
            } else {
                // 노드가 없는 경우 예외적으로 요소 끝에 추가합니다.
                element.appendChild(document.createTextNode(text));
            }
        } else if (op === DIFF_DELETE) {
            // 삭제: 현재 위치에서 텍스트를 삭제합니다.
            let remaining = text.length;
            while (remaining > 0 && currentNode) {
                const available = currentNode.length - currentOffset;
                if (available > remaining) {
                    currentNode.deleteData(currentOffset, remaining);
                    remaining = 0;
                    // 콘텐츠를 삭제했으므로 오프셋은 그대로 유지됩니다.
                } else {
                    currentNode.deleteData(currentOffset, available);
                    remaining -= available;
                    currentNode = walker.nextNode() as Text | null;
                    currentOffset = 0;
                }
            }
        }
    }
}

/**
 * 수정된 문장을 반영하여 새 EPUB Blob을 생성합니다.
 */
export async function generateFixedEpub(data: EpubData, revisedSentences: Map<string, string>): Promise<Blob> {
    const { zip, sentences } = data;

    const fileChanges = new Map<string, Map<string, string>>(); // filePath -> { id -> newText }

    revisedSentences.forEach((newText, id) => {
        const item = sentences.find(s => s.id === id);
        if (!item) return;

        if (!fileChanges.has(item.filePath)) {
            fileChanges.set(item.filePath, new Map());
        }
        fileChanges.get(item.filePath)?.set(id, newText);
    });

    for (const [filePath, revisions] of fileChanges) {
        let content = await zip.file(filePath)?.async('text');
        if (!content) continue;

        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'application/xhtml+xml');

        // Must match extractSentences traversal
        const blocks = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div, span');
        const processedElements = new Set<Element>();

        blocks.forEach((el, blockIndex) => {
            if (processedElements.has(el)) return;

            const text = el.textContent;
            if (!text || text.trim().length === 0) return;

            const hasBlockChild = Array.from(el.children).some(child =>
                ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'UL', 'OL', 'TABLE', 'BLOCKQUOTE', 'SECTION', 'ARTICLE', 'ASIDE', 'NAV', 'HEADER', 'FOOTER'].includes(child.tagName.toUpperCase())
            );

            if (hasBlockChild) return;

            processedElements.add(el);
            el.querySelectorAll('*').forEach(child => processedElements.add(child));

            const blockPrefix = `${filePath}#${blockIndex}-`;
            const hasRevision = Array.from(revisions.keys()).some(k => k.startsWith(blockPrefix));

            if (hasRevision) {
                // Reconstruct the FULL text of the block with revisions applied
                const segments = splitIntoSentences(text);
                const newSegments = segments.map((seg, sentIndex) => {
                    const id = `${blockPrefix}${sentIndex}`;
                    if (revisions.has(id)) {
                        const userText = revisions.get(id)!;
                        // Preserve original trailing whitespace logic
                        const originalTrailing = seg.segment.length - seg.segment.trimEnd().length;
                        const tail = seg.segment.slice(seg.segment.length - originalTrailing);
                        return userText + tail;
                    }
                    return seg.segment;
                });

                const newFullText = newSegments.join('');

                // Use diff-match-patch to apply changes to the DOM while preserving tags
                applyDiffToNode(el, newFullText);
            }
        });

        const serializer = new XMLSerializer();
        const newContent = serializer.serializeToString(doc);
        zip.file(filePath, newContent);
    }

    return await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/epub+zip',
        compression: 'DEFLATE',
        compressionOptions: {
            level: 6
        }
    });
}
