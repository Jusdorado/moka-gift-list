'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Settings, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import Hero from '../components/Hero';
import SearchBar from '../components/SearchBar';
import FilterBar, { SortOption, FilterStatus } from '../components/FilterBar';
import ProductGrid from '../components/ProductGrid';
import LoginModal from '../components/LoginModal';
import AdminPanel from '../components/AdminPanel';
import { Product } from '../types';


const parsePrice = (price?: string): number => {
  if (!price) return 0;
  // Remove currency symbols and convert comma to dot
  const cleaned = price.replace(/[€$]/g, '').replace(/\./g, '').replace(',', '.').trim();
  return parseFloat(cleaned) || 0;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [purchasedState, setPurchasedState] = useState<{ [key: string]: boolean }>({});
  const [authenticated, setAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [prefillProductId, setPrefillProductId] = useState<string | null>(null);
  const productsRef = useRef<HTMLElement>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))];
    return cats.sort();
  }, [products]);

  // Read prefill product from URL for shareable links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('product');
    if (pid) {
      setPrefillProductId(pid);
    }
  }, []);

  // Load products from database on mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch('/api/products', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.products && Array.isArray(data.products)) {
            setProducts(data.products);
          }
        }
      } catch (error) {
        console.error('Error loading products:', error);
      }
    };
    loadProducts();
  }, []);

  // Clear purchased state on page load - always start fresh
  useEffect(() => {
    localStorage.removeItem('moka-purchased');
    setPurchasedState({});
  }, []);

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = products.filter(product => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category filter
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;

      // Status filter
      const isPurchased = purchasedState[product.id] || false;
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'purchased' && isPurchased) ||
        (filterStatus === 'pending' && !isPurchased);

      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sort
    if (sortBy !== 'default') {
      result = [...result].sort((a, b) => {
        switch (sortBy) {
          case 'price-asc':
            return parsePrice(a.price) - parsePrice(b.price);
          case 'price-desc':
            return parsePrice(b.price) - parsePrice(a.price);
          case 'name-asc':
            return a.name.localeCompare(b.name, 'es');
          case 'name-desc':
            return b.name.localeCompare(a.name, 'es');
          default:
            return 0;
        }
      });
    }

    return result;
  }, [products, searchQuery, selectedCategory, filterStatus, sortBy, purchasedState]);

  const purchasedCount = Object.values(purchasedState).filter(Boolean).length;

  const handleTogglePurchased = (productId: string) => {
    setPurchasedState(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const handleLogin = (username: string, password: string) => {
    const adminUser = process.env.NEXT_PUBLIC_ADMIN_USER || 'admin';
    const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASS || 'admin';
    if (username === adminUser && password === adminPass) {
      setAuthenticated(true);
      setShowLoginModal(false);
      setShowAdminPanel(true);
    } else {
      alert('Credenciales incorrectas');
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setShowAdminPanel(false);
  };

  const handleAddProduct = async (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}`
    };
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    await saveProducts(updatedProducts);
  };

  const handleDeleteProduct = async (id: string) => {
    const updatedProducts = products.filter(p => p.id !== id);
    setProducts(updatedProducts);
    await saveProducts(updatedProducts);
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    const updatedProducts = products.map(p => p.id === id ? { ...p, ...updates } : p);
    setProducts(updatedProducts);
    await saveProducts(updatedProducts);
  };

  const handleResetProducts = async () => {
    // Reload products from database
    try {
      const response = await fetch('/api/products', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      }
    } catch (error) {
      console.error('Error reloading products:', error);
    }
  };

  const saveProducts = async (productsToSave: Product[]) => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ products: productsToSave }),
      });

      if (!response.ok) {
        throw new Error('Failed to save products');
      }


      return true;
    } catch (error) {
      console.error('Error saving products:', error);
      alert('Error al guardar los cambios');
      return false;
    }
  };

  const loadImage = (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timeout = setTimeout(() => {
        resolve(null);
      }, 5000);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };

      img.src = url;
    });
  };

  const generatePDF = async () => {
    setGeneratingPDF(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Receipt Header
      pdf.setFontSize(28);
      pdf.setTextColor(101, 67, 33);
      pdf.text('MOKA GIFT LIST', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      // Decorative line
      pdf.setDrawColor(201, 166, 107);
      pdf.setLineWidth(0.5);
      pdf.line(margin + 40, yPosition, pageWidth - margin - 40, yPosition);
      yPosition += 8;

      // Date and time
      const now = new Date();
      pdf.setFontSize(9);
      pdf.setTextColor(120, 113, 108);
      pdf.text(`Fecha: ${now.toLocaleDateString('es-ES')}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
      pdf.text(`Hora: ${now.toLocaleTimeString('es-ES')}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Summary box
      pdf.setDrawColor(212, 196, 168);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;

      pdf.setFontSize(10);
      pdf.setTextColor(51, 40, 28);
      pdf.text(`Total de productos:`, margin, yPosition);
      pdf.text(`${products.length}`, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 6;

      pdf.text(`Productos comprados:`, margin, yPosition);
      pdf.setTextColor(112, 141, 129);
      pdf.text(`${purchasedCount}`, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 6;

      pdf.setTextColor(51, 40, 28);
      pdf.text(`Pendientes:`, margin, yPosition);
      pdf.setTextColor(201, 166, 107);
      pdf.text(`${products.length - purchasedCount}`, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 6;

      pdf.setDrawColor(212, 196, 168);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 12;

      // Products section header
      pdf.setFontSize(12);
      pdf.setTextColor(101, 67, 33);
      pdf.text('PRODUCTOS COMPRADOS', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      // Filter only purchased products
      const purchasedProducts = products.filter(p => purchasedState[p.id]);

      if (purchasedProducts.length === 0) {
        pdf.setFontSize(10);
        pdf.setTextColor(120, 113, 108);
        pdf.text('No hay productos marcados como comprados', pageWidth / 2, yPosition + 10, { align: 'center' });
      }

      let productNumber = 1;
      for (const product of purchasedProducts) {
        // New page if needed
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
          pdf.setFontSize(12);
          pdf.setTextColor(101, 67, 33);
          pdf.text('PRODUCTOS (continuacion)', pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 10;
        }

        // Separator
        pdf.setDrawColor(230, 230, 230);
        pdf.setLineWidth(0.2);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;

        // Image if exists
        if (product.image) {
          try {
            const imgData = await loadImage(`/api/image-proxy?url=${encodeURIComponent(product.image)}`);
            if (imgData) {
              pdf.addImage(imgData, 'JPEG', margin + 5, yPosition, 25, 25, undefined, 'FAST');
            }
          } catch { }
        }

        // Name
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(51, 40, 28);
        const safeName = (product.name || '').normalize('NFKD');
        const nameLines = pdf.splitTextToSize(safeName, contentWidth - 40);
        pdf.text(nameLines[0], margin + 35, yPosition + 6);
        if (nameLines.length > 1) {
          pdf.setFontSize(9);
          pdf.text(nameLines[1], margin + 35, yPosition + 12);
        }

        // Category
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(120, 113, 108);
        const safeCategory = (product.category || '').normalize('NFKD');
        pdf.text(`${product.categoryEmoji || ''} ${safeCategory.toUpperCase()}`, margin + 35, yPosition + 18);

        // Price
        if (product.price) {
          pdf.setFontSize(12);
          pdf.setTextColor(201, 166, 107);
          pdf.text(product.price, pageWidth - margin, yPosition + 6, { align: 'right' });
        }

        // Author
        if (product.author) {
          pdf.setFontSize(8);
          pdf.setTextColor(112, 141, 129);
          pdf.text(`Autor: ${product.author}`, margin + 35, yPosition + 24);
        }
        // Color
        if (product.color) {
          pdf.setFontSize(8);
          pdf.setTextColor(112, 141, 129);
          pdf.text(`Color: ${product.color}`, margin + 35, yPosition + 29);
        }
        // Size
        if (product.size) {
          pdf.setFontSize(8);
          pdf.setTextColor(112, 141, 129);
          pdf.text(`Talla: ${product.size}`, margin + 35, yPosition + 34);
        }
        // Description
        if (product.description) {
          pdf.setFontSize(8);
          pdf.setTextColor(120, 113, 108);
          const descLines = pdf.splitTextToSize(product.description, contentWidth - 40);
          pdf.text(descLines.slice(0, 2), margin + 35, yPosition + 40);
        }
        // Link
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 102, 204);
        pdf.textWithLink('Ver producto online', margin + 35, yPosition + 50, { url: product.url });

        yPosition += 55;
        productNumber++;
      }

      // Footer separator
      yPosition = pageHeight - 25;
      pdf.setDrawColor(212, 196, 168);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;

      // Footer text
      pdf.setFontSize(8);
      pdf.setTextColor(120, 113, 108);
      pdf.text('Gracias por usar Moka Wish List', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Este documento fue generado automaticamente', pageWidth / 2, yPosition, { align: 'center' });

      pdf.save('moka-wish-list.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Por favor, intentalo de nuevo.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Action Buttons */}
      <div className="fixed top-6 right-6 z-40 flex gap-3">
        {/* PDF Button */}
        <button
          onClick={generatePDF}
          disabled={generatingPDF}
          className="p-3 bg-white/80 backdrop-blur-sm border-2 rounded-full hover:border-[var(--gold-500)] hover:shadow-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--moka-200)' }}
          title={generatingPDF ? "Generando PDF..." : "Descargar PDF"}
        >
          <FileDown className={`w-5 h-5 group-hover:scale-110 transition-transform ${generatingPDF ? 'animate-bounce' : ''}`} style={{ color: 'var(--gold-600)' }} />
        </button>

        {/* Admin Button */}
        <button
          onClick={() => setShowLoginModal(true)}
          className="p-3 bg-white/80 backdrop-blur-sm border-2 rounded-full hover:border-[var(--gold-500)] hover:shadow-lg transition-all"
          style={{ borderColor: 'var(--moka-200)' }}
          title="Administracion"
        >
          <Settings className="w-5 h-5" style={{ color: 'var(--moka-700)' }} />
        </button>
      </div>

      {/* Hero */}
      <Hero
        onExploreClick={scrollToProducts}
        productCount={products.length}
      />

      {/* Products Section */}
      <section ref={productsRef} className="max-w-6xl mx-auto px-4 py-20">
        {/* Search */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Filters */}
        <FilterBar
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          totalProducts={products.length}
          filteredCount={filteredProducts.length}
        />

        {/* Stats */}
        <div className="flex items-center justify-between mb-12 pb-6 border-b" style={{ borderColor: 'var(--moka-200)' }}>
          <div>
            <p className="text-sm" style={{ color: 'var(--moka-600)' }}>Total</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--moka-900)' }}>{filteredProducts.length} productos</p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--moka-600)' }}>Comprados</p>
            <p className="text-2xl font-bold gradient-text">{purchasedCount}</p>
          </div>
        </div>

        {/* Products Grid */}
        <ProductGrid
          products={filteredProducts}
          purchasedState={purchasedState}
          onTogglePurchased={handleTogglePurchased}
          prefillProductId={prefillProductId}
        />

        {/* No results */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-600 mb-4">No se encontraron productos</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-primary-600 hover:underline"
            >
              Limpiar busqueda
            </button>
          </div>
        )}
      </section>

      {/* Modals */}
      {showLoginModal && (
        <LoginModal
          onLogin={handleLogin}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {showAdminPanel && authenticated && (
        <AdminPanel
          products={products}
          onAddProduct={handleAddProduct}
          onDeleteProduct={handleDeleteProduct}
          onUpdateProduct={handleUpdateProduct}
          onSaveProducts={saveProducts}
          onResetProducts={handleResetProducts}
          onLogout={handleLogout}
          onClose={() => setShowAdminPanel(false)}
        />
      )}
    </div>
  );
}
