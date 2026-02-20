'use client';

import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';

interface ProductGridProps {
    products: Product[];
    purchasedState: { [key: string]: boolean };
    onTogglePurchased: (productId: string) => void;
    prefillProductId?: string | null;
}

export default function ProductGrid({ products, purchasedState, onTogglePurchased, prefillProductId }: ProductGridProps) {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const handleShare = (product: Product) => {
        const shareUrl = `${window.location.origin}/p/${product.id}`;
        if (navigator.share) {
            navigator.share({
                title: product.name,
                text: product.category,
                url: shareUrl,
            }).catch(() => {/* ignore */});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                alert('Enlace copiado al portapapeles');
            }).catch(() => {
                window.open(shareUrl, '_blank');
            });
        } else {
            window.open(shareUrl, '_blank');
        }
    };

    const openProduct = (product: Product) => {
        setSelectedProduct(product);
        const url = new URL(window.location.href);
        url.searchParams.set('product', product.id);
        window.history.replaceState({}, '', url.toString());
    };

    const closeProduct = () => {
        setSelectedProduct(null);
        const url = new URL(window.location.href);
        if (url.searchParams.has('product')) {
            url.searchParams.delete('product');
            window.history.replaceState({}, '', url.toString());
        }
    };

    // Open modal if URL contains ?product=
    useEffect(() => {
        if (!prefillProductId) return;
        const match = products.find(p => p.id === prefillProductId);
        if (match) {
            const raf = requestAnimationFrame(() => setSelectedProduct(match));
            return () => cancelAnimationFrame(raf);
        }
        return undefined;
    }, [prefillProductId, products]);

    if (products.length === 0) {
        return (
            <div className="text-center py-20">
                <p className="text-2xl text-gray-500">No se encontraron productos</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {products.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        isPurchased={purchasedState[product.id] || false}
                        onClick={() => openProduct(product)}
                        onShare={handleShare}
                    />
                ))}
            </div>

            {/* Product Modal */}
            {selectedProduct && (
                <ProductModal
                    product={selectedProduct}
                    isPurchased={purchasedState[selectedProduct.id] || false}
                    onClose={closeProduct}
                    onTogglePurchased={onTogglePurchased}
                />
            )}
        </>
    );
}
