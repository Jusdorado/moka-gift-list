'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { Product } from '../types';
import { Share2 } from 'lucide-react';

interface ProductCardProps {
    product: Product;
    isPurchased: boolean;
    onClick: () => void;
    onShare: (product: Product) => void;
}

export default function ProductCard({ product, isPurchased, onClick, onShare }: ProductCardProps) {
    const [imageError, setImageError] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            onClick={onClick}
            className="group relative bg-white/80 backdrop-blur-sm border-2 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-xl"
            style={{
                borderColor: isPurchased ? 'var(--accent-olive)' : 'var(--moka-200)',
                background: isPurchased ? 'rgba(112, 141, 129, 0.1)' : 'rgba(255, 255, 255, 0.8)'
            }}
        >
            {/* Purchased indicator */}
            {isPurchased && (
                <div className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-olive)' }}>
                    <span className="text-white text-xs font-bold">✓</span>
                </div>
            )}

            {/* Image */}
            {product.image && !imageError ? (
                <div className="relative w-full h-32 sm:h-40 overflow-hidden">
                    <img 
                        src={`/api/image-proxy?url=${encodeURIComponent(product.image)}`}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={() => setImageError(true)}
                    />
                    {/* Category badge on image */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-xs font-semibold text-white" style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}>
                        <span className="text-sm sm:text-base">{product.categoryEmoji}</span>
                        <span className="uppercase tracking-wide hidden sm:inline">{product.category}</span>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onShare(product); }}
                        className="p-2 rounded-lg text-xs font-semibold transition-colors hover:bg-[var(--moka-100)] absolute top-2 right-2"
                        aria-label={`Compartir ${product.name}`}
                    >
                        <Share2 className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="relative w-full h-32 sm:h-40 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${product.categoryColor}20, ${product.categoryColor}05)` }}>
                    <span className="text-4xl sm:text-6xl opacity-50">{product.categoryEmoji}</span>
                    {/* Category badge */}
                    <span className="flex items-center gap-2">
                        <span className="text-xl" aria-hidden>{product.categoryEmoji || '🎁'}</span>
                        <p className="text-xs font-medium text-gray-700 truncate" title={product.category}>
                            {product.category}
                        </p>
                    </span>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onShare(product); }}
                        className="p-2 rounded-lg text-xs font-semibold transition-colors hover:bg-[var(--moka-100)]"
                        aria-label={`Compartir ${product.name}`}
                    >
                        <Share2 className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="p-3 md:p-4" onClick={onClick}>
                {/* Name */}
                <h3 className="text-sm md:text-lg font-bold mb-1 md:mb-2 transition-colors line-clamp-2" style={{ color: 'var(--moka-900)' }}>
                    {product.name}
                </h3>

                {/* Price */}
                {product.price && (
                    <p className="text-lg md:text-xl font-bold mb-2 md:mb-3 gradient-text">{product.price}</p>
                )}

                {/* Quick info */}
                <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm" style={{ color: 'var(--moka-500)' }}>
                    <MoreHorizontal className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Click para ver detalles</span>
                    <span className="sm:hidden">Ver más</span>
                </div>
            </div>
        </motion.div>
    );
}
