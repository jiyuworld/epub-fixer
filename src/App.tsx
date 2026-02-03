import { useState, useMemo, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { Download, RefreshCw } from 'lucide-react';
import { parseEpub, generateFixedEpub, type EpubData, type SentenceItem } from './lib/epubService';
import { FileUploader } from './components/FileUploader';
import { SearchBar } from './components/SearchBar';
import { SentenceList } from './components/SentenceList';
import { EditForm } from './components/EditForm';
import { RevisionReviewModal } from './components/RevisionReviewModal';

function App() {
  const [epubData, setEpubData] = useState<EpubData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSentence, setSelectedSentence] = useState<SentenceItem | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Store revisions: ID -> New Text
  const [revisions, setRevisions] = useState<Map<string, string>>(new Map());

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    try {
      const data = await parseEpub(file);
      setEpubData(data);
      // Reset state
      setSearchTerm('');
      setSelectedSentence(null);
      setRevisions(new Map());
    } catch (err) {
      console.error(err);
      alert('Failed to parse EPUB file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRevision = (id: string, newText: string) => {
    setRevisions(prev => {
      const next = new Map(prev);
      next.set(id, newText);
      return next;
    });
    setSelectedSentence(null); // Close form
  };

  const executeDownload = async () => {
    if (!epubData) return;
    setIsLoading(true);
    try {
      // Apply revisions to current data first? 
      // Actually we pass original data + revisions map to generator
      const blob = await generateFixedEpub(epubData, revisions);
      saveAs(blob, `fixed_${epubData.fileName}`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate EPUB.');
    } finally {
      setIsLoading(false);
      setIsReviewModalOpen(false);
    }
  };

  // Filter sentences
  const filteredSentences = useMemo(() => {
    if (!epubData || !searchTerm) return [];

    const term = searchTerm.toLowerCase();
    return epubData.sentences.filter(s =>
      s.text.toLowerCase().includes(term)
    );
  }, [epubData, searchTerm]);

  // Apply visual updates to sentences if they have been revised
  // But wait, the list usually shows search results.
  // If I revised a sentence, should it show the NEW text in the list? Yes.

  const displaySentences = useMemo(() => {
    return filteredSentences.map(s => {
      if (revisions.has(s.id)) {
        return { ...s, text: revisions.get(s.id)! };
      }
      return s;
    });
  }, [filteredSentences, revisions]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);


  return (
    <div className="animate-fade-in">
      {!epubData && (
        <header style={{ marginBottom: '3rem' }}>
          <h1>Epub Fixer</h1>
          <h2>업로드 - 오탈자 검색 - 문장 수정 - 저장</h2>
        </header>
      )}

      {!epubData ? (
        <div className="card">
          <FileUploader onFileSelect={handleFileSelect} isLoading={isLoading} />
        </div>
      ) : (
        <div className="workspace animate-fade-in">
          <div className="workspace-header">
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Working on:</div>
              <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{epubData.fileName}</div>
            </div>

            <div className="workspace-header-actions">
              <button
                onClick={() => {
                  if (confirm('모든 작업 내용을 초기화하고 파일을 다시 선택하시겠습니까?')) {
                    setEpubData(null);
                  }
                }}
                style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}
              >
                <RefreshCw size={18} />
              </button>

              <button onClick={() => setIsReviewModalOpen(true)} disabled={revisions.size === 0 || isLoading}>
                <Download size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                EPUB 저장 (수정한 문장 {revisions.size}개)
              </button>
            </div>
          </div>

          {!selectedSentence ? (
            <div className="card" style={{ textAlign: 'left' }}>
              <SearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                resultCount={displaySentences.length}
              />
              <SentenceList
                sentences={displaySentences}
                searchTerm={searchTerm}
                onSelect={(item) => setSelectedSentence(item)}
              />
            </div>
          ) : (
            <EditForm
              sentence={revisions.has(selectedSentence.id)
                ? { ...selectedSentence, text: revisions.get(selectedSentence.id)! }
                : selectedSentence
              }
              onSave={handleSaveRevision}
              onCancel={() => setSelectedSentence(null)}
            />
          )}

        </div>
      )}

      {epubData && (
        <RevisionReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onConfirm={executeDownload}
          revisions={revisions}
          sentences={epubData.sentences}
        />
      )}
    </div>
  );
}

export default App;
