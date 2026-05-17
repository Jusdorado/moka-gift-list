'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, X, LogOut, Package, Loader2, Sparkles, RefreshCw,
  Search, ChevronDown, ChevronUp, Check, ImageOff, ExternalLink, Pencil, CheckCircle, Settings
} from 'lucide-react';
import { Product } from '../types';

interface CategoryField { name: string; required: boolean; }
interface CategoryDef { id: string; name: string; emoji: string; color: string; fields: CategoryField[]; }

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
  const [tab, setTab] = useState<'list' | 'add' | 'categories'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [scraping, setScraping] = useState(false);
  const [toast, setToast] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [newProduct, setNewProduct] = useState({ ...EMPTY_FORM });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [bulkScraping, setBulkScraping] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [newCategoryMode, setNewCategoryMode] = useState(false);
  const [categoryDefs, setCategoryDefs] = useState<CategoryDef[]>([]);
  const [newCatFields, setNewCatFields] = useState<CategoryField[]>([]);
  const [editingCat, setEditingCat] = useState<CategoryDef | null>(null);
  const [editCatFields, setEditCatFields] = useState<CategoryField[]>([]);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Load category definitions
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => {
      if (d.categories) setCategoryDefs(d.categories);
    }).catch(() => {});
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))].filter(Boolean);
    return cats.sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.price && p.price.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  // Get fields for a category
  const getFieldsForCategory = (catName: string): CategoryField[] => {
    const def = categoryDefs.find(c => c.name === catName);
    return def?.fields || [];
  };

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t); }, [toast]);

  // Scrape
  const doScrape = async (url: string, target: 'new' | 'edit' = 'new') => {
    if (!url || !url.startsWith('http')) return;
    setScraping(true);
    try {
      const res = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (data.error) { setToast('Error: ' + data.error); return; }
      if (target === 'new') {
        setNewProduct(prev => ({ ...prev, image: data.image || prev.image, name: data.name || prev.name, price: data.price || prev.price }));
      } else {
        setEditForm(prev => ({ ...prev, image: data.image || prev.image, name: data.name || prev.name, price: data.price || prev.price }));
      }
      if (data.image || data.name) setToast('Datos extraídos ✨');
    } catch { setToast('Error de red'); } finally { setScraping(false); }
  };

  // Bulk scrape
  const doBulkScrape = async (ids: string[]) => {
    setBulkScraping(true); setBulkProgress({ done: 0, total: ids.length });
    let updated = 0;
    for (const id of ids) {
      const product = products.find(p => p.id === id);
      if (!product?.url) { setBulkProgress(p => ({ ...p, done: p.done + 1 })); continue; }
      try {
        const res = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: product.url }) });
        const data = await res.json();
        if (!data.error) {
          const updates: Partial<Product> = {};
          if (data.image) updates.image = data.image;
          if (data.name) updates.name = data.name;
          if (data.price) updates.price = data.price;
          if (Object.keys(updates).length > 0) { onUpdateProduct(id, updates); updated++; }
        }
      } catch {}
      setBulkProgress(p => ({ ...p, done: p.done + 1 }));
    }
    setBulkScraping(false); setSelectedProducts(new Set()); setSelectMode(false);
    setToast(`${updated} productos actualizados`);
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted?.startsWith('http')) doScrape(pasted, 'new');
  };

  // Save category definition
  const saveCategoryDef = async (cat: CategoryDef) => {
    try {
      await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: cat }) });
      const res = await fetch('/api/categories');
      const d = await res.json();
      if (d.categories) setCategoryDefs(d.categories);
      setToast('Categoría guardada');
    } catch { setToast('Error guardando categoría'); }
  };

  // Add product
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.url) { setToast('Rellena nombre y URL'); return; }
    if (!newProduct.category) { setToast('Selecciona o crea una categoría'); return; }

    // If new category, save it
    if (newCategoryMode && newProduct.category) {
      const catDef: CategoryDef = {
        id: `cat-${Date.now()}`, name: newProduct.category,
        emoji: newProduct.categoryEmoji, color: newProduct.categoryColor, fields: newCatFields,
      };
      saveCategoryDef(catDef);
    }

    onAddProduct(newProduct);
    setNewProduct({ ...EMPTY_FORM });
    setNewCategoryMode(false);
    setNewCatFields([]);
    setTab('list');
    setToast('Producto añadido ✓');
  };

  // Category select handler
  const handleCategorySelect = (val: string) => {
    if (val === '__new__') {
      setNewCategoryMode(true);
      setNewProduct(prev => ({ ...prev, category: '', categoryEmoji: '', categoryColor: '#d946ef' }));
      setNewCatFields([]);
    } else {
      setNewCategoryMode(false);
      const def = categoryDefs.find(c => c.name === val);
      const existing = products.find(p => p.category === val);
      setNewProduct(prev => ({
        ...prev, category: val,
        categoryEmoji: def?.emoji || existing?.categoryEmoji || '',
        categoryColor: def?.color || existing?.categoryColor || '#d946ef',
      }));
    }
  };

  // Edit
  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, price: p.price, category: p.category, image: p.image, url: p.url, description: p.description, author: p.author, color: p.color, size: p.size, categoryEmoji: p.categoryEmoji, categoryColor: p.categoryColor });
  };
  const saveEdit = () => { if (editingId) { onUpdateProduct(editingId, editForm); setEditingId(null); setEditForm({}); setToast('Producto actualizado'); } };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  // Delete
  const handleDelete = (id: string) => {
    if (confirmDelete === id) { onDeleteProduct(id); setConfirmDelete(null); setToast('Producto eliminado'); }
    else { setConfirmDelete(id); setTimeout(() => setConfirmDelete(null), 3000); }
  };

  // Select
  const toggleSelect = (id: string) => { setSelectedProducts(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const selectAll = () => setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
  const selectNone = () => setSelectedProducts(new Set());

  // Field helpers
  const addField = (target: 'new' | 'edit') => {
    if (target === 'new') setNewCatFields([...newCatFields, { name: '', required: false }]);
    else setEditCatFields([...editCatFields, { name: '', required: false }]);
  };
  const removeField = (target: 'new' | 'edit', idx: number) => {
    if (target === 'new') setNewCatFields(newCatFields.filter((_, i) => i !== idx));
    else setEditCatFields(editCatFields.filter((_, i) => i !== idx));
  };
  const updateField = (target: 'new' | 'edit', idx: number, key: 'name' | 'required', value: string | boolean) => {
    if (target === 'new') { const f = [...newCatFields]; f[idx] = { ...f[idx], [key]: value }; setNewCatFields(f); }
    else { const f = [...editCatFields]; f[idx] = { ...f[idx], [key]: value }; setEditCatFields(f); }
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl border-2 text-sm focus:outline-none transition-colors";
  const inputStyle = { borderColor: 'var(--moka-200)', background: 'white', color: 'var(--moka-900)' };

  // Render field inputs for category
  const renderCategoryFields = (catName: string, values: Record<string, string | undefined>, onChange: (key: string, val: string) => void) => {
    const fields = getFieldsForCategory(catName);
    if (fields.length === 0) return null;
    return (
      <div className="grid grid-cols-2 gap-2 mt-2">
        {fields.map((f, i) => (
          <input key={i} type="text" placeholder={`${f.name}${f.required ? ' *' : ''}`}
            value={values[f.name.toLowerCase()] || ''}
            onChange={e => onChange(f.name.toLowerCase(), e.target.value)}
            className={inputCls} style={inputStyle} required={f.required} />
        ))}
      </div>
    );
  };

  // Field editor component
  const renderFieldEditor = (fields: CategoryField[], target: 'new' | 'edit') => (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase" style={{ color: 'var(--moka-500)' }}>Campos de la categoría</span>
        <button type="button" onClick={() => addField(target)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ color: 'var(--gold-600)', background: 'var(--moka-100)' }}>
          + Campo
        </button>
      </div>
      {fields.map((f, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="text" placeholder="Nombre campo" value={f.name}
            onChange={e => updateField(target, i, 'name', e.target.value)}
            className={inputCls + ' flex-1'} style={inputStyle} />
          <label className="flex items-center gap-1 shrink-0 text-xs cursor-pointer" style={{ color: 'var(--moka-600)' }}>
            <input type="checkbox" checked={f.required}
              onChange={e => updateField(target, i, 'required', e.target.checked)}
              className="w-4 h-4 rounded" />
            Oblig.
          </label>
          <button type="button" onClick={() => removeField(target, i)} className="p-1 rounded" style={{ color: '#dc2626' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {fields.length === 0 && <p className="text-xs" style={{ color: 'var(--moka-400)' }}>Sin campos especiales (solo nombre, URL, precio, imagen)</p>}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full md:max-w-[520px] shadow-2xl overflow-hidden flex flex-col" style={{ background: 'var(--moka-50)' }}>

        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b shrink-0" style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}>
          <div className="flex items-center gap-2"><Package className="w-5 h-5 text-white" /><h2 className="text-lg font-bold text-white">Admin</h2></div>
          <div className="flex items-center gap-2">
            <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.2)' }}><LogOut className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-2 rounded-lg text-white" style={{ background: 'rgba(255,255,255,0.2)' }}><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0" style={{ borderColor: 'var(--moka-200)' }}>
          {(['list', 'add', 'categories'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-3 text-xs font-bold text-center transition-colors"
              style={{ color: tab === t ? 'var(--gold-600)' : 'var(--moka-500)', borderBottom: tab === t ? '3px solid var(--gold-500)' : '3px solid transparent' }}>
              {t === 'list' ? `Productos (${products.length})` : t === 'add' ? '+ Añadir' : '⚙ Categorías'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24">

          {/* ═══ TAB ADD ═══ */}
          {tab === 'add' && (
            <form onSubmit={handleSubmit} className="py-4 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--moka-500)' }}>URL *</label>
              <div className="flex gap-2">
                <input ref={urlInputRef} type="url" placeholder="https://..." value={newProduct.url}
                  onChange={e => setNewProduct({ ...newProduct, url: e.target.value })}
                  onPaste={handleUrlPaste} onBlur={() => doScrape(newProduct.url, 'new')}
                  className={inputCls + ' flex-1'} style={inputStyle} required />
                <button type="button" onClick={() => doScrape(newProduct.url, 'new')} disabled={scraping || !newProduct.url}
                  className="px-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}>
                  {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </button>
              </div>

              {newProduct.image && (
                <div className="flex items-center gap-3 p-2 rounded-xl" style={{ background: 'var(--moka-100)' }}>
                  <img src={newProduct.image} alt="" className="w-14 h-14 object-cover rounded-lg" />
                  <span className="text-xs flex-1 truncate" style={{ color: 'var(--moka-600)' }}>Imagen detectada</span>
                  <button type="button" onClick={() => setNewProduct({ ...newProduct, image: '' })} className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: '#dc2626' }}>Quitar</button>
                </div>
              )}

              <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--moka-500)' }}>Nombre *</label>
              <input type="text" placeholder="Nombre del producto" value={newProduct.name}
                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className={inputCls} style={inputStyle} required />

              <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--moka-500)' }}>Categoría *</label>
              <select value={newCategoryMode ? '__new__' : newProduct.category} onChange={e => handleCategorySelect(e.target.value)} className={inputCls} style={inputStyle}>
                <option value="">Selecciona...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__new__">+ Nueva categoría</option>
              </select>

              {/* New category creation */}
              {newCategoryMode && (
                <div className="space-y-2 p-3 rounded-xl" style={{ background: 'var(--moka-100)' }}>
                  <input type="text" placeholder="Nombre categoría *" value={newProduct.category}
                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} className={inputCls} style={inputStyle} required />
                  <div className="flex gap-2">
                    <input type="text" placeholder="Emoji (ej: 💎)" value={newProduct.categoryEmoji}
                      onChange={e => setNewProduct({ ...newProduct, categoryEmoji: e.target.value })} className={inputCls + ' flex-1'} style={inputStyle} />
                    <input type="color" value={newProduct.categoryColor} onChange={e => setNewProduct({ ...newProduct, categoryColor: e.target.value })}
                      className="w-12 h-10 rounded-lg border-2 cursor-pointer" style={{ borderColor: 'var(--moka-200)' }} />
                  </div>
                  {renderFieldEditor(newCatFields, 'new')}
                </div>
              )}

              {/* Category-specific fields */}
              {!newCategoryMode && newProduct.category && (
                renderCategoryFields(newProduct.category, { color: newProduct.color, talla: newProduct.size, size: newProduct.size, autor: newProduct.author, author: newProduct.author },
                  (key, val) => {
                    if (key === 'talla' || key === 'size') setNewProduct({ ...newProduct, size: val });
                    else if (key === 'autor' || key === 'author') setNewProduct({ ...newProduct, author: val });
                    else if (key === 'color') setNewProduct({ ...newProduct, color: val });
                    else if (key === 'descripción' || key === 'description') setNewProduct({ ...newProduct, description: val });
                  }
                )
              )}

              <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--moka-500)' }}>Precio</label>
              <input type="text" placeholder="ej. 29,99€" value={newProduct.price}
                onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} className={inputCls} style={inputStyle} />

              <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--moka-500)' }}>Imagen (manual)</label>
              <input type="url" placeholder="https://...imagen.jpg" value={newProduct.image}
                onChange={e => setNewProduct({ ...newProduct, image: e.target.value })} className={inputCls} style={inputStyle} />

              <button type="button" onClick={() => {
                const adv = document.getElementById('adv-fields');
                if (adv) adv.classList.toggle('hidden');
              }} className="flex items-center gap-1.5 text-sm font-semibold w-full py-1" style={{ color: 'var(--moka-600)' }}>
                <ChevronDown className="w-4 h-4" /> Más campos
              </button>
              <div id="adv-fields" className="hidden grid grid-cols-2 gap-3">
                <input type="text" placeholder="Color" value={newProduct.color} onChange={e => setNewProduct({ ...newProduct, color: e.target.value })} className={inputCls} style={inputStyle} />
                <input type="text" placeholder="Talla" value={newProduct.size} onChange={e => setNewProduct({ ...newProduct, size: e.target.value })} className={inputCls} style={inputStyle} />
                <input type="text" placeholder="Autor" value={newProduct.author} onChange={e => setNewProduct({ ...newProduct, author: e.target.value })} className={inputCls + ' col-span-2'} style={inputStyle} />
                <textarea placeholder="Descripción" value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} className={inputCls + ' col-span-2'} style={inputStyle} rows={2} />
              </div>

              <button type="submit" className="w-full px-6 py-3.5 text-white font-bold rounded-xl hover:shadow-xl transition-all mt-2"
                style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}>Guardar Producto</button>
            </form>
          )}

          {/* ═══ TAB CATEGORIES ═══ */}
          {tab === 'categories' && (
            <div className="py-4 space-y-3">
              <h3 className="text-sm font-bold" style={{ color: 'var(--moka-700)' }}>Categorías definidas</h3>
              {categoryDefs.map(cat => (
                <div key={cat.id} className="p-3 rounded-xl border" style={{ borderColor: editingCat?.id === cat.id ? 'var(--gold-500)' : 'var(--moka-200)', background: 'white' }}>
                  {editingCat?.id !== cat.id ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm" style={{ color: 'var(--moka-900)' }}>{cat.emoji} {cat.name}</span>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {cat.fields.map((f, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: f.required ? 'var(--gold-100)' : 'var(--moka-100)', color: f.required ? 'var(--gold-700)' : 'var(--moka-600)' }}>
                              {f.name}{f.required ? ' *' : ''}
                            </span>
                          ))}
                          {cat.fields.length === 0 && <span className="text-xs" style={{ color: 'var(--moka-400)' }}>Sin campos especiales</span>}
                        </div>
                      </div>
                      <button onClick={() => { setEditingCat(cat); setEditCatFields([...cat.fields]); }}
                        className="p-2 rounded-lg" style={{ color: 'var(--gold-600)' }}><Pencil className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input type="text" value={editingCat.emoji} onChange={e => setEditingCat({ ...editingCat, emoji: e.target.value })}
                          placeholder="Emoji" className={inputCls + ' w-16'} style={inputStyle} />
                        <input type="text" value={editingCat.name} onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                          placeholder="Nombre" className={inputCls + ' flex-1'} style={inputStyle} />
                        <input type="color" value={editingCat.color} onChange={e => setEditingCat({ ...editingCat, color: e.target.value })}
                          className="w-10 h-10 rounded-lg border-2 cursor-pointer" style={{ borderColor: 'var(--moka-200)' }} />
                      </div>
                      {renderFieldEditor(editCatFields, 'edit')}
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => { saveCategoryDef({ ...editingCat, fields: editCatFields }); setEditingCat(null); }}
                          className="px-3 py-1.5 rounded-lg text-white text-xs font-bold" style={{ background: '#16a34a' }}>Guardar</button>
                        <button onClick={() => setEditingCat(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ color: 'var(--moka-600)', background: 'var(--moka-100)' }}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {categoryDefs.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'var(--moka-400)' }}>No hay categorías definidas aún. Se crean al añadir productos con categoría nueva.</p>}
            </div>
          )}

          {/* ═══ TAB LIST ═══ */}
          {tab === 'list' && (
            <div className="py-4">
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--moka-400)' }} />
                  <input type="text" placeholder="Buscar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 text-sm focus:outline-none" style={{ borderColor: 'var(--moka-200)', background: 'white', color: 'var(--moka-900)' }} />
                </div>
                <button onClick={() => { setSelectMode(!selectMode); if (selectMode) selectNone(); }}
                  className="px-3 py-2 rounded-xl text-xs font-bold shrink-0"
                  style={{ background: selectMode ? 'var(--gold-500)' : 'var(--moka-100)', color: selectMode ? 'white' : 'var(--moka-600)' }}>
                  {selectMode ? 'Cancelar' : 'Seleccionar'}
                </button>
              </div>

              {selectMode && (
                <div className="flex items-center gap-2 mb-3 p-2 rounded-xl" style={{ background: 'var(--moka-100)' }}>
                  <button onClick={selectAll} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ color: 'var(--gold-600)' }}>Todos</button>
                  <button onClick={selectNone} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ color: 'var(--moka-500)' }}>Ninguno</button>
                  <span className="text-xs flex-1" style={{ color: 'var(--moka-500)' }}>{selectedProducts.size} sel.</span>
                  {selectedProducts.size > 0 && (
                    <button onClick={() => doBulkScrape(Array.from(selectedProducts))} disabled={bulkScraping}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}>
                      {bulkScraping ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Re-scrape
                    </button>
                  )}
                </div>
              )}

              {bulkScraping && (
                <div className="mb-3 p-2 rounded-xl" style={{ background: 'var(--moka-100)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold" style={{ color: 'var(--gold-600)' }}>Actualizando...</span>
                    <span className="text-xs" style={{ color: 'var(--moka-500)' }}>{bulkProgress.done}/{bulkProgress.total}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--moka-200)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%`, background: 'var(--gold-500)' }} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {filteredProducts.map(product => (
                  <div key={product.id} className="bg-white/90 border rounded-xl overflow-hidden"
                    style={{ borderColor: editingId === product.id ? 'var(--gold-500)' : selectedProducts.has(product.id) ? 'var(--gold-400)' : 'var(--moka-200)' }}>
                    {editingId !== product.id ? (
                      <div className="flex items-center gap-3 p-3">
                        {selectMode && (
                          <button onClick={() => toggleSelect(product.id)} className="shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center"
                            style={{ borderColor: selectedProducts.has(product.id) ? 'var(--gold-500)' : 'var(--moka-300)', background: selectedProducts.has(product.id) ? 'var(--gold-500)' : 'transparent' }}>
                            {selectedProducts.has(product.id) && <Check className="w-3 h-3 text-white" />}
                          </button>
                        )}
                        <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border flex items-center justify-center" style={{ borderColor: 'var(--moka-200)' }}>
                          {product.image ? <img src={product.image} alt="" className="w-full h-full object-cover" /> : <ImageOff className="w-4 h-4" style={{ color: 'var(--moka-400)' }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate" style={{ color: 'var(--moka-900)' }}>{product.categoryEmoji && <span className="mr-1">{product.categoryEmoji}</span>}{product.name}</h4>
                          <p className="text-xs truncate" style={{ color: 'var(--moka-500)' }}>{product.category}</p>
                          <span className="text-xs font-semibold" style={{ color: 'var(--gold-600)' }}>{product.price || '—'}</span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {product.url && <a href={product.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg" style={{ color: 'var(--moka-400)' }}><ExternalLink className="w-3.5 h-3.5" /></a>}
                          <button onClick={() => startEdit(product)} className="p-2 rounded-lg" style={{ color: 'var(--gold-600)' }}><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(product.id)} className="p-2 rounded-lg" style={{ color: confirmDelete === product.id ? '#fff' : '#dc2626', background: confirmDelete === product.id ? '#dc2626' : 'transparent' }}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold uppercase" style={{ color: 'var(--gold-600)' }}>Editando</span>
                          <div className="flex gap-1">
                            <button onClick={() => doScrape(editForm.url || '', 'edit')} disabled={scraping || !editForm.url}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                              style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}>
                              {scraping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Scrape
                            </button>
                            <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg text-white text-xs font-bold" style={{ background: '#16a34a' }}>Guardar</button>
                            <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ color: 'var(--moka-600)', background: 'var(--moka-100)' }}>✕</button>
                          </div>
                        </div>
                        {editForm.image && <div className="flex items-center gap-2"><img src={editForm.image} alt="" className="w-12 h-12 object-cover rounded-lg" /><button type="button" onClick={() => setEditForm({ ...editForm, image: '' })} className="text-xs px-2 py-1 rounded-lg" style={{ color: '#dc2626' }}>Quitar</button></div>}
                        <input type="text" placeholder="Nombre" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} style={inputStyle} />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" placeholder="Precio" value={editForm.price || ''} onChange={e => setEditForm({ ...editForm, price: e.target.value })} className={inputCls} style={inputStyle} />
                          <input type="text" placeholder="Categoría" value={editForm.category || ''} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className={inputCls} style={inputStyle} />
                        </div>
                        <input type="url" placeholder="URL" value={editForm.url || ''} onChange={e => setEditForm({ ...editForm, url: e.target.value })} className={inputCls} style={inputStyle} />
                        <input type="url" placeholder="Imagen" value={editForm.image || ''} onChange={e => setEditForm({ ...editForm, image: e.target.value })} className={inputCls} style={inputStyle} />
                        <div className="grid grid-cols-3 gap-2">
                          <input type="text" placeholder="Talla" value={editForm.size || ''} onChange={e => setEditForm({ ...editForm, size: e.target.value })} className={inputCls} style={inputStyle} />
                          <input type="text" placeholder="Color" value={editForm.color || ''} onChange={e => setEditForm({ ...editForm, color: e.target.value })} className={inputCls} style={inputStyle} />
                          <input type="text" placeholder="Autor" value={editForm.author || ''} onChange={e => setEditForm({ ...editForm, author: e.target.value })} className={inputCls} style={inputStyle} />
                        </div>
                        <textarea placeholder="Descripción" value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className={inputCls} style={inputStyle} rows={2} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {filteredProducts.length === 0 && <div className="text-center py-10"><p className="text-sm" style={{ color: 'var(--moka-500)' }}>{searchQuery ? 'Sin resultados' : 'No hay productos'}</p></div>}
            </div>
          )}
        </div>

        {/* Toast */}
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
