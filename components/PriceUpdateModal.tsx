'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Product } from '../types';
import { useScrollLock } from '../hooks/useScrollLock';

interface PriceUpdateModalProps {
  products: Product[];
  onClose: () => void;
  onUpdatePrices: (productIds: string[]) => Promise<void>;
}

type UpdateMode = 'all' | 'no-price' | 'select';

export default function PriceUpdateModal({ products, onClose, onUpdatePrices }: PriceUpdateModalProps) {
  const [mode, setMode] = useState<UpdateMode>('no-price');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<{ success: string[]; failed: string[] } | null>(null);

  const productsWithoutPrice = products.filter(p => !p.price);

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

  const handleToggleProduct = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleUpdate = async () => {
    let idsToUpdate: string[] = [];

    switch (mode) {
      case 'all':
        idsToUpdate = products.map(p => p.id);
        break;
      case 'no-price':
        idsToUpdate = productsWithoutPrice.map(p => p.id);
        break;
      case 'select':
        idsToUpdate = Array.from(selectedIds);
        break;
    }

    if (idsToUpdate.length === 0) {
      alert('No hay productos seleccionados');
      return;
    }

    setIsUpdating(true);
    setProgress({ current: 0, total: idsToUpdate.length });

    try {
      await onUpdatePrices(idsToUpdate);
      setResults({ success: idsToUpdate, failed: [] });
    } catch (error) {
      console.error('Error updating prices:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
          style={{ background: 'var(--moka-50)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b" style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))', borderColor: 'var(--moka-200)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white">Actualizar Precios</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-white transition-colors"
                style={{ background: 'rgba(255, 255, 255, 0.2)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto" data-scrollable>
            {!isUpdating && !results ? (
              <>
                {/* Mode Selection */}
                <div className="space-y-3 mb-6">
                  <label className="block text-sm font-bold mb-3" style={{ color: 'var(--moka-900)' }}>
                    Selecciona qué productos actualizar:
                  </label>

                  <button
                    onClick={() => setMode('no-price')}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      mode === 'no-price' ? 'border-gold-500 shadow-md' : 'border-moka-200'
                    }`}
                    style={{ background: mode === 'no-price' ? 'var(--moka-100)' : 'white' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold" style={{ color: 'var(--moka-900)' }}>
                          Solo sin precio
                        </p>
                        <p className="text-sm" style={{ color: 'var(--moka-600)' }}>
                          Actualizar productos que no tienen precio
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: 'var(--gold-500)', color: 'white' }}>
                        {productsWithoutPrice.length}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('all')}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      mode === 'all' ? 'border-gold-500 shadow-md' : 'border-moka-200'
                    }`}
                    style={{ background: mode === 'all' ? 'var(--moka-100)' : 'white' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold" style={{ color: 'var(--moka-900)' }}>
                          Todos los productos
                        </p>
                        <p className="text-sm" style={{ color: 'var(--moka-600)' }}>
                          Actualizar precios de todos los productos
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: 'var(--gold-500)', color: 'white' }}>
                        {products.length}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('select')}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      mode === 'select' ? 'border-gold-500 shadow-md' : 'border-moka-200'
                    }`}
                    style={{ background: mode === 'select' ? 'var(--moka-100)' : 'white' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold" style={{ color: 'var(--moka-900)' }}>
                          Seleccionar manualmente
                        </p>
                        <p className="text-sm" style={{ color: 'var(--moka-600)' }}>
                          Elige qué productos actualizar
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: 'var(--gold-500)', color: 'white' }}>
                        {selectedIds.size}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Product Selection */}
                {mode === 'select' && (
                  <div className="space-y-2 mb-6">
                    <p className="text-sm font-bold mb-2" style={{ color: 'var(--moka-700)' }}>
                      Selecciona productos:
                    </p>
                    <div className="max-h-64 overflow-y-auto space-y-2 p-2 rounded-lg" style={{ background: 'var(--moka-100)' }} data-scrollable>
                      {products.map((product) => (
                        <label
                          key={product.id}
                          className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(product.id)}
                            onChange={() => handleToggleProduct(product.id)}
                            className="w-4 h-4"
                          />
                          <span className="text-base">{product.categoryEmoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--moka-900)' }}>
                              {product.name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--moka-600)' }}>
                              {product.price || 'Sin precio'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-6 py-3 rounded-xl font-bold transition-all"
                    style={{ background: 'var(--moka-200)', color: 'var(--moka-700)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="flex-1 px-6 py-3 text-white font-bold rounded-xl hover:shadow-xl transition-all"
                    style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}
                  >
                    Actualizar Precios
                  </button>
                </div>
              </>
            ) : isUpdating ? (
              /* Progress */
              <div className="text-center py-12">
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" style={{ color: 'var(--gold-500)' }} />
                <p className="text-xl font-bold mb-2" style={{ color: 'var(--moka-900)' }}>
                  Actualizando precios...
                </p>
                <p className="text-sm" style={{ color: 'var(--moka-600)' }}>
                  {progress.current} de {progress.total} productos
                </p>
                <div className="w-full max-w-md mx-auto mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'var(--moka-200)' }}>
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))',
                      width: `${(progress.current / progress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              /* Results */
              <div className="text-center py-12">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: '#10b981' }} />
                <p className="text-xl font-bold mb-2" style={{ color: 'var(--moka-900)' }}>
                  ¡Precios actualizados!
                </p>
                <p className="text-sm mb-6" style={{ color: 'var(--moka-600)' }}>
                  {results?.success.length} productos actualizados correctamente
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-3 text-white font-bold rounded-xl hover:shadow-xl transition-all"
                  style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
