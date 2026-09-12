import React, { useState, useRef, useEffect } from 'react';
import { 
  FileSignature, 
  Stamp, 
  Upload, 
  Trash2, 
  Check, 
  X, 
  Sparkles, 
  PenTool, 
  Eraser, 
  Eye, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { ExamConfig } from '../types';
import { 
  processSignatureOrStampFile, 
  createDynamicMadrasahStamp, 
  PRESET_STAMP_KEMENAG, 
  PRESET_STAMP_SEKOLAH, 
  PRESET_SIGNATURE_BLUE, 
  PRESET_SIGNATURE_BLACK 
} from '../utils/signatureStampUtils';

interface SignatureStampModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ExamConfig;
  onSaveConfig: (updated: ExamConfig) => void;
}

export const SignatureStampModal: React.FC<SignatureStampModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'ttd' | 'stempel' | 'pejabat'>('ttd');
  
  // Local working state
  const [signatureEnabled, setSignatureEnabled] = useState<boolean>(config.signatureEnabled ?? true);
  const [signatureUrl, setSignatureUrl] = useState<string | undefined>(config.signatureUrl);
  
  const [stampEnabled, setStampEnabled] = useState<boolean>(config.stampEnabled ?? true);
  const [stampUrl, setStampUrl] = useState<string | undefined>(config.stampUrl);
  
  const [signerType, setSignerType] = useState<'principal' | 'committee'>(
    config.signatureSigner || 'principal'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File input refs
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  // Canvas ref for signature pad
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnOnCanvas, setHasDrawnOnCanvas] = useState(false);

  // Synchronize when opening
  useEffect(() => {
    if (isOpen) {
      setSignatureEnabled(config.signatureEnabled ?? true);
      setSignatureUrl(config.signatureUrl);
      setStampEnabled(config.stampEnabled ?? true);
      setStampUrl(config.stampUrl);
      setSignerType(config.signatureSigner || 'principal');
      setErrorMessage(null);
    }
  }, [isOpen, config]);

  // Handle signature pad canvas setup
  useEffect(() => {
    if (activeTab === 'ttd' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1d4ed8'; // Default royal blue ink
        ctx.lineWidth = 2.5;
      }
    }
  }, [activeTab]);

  if (!isOpen) return null;

  // Handle File Upload for Signature
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const dataUrl = await processSignatureOrStampFile(file, 450);
      setSignatureUrl(dataUrl);
      setSignatureEnabled(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal memproses file tanda tangan.');
    } finally {
      setIsLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Handle File Upload for Stamp
  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const dataUrl = await processSignatureOrStampFile(file, 450);
      setStampUrl(dataUrl);
      setStampEnabled(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal memproses file stempel.');
    } finally {
      setIsLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawnOnCanvas(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawnOnCanvas(false);
    }
  };

  const applyCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnOnCanvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureUrl(dataUrl);
    setSignatureEnabled(true);
  };

  // Save all changes to config
  const handleSave = () => {
    const updated: ExamConfig = {
      ...config,
      signatureEnabled,
      signatureUrl,
      stampEnabled,
      stampUrl,
      signatureSigner: signerType,
    };
    onSaveConfig(updated);
    onClose();
  };

  // Signer names for live preview
  const signerName = signerType === 'principal' ? config.principalName : config.committeeHeadName;
  const signerNip = signerType === 'principal' ? config.principalNip : config.committeeHeadNip;
  const signerTitle = signerType === 'principal' 
    ? (['MTs', 'MA', 'MI'].includes(config.schoolLevel) ? 'Kepala Madrasah,' : 'Kepala Sekolah,')
    : 'Ketua Panitia Ujian,';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs no-print overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Pengaturan Tanda Tangan (TTD) &amp; Stempel Kartu</h3>
              <p className="text-[11px] text-slate-500">
                Upload atau pilih stempel resmi dan tanda tangan digital untuk dicetak pada kartu ujian
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ttd')}
            className={`pb-2.5 px-3 font-semibold text-xs border-b-2 flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'ttd'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSignature className="w-3.5 h-3.5" />
            <span>1. Tanda Tangan (TTD)</span>
            {signatureUrl && signatureEnabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stempel')}
            className={`pb-2.5 px-3 font-semibold text-xs border-b-2 flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'stempel'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Stamp className="w-3.5 h-3.5" />
            <span>2. Stempel Sekolah / MTs</span>
            {stampUrl && stampEnabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pejabat')}
            className={`pb-2.5 px-3 font-semibold text-xs border-b-2 flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'pejabat'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>3. Pilihan Pejabat</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          
          {/* TAB 1: TANDA TANGAN (TTD) */}
          {activeTab === 'ttd' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Toggle Display */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="font-bold text-slate-800">Tampilkan Tanda Tangan Digital pada Kartu</span>
                    <p className="text-[11px] text-slate-500">Jika dimatikan, ruang tanda tangan tetap ada untuk ditandatangani manual.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signatureEnabled}
                    onChange={(e) => setSignatureEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Upload & Preset Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload File Box */}
                <div className="p-4 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-indigo-50/20 transition-all group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-indigo-600 mb-2 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs">Upload File Tanda Tangan</h4>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                    Format PNG (latar transparan disarankan), JPG, atau SVG
                  </p>

                  <input
                    ref={signatureInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => signatureInputRef.current?.click()}
                    disabled={isLoading}
                    className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shadow-xs cursor-pointer transition-colors"
                  >
                    {isLoading ? 'Memproses...' : 'Pilih Gambar TTD'}
                  </button>
                </div>

                {/* Preset Signatures */}
                <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Gunakan Template TTD Siap Pakai:</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSignatureUrl(PRESET_SIGNATURE_BLUE);
                          setSignatureEnabled(true);
                        }}
                        className={`p-2 rounded-lg border text-left flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                          signatureUrl === PRESET_SIGNATURE_BLUE
                            ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500'
                            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                        }`}
                      >
                        <img src={PRESET_SIGNATURE_BLUE} alt="TTD Biru" className="h-7 w-auto object-contain" />
                        <span className="text-[10px] font-bold text-blue-700">Tinta Biru Basah</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSignatureUrl(PRESET_SIGNATURE_BLACK);
                          setSignatureEnabled(true);
                        }}
                        className={`p-2 rounded-lg border text-left flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                          signatureUrl === PRESET_SIGNATURE_BLACK
                            ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500'
                            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                        }`}
                      >
                        <img src={PRESET_SIGNATURE_BLACK} alt="TTD Hitam" className="h-7 w-auto object-contain" />
                        <span className="text-[10px] font-bold text-slate-900">Tinta Hitam Tegas</span>
                      </button>
                    </div>
                  </div>

                  {signatureUrl && (
                    <button
                      type="button"
                      onClick={() => setSignatureUrl(undefined)}
                      className="w-full mt-2 py-1 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Tanda Tangan</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Digital Canvas Drawing Pad */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Atau Coret / Gambar TTD Langsung di Sini:</span>
                  </div>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Hapus Coretan</span>
                  </button>
                </div>

                <div className="bg-white rounded-lg border-2 border-slate-300 shadow-inner flex items-center justify-center relative touch-none overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={130}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-32 cursor-crosshair"
                  />
                  {!hasDrawnOnCanvas && (
                    <span className="absolute pointer-events-none text-slate-300 text-xs italic font-medium">
                      Sentuh atau geser mouse untuk membubuhkan tanda tangan...
                    </span>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={applyCanvasSignature}
                    disabled={!hasDrawnOnCanvas}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Gunakan Hasil Coretan Ini</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STEMPEL RESMI */}
          {activeTab === 'stempel' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Toggle Display */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="font-bold text-slate-800">Tampilkan Stempel Resmi pada Kartu Ujian</span>
                    <p className="text-[11px] text-slate-500">Stempel diletakkan secara realistis sedikit menindih tanda tangan di sebelah kiri.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stampEnabled}
                    onChange={(e) => setStampEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Upload & Preset Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload File Box */}
                <div className="p-4 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-indigo-50/20 transition-all group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-indigo-600 mb-2 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs">Upload File Stempel Madrasah/Sekolah</h4>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                    Format PNG (transparan disarankan), JPG, atau SVG stempel bulat
                  </p>

                  <input
                    ref={stampInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleStampUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => stampInputRef.current?.click()}
                    disabled={isLoading}
                    className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shadow-xs cursor-pointer transition-colors"
                  >
                    {isLoading ? 'Memproses...' : 'Pilih Gambar Stempel'}
                  </button>
                </div>

                {/* Stempel Presets */}
                <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Pilihan Stempel Resmi Siap Pakai:</span>
                    </div>

                    <div className="space-y-2">
                      {/* Dynamic School Stamp Preset */}
                      <button
                        type="button"
                        onClick={() => {
                          const autoStamp = createDynamicMadrasahStamp(config.schoolName, config.district);
                          setStampUrl(autoStamp);
                          setStampEnabled(true);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left flex items-center gap-2.5 cursor-pointer transition-all"
                      >
                        <div className="w-8 h-8 rounded-full border border-indigo-200 bg-indigo-50 flex items-center justify-center shrink-0">
                          <Stamp className="w-4 h-4 text-indigo-700" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">Stempel Otomatis Nama Sekolah</span>
                          <span className="text-[10px] text-slate-500 block truncate">{config.schoolName}</span>
                        </div>
                      </button>

                      {/* Kemenag Stamp Preset */}
                      <button
                        type="button"
                        onClick={() => {
                          setStampUrl(PRESET_STAMP_KEMENAG);
                          setStampEnabled(true);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left flex items-center gap-2.5 cursor-pointer transition-all"
                      >
                        <img src={PRESET_STAMP_KEMENAG} alt="Kemenag" className="w-8 h-8 object-contain shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">Stempel Kemenag RI / MTs</span>
                          <span className="text-[10px] text-slate-500 block truncate">Warna Ungu Tinta Tradisional</span>
                        </div>
                      </button>

                      {/* Dinas Pendidikan Stamp Preset */}
                      <button
                        type="button"
                        onClick={() => {
                          setStampUrl(PRESET_STAMP_SEKOLAH);
                          setStampEnabled(true);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left flex items-center gap-2.5 cursor-pointer transition-all"
                      >
                        <img src={PRESET_STAMP_SEKOLAH} alt="Sekolah" className="w-8 h-8 object-contain shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">Stempel Panitia Penilaian</span>
                          <span className="text-[10px] text-slate-500 block truncate">Warna Biru / Indigo Resmi</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {stampUrl && (
                    <button
                      type="button"
                      onClick={() => setStampUrl(undefined)}
                      className="w-full mt-2 py-1 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Stempel</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PEJABAT PENANDATANGAN */}
          {activeTab === 'pejabat' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 text-xs block">Pilih Pejabat yang Mengesahkan Kartu Ujian:</span>
                <p className="text-[11px] text-slate-500 mt-0.5">Nama dan NIP akan otomatis tercetak di bawah tanda tangan.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <label className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                    signerType === 'principal'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="signerType"
                      value="principal"
                      checked={signerType === 'principal'}
                      onChange={() => setSignerType('principal')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {['MTs', 'MA', 'MI'].includes(config.schoolLevel) ? 'Kepala Madrasah' : 'Kepala Sekolah'}
                      </div>
                      <div className="text-xs font-semibold text-indigo-950 mt-1">{config.principalName}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">NIP. {config.principalNip || '-'}</div>
                    </div>
                  </label>

                  <label className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                    signerType === 'committee'
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="signerType"
                      value="committee"
                      checked={signerType === 'committee'}
                      onChange={() => setSignerType('committee')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Ketua Panitia Ujian</div>
                      <div className="text-xs font-semibold text-indigo-950 mt-1">{config.committeeHeadName}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">NIP. {config.committeeHeadNip || '-'}</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* LIVE PREVIEW BOX OF SIGNATURE & STAMP BLOCK */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>Pratinjau Hasil Cetak pada Sudut Kartu Ujian:</span>
              </span>
              <div className="flex items-center gap-2 text-[10px]">
                {signatureEnabled && signatureUrl && (
                  <span className="text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                    TTD Aktif ✓
                  </span>
                )}
                {stampEnabled && stampUrl && (
                  <span className="text-indigo-700 font-semibold bg-indigo-100 px-2 py-0.5 rounded-full">
                    Stempel Aktif ✓
                  </span>
                )}
              </div>
            </div>

            {/* Realistic Exam Card Signature Corner */}
            <div className="bg-white p-4 rounded-lg border-2 border-black max-w-sm ml-auto shadow-xs select-none">
              <div className="text-right text-[10px] leading-tight text-black">
                <p className="text-black">{config.issuePlace || 'Gresik'}, {config.issueDate || '30 September 2026'}</p>
                <p className="font-semibold text-black mt-0.5">{signerTitle}</p>

                {/* Relative Signature & Stamp Layer */}
                <div className="relative flex items-center justify-end my-1 h-14 w-full">
                  {/* Stempel (slightly overlapping left, authentic tilt) */}
                  {stampEnabled && stampUrl && (
                    <div 
                      className="absolute z-10 pointer-events-none"
                      style={{
                        right: '54px',
                        bottom: '-6px',
                        width: '56px',
                        height: '56px',
                        opacity: 0.9,
                        transform: 'rotate(-8deg)',
                        mixBlendMode: 'multiply'
                      }}
                    >
                      <img src={stampUrl} alt="Stempel" className="w-full h-full object-contain" />
                    </div>
                  )}

                  {/* Tanda Tangan */}
                  {signatureEnabled && signatureUrl ? (
                    <div className="relative z-0 h-12 flex items-center justify-end">
                      <img src={signatureUrl} alt="TTD" className="h-full w-auto object-contain max-w-[140px]" />
                    </div>
                  ) : (
                    <div className="h-10 flex items-center justify-end text-slate-300 italic text-[9px]">
                      (Tanda Tangan Manual)
                    </div>
                  )}
                </div>

                <p className="font-bold uppercase underline leading-tight text-black text-[11px]">{signerName}</p>
                <p className="font-mono text-[9.5px] text-black mt-0.5">NIP {signerNip || '-'}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50 shrink-0 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Terapkan ke Kartu Ujian</span>
          </button>
        </div>

      </div>
    </div>
  );
};
