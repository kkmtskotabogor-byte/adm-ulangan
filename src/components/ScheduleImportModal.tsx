import React, { useState, useRef } from 'react';
import { ExamScheduleItem } from '../types';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Sparkles, 
  Layers, 
  Calendar, 
  Clock, 
  Coffee,
  BookOpen
} from 'lucide-react';
import { 
  USER_UPLOADED_SCHEDULE_TEMPLATE_RAW, 
  parseScheduleText, 
  parseScheduleFile, 
  generateScheduleCsvTemplate, 
  downloadCsvFile, 
  ParsedScheduleResult 
} from '../utils/scheduleParser';

interface ScheduleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSchedules: (schedules: ExamScheduleItem[], mode: 'replace' | 'append') => void;
  currentScheduleCount: number;
}

export const ScheduleImportModal: React.FC<ScheduleImportModalProps> = ({
  isOpen,
  onClose,
  onImportSchedules,
  currentScheduleCount,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState<string>('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedScheduleResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setPastedText(text);
    setErrorMessage(null);
    if (!text.trim()) {
      setParsedResult(null);
      return;
    }
    const result = parseScheduleText(text);
    setParsedResult(result);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const result = await parseScheduleFile(file);
      if (result.schedules.length === 0) {
        setErrorMessage('File tidak memiliki data jadwal yang valid.');
        setParsedResult(null);
      } else {
        setParsedResult(result);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membaca file spreadsheet/CSV.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadUserTemplate = () => {
    setPastedText(USER_UPLOADED_SCHEDULE_TEMPLATE_RAW);
    const result = parseScheduleText(USER_UPLOADED_SCHEDULE_TEMPLATE_RAW);
    setParsedResult(result);
    setErrorMessage(null);
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateScheduleCsvTemplate();
    downloadCsvFile(csvContent, 'template_jadwal_ulangan.csv');
  };

  const handleApply = () => {
    if (!parsedResult || parsedResult.schedules.length === 0) {
      setErrorMessage('Tidak ada jadwal valid untuk diimpor.');
      return;
    }
    onImportSchedules(parsedResult.schedules, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-900">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Import Jadwal Ulangan / Ujian</span>
                <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                  Excel &amp; CSV
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Impor daftar hari, tanggal, mata pelajaran, dan waktu sesi langsung dari template file Anda.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs & Actions Bar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'paste'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Tempel Teks (Paste)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File (Excel/CSV)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleLoadUserTemplate}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              title="Muat data template 23 sesi (STS MTs Manbaul Islam) yang telah Anda upload"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Muat Template Saya (23 Sesi)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download Format Template (.CSV)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60 transition-all rounded-2xl p-8 text-center cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform mx-auto flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Klik untuk pilih file atau seret file ke sini
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Mendukung format <strong>.xlsx, .xls, .csv, atau .txt</strong> (Header: <code>No;Hari/ Tanggal;Mata Pelajaran;Waktu</code>)
                </p>
                {isProcessing && (
                  <p className="text-xs font-semibold text-indigo-600 mt-3 animate-pulse">
                    Sedang memproses file...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Tempel Teks */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">
                  Tempel data teks (dipisah titik-koma <code>;</code>, koma <code>,</code>, atau tab):
                </span>
                <span className="text-[11px] text-slate-400">
                  {pastedText.split('\n').filter(Boolean).length} baris
                </span>
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={7}
                placeholder="No;Hari/ Tanggal;Mata Pelajaran;Waktu&#10;1;Senin/28 September 2026;Bahasa Indonesia;07.30-08.30&#10;2;Senin/28 September 2026;IPS;08.30-09.30&#10;3;Senin/28 September 2026;Istirahat;09.30-10.00..."
                className="w-full font-mono text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 resize-y"
              />
            </div>
          )}

          {/* Parsed Preview Statistics & Options */}
          {parsedResult && parsedResult.schedules.length > 0 && (
            <div className="space-y-3">
              {/* Summary Stats Badges */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Terdeteksi: {parsedResult.schedules.length} Baris Jadwal</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{parsedResult.examCount} Mapel Ujian</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    <Coffee className="w-3.5 h-3.5" />
                    <span>{parsedResult.breakCount} Jam Istirahat</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold bg-white px-2.5 py-1 rounded-md border border-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{parsedResult.daysCount} Hari Pelaksanaan</span>
                  </div>
                </div>

                {/* Import Mode: Replace vs Append */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">Metode Simpan:</label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as 'replace' | 'append')}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="replace">Ganti Semua Jadwal (Timpa / Gantikan Jadwal Lama)</option>
                    <option value="append">Tambahkan ke Jadwal yang Ada</option>
                  </select>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 uppercase text-[10.5px] tracking-wider font-bold">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">No</th>
                        <th className="py-2 px-3 w-44">Hari / Tanggal</th>
                        <th className="py-2 px-3">Mata Pelajaran</th>
                        <th className="py-2 px-3 w-28">Waktu Sesi</th>
                        <th className="py-2 px-3 w-28 text-center">Tipe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white font-medium">
                      {parsedResult.schedules.map((item, idx) => (
                        <tr 
                          key={idx}
                          className={`hover:bg-slate-50 transition-colors ${
                            item.isBreak ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {item.dayName}, {item.date}
                          </td>
                          <td className="py-2 px-3">
                            <span className={item.isBreak ? 'italic text-amber-900 font-semibold' : 'text-slate-900 font-bold'}>
                              {item.subject}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700 text-[11px]">
                            {item.sessionTime}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {item.isBreak ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Istirahat
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Ujian
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {importMode === 'replace' ? (
              <span>Jadwal aktif saat ini ({currentScheduleCount} sesi) akan diganti dengan data baru.</span>
            ) : (
              <span>Data baru akan ditambahkan setelah jadwal aktif saat ini.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!parsedResult || parsedResult.schedules.length === 0}
              className={`px-5 py-2 text-xs font-bold rounded-xl text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer ${
                !parsedResult || parsedResult.schedules.length === 0
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Terapkan Sebagai Master Jadwal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
