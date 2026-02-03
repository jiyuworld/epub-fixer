import React from 'react';
import type { SentenceItem } from '../lib/epubService';

interface SentenceListProps {
    sentences: SentenceItem[];
    searchTerm: string;
    onSelect: (sentence: SentenceItem) => void;
}

export const SentenceList: React.FC<SentenceListProps> = ({ sentences, searchTerm, onSelect }) => {
    if (!searchTerm) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: 'var(--text-muted)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 'var(--radius-md)'
            }}>
                검색어를 입력하여 오탈자가 있는 문장을 찾으세요.
            </div>
        );
    }

    if (sentences.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                검색 결과가 없습니다.
            </div>
        );
    }

    return (
        <div className="sentence-list" style={{
            display: 'grid',
            gap: '1rem',
            maxHeight: '400px',
            overflowY: 'auto',
            paddingRight: '0.5rem'
        }}>
            {sentences.map((item) => (
                <div
                    key={item.id}
                    onClick={() => onSelect(item)}
                    style={{
                        background: 'var(--bg-input)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        border: '1px solid transparent',
                        transition: 'all 0.2s'
                    }}
                    className="sentence-item"
                >
                    {/* Highlight match */}
                    <div style={{
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        lineHeight: '1.5'
                    }} dangerouslySetInnerHTML={{
                        __html: highlightMatch(item.text, searchTerm)
                    }} />
                    <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.5rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {item.filePath}
                    </div>
                </div>
            ))}
        </div>
    );
};

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatch(text: string, term: string): string {
    if (!term) return text;
    const escapedTerm = escapeRegExp(term);
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    return text.replace(regex, '<span style="color: var(--accent); font-weight: bold;">$1</span>');
}
