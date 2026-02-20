'use client';

import { Search, X } from 'lucide-react';

interface SearchBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

export default function SearchBar({ searchQuery, onSearchChange }: SearchBarProps) {
    return (
        <div className="mb-12">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--moka-500)' }} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Buscar productos..."
                    className="w-full px-4 py-3 pl-12 pr-12 rounded-xl border-2 bg-white/80 backdrop-blur-sm focus:outline-none transition-all"
                    style={{ 
                        borderColor: 'var(--moka-200)',
                        color: 'var(--moka-900)'
                    }}
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors"
                        style={{ background: 'var(--moka-100)' }}
                        aria-label="Limpiar búsqueda"
                    >
                        <X className="w-4 h-4" style={{ color: 'var(--moka-500)' }} />
                    </button>
                )}
            </div>
        </div>
    );
}
