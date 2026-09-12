import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  Smartphone,
  Laptop,
  UploadCloud,
  RefreshCw,
  X,
  Database,
  Radio,
  Share2,
} from 'lucide-react';
import { ExamConfig, ExamRoom, Student, Proctor, ExamScheduleItem, ProctorAttendanceRecord } from '../types';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ExamConfig;
  students: Student[];
  rooms: ExamRoom[];
  proctors: Proctor[];
  schedules: ExamScheduleItem[];
  attendanceRecords: ProctorAttendanceRecord[];
  isConnected: boolean;
  isSyncing: boolean;
  onForceSyncAllToCloud: () => Promise<void>;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  config,
  students,
  rooms,
  proctors,
  schedules,
  attendanceRecords,
  isConnected,
  isSyncing,
  onForceSyncAllToCloud,
}) => {
  const [copied, setCopied] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    currentUrl
  )}&bgcolor=ffffff&color=1e293b`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleUploadAll = async () => {
    try {
      setUploadStatus('Mengupload data ke Cloud Database...');
      await onForceSyncAllToCloud();
      setUploadStatus('Data berhasil diupload dan disinkronkan ke Cloud!');
      setTimeout(() => setUploadStatus(null), 4000);
    } catch (err) {
      setUploadStatus('Gagal upload: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Cloud Database Real-time</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                  {isConnected ? 'Aktif Multi-Device' : 'Menghubungkan...'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Google Cloud Firestore • Akses dan sinkronisasi otomatis antar semua perangkat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status Banner */}
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
              <Database className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-700 leading-relaxed">
              <p className="font-bold text-slate-900 mb-1">
                Database Cloud Real-Time Siap Digunakan
              </p>
              Setiap perubahan yang dilakukan di aplikasi ini (tambah peserta, plotting ruang ujian,
              pengaturan jadwal, presensi pengawas, tanda tangan digital) akan langsung tersimpan ke
              Cloud Firestore dan tersinkronisasi <strong>secara real-time</strong> ke seluruh perangkat
              lain tanpa perlu muat ulang (refresh) halaman.
            </div>
          </div>

          {/* Quick Metrics */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Status Data Saat Ini
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Peserta</span>
                <span className="text-lg font-black text-slate-900">{students.length}</span>
                <span className="text-[10px] text-slate-500 block">Siswa</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Ruangan</span>
                <span className="text-lg font-black text-slate-900">{rooms.length}</span>
                <span className="text-[10px] text-slate-500 block">Ruang Ujian</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Pengawas</span>
                <span className="text-lg font-black text-slate-900">{proctors.length}</span>
                <span className="text-[10px] text-slate-500 block">Guru</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Presensi &amp; TTD</span>
                <span className="text-lg font-black text-emerald-600">{attendanceRecords.length}</span>
                <span className="text-[10px] text-slate-500 block">Digital Log</span>
              </div>
            </div>
          </div>

          {/* Device Sharing & QR Code */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Buka di Smartphone, Tablet, atau Laptop Lain
                </h4>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                Live URL
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <img
                  src={qrUrl}
                  alt="QR Code Akses Aplikasi"
                  className="w-32 h-32 rounded-lg shadow-xs object-contain bg-white p-1 border border-slate-200"
                />
                <span className="text-[10px] text-slate-500 font-semibold mt-2 flex items-center gap-1">
                  <QrCode className="w-3 h-3" />
                  Scan untuk Buka di HP
                </span>
              </div>

              {/* Instructions and URL Link */}
              <div className="sm:col-span-2 space-y-3">
                <div className="text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <Smartphone className="w-4 h-4 text-slate-500" />
                    <span>Untuk Pengawas di Ruang Ujian:</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pl-6">
                    Buka link ini di smartphone pengawas untuk langsung melakukan presensi digital dan tanda tangan online.
                  </p>
                  <div className="flex items-center gap-2 font-semibold text-slate-800 pt-1">
                    <Laptop className="w-4 h-4 text-slate-500" />
                    <span>Untuk Panitia / Operator:</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pl-6">
                    Buka di laptop panitia untuk memantau status kehadiran peserta dan mencetak dokumen ujian siap pakai.
                  </p>
                </div>

                {/* Copyable link input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-mono focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin!' : 'Salin'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cloud Action: Force Sync */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left space-y-0.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-indigo-600" />
                Upload Seluruh Data Lokal ke Cloud
              </span>
              <p className="text-[11px] text-slate-500">
                Tekan tombol ini jika ingin memastikan seluruh data peserta, ruang, dan jadwal terunggah ke Cloud Firestore.
              </p>
              {uploadStatus && (
                <p className="text-xs font-bold text-emerald-600 pt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {uploadStatus}
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleUploadAll}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-indigo-50 hover:border-indigo-300 text-slate-800 hover:text-indigo-700 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan ke Cloud'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
