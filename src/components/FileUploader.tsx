import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
    onFileSelect: (file: File) => void;
    isLoading?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isLoading }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file: File) => {
        if (file.name.endsWith('.epub')) {
            onFileSelect(file);
        } else {
            alert('EPUB 파일만 업로드 가능합니다.');
        }
    };

    return (
        <div
            className={`file-uploader ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
                border: '2px dashed var(--primary)',
                borderRadius: 'var(--radius-lg)',
                padding: '3rem',
                textAlign: 'center',
                cursor: isLoading ? 'wait' : 'pointer',
                backgroundColor: isDragging ? 'rgba(var(--primary-hue), 70%, 60%, 0.1)' : 'transparent',
                transition: 'all 0.2s ease'
            }}
        >
            <input
                type="file"
                accept=".epub"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileInput}
                disabled={isLoading}
            />

            <div style={{ pointerEvents: 'none' }}>
                {isLoading ? (
                    <div className="spinner">로딩중...</div>
                ) : (
                    <>
                        <Upload size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ margin: '0 0 0.5rem 0' }}>EPUB 파일을 업로드해주세요.</h3>
                    </>
                )}
            </div>
        </div>
    );
};
