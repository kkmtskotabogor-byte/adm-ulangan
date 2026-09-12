import React, { useState, useRef } from 'react';
import { ExamCategory, ExamConfig } from '../types';
import { 
  Settings, 
  Check, 
  Building2, 
  UserCheck, 
  Calendar, 
  ShieldCheck, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Sparkles,
  AlertCircle,
  Eye,
  FileSignature,
  Stamp
} from 'lucide-react';
import { 
  processLogoFile, 
  PRESET_LOGO_KEMENAG, 
  PRESET_LOGO_MTS, 
  PRESET_LOGO_TUTWURI 
} from '../utils/logoUtils';
import { SignatureStampModal } from './SignatureStampModal';

interface ConfigViewProps {
  config: ExamConfig;
  onSaveConfig: (updated: ExamConfig) => void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({ config, onSaveConfig }) => {
  const [formData, setFormData] = useState<ExamConfig>(config);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [showSignatureStampModal, setShowSignatureStampModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = async (file: File) => {
    setUploadError(null);
    setIsProcessingLogo(true);
    try {
      const dataUrl = await processLogoFile(file);
      setFormData((prev) => ({ ...prev, logoUrl: dataUrl }));
    } catch (err: any) {
      setUploadError(err.message || 'Gagal mengunggah logo');
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleLogoFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSelectPreset = (presetDataUrl: string) => {
    setUploadError(null);
    setFormData((prev) => ({ ...prev, logoUrl: presetDataUrl }));
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExamTypeChange = (type: ExamCategory) => {
    let defaultTitle = '';
    if (type === 'STS') {
      defaultTitle = `SUMATIF TENGAH SEMESTER (STS) ${formData.semester.toUpperCase()}`;
    } else if (type === 'SAS') {
      defaultTitle = `SUMATIF AKHIR SEMESTER (SAS) GANJIL`;
    } else if (type === 'SAT') {
      defaultTitle = `ASESMEN SUMATIF AKHIR TAHUN (SAT) GENAP`;
    } else if (type === 'US') {
      defaultTitle = `UJIAN SEKOLAH (US / USPB) TINGKAT AKHIR`;
    }

    setFormData({
      ...formData,
      examType: type,
      examTitle: defaultTitle,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <span>Pengaturan Identitas Sekolah &amp; Pelaksanaan Ujian</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi jenis ujian (STS, SAS, SAT, US), profil sekolah untuk kop surat, nama kepala sekolah &amp; ketua panitia.
          </p>
        </div>

        {showSavedToast && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-300 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Pengaturan Berhasil Disimpan!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Exam Type Selector */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>1. Jenis Ujian &amp; Periode Pelaksanaan</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Pilih Kategori Ujian Sekolah:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'STS', title: 'STS', desc: 'Sumatif Tengah Semester (PTS)' },
                { id: 'SAS', title: 'SAS', desc: 'Sumatif Akhir Semester Ganjil (PAS)' },
                { id: 'SAT', title: 'SAT', desc: 'Sumatif Akhir Tahun Genap (PAT)' },
                { id: 'US', title: 'Ujian Sekolah', desc: 'Ujian Sekolah / Asesmen Akhir (US/USPB)' },
              ].map((item) => {
                const isSelected = formData.examType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleExamTypeChange(item.id as ExamCategory)}
                    className={`p-3.5 rounded-lg text-left border-2 transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold">{item.title}</span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 font-bold" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tahun Pelajaran (TP)
              </label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                placeholder="2025/2026"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Semester
              </label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value as 'Ganjil' | 'Genap' })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Awalan Kode No. Peserta (Prefix)
              </label>
              <input
                type="text"
                value={formData.codePrefix}
                onChange={(e) => setFormData({ ...formData, codePrefix: e.target.value })}
                placeholder="25-04"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                required
              />
              <span className="text-[10px] text-slate-400">Contoh: 25-04 menghasilkan 25-04-01-001</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Judul Resmi Ujian (Ditampilkan pada Kartu &amp; Berkas Ujian)
            </label>
            <input
              type="text"
              value={formData.examTitle}
              onChange={(e) => setFormData({ ...formData, examTitle: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
              required
            />
          </div>
        </div>

        {/* Section 2: School Profile (Kop Surat) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>2. Identitas Sekolah &amp; Kop Surat Resmi</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Sekolah Resmi
              </label>
              <input
                type="text"
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                placeholder="SMK NEGERI 1 ..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenjang Sekolah / Madrasah
              </label>
              <select
                value={formData.schoolLevel}
                onChange={(e) => setFormData({ ...formData, schoolLevel: e.target.value as any })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
              >
                <option value="MTs">MTs (Madrasah Tsanawiyah)</option>
                <option value="MA">MA (Madrasah Aliyah)</option>
                <option value="MI">MI (Madrasah Ibtidaiyah)</option>
                <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
                <option value="SMA">SMA (Sekolah Menengah Atas)</option>
                <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
                <option value="SD">SD (Sekolah Dasar)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NPSN Sekolah
              </label>
              <input
                type="text"
                value={formData.npsn}
                onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                placeholder="20234567"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Jalan &amp; Kompleks
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Jl. Merdeka Pendidikan No. 45"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kecamatan</label>
              <input
                type="text"
                value={formData.subdistrict}
                onChange={(e) => setFormData({ ...formData, subdistrict: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kabupaten / Kota</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Provinsi</label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Pos</label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">No. Telepon</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Resmi</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Website</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Upload & Kelola Logo MTs / Madrasah / Sekolah */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <span>3. Upload &amp; Kelola Logo MTs / Madrasah (Kop Kartu Ujian)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Ditampilkan otomatis pada Kop Kartu Peserta Ujian &amp; Berkas Resmi
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Upload Dropzone & Presets (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
                    : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/70 bg-slate-50/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleLogoFile(e.target.files[0]);
                    }
                  }}
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                  <Upload className="w-6 h-6" />
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Klik untuk memilih file logo MTs atau seret &amp; lepas ke sini
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mendukung PNG transparan, JPG, SVG, WebP (Ukuran otomatis dioptimalkan)
                  </p>
                </div>

                {isProcessingLogo && (
                  <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 mt-1">
                    <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>Memproses &amp; menyimpan logo...</span>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Quick Presets for MTs / Kemenag */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Pilihan Cepat Logo Resmi:</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Klik untuk langsung menerapkan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectPreset(PRESET_LOGO_KEMENAG)}
                    className="p-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-400 rounded-md text-left flex items-center gap-2 text-xs transition-colors cursor-pointer"
                  >
                    <img src={PRESET_LOGO_KEMENAG} alt="Kemenag" className="w-7 h-7 object-contain shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">Kemenag RI</p>
                      <p className="text-[10px] text-slate-500 truncate">Ikhlas Beramal (MTs)</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPreset(PRESET_LOGO_MTS)}
                    className="p-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-400 rounded-md text-left flex items-center gap-2 text-xs transition-colors cursor-pointer"
                  >
                    <img src={PRESET_LOGO_MTS} alt="MTs" className="w-7 h-7 object-contain shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">Madrasah (MTs)</p>
                      <p className="text-[10px] text-slate-500 truncate">Perisai Hijau &amp; Emas</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPreset(PRESET_LOGO_TUTWURI)}
                    className="p-2 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-400 rounded-md text-left flex items-center gap-2 text-xs transition-colors cursor-pointer"
                  >
                    <img src={PRESET_LOGO_TUTWURI} alt="Tut Wuri" className="w-7 h-7 object-contain shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">Tut Wuri</p>
                      <p className="text-[10px] text-slate-500 truncate">Kemdikbudristek</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Live Preview in Exam Card Kop (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800">Pratinjau Kop Kartu Ujian:</span>
                  {formData.logoUrl && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                      Logo Aktif ✓
                    </span>
                  )}
                </div>

                {/* Simulated Exam Card Kop */}
                <div className="bg-white p-3 rounded-lg border-2 border-black shadow-xs space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 shrink-0 flex items-center justify-center p-0.5 border border-slate-200 rounded bg-slate-50">
                      {formData.logoUrl ? (
                        <img
                          src={formData.logoUrl}
                          alt="Logo MTs"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-slate-400 text-[9px] text-center font-bold">Tanpa Logo</div>
                      )}
                    </div>
                    <div className="flex-1 text-center min-w-0">
                      <h4 className="font-extrabold uppercase text-[11px] text-black leading-tight truncate">
                        {formData.schoolName || 'MTS MANBAUL ISLAM'}
                      </h4>
                      <p className="text-[8px] text-black leading-tight truncate mt-0.5">
                        {formData.address || 'Alamat Madrasah / Sekolah'}
                      </p>
                      <p className="text-[7.5px] text-black leading-tight truncate mt-0.5">
                        Telp. {formData.phone || '...'} • Email {formData.email || '...'}
                      </p>
                    </div>
                  </div>

                  <div className="border-y border-black py-0.5 text-center font-bold text-[9px] uppercase tracking-wider bg-slate-50">
                    KARTU PESERTA {formData.examType}
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
                  Logo ini akan tercetak otomatis pada seluruh kartu peserta ujian (mode 3 kartu &amp; 4 kartu per lembar F4) serta lembar presensi dan berita acara.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{formData.logoUrl ? 'Ganti File Logo' : 'Unggah File'}</span>
                </button>

                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Logo</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Officials & Signatures */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>4. Pejabat Penandatangan &amp; Titimangsa Kartu Ujian</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kepala Sekolah */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Kepala Sekolah</span>
              </h4>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nama Lengkap &amp; Gelar
                </label>
                <input
                  type="text"
                  value={formData.principalName}
                  onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                  placeholder="Drs. H. ..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={formData.principalNip}
                  onChange={(e) => setFormData({ ...formData, principalNip: e.target.value })}
                  placeholder="1971..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-mono"
                />
              </div>
            </div>

            {/* Ketua Panitia Ujian */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ketua Panitia Ujian</span>
              </h4>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nama Lengkap &amp; Gelar
                </label>
                <input
                  type="text"
                  value={formData.committeeHeadName}
                  onChange={(e) => setFormData({ ...formData, committeeHeadName: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  NIP Ketua Panitia
                </label>
                <input
                  type="text"
                  value={formData.committeeHeadNip}
                  onChange={(e) => setFormData({ ...formData, committeeHeadNip: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kota / Tempat Terbit Kartu
              </label>
              <input
                type="text"
                value={formData.issuePlace}
                onChange={(e) => setFormData({ ...formData, issuePlace: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Titimangsa Kartu
              </label>
              <input
                type="text"
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                placeholder="01 Desember 2025"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Dedicated Card: Tanda Tangan & Stempel Resmi */}
          <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-3 mt-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
              <div className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-indigo-700" />
                <span className="font-bold text-xs text-slate-900">Tanda Tangan &amp; Stempel Resmi Kartu Ujian</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSignatureStampModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload TTD &amp; Stempel</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* TTD Status & Toggle */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <FileSignature className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tanda Tangan (TTD)</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {formData.signatureUrl ? (
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">
                        Gambar Terpasang ✓
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.2 rounded-full">
                        Belum Diunggah
                      </span>
                    )}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.signatureEnabled ?? true}
                    onChange={(e) => setFormData({ ...formData, signatureEnabled: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Tampilkan</span>
                </label>
              </div>

              {/* Stempel Status & Toggle */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Stamp className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Stempel Madrasah/Sekolah</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {formData.stampUrl ? (
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">
                        Gambar Terpasang ✓
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.2 rounded-full">
                        Belum Diunggah
                      </span>
                    )}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.stampEnabled}
                    onChange={(e) => setFormData({ ...formData, stampEnabled: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Tampilkan</span>
                </label>
              </div>
            </div>

            {/* Penandatangan Selector */}
            <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 font-medium text-[11px]">Pejabat yang Bertandatangan:</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="configSigner"
                    value="principal"
                    checked={(formData.signatureSigner || 'principal') === 'principal'}
                    onChange={() => setFormData({ ...formData, signatureSigner: 'principal' })}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Kepala Sekolah / Madrasah</span>
                </label>
                <label className="flex items-center gap-1.5 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="configSigner"
                    value="committee"
                    checked={formData.signatureSigner === 'committee'}
                    onChange={() => setFormData({ ...formData, signatureSigner: 'committee' })}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Ketua Panitia Ujian</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview of School Letterhead (Kop Surat) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>Pratinjau Kop Surat Resmi</span>
            </span>
            <span className="text-[11px] text-slate-400">Ditampilkan pada lembar kartu &amp; administrasi</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80 font-serif text-slate-900">
            <div className="flex items-center gap-4">
              {formData.logoUrl && (
                <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                  <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="flex-1 text-center">
                {['MTs', 'MA', 'MI'].includes(formData.schoolLevel) ? (
                  <>
                    <div className="text-xs tracking-wider uppercase font-semibold text-slate-700">
                      KEMENTERIAN AGAMA REPUBLIK INDONESIA
                    </div>
                    <div className="text-xs tracking-wider uppercase font-semibold text-slate-700">
                      KANTOR KEMENTERIAN AGAMA {formData.district.toUpperCase()}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs tracking-wider uppercase font-semibold text-slate-700">
                      PEMERINTAH DAERAH PROVINSI {formData.province.toUpperCase()}
                    </div>
                    <div className="text-xs tracking-wider uppercase font-semibold text-slate-700">
                      DINAS PENDIDIKAN DAN KEBUDAYAAN
                    </div>
                  </>
                )}
                <div className="text-base sm:text-lg font-black tracking-tight text-slate-950 uppercase mt-0.5">
                  {formData.schoolName}
                </div>
                <div className="text-[11px] font-sans text-slate-600 mt-0.5">
                  {formData.address}, {formData.subdistrict}, {formData.district} - {formData.postalCode}
                </div>
                <div className="text-[10px] font-sans text-slate-500">
                  Telp: {formData.phone} | Email: {formData.email} | Web: {formData.website}
                </div>
              </div>
            </div>
            <div className="border-b-2 border-slate-900 mt-2"></div>
            <div className="border-b border-slate-900 mt-0.5"></div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Simpan Perubahan Pengaturan</span>
          </button>
        </div>
      </form>

      {/* Signature & Stamp Modal */}
      <SignatureStampModal
        isOpen={showSignatureStampModal}
        onClose={() => setShowSignatureStampModal(false)}
        config={formData}
        onSaveConfig={(updated) => {
          setFormData(updated);
          onSaveConfig(updated);
        }}
      />
    </div>
  );
};
