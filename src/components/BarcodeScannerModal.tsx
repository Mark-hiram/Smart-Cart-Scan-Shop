import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Keyboard,
  X,
  AlertCircle,
  CheckCircle2,
  Plus,
  Minus,
  Sparkles,
  ShoppingBag,
  RotateCw,
  Search,
  Volume2,
  Store,
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { api } from '../api.ts';
import { Supermarket, Product } from '../types.ts';
import { playScanBeep } from '../utils/audio.ts';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  supermarket: Supermarket;
  sessionId: string;
  onItemAdded: (barcode: string, quantity: number) => void;
  onOpenSearch: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  supermarket,
  sessionId,
  onItemAdded,
  onOpenSearch,
}) => {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedProduct, setDetectedProduct] = useState<any | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const [storeProducts, setStoreProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (isOpen && supermarket?.id) {
      api.getAdminProducts(supermarket.id)
        .then((res) => {
          if (res.success && res.products) {
            setStoreProducts(res.products);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, supermarket?.id]);

  // Stop camera helper
  const stopCamera = () => {
    if (codeReaderRef.current) {
      try {
        // ZXing browser controls
      } catch (e) {
        // ignore
      }
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  // Start camera scanning
  useEffect(() => {
    if (!isOpen || mode !== 'camera') {
      stopCamera();
      return;
    }

    let isCancelled = false;

    const startScanner = async () => {
      setCameraError(null);
      setIsScanning(true);

      try {
        // Check if browser has getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access not supported on this browser. Use manual barcode entry.');
        }

        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        if (videoRef.current) {
          await codeReader.decodeFromVideoDevice(
            undefined, // default camera (prefers environment back camera on mobile)
            videoRef.current,
            (result, error) => {
              if (isCancelled) return;
              if (result) {
                const text = result.getText();
                handleBarcodeDetected(text);
              }
            }
          );
        }
      } catch (err: any) {
        console.warn('Camera initialization error:', err);
        setCameraError(err.message || 'Unable to access camera. Please allow camera permissions.');
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      isCancelled = true;
      stopCamera();
    };
  }, [isOpen, mode]);

  // Handle barcode lookup
  const handleBarcodeDetected = async (barcodeText: string) => {
    if (lookupLoading) return;
    const cleanBarcode = barcodeText.trim();
    if (!cleanBarcode) return;

    setLookupLoading(true);
    setNotFoundBarcode(null);
    setDetectedProduct(null);
    setAddSuccessMessage(null);
    setQuantity(1);

    try {
      const res = await api.lookupBarcode(supermarket.id, cleanBarcode);
      if (res.success && res.product) {
        playScanBeep(true);
        setDetectedProduct(res.product);
      } else {
        playScanBeep(false);
        setNotFoundBarcode(cleanBarcode);
      }
    } catch (err: any) {
      playScanBeep(false);
      setNotFoundBarcode(cleanBarcode);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    handleBarcodeDetected(manualBarcode.trim());
  };

  const handleAddToCart = async () => {
    if (!detectedProduct) return;
    setAddingToCart(true);
    try {
      await onItemAdded(detectedProduct.barcode, quantity);
      setAddSuccessMessage(`Added ${quantity} × ${detectedProduct.name} to your SmartCart!`);
      // Keep card open briefly or allow scanning next
      setTimeout(() => {
        setDetectedProduct(null);
        setAddSuccessMessage(null);
      }, 1400);
    } catch (err: any) {
      alert(err.message || 'Failed to add item to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-800/20 overflow-hidden">
        {/* Header with Appealing Supermarket Background */}
        <div className="relative overflow-hidden text-white p-4 flex items-center justify-between border-b border-emerald-800 bg-emerald-950">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img
              src="/supermarket_hero.jpg"
              alt="Supermarket grocery store"
              className="w-full h-full object-cover object-center filter brightness-[0.6] contrast-[1.1] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/90 to-emerald-950/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/30 to-transparent" />
          </div>

          <div className="relative z-10 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-md">
              <Camera className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Barcode Scanner</h2>
              <p className="text-[11px] text-emerald-200">
                Searching: <strong className="text-amber-300">{supermarket.name}</strong> database
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="relative z-10 w-8 h-8 rounded-full bg-emerald-950/60 hover:bg-emerald-950 text-emerald-200 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher: Camera vs Manual Entry */}
        <div className="flex bg-slate-100 p-1.5 border-b border-slate-200 text-xs font-semibold">
          <button
            onClick={() => {
              setMode('camera');
              setNotFoundBarcode(null);
            }}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              mode === 'camera'
                ? 'bg-emerald-800 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Camera Viewfinder
          </button>
          <button
            onClick={() => {
              stopCamera();
              setMode('manual');
              setNotFoundBarcode(null);
            }}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              mode === 'manual'
                ? 'bg-emerald-800 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            Enter Barcode Manually
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* CAMERA MODE */}
          {mode === 'camera' && (
            <div className="space-y-3">
              <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                {/* Real Video Element */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />

                {/* Barcode Frame Overlay with Laser Line */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  <div className="w-64 h-36 border-2 border-emerald-400 rounded-2xl relative shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-emerald-500/5">
                    {/* Corner Reticles */}
                    <span className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-amber-400" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-amber-400" />
                    <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-amber-400" />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-amber-400" />

                    {/* Animated Red Laser Guide */}
                    <div className="absolute left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse top-1/2 -translate-y-1/2" />
                  </div>

                  <p className="text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full font-medium mt-3 backdrop-blur-xs flex items-center gap-1.5">
                    <Volume2 className="w-3 h-3 text-amber-300" />
                    Align barcode inside the frame
                  </p>
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/90 text-white p-6 flex flex-col items-center justify-center text-center">
                    <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                    <p className="text-sm font-bold text-amber-300 mb-1">Camera Feed Inactive</p>
                    <p className="text-xs text-slate-300 max-w-xs mb-3">{cameraError}</p>
                    <button
                      onClick={() => setMode('manual')}
                      className="text-xs bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl hover:bg-amber-300 transition"
                    >
                      Use Manual Barcode Entry
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MANUAL ENTRY MODE */}
          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Type Product Barcode (EAN-13, EAN-8, UPC)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 6161234567890"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={lookupLoading || !manualBarcode.trim()}
                    className="bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition"
                  >
                    {lookupLoading ? 'Checking...' : 'Lookup'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Store Shelf Catalog Shortcuts */}
          {storeProducts.length > 0 ? (
            <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/70">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-emerald-700" />
                  Shelf Items in {supermarket.name}:
                </span>
                <span className="text-[10px] text-emerald-800 font-mono font-bold">Tap to Scan</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                {storeProducts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleBarcodeDetected(item.barcode)}
                    className="text-left p-2 rounded-xl bg-white hover:bg-emerald-100/70 border border-emerald-200 text-xs transition flex flex-col group shadow-2xs"
                  >
                    <span className="font-semibold text-slate-900 truncate group-hover:text-emerald-900">
                      {item.product_name}
                    </span>
                    <div className="flex items-center justify-between mt-0.5 text-[10px]">
                      <span className="font-mono text-slate-500">{item.barcode}</span>
                      <span className="font-bold text-emerald-800 font-mono">KSh {item.selling_price}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
              <p className="text-[11px] text-slate-500">
                No products registered in {supermarket.name} yet. Add inventory items in Store Admin.
              </p>
            </div>
          )}

          {/* SUCCESS ADD MESSAGE */}
          {addSuccessMessage && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{addSuccessMessage}</span>
            </div>
          )}

          {/* PRODUCT FOUND CARD */}
          {detectedProduct && (
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-4 rounded-3xl border-2 border-emerald-500 shadow-md animate-in slide-in-from-bottom-3 duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                      {detectedProduct.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {detectedProduct.barcode}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    {detectedProduct.name}
                  </h3>

                  <p className="text-xs text-slate-600">
                    Brand: <strong className="text-slate-800">{detectedProduct.brand}</strong> • Unit: <strong className="text-slate-800">{detectedProduct.unit}</strong>
                  </p>

                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-2xl font-black font-mono text-emerald-800">
                      KSh {detectedProduct.discount_price && detectedProduct.discount_price > 0 && detectedProduct.discount_price < detectedProduct.price
                        ? detectedProduct.discount_price
                        : detectedProduct.price}
                    </span>
                    {detectedProduct.discount_price && detectedProduct.discount_price > 0 && detectedProduct.discount_price < detectedProduct.price && (
                      <span className="text-xs text-slate-400 line-through font-mono">
                        KSh {detectedProduct.price}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {detectedProduct.stock > 0 ? `In Stock (${detectedProduct.stock})` : 'Out of Stock'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity selector & Add to cart */}
              <div className="mt-4 pt-3 border-t border-emerald-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center bg-white rounded-xl border border-emerald-300 p-1 shadow-2xs">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center font-mono font-bold text-sm text-slate-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart || detectedProduct.stock <= 0}
                  className="flex-1 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {addingToCart ? 'Adding...' : `Add to Cart (KSh ${((detectedProduct.discount_price && detectedProduct.discount_price > 0 ? detectedProduct.discount_price : detectedProduct.price) * quantity).toLocaleString()})`}
                </button>
              </div>
            </div>
          )}

          {/* NOT FOUND ERROR STATE (Section 4) */}
          {notFoundBarcode && (
            <div className="bg-rose-50 border-2 border-rose-300 p-4 rounded-3xl text-rose-900 animate-in slide-in-from-bottom-2">
              <div className="flex items-start gap-2.5 mb-2">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-sm text-rose-900">
                    Product not found in this supermarket.
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Barcode <span className="font-mono font-bold">{notFoundBarcode}</span> is not registered in <strong className="text-rose-950">{supermarket.name}</strong>'s database.
                  </p>
                </div>
              </div>

              {/* Action buttons as specified in Section 4 */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-rose-200 text-xs">
                <button
                  onClick={() => {
                    setNotFoundBarcode(null);
                    setMode('camera');
                  }}
                  className="p-2 bg-white hover:bg-rose-100/70 border border-rose-300 rounded-xl font-bold text-rose-800 transition flex items-center justify-center gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Scan Again
                </button>
                <button
                  onClick={() => {
                    setNotFoundBarcode(null);
                    setMode('manual');
                  }}
                  className="p-2 bg-white hover:bg-rose-100/70 border border-rose-300 rounded-xl font-bold text-rose-800 transition flex items-center justify-center gap-1"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  Enter Manually
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onOpenSearch();
                  }}
                  className="col-span-2 p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-1 shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  Search Store Catalog
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Active Supermarket: <strong className="text-slate-800">{supermarket.supermarket_code}</strong></span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-700 font-bold hover:underline"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
