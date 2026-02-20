'use client';

import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';

export type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';
export type FilterStatus = 'all' | 'purchased' | 'pending';

interface FilterBarProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  filterStatus: FilterStatus;
  onFilterStatusChange: (status: FilterStatus) => void;
  totalProducts: number;
  filteredCount: number;
}

export default function FilterBar({
  categories,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  filterStatus,
  onFilterStatusChange,
  totalProducts,
  filteredCount,
}: FilterBarProps) {
  const hasActiveFilters = selectedCategory !== 'all' || sortBy !== 'default' || filterStatus !== 'all';

  const clearFilters = () => {
    onCategoryChange('all');
    onSortChange('default');
    onFilterStatusChange('all');
  };

  return (
    <div className="mb-8">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--moka-700)' }}>
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filtros</span>
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg border-2 text-sm font-medium cursor-pointer transition-all focus:outline-none"
            style={{
              borderColor: selectedCategory !== 'all' ? 'var(--gold-500)' : 'var(--moka-200)',
              background: selectedCategory !== 'all' ? 'var(--gold-400)' : 'white',
              color: selectedCategory !== 'all' ? 'white' : 'var(--moka-700)',
            }}
          >
            <option value="all">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: selectedCategory !== 'all' ? 'white' : 'var(--moka-500)' }} />
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg border-2 text-sm font-medium cursor-pointer transition-all focus:outline-none"
            style={{
              borderColor: sortBy !== 'default' ? 'var(--gold-500)' : 'var(--moka-200)',
              background: sortBy !== 'default' ? 'var(--gold-400)' : 'white',
              color: sortBy !== 'default' ? 'white' : 'var(--moka-700)',
            }}
          >
            <option value="default">Ordenar por...</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
            <option value="name-asc">Nombre: A-Z</option>
            <option value="name-desc">Nombre: Z-A</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: sortBy !== 'default' ? 'white' : 'var(--moka-500)' }} />
        </div>

        {/* Status Filter */}
        <div className="flex rounded-lg border-2 overflow-hidden" style={{ borderColor: 'var(--moka-200)' }}>
          <button
            onClick={() => onFilterStatusChange('all')}
            className="px-3 py-2 text-sm font-medium transition-all"
            style={{
              background: filterStatus === 'all' ? 'var(--gold-400)' : 'white',
              color: filterStatus === 'all' ? 'white' : 'var(--moka-600)',
            }}
          >
            Todos
          </button>
          <button
            onClick={() => onFilterStatusChange('pending')}
            className="px-3 py-2 text-sm font-medium transition-all border-x"
            style={{
              background: filterStatus === 'pending' ? 'var(--gold-400)' : 'white',
              color: filterStatus === 'pending' ? 'white' : 'var(--moka-600)',
              borderColor: 'var(--moka-200)',
            }}
          >
            Pendientes
          </button>
          <button
            onClick={() => onFilterStatusChange('purchased')}
            className="px-3 py-2 text-sm font-medium transition-all"
            style={{
              background: filterStatus === 'purchased' ? 'var(--accent-olive)' : 'white',
              color: filterStatus === 'purchased' ? 'white' : 'var(--moka-600)',
            }}
          >
            Comprados
          </button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ color: 'var(--moka-600)', background: 'var(--moka-100)' }}
          >
            <X className="w-3 h-3" />
            Limpiar
          </button>
        )}
      </div>

      {/* Results count */}
      {(hasActiveFilters || filteredCount !== totalProducts) && (
        <p className="text-sm" style={{ color: 'var(--moka-500)' }}>
          Mostrando {filteredCount} de {totalProducts} productos
        </p>
      )}
    </div>
  );
}
