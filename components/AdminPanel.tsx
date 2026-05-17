'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, X, LogOut, Package, Loader2, Sparkles,
  Search, ChevronDown, ChevronUp, Check, ImageOff, ExternalLink, Pencil
} from 'lucide-react';
import { Product } from '../types';

interface AdminPanelProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onResetProducts?: () => void;
  onLogout: () => void;
  onClose: () => void;
}

const EMPTY_FORM = {
  name: '', category: '', categoryEmoji: '', categoryColor: '#d946ef',
  price: '', url: '', image: '', description: '', author: '', color: '', size: '',
};

export default function AdminPanel({
  products, onAddProduct, onDeleteProduct, onUpdateProduct, onLogout, onClose,
}: AdminPanelProps) {
  // ── state ──
  const [tab, setTab] = useState<'list' | 'add'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [toast, setToast] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [newProduct, setNewProduct] = useState({ ...EMPTY_FORM });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // ── derived ──
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))].filter(Boolean);
    return cats.sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.price && p.price.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  // ── toast auto-dismiss ──
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── scrape ──
  const doScrape = async (url: string) => {
    if (!url || !url.startsWith('http')) return;
    setScraping(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) return;
      setNewProduct(prev => ({
        ...prev,
        image: data.image || prev.image,
        name: data.name || prev.name,
        price: data.price || prev.price,
      }));
      if (data.image || data.name) setToast('Datos extraídos ✨');
    } catch { /* ignore */ } finally {
      setScraping(false);
    }
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted?.startsWith('http')) doScrape(pasted);
  };

  // ── add ──
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.category || !newProduct.url) {
      setToast('Rellena nombre, categoría y URL');
      return;
    }
    onAddProduct(newProduct);
    setNewProduct({ ...EMPTY_FORM });
    setShowAdvanced(false);
    setTab('list');
    setToast('Producto añadido ✓');
  };

  // ── inline edit ──
  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, price: p.price, category: p.category, image: p.image, url: p.url, description: p.description, author: p.author, color: p.color, size: p.size });
  };
  const saveEdit = () => {
    if (editingId) {
      onUpdateProduct(editingId, editForm);
      setEditingId(null);
      setEditForm({});
      setToast('Producto actualizado');
    }
  };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  // ── delete ──
  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      onDeleteProduct(id);
      setConfirmDelete(null);
      setToast('Producto eliminado');
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const isNewCategory = newProduct.category !== '' && !categories.includes(newProduct.category);

  // ── input class helper ──
  const inputCls = "w-full px-3 py-2.5 rounded-xl border-2 text-sm focus:outline-none transition-colors";
  const inputStyle = { borderColor: 'var(--moka-200)', background: 'white', color: 'var(--moka-900)' };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sidebar */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full md:max-w-[520px] shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--moka-50)' }}
      >
        {/* ─── Header ─── */}
        <div className="p-4 flex items-center justify-between border-b shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))', borderColor: 'var(--moka-200)' }}>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white">Admin Panel</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Salir</span>
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-white" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── Tab bar ─── */}
        <div className="flex border-b shrink-0" style={{ borderColor: 'var(--moka-200)' }}>
          <button onClick={() => setTab('list')}
            className="flex-1 py-3 text-sm font-bold text-center transition-colors"
            style={{
              color: tab === 'list' ? 'var(--gold-600)' : 'var(--moka-500)',
              borderBottom: tab === 'list' ? '3px solid var(--gold-500)' : '3px solid transparent',
            }}>
            Productos ({products.length})
          </button>
          <button onClick={() => setTab('add')}
            className="flex-1 py-3 text-sm font-bold text-center transition-colors"
            style={{
              color: tab === 'add' ? 'var(--gold-600)' : 'var(--moka-500)',
              borderBottom: tab === 'add' ? '3px solid var(--gold-500)' : '3px solid transparent',
            }}>
            <Plus className="w-4 h-4 inline mr-1" />Añadir
          </button>
        </div>

        {/* ─── Content ─── */}
        <div className="flex-1 overflow-y-auto px-4 pb-24">

          {/* ════════ TAB: ADD ════════ */}
          {tab === 'add' && (
            <form onSubmit={handleSubmit} className="py-4 space-y-3">
              {/* URL + Scrape */}
              <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--moka-500)' }}>URL del producto *</label>
              <div className="flex gap-2">
                <input ref={urlInputRef} type="url" placeholder="https://..." value={newProduct.url}
                  onChange={e => setNewProduct({ ...newProduct, url: e.target.value })}
                  onPaste={handleUrlPaste} onBlur={() => doScrape(newProduct.url)}
                  className={inputCls + ' flex-1'} style={inputStyle} required />
                <button type="button" onClick={() => doScrape(newProduct.url)}
                  disabled={scraping || !newProduct.url}
                  className="px-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50 shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}>
                  {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </button>
              </div>

              {/* Image preview */}
              {newProduct.image && (
                <div className="flex items-center gap-3 p-2 rounded-xl" style={{ background: 'var(--moka-100)' }}>
                  <img src={newProduct.image} alt="preview" className="w-16 h-16 object-cover rounded-lg border" style={{ borderColor: 'var(--moka-200)' }} />
                  <span className="text-xs truncate flex-1" style={{ color: 'var(--moka-600)' }}>Imagen detectada</span>
                  <button type="button" onClick={() => setNewProduct({ ...newProduct, image: '' })}
                    className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: '#dc2626', background: 'rgba(220,38,38,0.1)' }}>
                    Quitar
                  </button>
                </div>
              )}

              {/* Name */}
              <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--moka-500)' }}>Nombre *</label>
              <input type="text" placeholder="Nombre del producto" value={newProduct.name}
                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                className={inputCls} style={inputStyle} required />

              {/* Category */}
              <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--moka-500)' }}>Categoría *</label>
              <div className="flex gap-2">
                <select value={isNewCategory ? '__new__' : newProduct.category}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '__new__') { setNewProduct({ ...newProduct, category: '' }); return; }
                    const ex = products.find(p => p.category === val);
                    setNewProduct({ ...newProduct, category: val, categoryEmoji: ex?.categoryEmoji || '', categoryColor: ex?.categoryColor || '#d946ef' });
                  }}
                  className={inputCls + ' flex-1'} style={inputStyle}>
                  <option value="">Selecciona...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__new__">+ Nueva categoría</option>
                </select>
                {isNewCategory && (
                  <input type="text" placeholder="Nueva categoría" value={newProduct.category}
                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                    className={inputCls + ' flex-1'} style={inputStyle} />
                )}
              </div>

              {/* Price */}
              <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--moka-500)' }}>Precio</label>
              <input type="text" placeholder="ej. 29,99€" value={newProduct.price}
                onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                className={inputCls} style={inputStyle} />

              {/* Image URL manual */}
              <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--moka-500)' }}>URL imagen (manual)</label>
              <input type="url" placeholder="https://...imagen.jpg" value={newProduct.image}
                onChange={e => setNewProduct({ ...newProduct, image: e.target.value })}
                className={inputCls} style={inputStyle} />

              {/* Advanced toggle */}
              <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-sm font-semibold w-full py-1" style={{ color: 'var(--moka-600)' }}>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Opciones avanzadas
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 gap-3 overflow-hidden">
                    <div className="col-span-2 flex gap-2">
                      <input type="text" placeholder="Emoji" value={newProduct.categoryEmoji}
                        onChange={e => setNewProduct({ ...newProduct, categoryEmoji: e.target.value })}
                        className={inputCls} style={inputStyle} />
                      <input type="color" value={newProduct.categoryColor}
                        onChange={e => setNewProduct({ ...newProduct, categoryColor: e.target.value })}
                        className="w-12 h-10 rounded-lg border-2 cursor-pointer" style={{ borderColor: 'var(--moka-200)' }} />
                    </div>
                    <input type="text" placeholder="Color" value={newProduct.color}
                      onChange={e => setNewProduct({ ...newProduct, color: e.target.value })}
                      className={inputCls} style={inputStyle} />
                    <input type="text" placeholder="Talla" value={newProduct.size}
                      onChange={e => setNewProduct({ ...newProduct, size: e.target.value })}
                      className={inputCls} style={inputStyle} />
                    <input type="text" placeholder="Autor" value={newProduct.author}
                      onChange={e => setNewProduct({ ...newProduct, author: e.target.value })}
                      className={inputCls + ' col-span-2'} style={inputStyle} />
                    <textarea placeholder="Descripción" value={newProduct.description}
                      onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                      className={inputCls + ' col-span-2'} style={inputStyle} rows={2} />
                  </motion.div>
                )}
              </AnimatePresence>

              <button type="submit"
                className="w-full px-6 py-3.5 text-white font-bold rounded-xl hover:shadow-xl transition-all mt-2"
                style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}>
                Guardar Producto
              </button>
            </form>
          )}

          {/* ════════ TAB: LIST ════════ */}
          {tab === 'list' && (
            <div className="py-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--moka-400)' }} />
                <input type="text" placeholder="Buscar producto..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 text-sm focus:outline-none"
                  style={{ borderColor: 'var(--moka-200)', background: 'white', color: 'var(--moka-900)' }} />
              </div>

              {/* Product cards */}
              <div className="space-y-2">
                {filteredProducts.map(product => (
                  <div key={product.id} className="bg-white/90 backdrop-blur-sm border rounded-xl overflow-hidden"
                    style={{ borderColor: editingId === product.id ? 'var(--gold-500)' : 'var(--moka-200)' }}>

                    {/* ── Normal view ── */}
                    {editingId !== product.id ? (
                      <div className="flex items-center gap-3 p-3">
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border flex items-center justify-center"
                          style={{ borderColor: 'var(--moka-200)' }}>
                          {product.image
                            ? <img src={product.image} alt="" className="w-full h-full object-cover" />
                            : <ImageOff className="w-5 h-5" style={{ color: 'var(--moka-400)' }} />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate" style={{ color: 'var(--moka-900)' }}>
                            {product.categoryEmoji && <span className="mr-1">{product.categoryEmoji}</span>}
                            {product.name}
                          </h4>
                          <p className="text-xs truncate" style={{ color: 'var(--moka-500)' }}>{product.category}</p>
                          <span className="text-xs font-semibold mt-0.5 inline-block px-2 py-0.5 rounded-md"
                            style={{ color: 'var(--gold-600)', background: 'var(--moka-100)' }}>
                            {product.price || 'Sin precio'}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {product.url && (
                            <a href={product.url} target="_blank" rel="noopener noreferrer"
                              className="p-2 rounded-lg transition-colors" style={{ color: 'var(--moka-500)' }}>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button onClick={() => startEdit(product)}
                            className="p-2 rounded-lg transition-colors" style={{ color: 'var(--gold-600)' }}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(product.id)}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: confirmDelete === product.id ? '#fff' : '#dc2626', background: confirmDelete === product.id ? '#dc2626' : 'rgba(220,38,38,0.08)' }}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Edit view ── */
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold uppercase" style={{ color: 'var(--gold-600)' }}>Editando</span>
                          <div className="flex gap-1">
                            <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg text-white text-xs font-bold"
                              style={{ background: 'var(--gold-500)' }}>Guardar</button>
                            <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg text-xs font-bold"
                              style={{ color: 'var(--moka-600)', background: 'var(--moka-100)' }}>Cancelar</button>
                          </div>
                        </div>
                        <input type="text" placeholder="Nombre" value={editForm.name || ''}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className={inputCls} style={inputStyle} />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" placeholder="Precio" value={editForm.price || ''}
                            onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                            className={inputCls} style={inputStyle} />
                          <input type="text" placeholder="Categoría" value={editForm.category || ''}
                            onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                            className={inputCls} style={inputStyle} />
                        </div>
                        <input type="url" placeholder="URL" value={editForm.url || ''}
                          onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                          className={inputCls} style={inputStyle} />
                        <input type="url" placeholder="Imagen URL" value={editForm.image || ''}
                          onChange={e => setEditForm({ ...editForm, image: e.target.value })}
                          className={inputCls} style={inputStyle} />
                        <div className="grid grid-cols-3 gap-2">
                          <input type="text" placeholder="Talla" value={editForm.size || ''}
                            onChange={e => setEditForm({ ...editForm, size: e.target.value })}
                            className={inputCls} style={inputStyle} />
                          <input type="text" placeholder="Color" value={editForm.color || ''}
                            onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                            className={inputCls} style={inputStyle} />
                          <input type="text" placeholder="Autor" value={editForm.author || ''}
                            onChange={e => setEditForm({ ...editForm, author: e.target.value })}
                            className={inputCls} style={inputStyle} />
                        </div>
                        <textarea placeholder="Descripción" value={editForm.description || ''}
                          onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                          className={inputCls} style={inputStyle} rows={2} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-sm" style={{ color: 'var(--moka-500)' }}>
                    {searchQuery ? 'Sin resultados' : 'No hay productos'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Toast ─── */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-semibold shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}>
              <Check className="w-4 h-4" />{toast}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
