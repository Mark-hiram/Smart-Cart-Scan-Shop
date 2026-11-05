import React, { useState, useEffect } from 'react';
import { Search, X, ShoppingBag, Plus, Tag, Check, Filter } from 'lucide-react';
import { api } from '../api.ts';
import { Product, Supermarket } from '../types.ts';

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  supermarket: Supermarket;
  onAddToCart: (barcode: string, quantity: number) => void;
}

export const ProductSearchModal: React.FC<ProductSearchModalProps> = ({
  isOpen,
  onClose,
  supermarket,
  onAddToCart,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedItemBarcode, setAddedItemBarcode] = useState<string | null>(null);

  const categories = [
    'all',
    'Bakery',
    'Dairy',
    'Food & Groceries',
    'Beverages',
    'Personal Care',
    'Cleaning Products',
    'Fresh Produce',
    'Household & Electronics',
  ];

  useEffect(() => {
    if (!isOpen) return;
    loadProducts();
  }, [isOpen, query, selectedCategory, supermarket.id]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.searchProducts(
        supermarket.id,
        query,
        selectedCategory === 'all' ? '' : selectedCategory
      );
      if (res.success) {
        setProducts(res.products);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (product: Product) => {
    onAddToCart(product.barcode, 1);
    setAddedItemBarcode(product.barcode);
    setTimeout(() => {
      setAddedItemBarcode(null);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header with Appealing Supermarket Background */}
        <div className="relative overflow-hidden text-white p-4 flex items-center justify-between border-b border-emerald-800 bg-emerald-950">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img
              src="/store_admin_hero.jpg"
              alt="Supermarket grocery shelves"
              className="w-full h-full object-cover object-center filter brightness-[0.6] contrast-[1.1] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/90 to-emerald-950/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/30 to-transparent" />
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold">
              <Search className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">Search Store Products</h2>
              <p className="text-[10px] text-emerald-200">
                Exclusive to <strong className="text-amber-300">{supermarket.name}</strong> catalog
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-10 w-7 h-7 rounded-full bg-emerald-950/60 text-emerald-200 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search input & category filter */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name, barcode, brand, or category..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Categories Pill Slider */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition font-medium shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-emerald-800 text-white shadow-2xs font-bold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat === 'all' ? 'All Products' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto flex-1 space-y-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading catalog...</div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No products found matching your search in {supermarket.name}.
            </div>
          ) : (
            products.map((p) => {
              const effectivePrice =
                p.discount_price && p.discount_price > 0 && p.discount_price < p.selling_price
                  ? p.discount_price
                  : p.selling_price;
              const isAdded = addedItemBarcode === p.barcode;

              return (
                <div
                  key={p.id}
                  className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 transition shadow-2xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-xs text-slate-900 leading-snug">
                        {p.product_name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">({p.unit})</span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Brand: {p.brand}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px]">{p.barcode}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-xs font-mono font-black text-emerald-800">
                        KSh {effectivePrice.toLocaleString()}
                      </span>
                      {p.discount_price && p.discount_price > 0 && p.discount_price < p.selling_price && (
                        <span className="text-[10px] font-mono text-slate-400 line-through">
                          KSh {p.selling_price}
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                          p.stock_quantity > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {p.stock_quantity > 0 ? `In Stock (${p.stock_quantity})` : 'Out of Stock'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAdd(p)}
                    disabled={p.stock_quantity <= 0}
                    className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95 ${
                      isAdded
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-800 hover:bg-emerald-900 text-white disabled:opacity-40'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>{products.length} products available</span>
          <button onClick={onClose} className="font-bold text-slate-700 hover:underline">
            Close Search
          </button>
        </div>
      </div>
    </div>
  );
};
