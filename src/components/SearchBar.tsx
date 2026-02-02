import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    resultCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, onSearchChange, resultCount }) => {
    return (
        <div className="search-bar" style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search
                size={20}
                style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                }}
            />
            <input
                type="text"
                placeholder="문장 검색"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{ paddingLeft: '3rem' }}
                autoFocus
            />
            {searchTerm && (
                <div style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.85rem',
                    color: 'var(--primary)'
                }}>
                    {resultCount} results
                </div>
            )}
        </div>
    );
};
