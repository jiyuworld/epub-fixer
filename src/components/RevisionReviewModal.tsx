import { X, ArrowRight, Download } from 'lucide-react';
import type { SentenceItem } from '../lib/epubService';

interface RevisionReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    revisions: Map<string, string>;
    sentences: SentenceItem[];
}

export function RevisionReviewModal({ isOpen, onClose, onConfirm, revisions, sentences }: RevisionReviewModalProps) {
    if (!isOpen) return null;

    const changedItems = Array.from(revisions.entries()).map(([id, newText]) => {
        const original = sentences.find(s => s.id === id);
        return {
            id,
            originalText: original?.text || '(원본을 찾을 수 없음)',
            newText
        };
    });

    return (
        <div className="modal-overlay">
            <div className="modal-content animate-scale-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>수정 내역 확인</h2>
                        <p style={{ color: 'var(--text-muted)' }}>총 {changedItems.length}개의 문장이 수정되었습니다.</p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '0.5rem',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        className="hover-bg-muted"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    marginBottom: '1.5rem',
                    border: '1px solid var(--border-color, #eee)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-main, #f9fafb)'
                }}>
                    {changedItems.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            수정된 내용이 없습니다.
                        </div>
                    ) : (
                        changedItems.map(item => (
                            <div key={item.id} style={{
                                padding: '1.25rem',
                                borderBottom: '1px solid var(--border-color, #eee)',
                                backgroundColor: 'var(--bg-card, white)'
                            }}>
                                <div className="revision-grid">
                                    <div style={{ backgroundColor: 'rgba(255, 0, 0, 0.05)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255, 0, 0, 0.1)' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#ef4444', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Original</div>
                                        <div style={{ color: 'var(--text-primary)', lineHeight: '1.6', fontSize: '0.95rem' }}>{item.originalText}</div>
                                    </div>

                                    <div className="revision-arrow" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', paddingTop: '1.5rem', color: 'var(--text-muted)' }}>
                                        <ArrowRight size={20} />
                                    </div>

                                    <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#3b82f6', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Changed</div>
                                        <div style={{ color: 'var(--text-primary)', lineHeight: '1.6', fontSize: '0.95rem', fontWeight: '500' }}>{item.newText}</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="modal-actions">
                    <button onClick={onClose} style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color, #ccc)',
                        backgroundColor: 'var(--bg-card, white)',
                        cursor: 'pointer',
                        fontWeight: '500',
                        color: 'var(--text-primary)'
                    }}>
                        계속 수정하기
                    </button>
                    <button onClick={onConfirm} style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: '600',
                        boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)'
                    }}>
                        <Download size={18} />
                        EPUB 저장하기
                    </button>
                </div>
            </div>
        </div>
    );
}
