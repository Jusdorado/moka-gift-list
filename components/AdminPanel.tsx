'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, Trash2, X, LogOut, Package, GripVertical, DollarSign, ChevronDown, RefreshCw, FolderPlus } from 'lucide-react';
import { Product } from '../types';
import PriceUpdateModal from './PriceUpdateModal';
import CategoryManager from './CategoryManager';
import { useScrollLock } from '../hooks/useScrollLock';

interface CategoryField {
  name: string;
  required: boolean;
}

interface CategoryDefinition {
  name: string;
  emoji: string;
  color: string;
  fields: CategoryField[];
}

interface AdminPanelProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onSaveProducts?: (products: Product[]) => Promise<boolean>;
  onResetProducts?: () => void;
  onLogout: () => void;
  onClose: () => void;
}

export default function AdminPanel({ products, onAddProduct, onDeleteProduct, onUpdateProduct, onSaveProducts, onResetProducts, onLogout, onClose }: AdminPanelProps) {
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [orderedProducts, setOrderedProducts] = useState(products);
  const [isSaving, setIsSaving] = useState(false);
  const [showPriceUpdateModal, setShowPriceUpdateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [categories, setCategories] = useState<CategoryDefinition[]>([]);
  const [editingCategory, setEditingCategory] = useState<CategoryDefinition | null>(null);

  // Determinar qué campos mostrar según la categoría
  const getCategoryFields = (category: string) => {
    const lowerCategory = category.toLowerCase();

    // Libros - tienen autor
    if (lowerCategory.includes('libro') || lowerCategory.includes('book')) {
      return ['author', 'description'];
    }

    // Equipamiento de música/producción - solo descripción técnica
    if (lowerCategory.includes('música') || lowerCategory.includes('producción') || lowerCategory.includes('music')) {
      return ['description'];
    }

    // Ropa / caps - talla y color
    if (
      lowerCategory.includes('streetwear') ||
      lowerCategory.includes('moda') ||
      lowerCategory.includes('cold culture') ||
      lowerCategory.includes('gng') ||
      lowerCategory.includes('ropa') ||
      lowerCategory.includes('clothing') ||
      lowerCategory.includes('gorra') ||
      lowerCategory.includes('cap') ||
      lowerCategory.includes('new era')
    ) {
      return ['size', 'color'];
    }

    // Gaming y componentes PC - descripción técnica
    if (lowerCategory.includes('gaming') || lowerCategory.includes('componentes') ||
      lowerCategory.includes('confort') || lowerCategory.includes('pc')) {
      return ['description'];
    }

    // Fragancias - descripción
    if (lowerCategory.includes('fragancia') || lowerCategory.includes('perfume')) {
      return ['description'];
    }

    return [];
  };

  const mapFieldKey = (fieldKey: string) => {
    const key = fieldKey.toLowerCase();
    if (key === 'talla' || key === 'size') return 'size';
    if (key === 'autor' || key === 'author') return 'author';
    if (key === 'descripción') return 'description';
    return key;
  };

  // Cargar definiciones de categorías desde la base de datos
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/categories', {
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.categories && Array.isArray(data.categories)) {
            setCategories(data.categories);
          }
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Extraer categorías únicas de los productos existentes
  const existingCategories = useMemo(() => {
    const uniqueCategories = new Map<string, CategoryDefinition>();

    // Primero añadir categorías de productos existentes
    products.forEach(product => {
      if (!uniqueCategories.has(product.category)) {
        const defaultFields = getCategoryFields(product.category).map(f => ({ name: f, required: false }));
        uniqueCategories.set(product.category, {
          name: product.category,
          emoji: product.categoryEmoji || '📦',
          color: product.categoryColor || '#d946ef',
          fields: defaultFields,
        });
      }
    });

    // Luego sobrescribir con definiciones personalizadas de la DB
    categories.forEach(cat => {
      uniqueCategories.set(cat.name, cat);
    });

    return Array.from(uniqueCategories.values());
  }, [products, categories]);

  // Bloquear scroll cuando el panel está abierto
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

  // Sincronizar orderedProducts cuando products cambia
  useEffect(() => {
    setOrderedProducts(products);
  }, [products]);

  // Cuando una categoría cambia (emoji/color), reflejarlo en productos en memoria
  useEffect(() => {
    if (!categories.length) return;
    const updates: { id: string; next: Product }[] = [];
    setOrderedProducts((prev) => {
      let changed = false;
      const updated = prev.map((product) => {
        const cat = categories.find((c) => c.name === product.category);
        if (!cat) return product;
        if (product.categoryEmoji !== cat.emoji || product.categoryColor !== cat.color) {
          changed = true;
          const next = { ...product, categoryEmoji: cat.emoji, categoryColor: cat.color };
          updates.push({ id: product.id, next });
          return next;
        }
        return product;
      });
      return changed ? updated : prev;
    });
    // Propaga fuera del setState para evitar avisos de React
    updates.forEach(({ id, next }) => onUpdateProduct(id, next));
  }, [categories, onUpdateProduct]);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    category: '',
    categoryEmoji: '📦',
    categoryColor: '#d946ef',
    price: '',
    url: '',
    image: '',
    author: '',
    size: '',
    color: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProduct.name && newProduct.category && newProduct.url) {
      onAddProduct(newProduct);
      setNewProduct({
        name: '',
        category: '',
        categoryEmoji: '📦',
        categoryColor: '#d946ef',
        price: '',
        url: '',
        image: ''
      });
      setIsAddingProduct(false);
    }
  };

  const handleReorder = (newOrder: Product[]) => {
    setOrderedProducts(newOrder);
    newOrder.forEach((product) => {
      onUpdateProduct(product.id, { ...product });
    });
  };

  const handleUpdatePrices = async (productIds: string[]) => {
    for (const id of productIds) {
      try {
        const product = products.find(p => p.id === id);
        if (!product) continue;

        const response = await fetch(`/api/price?url=${encodeURIComponent(product.url)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.price) {
            onUpdateProduct(id, { price: data.price });
          }
        }
      } catch (error) {
        console.error(`Error updating price for ${id}:`, error);
      }
    }
  };

  const handleAutoUpdatePrice = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const response = await fetch(`/api/price?url=${encodeURIComponent(product.url)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.price) {
          onUpdateProduct(productId, { price: data.price });
          setEditingPrice(null);
        } else {
          alert('No se pudo obtener el precio automáticamente');
        }
      }
    } catch (error) {
      console.error('Error auto-updating price:', error);
      alert('Error al actualizar el precio automáticamente');
    }
  };

  const handleSaveCategory = async (category: CategoryDefinition) => {
    try {
      // Guardar en la base de datos
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category }),
      });

      if (!response.ok) {
        throw new Error('Failed to save category');
      }

      // Actualizar estado local
      setCategories(prev => {
        const exists = prev.some(c => c.name === category.name);
        if (exists) {
          return prev.map(c => c.name === category.name ? category : c);
        }
        return [...prev, category];
      });
      setNewProduct({
        ...newProduct,
        category: category.name,
        categoryEmoji: category.emoji,
        categoryColor: category.color,
      });

      // Propagar cambios a productos existentes de esa categoría
      orderedProducts.forEach((product) => {
        if (product.category === category.name) {
          onUpdateProduct(product.id, {
            ...product,
            categoryEmoji: category.emoji,
            categoryColor: category.color,
          });
        }
      });
      setEditingCategory(null);

    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error al guardar la categoría');
    }
  };


  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sidebar Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full md:w-[600px] shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--moka-50)' }}
      >
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b" style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))', borderColor: 'var(--moka-200)' }}>
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Administración</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPriceUpdateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold transition-all"
              style={{ background: 'rgba(255, 255, 255, 0.3)' }}
              title="Actualizar precios automáticamente"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Precios</span>
            </button>
            {onSaveProducts && (
              <button
                onClick={async () => {
                  setIsSaving(true);
                  await onSaveProducts(orderedProducts);
                  setIsSaving(false);
                }}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-white font-semibold transition-all disabled:opacity-50"
                style={{ background: 'rgba(255, 255, 255, 0.3)' }}
                title="Guardar cambios en la base de datos"
              >
                {isSaving ? '⏳ Guardando...' : '💾 Guardar'}
              </button>
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-colors"
              style={{ background: 'rgba(255, 255, 255, 0.2)' }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
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
        <div className="flex-1 overflow-y-auto p-6 flex flex-col" data-scrollable>
          {/* Quick Add Button */}
          <button
            onClick={() => setIsAddingProduct(!isAddingProduct)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white font-bold rounded-xl hover:shadow-xl transition-all mb-6"
            style={{ background: isAddingProduct ? 'var(--moka-600)' : 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}
          >
            {isAddingProduct ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {isAddingProduct ? 'Cancelar' : 'Nuevo Producto'}
          </button>

          {/* Quick Add Form */}
          <AnimatePresence>
            {isAddingProduct && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="mb-6 p-4 rounded-xl space-y-3"
                style={{ background: 'var(--moka-100)' }}
              >
                <input
                  type="text"
                  placeholder="Nombre *"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="admin-input w-full text-sm"
                  required
                />

                {/* Category Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold" style={{ color: 'var(--moka-700)' }}>
                    Categoría *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {existingCategories.map((category) => (
                      <div
                        key={category.name}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all"
                        style={{
                          color: category.color || 'var(--moka-800)',
                          borderColor: newProduct.category === category.name ? 'var(--gold-500)' : 'transparent',
                          background: newProduct.category === category.name ? 'var(--moka-100)' : undefined,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setNewProduct({
                              ...newProduct,
                              category: category.name,
                              categoryEmoji: category.emoji,
                              categoryColor: category.color,
                            });
                          }}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          <span className="text-base">{category.emoji || '📦'}</span>
                          <span className="truncate text-xs">{category.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(category);
                            setShowCategoryManager(true);
                          }}
                          className="shrink-0 px-2 py-1 rounded-md text-xs font-semibold"
                          style={{ background: 'var(--moka-200)', color: 'var(--moka-700)' }}
                          aria-label={`Editar categoría ${category.name}`}
                        >
                          Editar
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null);
                      setShowCategoryManager(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-semibold transition-all"
                    style={{ background: 'var(--moka-200)', color: 'var(--moka-700)' }}
                  >
                    <FolderPlus className="w-4 h-4" />
                    Nueva Categoría
                  </button>
                </div>
                <input
                  type="url"
                  placeholder="URL *"
                  value={newProduct.url}
                  onChange={(e) => setNewProduct({ ...newProduct, url: e.target.value })}
                  className="admin-input w-full text-sm"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Precio"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="admin-input text-sm"
                  />
                  <input
                    type="color"
                    value={newProduct.categoryColor}
                    onChange={(e) => setNewProduct({ ...newProduct, categoryColor: e.target.value })}
                    className="admin-input h-10"
                  />
                </div>
                <input
                  type="url"
                  placeholder="Imagen URL"
                  value={newProduct.image}
                  onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                  className="admin-input w-full text-sm"
                />

                {/* Campos dinámicos según categoría */}
                {newProduct.category && (() => {
                  const customCategory = categories.find(c => c.name === newProduct.category);
                  const categoryFields = customCategory?.fields || [];
                  const defaultFields = getCategoryFields(newProduct.category);
                  const fieldsToShow = categoryFields.length > 0 ? categoryFields : defaultFields.map(f => ({ name: f, required: false }));
                  if (fieldsToShow.length === 0) return null;

                  return (
                    <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--moka-300)' }}>
                      <p className="text-xs font-semibold" style={{ color: 'var(--moka-700)' }}>
                        📝 Campos de {newProduct.category}
                      </p>
                      {fieldsToShow.map((field) => {
                        const fieldName = typeof field === 'string' ? field : field.name;
                        const isRequired = typeof field === 'object' ? field.required : false;
                        const fieldKey = fieldName.toLowerCase();
                        const actualKey = mapFieldKey(fieldKey);

                        if (actualKey === 'description') {
                          return (
                            <textarea
                              key={fieldKey}
                              placeholder={`${fieldName}${isRequired ? ' *' : ''}`}
                              value={(newProduct as Record<string, string | undefined>).description || ''}
                              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                              className="admin-input w-full text-sm"
                              rows={2}
                              required={isRequired}
                            />
                          );
                        }

                        return (
                          <input
                            key={fieldKey}
                            type="text"
                            placeholder={`${fieldName}${isRequired ? ' *' : ''}`}
                            value={(newProduct as Record<string, string | undefined>)[actualKey] || ''}
                            onChange={(e) => setNewProduct({ ...newProduct, [actualKey]: e.target.value })}
                            className="admin-input w-full text-sm"
                            required={isRequired}
                          />
                        );
                      })}
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  className="w-full px-4 py-2 text-white font-bold rounded-lg text-sm"
                  style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}
                >
                  Guardar
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Products List with Drag & Drop */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-sm font-bold mb-3 sticky top-0" style={{ color: 'var(--moka-900)' }}>
              Productos ({products.length})
            </h3>
            <Reorder.Group axis="y" values={orderedProducts} onReorder={handleReorder} className="space-y-2">
              {orderedProducts.map((product) => (
                <Reorder.Item key={product.id} value={product} className="group">
                  <motion.div
                    layout
                    className="p-3 bg-white/80 backdrop-blur-sm border rounded-lg transition-all hover:border-gold-500 hover:shadow-md"
                    style={{ borderColor: 'var(--moka-200)' }}
                  >
                    <div className="flex items-center gap-2">
                      {/* Drag Handle */}
                      <GripVertical className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: 'var(--moka-400)' }} />

                      {/* Product Info */}
                      <button
                        onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                        className="flex-1 text-left flex items-center gap-2 hover:opacity-80 transition-opacity"
                      >
                        <span className="text-base">{product.categoryEmoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--moka-900)' }}>{product.name}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--moka-500)' }}>{product.category}</p>
                        </div>
                        {product.price && (
                          <p className="text-xs font-bold" style={{ color: 'var(--gold-600)' }}>{product.price}</p>
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedProduct === product.id ? 'rotate-180' : ''}`} style={{ color: 'var(--moka-400)' }} />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => onDeleteProduct(product.id)}
                        className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        style={{ color: '#dc2626', background: 'rgba(220, 38, 38, 0.1)' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {expandedProduct === product.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t space-y-2"
                          style={{ borderColor: 'var(--moka-200)' }}
                        >
                          {/* Price Editor */}
                          {editingPrice === product.id ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={newPrice}
                                  onChange={(e) => setNewPrice(e.target.value)}
                                  placeholder="Precio"
                                  className="admin-input flex-1 text-xs py-1"
                                  autoFocus
                                />
                                <button
                                  onClick={() => {
                                    onUpdateProduct(product.id, { price: newPrice });
                                    setEditingPrice(null);
                                    setNewPrice('');
                                  }}
                                  className="px-2 py-1 text-white font-semibold rounded text-xs"
                                  style={{ background: 'var(--gold-500)' }}
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingPrice(null);
                                    setNewPrice('');
                                  }}
                                  className="px-2 py-1 font-semibold rounded text-xs"
                                  style={{ color: 'var(--moka-700)', background: 'var(--moka-200)' }}
                                >
                                  ✕
                                </button>
                              </div>
                              <button
                                onClick={() => handleAutoUpdatePrice(product.id)}
                                className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors"
                                style={{ color: 'white', background: 'var(--gold-500)' }}
                              >
                                <RefreshCw className="w-3 h-3" />
                                Actualizar automáticamente
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPrice(product.id);
                                setNewPrice(product.price || '');
                              }}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-semibold transition-colors"
                              style={{ color: 'var(--gold-600)', background: 'var(--moka-100)' }}
                            >
                              <DollarSign className="w-3 h-3" />
                              {product.price ? `Precio: ${product.price}` : 'Añadir precio'}
                            </button>
                          )}

                          {/* Edit Product Details */}
                          {editingProduct === product.id ? (
                            <div className="space-y-2">
                              {/* Mostrar categoría (editable) */}
                              <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--moka-100)' }}>
                                <span className="text-base">{product.categoryEmoji}</span>
                                <span className="text-xs font-semibold" style={{ color: 'var(--moka-600)' }}>
                                  {product.category}
                                </span>
                              </div>

                              <input
                                type="text"
                                value={editForm.name || ''}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                placeholder="Nombre"
                                className="admin-input w-full text-xs py-1"
                              />
                              <input
                                type="url"
                                value={editForm.url || ''}
                                onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                                placeholder="URL"
                                className="admin-input w-full text-xs py-1"
                              />
                              <input
                                type="url"
                                value={editForm.image || ''}
                                onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                                placeholder="Imagen URL"
                                className="admin-input w-full text-xs py-1"
                              />

                              {/* Campos dinámicos según categoría (usar definiciones personalizadas) */}
                              {editForm.category && (() => {
                                const customCategory = categories.find(c => c.name === editForm.category);
                                const categoryFields = customCategory?.fields || [];
                                const defaultFields = getCategoryFields(editForm.category);
                                const fieldsToShow = categoryFields.length > 0 ? categoryFields : defaultFields.map(f => ({ name: f, required: false }));
                                if (fieldsToShow.length === 0) return null;

                                return (
                                  <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--moka-300)' }}>
                                    {fieldsToShow.map((field) => {
                                      const fieldName = typeof field === 'string' ? field : field.name;
                                      const isRequired = typeof field === 'object' ? field.required : false;
                                      const fieldKey = fieldName.toLowerCase();
                                      const actualKey = mapFieldKey(fieldKey);

                                      if (actualKey === 'description') {
                                        return (
                                          <textarea
                                            key={fieldKey}
                                            placeholder={`${fieldName}${isRequired ? ' *' : ''}`}
                                            value={editForm.description || ''}
                                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                            className="admin-input w-full text-xs"
                                            rows={2}
                                            required={isRequired}
                                          />
                                        );
                                      }

                                      return (
                                        <input
                                          key={fieldKey}
                                          type="text"
                                          placeholder={`${fieldName}${isRequired ? ' *' : ''}`}
                                          value={(editForm as Record<string, string | undefined>)[actualKey] || ''}
                                          onChange={(e) => setEditForm({ ...editForm, [actualKey]: e.target.value })}
                                          className="admin-input w-full text-xs"
                                          required={isRequired}
                                        />
                                      );
                                    })}
                                  </div>
                                );
                              })()}

                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    onUpdateProduct(product.id, editForm);
                                    setEditingProduct(null);
                                    setEditForm({});
                                  }}
                                  className="flex-1 px-3 py-1.5 text-white font-semibold rounded text-xs"
                                  style={{ background: 'var(--gold-500)' }}
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingProduct(null);
                                    setEditForm({});
                                  }}
                                  className="flex-1 px-3 py-1.5 font-semibold rounded text-xs"
                                  style={{ color: 'var(--moka-700)', background: 'var(--moka-200)' }}
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Quick Info */}
                              <div className="text-xs space-y-1 mb-2" style={{ color: 'var(--moka-600)' }}>
                                {product.url && (
                                  <p className="truncate">
                                    <span className="font-semibold">URL:</span> {product.url.split('/')[2]}
                                  </p>
                                )}
                                {product.image && (
                                  <p className="truncate">
                                    <span className="font-semibold">Imagen:</span> ✓
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setEditingProduct(product.id);
                                  setEditForm({
                                    name: product.name,
                                    category: product.category,
                                    categoryEmoji: product.categoryEmoji,
                                    categoryColor: product.categoryColor,
                                    url: product.url,
                                    image: product.image,
                                    author: product.author,
                                    size: product.size,
                                    color: product.color,
                                    description: product.description,
                                  });
                                }}
                                className="w-full px-2 py-1.5 rounded text-xs font-semibold transition-colors"
                                style={{ color: 'var(--moka-700)', background: 'var(--moka-100)' }}
                              >
                                ✏️ Editar producto
                              </button>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        </div>
      </motion.div>

      {/* Price Update Modal */}
      {showPriceUpdateModal && (
        <PriceUpdateModal
          products={products}
          onClose={() => setShowPriceUpdateModal(false)}
          onUpdatePrices={handleUpdatePrices}
        />
      )}

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <CategoryManager
          onClose={() => setShowCategoryManager(false)}
          onSave={handleSaveCategory}
          existingCategory={editingCategory || undefined}
        />
      )}
    </>
  );
}
