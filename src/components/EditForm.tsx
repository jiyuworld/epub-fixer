import React, { useState, useEffect } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import type { SentenceItem } from '../lib/epubService';

interface EditFormProps {
    sentence: SentenceItem;
    onSave: (id: string, newText: string) => void;
    onCancel: () => void;
}

export const EditForm: React.FC<EditFormProps> = ({ sentence, onSave, onCancel }) => {
    const [text, setText] = useState(sentence.text);

    // Reset text when sentence changes
    useEffect(() => {
        setText(sentence.text);
    }, [sentence]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(sentence.id, text);
    };

    return (
        <div className="edit-form card animate-fade-in" style={{
            marginTop: '2rem',
            textAlign: 'left',
            border: '1px solid var(--primary)',
            boxShadow: 'var(--shadow-glow)'
        }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                문장 교정
            </h3>

            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>ORIGINAL</div>
                <div>{sentence.text}</div>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label
                        style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: '0.9rem',
                            color: 'var(--accent)'
                        }}
                    >
                        오탈자가 수정된 문장 전체를 입력해 주세요
                    </label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={3}
                        style={{
                            width: '100%',
                            background: 'var(--bg-input)',
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-main)',
                            padding: '1rem',
                            fontSize: '1rem',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                        }}
                        autoFocus
                    />
                    <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <AlertTriangle size={14} color="orange" />
                        <span>주의: 볼드체(b)나 이탤릭체(i) 등의 서식은 사라질 수 있습니다. 텍스트만 유지됩니다.</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            color: 'var(--text-muted)'
                        }}
                    >
                        <X size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                        취소
                    </button>
                    <button type="submit">
                        <Check size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                        수정 완료
                    </button>
                </div>
            </form>
        </div>
    );
};
