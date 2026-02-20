'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';

interface CategoryField {
  name: string;
  required: boolean;
}

interface CategoryDefinition {
  id?: string;
  name: string;
  emoji: string;
  color: string;
  fields: CategoryField[];
}

interface CategoryManagerProps {
  onClose: () => void;
  onSave: (category: CategoryDefinition) => void;
  existingCategory?: CategoryDefinition;
}

export default function CategoryManager({ onClose, onSave, existingCategory }: CategoryManagerProps) {
  const [categoryName, setCategoryName] = useState(existingCategory?.name || '');
  const [emoji, setEmoji] = useState(existingCategory?.emoji || '📦');
  const [color, setColor] = useState(existingCategory?.color || '#d946ef');
  const [fields, setFields] = useState<CategoryField[]>(existingCategory?.fields || []);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  useScrollLock(true);

  useEffect(() => {
    setCategoryName(existingCategory?.name || '');
    setEmoji(existingCategory?.emoji || '📦');
    setColor(existingCategory?.color || '#d946ef');
    setFields(existingCategory?.fields || []);
  }, [existingCategory]);

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
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  const handleAddField = () => {
    if (newFieldName.trim()) {
      setFields([...fields, { name: newFieldName.trim(), required: newFieldRequired }]);
      setNewFieldName('');
      setNewFieldRequired(false);
    }
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (categoryName.trim()) {
      onSave({
        id: existingCategory?.id || `cat-${Date.now()}`,
        name: categoryName.trim(),
        emoji,
        color,
        fields,
      });
      onClose();
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
              <h2 className="text-2xl font-bold text-white">
                {existingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
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
          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6" data-scrollable>
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--moka-700)' }}>
                Información Básica
              </h3>
              
              <input
                type="text"
                placeholder="Nombre de la categoría *"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="admin-input w-full"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--moka-700)' }}>
                    Emoji
                  </label>
                  <input
                    type="text"
                    placeholder="📦"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    className="admin-input w-full text-center text-2xl"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--moka-700)' }}>
                    Color
                  </label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="admin-input w-full h-12"
                  />
                </div>
              </div>
            </div>

            {/* Custom Fields */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--moka-700)' }}>
                Campos Personalizados
              </h3>
              
              {/* Existing Fields */}
              {fields.length > 0 && (
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ background: 'var(--moka-100)' }}
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: 'var(--moka-900)' }}>
                          {field.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--moka-600)' }}>
                          {field.required ? '✓ Obligatorio' : 'Opcional'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveField(index)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: '#dc2626', background: 'rgba(220, 38, 38, 0.1)' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Field */}
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--moka-100)', border: '2px dashed var(--moka-300)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--moka-700)' }}>
                  Añadir nuevo campo
                </p>
                <input
                  type="text"
                  placeholder="Nombre del campo (ej: Autor, Talla, Color)"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="admin-input w-full text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddField();
                    }
                  }}
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFieldRequired}
                    onChange={(e) => setNewFieldRequired(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium" style={{ color: 'var(--moka-700)' }}>
                    Campo obligatorio
                  </span>
                </label>
                <button
                  onClick={handleAddField}
                  disabled={!newFieldName.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                  style={{ background: 'var(--gold-500)' }}
                >
                  <Plus className="w-4 h-4" />
                  Añadir Campo
                </button>
              </div>

              {/* Field Examples */}
              <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--moka-100)', color: 'var(--moka-600)' }}>
                <p className="font-semibold mb-1">💡 Ejemplos de campos:</p>
                <ul className="space-y-0.5 ml-4">
                  <li>• <strong>Libros:</strong> Autor (obligatorio), Editorial</li>
                  <li>• <strong>Ropa:</strong> Talla (obligatorio), Color</li>
                  <li>• <strong>Electrónica:</strong> Especificaciones técnicas</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t flex gap-3" style={{ borderColor: 'var(--moka-200)' }}>
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-bold transition-all"
              style={{ background: 'var(--moka-200)', color: 'var(--moka-700)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!categoryName.trim()}
              className="flex-1 px-6 py-3 text-white font-bold rounded-xl hover:shadow-xl transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}
            >
              {existingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
