'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Tag, User, Palette, Ruler, Package, RefreshCw, TrendingUp } from 'lucide-react';
import { Product } from '../types';
import { useRealTimePrice } from '../hooks/useRealTimePrice';
import { useScrollLock } from '../hooks/useScrollLock';

interface ProductModalProps {
  product: Product;
  isPurchased: boolean;
  onClose: () => void;
  onTogglePurchased: (productId: string) => void;
}

export default function ProductModal({ product, isPurchased, onClose, onTogglePurchased }: ProductModalProps) {
  const [imageError, setImageError] = useState(false);
  const { price: realTimePrice, loading: priceLoading, error: priceError } = useRealTimePrice(product.url, true);

  // Bloquear scroll cuando el modal está abierto
  useScrollLock(true);

  // Manejar ESC y botón de retroceso
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    // Agregar entrada al historial para interceptar el botón de retroceso
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          style={{ background: 'var(--moka-50)' }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full transition-all hover:scale-110"
            style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Image Section */}
          {product.image && !imageError ? (
            <div className="relative w-full h-64 md:h-80 overflow-hidden">
              <img 
                src={`/api/image-proxy?url=${encodeURIComponent(product.image)}`}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Category badge on image */}
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}>
                <span className="text-lg">{product.categoryEmoji}</span>
                <span className="text-xs font-semibold text-white uppercase tracking-wide">
                  {product.category}
                </span>
              </div>

              {/* Title and price on image */}
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-lg">
                  {product.name}
                </h2>
                {product.price && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}>
                    <Tag className="w-4 h-4" style={{ color: 'var(--gold-500)' }} />
                    <span className="text-xl font-bold gradient-text">{product.price}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative p-6 pb-8" style={{ background: `linear-gradient(135deg, ${product.categoryColor}15, ${product.categoryColor}05)` }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{product.categoryEmoji}</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--moka-600)' }}>
                    {product.category}
                  </p>
                  <h2 className="text-2xl font-bold mt-1" style={{ color: 'var(--moka-900)' }}>
                    {product.name}
                  </h2>
                </div>
              </div>
              {product.price && (
                <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                  <Tag className="w-4 h-4" style={{ color: 'var(--gold-500)' }} />
                  <span className="text-xl font-bold gradient-text">{product.price}</span>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]" data-scrollable>
            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--moka-700)' }}>
                  Descripción
                </h3>
                <p className="leading-relaxed" style={{ color: 'var(--moka-600)' }}>{product.description}</p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {product.author && (
                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'var(--moka-100)' }}>
                  <User className="w-5 h-5 mt-0.5" style={{ color: 'var(--moka-500)' }} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--moka-600)' }}>
                      Autor
                    </p>
                    <p className="font-medium" style={{ color: 'var(--moka-900)' }}>{product.author}</p>
                  </div>
                </div>
              )}

              {product.color && (
                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'var(--moka-100)' }}>
                  <Palette className="w-5 h-5 mt-0.5" style={{ color: 'var(--moka-500)' }} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--moka-600)' }}>
                      Color
                    </p>
                    <p className="font-medium" style={{ color: 'var(--moka-900)' }}>{product.color}</p>
                  </div>
                </div>
              )}

              {product.size && (
                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'var(--moka-100)' }}>
                  <Ruler className="w-5 h-5 mt-0.5" style={{ color: 'var(--moka-500)' }} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--moka-600)' }}>
                      Talla
                    </p>
                    <p className="font-medium" style={{ color: 'var(--moka-900)' }}>{product.size}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {/* Real-time price banner */}
              <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, var(--moka-100), var(--moka-50))', border: '2px solid var(--gold-400)' }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--gold-400)' }}>
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1" style={{ color: 'var(--moka-900)' }}>
                      Precio en Tiempo Real
                    </p>
                    {priceLoading ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'var(--gold-500)' }} />
                        <span className="text-sm" style={{ color: 'var(--moka-600)' }}>Obteniendo precio actual...</span>
                      </div>
                    ) : priceError ? (
                      <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--moka-600)' }}>
                          No se pudo obtener el precio automáticamente
                        </p>
                        {product.price && (
                          <p className="text-sm">
                            <span style={{ color: 'var(--moka-600)' }}>Último precio guardado: </span>
                            <span className="font-bold gradient-text">{product.price}</span>
                          </p>
                        )}
                      </div>
                    ) : realTimePrice ? (
                      <div>
                        <p className="text-2xl font-bold gradient-text mb-1">{realTimePrice}</p>
                        {product.price && product.price !== realTimePrice && (
                          <p className="text-xs" style={{ color: 'var(--moka-600)' }}>
                            Antes: <span className="line-through">{product.price}</span>
                          </p>
                        )}
                      </div>
                    ) : product.price ? (
                      <p className="text-xl font-bold gradient-text">{product.price}</p>
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--moka-600)' }}>Precio no disponible</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--moka-500)' }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--gold-500)' }} />
                  <span>Actualizado automáticamente desde la tienda</span>
                </div>
              </div>

              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center justify-center gap-2 w-full px-6 py-4 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-300 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, var(--gold-600), var(--moka-400))' }} />
                <Package className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Comprar en la tienda</span>
                <ExternalLink className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
              </a>

              <button
                onClick={() => onTogglePurchased(product.id)}
                className="flex items-center justify-center gap-2 w-full px-6 py-4 font-bold rounded-xl transition-all border-2"
                style={{
                  background: isPurchased ? 'rgba(112, 141, 129, 0.1)' : 'var(--moka-100)',
                  color: isPurchased ? 'var(--accent-olive)' : 'var(--moka-700)',
                  borderColor: isPurchased ? 'var(--accent-olive)' : 'var(--moka-200)'
                }}
              >
                <input
                  type="checkbox"
                  checked={isPurchased}
                  onChange={() => {}}
                  className="w-5 h-5 rounded border-2 cursor-pointer"
                  style={{ borderColor: 'var(--moka-300)' }}
                />
                <span>{isPurchased ? '✓ Comprado' : 'Marcar como comprado'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
