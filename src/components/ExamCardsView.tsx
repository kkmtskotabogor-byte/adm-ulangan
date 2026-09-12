import React, { useState, useMemo, useRef } from 'react';
import { ExamConfig, ExamRoom, Student, ExamScheduleItem } from '../types';
import { BarcodeSVG } from '../utils/barcode';
import { 
  MTS_MANBAUL_ISLAM_STS_SCHEDULE,
  IMAGE_SAMPLE_SCHEDULE, 
  MTS_MADRASAH_SCHEDULE 
} from '../data/schedulePresets';
import { 
  Printer, 
  Search, 
  Layers, 
  Award, 
  Calendar,
  Settings2,
  Sparkles,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  Clock,
  BookOpen,
  ExternalLink,
  AlertCircle,
  X,
  Upload,
  Image as ImageIcon,
  Type,
  Sliders,
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

export interface CardFontSizes {
  nameSize: number; // 0 for auto/default, or in px (7 - 16)
  numberSize: number; // 0 for auto/default, or in px (7 - 16)
  roomSize: number; // 0 for auto/default, or in px (12 - 36)
}

interface ExamCardsViewProps {
  config: ExamConfig;
  students: Student[];
  rooms: ExamRoom[];
  schedules?: ExamScheduleItem[];
  onUpdateSchedules?: (schedules: ExamScheduleItem[]) => void;
  onUpdateConfig?: (config: ExamConfig) => void;
}

// Group schedules by day for the table
interface GroupedScheduleDay {
  dayName: string;
  date: string;
  sessions: {
    id: string;
    jamKe: number;
    time: string;
    subject: string;
    overallIndex: number;
  }[];
}

export const ExamCardsView: React.FC<ExamCardsViewProps> = ({
  config,
  students,
  rooms,
  schedules: propSchedules,
  onUpdateSchedules,
  onUpdateConfig,
}) => {
  // Logo Modal & Quick Customization State
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [isLogoModalDragging, setIsLogoModalDragging] = useState(false);
  const [logoModalError, setLogoModalError] = useState<string | null>(null);
  const [isProcessingLogoModal, setIsProcessingLogoModal] = useState(false);
  const logoModalInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (file: File) => {
    setLogoModalError(null);
    setIsProcessingLogoModal(true);
    try {
      const dataUrl = await processLogoFile(file);
      if (onUpdateConfig) {
        onUpdateConfig({ ...config, logoUrl: dataUrl });
      }
    } catch (err: any) {
      setLogoModalError(err.message || 'Gagal memproses file gambar');
    } finally {
      setIsProcessingLogoModal(false);
    }
  };

  const handlePresetLogoSelect = (presetDataUrl: string) => {
    setLogoModalError(null);
    if (onUpdateConfig) {
      onUpdateConfig({ ...config, logoUrl: presetDataUrl });
    }
  };

  const handleRemoveLogo = () => {
    if (onUpdateConfig) {
      onUpdateConfig({ ...config, logoUrl: undefined });
    }
    if (logoModalInputRef.current) {
      logoModalInputRef.current.value = '';
    }
  };
  // Filters
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Card Format: 'schedule_card' matches the user's uploaded image with the table on the right
  const [cardFormat, setCardFormat] = useState<'schedule_card' | 'compact_card'>('schedule_card');
  const [paperSize, setPaperSize] = useState<'F4' | 'A4'>('F4');
  const [cardLayout, setCardLayout] = useState<'3_per_page' | '2_per_page' | '1_per_page' | '6_per_page' | '4_per_page'>('3_per_page');
  const [printScale, setPrintScale] = useState<'100' | '94' | '88'>('100');
  const [signatory, setSignatory] = useState<'committee' | 'principal'>('committee'); // Ketua Pelaksana as in example image

  // Custom Font Sizes: Nama, Nomor Peserta, Ruang
  const [showFontSizePanel, setShowFontSizePanel] = useState(false);
  const [fontSizes, setFontSizes] = useState<CardFontSizes>(() => {
    try {
      const saved = localStorage.getItem('exam_card_font_sizes');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return { nameSize: 0, numberSize: 0, roomSize: 0 };
  });

  const updateFontSize = (key: keyof CardFontSizes, value: number) => {
    setFontSizes(prev => {
      const next = { ...prev, [key]: Math.max(0, value) };
      try {
        localStorage.setItem('exam_card_font_sizes', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const resetFontSizes = () => {
    const defaults = { nameSize: 0, numberSize: 0, roomSize: 0 };
    setFontSizes(defaults);
    try {
      localStorage.removeItem('exam_card_font_sizes');
    } catch (e) {
      console.error(e);
    }
  };

  // Schedule management
  const [activePreset, setActivePreset] = useState<'sts' | 'sample_image' | 'mts' | 'custom'>('sts');
  const [localSchedules, setLocalSchedules] = useState<ExamScheduleItem[]>(() => {
    return propSchedules && propSchedules.length > 0 ? propSchedules : MTS_MANBAUL_ISLAM_STS_SCHEDULE;
  });

  // Sync when propSchedules updates from parent
  React.useEffect(() => {
    if (propSchedules && propSchedules.length > 0) {
      setLocalSchedules(propSchedules);
    }
  }, [propSchedules]);

  // Dynamically compute default schedule title based on active config (examType, semester, classes)
  const defaultScheduleTitle = useMemo(() => {
    const type = config.examType || 'STS';
    const sem = config.semester ? config.semester.toUpperCase() : 'GANJIL';

    // Extract distinct levels from student classes (e.g. VII, VIII, IX)
    const levels = new Set<string>();
    students.forEach((s) => {
      const match = s.className.match(/^(VII|VIII|IX|X|XI|XII|\d+)/i);
      if (match) levels.add(match[1].toUpperCase());
    });
    
    let levelStr = 'KELAS VII DAN VIII';
    if (levels.size > 0) {
      const sorted = Array.from(levels);
      if (sorted.length === 1) levelStr = `KELAS ${sorted[0]}`;
      else if (sorted.length === 2) levelStr = `KELAS ${sorted[0]} DAN ${sorted[1]}`;
      else levelStr = `KELAS ${sorted.slice(0, -1).join(', ')} DAN ${sorted[sorted.length - 1]}`;
    }
    
    return `JADWAL ${type} ${sem} ${levelStr}`;
  }, [config.examType, config.semester, students]);

  // Allow user custom title, but discard old hardcoded "UAS" legacy titles
  const [customScheduleTitle, setCustomScheduleTitle] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('custom_exam_schedule_title');
      if (saved && (saved.includes('UAS') || saved.includes('uas'))) {
        localStorage.removeItem('custom_exam_schedule_title');
        return null;
      }
      return saved || null;
    } catch {
      return null;
    }
  });

  const scheduleTitle = customScheduleTitle || defaultScheduleTitle;
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSignatureStampModal, setShowSignatureStampModal] = useState(false);

  // All unique classes
  const classes = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.className))).sort();
  }, [students]);

  // Filter students for printing
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchRoom = selectedRoom === 'ALL' || s.roomId === selectedRoom;
      const matchClass = selectedClass === 'ALL' || s.className === selectedClass;
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.examNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nisn.includes(searchTerm);
      return matchRoom && matchClass && matchSearch;
    });
  }, [students, selectedRoom, selectedClass, searchTerm]);

  // iFrame preview detection (in sandbox iframes, browsers often suppress window.print modal)
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const [showPrintHelperModal, setShowPrintHelperModal] = useState(false);

  // Direct standalone URL with tab=cards & autoPrint=true for 100% reliable printing in a new tab
  const printNewTabUrl = useMemo(() => {
    if (typeof window === 'undefined') return '#';
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'cards');
      url.searchParams.set('autoPrint', 'true');
      return url.toString();
    } catch {
      return window.location.href;
    }
  }, []);

  // Handle print
  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Direct window.print() failed:', err);
    }
    // If inside an iframe (like AI Studio preview), Chrome suppresses modal dialogs
    if (isIframe) {
      setShowPrintHelperModal(true);
    }
  };

  // Switch preset
  const handleSelectPreset = (preset: 'sts' | 'sample_image' | 'mts') => {
    setActivePreset(preset);
    setCustomScheduleTitle(null);
    try {
      localStorage.removeItem('custom_exam_schedule_title');
    } catch (e) {
      console.error(e);
    }

    if (preset === 'sts') {
      setLocalSchedules(MTS_MANBAUL_ISLAM_STS_SCHEDULE);
      if (onUpdateSchedules) onUpdateSchedules(MTS_MANBAUL_ISLAM_STS_SCHEDULE);
    } else if (preset === 'sample_image') {
      setLocalSchedules(IMAGE_SAMPLE_SCHEDULE);
      if (onUpdateSchedules) onUpdateSchedules(IMAGE_SAMPLE_SCHEDULE);
    } else {
      const mtsData = MTS_MADRASAH_SCHEDULE;
      setLocalSchedules(mtsData);
      if (onUpdateSchedules) onUpdateSchedules(mtsData);
    }
  };

  // Group schedules by day
  const groupedDays: GroupedScheduleDay[] = useMemo(() => {
    const daysMap = new Map<string, GroupedScheduleDay>();
    let counter = 1;

    localSchedules.forEach((item) => {
      const key = `${item.dayName}|${item.date}`;
      if (!daysMap.has(key)) {
        daysMap.set(key, {
          dayName: item.dayName,
          date: item.date,
          sessions: [],
        });
      }
      const dayEntry = daysMap.get(key)!;
      dayEntry.sessions.push({
        id: item.id,
        jamKe: dayEntry.sessions.length + 1,
        time: item.sessionTime,
        subject: item.subject,
        overallIndex: counter++,
      });
    });

    return Array.from(daysMap.values());
  }, [localSchedules]);

  // Chunk students into pages based on selected paper layout
  const chunkSize = useMemo(() => {
    if (cardFormat === 'schedule_card') {
      if (cardLayout === '4_per_page') return 4;
      if (cardLayout === '3_per_page') return 3;
      if (cardLayout === '1_per_page') return 1;
      return 2;
    } else {
      if (cardLayout === '6_per_page') return 6;
      return 4;
    }
  }, [cardFormat, cardLayout]);

  const chunkedStudents: Student[][] = [];
  for (let i = 0; i < filteredStudents.length; i += chunkSize) {
    chunkedStudents.push(filteredStudents.slice(i, i + chunkSize));
  }

  // Room number helper: extract clean integer or string (e.g. "Ruang 01" -> "1")
  const getRoomDisplay = (student: Student): string => {
    const roomName = student.roomName || (rooms.find(r => r.id === student.roomId)?.name);
    if (!roomName) return '1';
    const match = roomName.match(/\d+/);
    return match ? String(parseInt(match[0], 10)) : roomName;
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Print CSS for chosen paper size and layout */}
      <style>{`
        @media print {
          @page {
            size: ${paperSize === 'F4' ? '215mm 330mm portrait' : 'A4 portrait'};
            margin: ${cardLayout === '3_per_page' || cardLayout === '4_per_page' ? '2.5mm 3.5mm' : '5mm 5mm'};
          }
          ${printScale === '94' ? `
            .f4-page-sheet {
              zoom: 0.94 !important;
            }
          ` : printScale === '88' ? `
            .f4-page-sheet {
              zoom: 0.88 !important;
            }
          ` : ''}
        }
      `}</style>

      {/* Top Toolbar & Print Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <span>Cetak Kartu Peserta Ujian &amp; Jadwal Pengawas</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Desain kartu peserta lengkap dengan tabel jadwal sesi &amp; paraf tanda tangan pengawas ruang per mata pelajaran.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Logo MTs / Madrasah Quick Access */}
            <button
              type="button"
              onClick={() => setShowLogoModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 text-xs font-bold rounded-lg border border-slate-300 hover:border-emerald-400 transition-all cursor-pointer shadow-2xs"
              title="Upload atau ganti Logo MTs pada kartu ujian"
            >
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" className="w-4 h-4 object-contain rounded shrink-0" />
              ) : (
                <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>Logo MTs</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-100 text-emerald-800">
                {config.logoUrl ? '✓ Aktif' : '+ Upload'}
              </span>
            </button>

            {/* Menu Atur Ukuran Font (Nama, No. Peserta, Ruang) */}
            <button
              type="button"
              onClick={() => setShowFontSizePanel(!showFontSizePanel)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                showFontSizePanel || fontSizes.nameSize > 0 || fontSizes.numberSize > 0 || fontSizes.roomSize > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                  : 'bg-white hover:bg-amber-50 text-slate-800 hover:text-amber-900 border-slate-300'
              }`}
              title="Atur ukuran font Nama Siswa, Nomor Peserta, dan Ruang pada kartu"
            >
              <Type className="w-4 h-4 shrink-0" />
              <span>Ukuran Font</span>
              {(fontSizes.nameSize > 0 || fontSizes.numberSize > 0 || fontSizes.roomSize > 0) ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-amber-700 text-amber-100">
                  Kustom
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-600">
                  Bawaan
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowScheduleModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-all cursor-pointer"
              title="Atur Mata Pelajaran & Jadwal Ujian pada Kartu"
            >
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Kelola Jadwal ({localSchedules.length} Sesi)</span>
            </button>

            {/* Menu Upload TTD & Stempel */}
            <button
              type="button"
              onClick={() => setShowSignatureStampModal(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                (config.stampEnabled && config.stampUrl) || (config.signatureEnabled !== false && config.signatureUrl)
                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300 ring-1 ring-indigo-300'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
              }`}
              title="Upload atau atur tanda tangan dan stempel resmi madrasah/sekolah pada kartu ujian"
            >
              <FileSignature className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>TTD &amp; Stempel</span>
              {((config.stampEnabled && config.stampUrl) || (config.signatureEnabled !== false && config.signatureUrl)) ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-600 text-white">
                  Aktif
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-500">
                  Atur
                </span>
              )}
            </button>

            {/* Direct Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              id="btn-cetak-kartu"
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
              title="Klik untuk membuka dialog cetak browser (Ctrl+P)"
            >
              <Printer className="w-4 h-4" />
              <span>
                {paperSize === 'F4' 
                  ? cardLayout === '4_per_page'
                    ? 'Cetak Kartu (F4: 4 Kartu/Lembar)'
                    : cardLayout === '3_per_page'
                      ? 'Cetak Kartu (F4: 3 Kartu/Lembar)' 
                      : 'Cetak Kartu (F4)'
                  : cardLayout === '2_per_page'
                    ? 'Cetak Kartu (A4: 2 Kartu)'
                    : 'Cetak Kartu (A4)'}
              </span>
            </button>

            {/* Standalone New Tab Print Button (Bypasses all iframe restrictions) */}
            <a
              href={printNewTabUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="btn-buka-tab-baru-cetak"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
              title="Buka kartu di tab baru browser untuk mencetak langsung tanpa batasan iframe / preview"
            >
              <ExternalLink className="w-4 h-4 text-emerald-100" />
              <span>Buka di Tab Baru (Cetak PDF)</span>
            </a>
          </div>
        </div>

        {/* Informative Banner when in iFrame Preview */}
        {isIframe && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">
                  Perhatian: Aplikasi sedang berada di dalam jendela Pratinjau (iFrame)
                </p>
                <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                  Sebagian browser (seperti Google Chrome) secara otomatis memblokir dialog cetak printer jika dipanggil dari dalam kotak pratinjau. 
                  Jika tombol <strong>Cetak Kartu</strong> tidak memunculkan dialog cetak di layar Anda, klik tombol hijau <strong>"Buka di Tab Baru (Cetak PDF)"</strong> untuk mencetak tanpa halangan.
                </p>
              </div>
            </div>
            <a
              href={printNewTabUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-xs text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Tab Baru</span>
            </a>
          </div>
        )}

        {/* Panel Pengaturan Ukuran Font (Nama, Nomor Peserta, Ruang) */}
        {showFontSizePanel && (
          <div className="p-4 bg-amber-50/80 border-2 border-amber-300 rounded-xl space-y-3.5 transition-all animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
                  <Type className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
                    <span>Atur Ukuran Font Kartu Peserta</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono">
                      Nama • No. Peserta • Ruang
                    </span>
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    Sesuaikan ukuran teks secara presisi agar kartu lebih mudah dibaca, lebih tebal, atau lebih hemat ruang cetak.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={resetFontSizes}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-white hover:bg-amber-100 rounded-lg border border-amber-300 cursor-pointer transition-colors shadow-2xs"
                  title="Kembalikan semua ukuran font ke bawaan awal"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Bawaan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFontSizePanel(false)}
                  className="p-1 text-amber-800 hover:text-amber-950 hover:bg-amber-200 rounded-md transition-colors cursor-pointer"
                  title="Tutup panel ukuran font"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3 Kolom Pengaturan Ukuran */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1. Nama Siswa */}
              <div className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>👤 Nama Siswa</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    {fontSizes.nameSize === 0 ? 'Bawaan (Auto)' : `${fontSizes.nameSize} px`}
                  </span>
                </div>

                {/* Stepper + Slider */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateFontSize('nameSize', (fontSizes.nameSize || 10) - 1)}
                    disabled={fontSizes.nameSize !== 0 && fontSizes.nameSize <= 7}
                    className="w-7 h-7 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-sm"
                    title="Perkecil font nama"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="7"
                    max="16"
                    step="1"
                    value={fontSizes.nameSize || 10}
                    onChange={(e) => updateFontSize('nameSize', Number(e.target.value))}
                    className="flex-1 accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => updateFontSize('nameSize', (fontSizes.nameSize || 10) + 1)}
                    disabled={fontSizes.nameSize >= 16}
                    className="w-7 h-7 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-sm"
                    title="Perbesar font nama"
                  >
                    +
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => updateFontSize('nameSize', 0)}
                    className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer ${
                      fontSizes.nameSize === 0 
                        ? 'bg-amber-600 text-white border-amber-700 font-bold' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Auto
                  </button>
                  {[8, 9, 10, 11, 12, 13, 14].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => updateFontSize('nameSize', sz)}
                      className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer ${
                        fontSizes.nameSize === sz 
                          ? 'bg-amber-600 text-white border-amber-700 font-bold' 
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Nomor Peserta */}
              <div className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🔢 Nomor Peserta</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    {fontSizes.numberSize === 0 ? 'Bawaan (Auto)' : `${fontSizes.numberSize} px`}
                  </span>
                </div>

                {/* Stepper + Slider */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateFontSize('numberSize', (fontSizes.numberSize || 10) - 1)}
                    disabled={fontSizes.numberSize !== 0 && fontSizes.numberSize <= 7}
                    className="w-7 h-7 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-sm"
                    title="Perkecil font nomor peserta"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="7"
                    max="16"
                    step="1"
                    value={fontSizes.numberSize || 10}
                    onChange={(e) => updateFontSize('numberSize', Number(e.target.value))}
                    className="flex-1 accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => updateFontSize('numberSize', (fontSizes.numberSize || 10) + 1)}
                    disabled={fontSizes.numberSize >= 16}
                    className="w-7 h-7 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-sm"
                    title="Perbesar font nomor peserta"
                  >
                    +
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => updateFontSize('numberSize', 0)}
                    className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer ${
                      fontSizes.numberSize === 0 
                        ? 'bg-amber-600 text-white border-amber-700 font-bold' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Auto
                  </button>
                  {[8, 9, 10, 11, 12, 13, 14].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => updateFontSize('numberSize', sz)}
                      className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer ${
                        fontSizes.numberSize === sz 
                          ? 'bg-amber-600 text-white border-amber-700 font-bold' 
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Nomor Ruang */}
              <div className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🚪 Nomor Ruang</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    {fontSizes.roomSize === 0 ? 'Bawaan (Auto)' : `${fontSizes.roomSize} px`}
                  </span>
                </div>

                {/* Stepper + Slider */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateFontSize('roomSize', (fontSizes.roomSize || 22) - 2)}
                    disabled={fontSizes.roomSize !== 0 && fontSizes.roomSize <= 12}
                    className="w-7 h-7 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-sm"
                    title="Perkecil nomor ruang"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="12"
                    max="36"
                    step="2"
                    value={fontSizes.roomSize || 22}
                    onChange={(e) => updateFontSize('roomSize', Number(e.target.value))}
                    className="flex-1 accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => updateFontSize('roomSize', (fontSizes.roomSize || 22) + 2)}
                    disabled={fontSizes.roomSize >= 36}
                    className="w-7 h-7 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-sm"
                    title="Perbesar nomor ruang"
                  >
                    +
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => updateFontSize('roomSize', 0)}
                    className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer ${
                      fontSizes.roomSize === 0 
                        ? 'bg-amber-600 text-white border-amber-700 font-bold' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Auto
                  </button>
                  {[16, 18, 20, 22, 24, 28, 32].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => updateFontSize('roomSize', sz)}
                      className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer ${
                        fontSizes.roomSize === sz 
                          ? 'bg-amber-600 text-white border-amber-700 font-bold' 
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-3 bg-white rounded-lg border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-amber-950 shrink-0">Pratinjau Langsung:</span>
                <div className="flex flex-wrap items-center gap-3 bg-amber-50/50 px-3 py-1.5 rounded border border-amber-200/80">
                  <div>
                    <span className="text-[8.5px] text-slate-400 block font-sans">Nama:</span>
                    <span 
                      className="font-bold text-slate-900 uppercase"
                      style={fontSizes.nameSize ? { fontSize: `${fontSizes.nameSize}px`, lineHeight: 1 } : { fontSize: '10px' }}
                    >
                      AHMAD SAIFULLAH
                    </span>
                  </div>
                  <div className="border-l border-amber-200 pl-3">
                    <span className="text-[8.5px] text-slate-400 block font-sans">No. Peserta:</span>
                    <span 
                      className="font-bold font-mono text-slate-900"
                      style={fontSizes.numberSize ? { fontSize: `${fontSizes.numberSize}px`, lineHeight: 1 } : { fontSize: '10px' }}
                    >
                      26-04-01-001-8
                    </span>
                  </div>
                  <div className="border-l border-amber-200 pl-3">
                    <span className="text-[8.5px] text-slate-400 block font-sans">Ruang:</span>
                    <span 
                      className="font-extrabold text-slate-900"
                      style={fontSizes.roomSize ? { fontSize: `${fontSizes.roomSize}px`, lineHeight: 1 } : { fontSize: '20px' }}
                    >
                      01
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <span className="text-[10px] text-slate-500 font-medium">Setelan Cepat:</span>
                <button
                  type="button"
                  onClick={() => {
                    updateFontSize('nameSize', 9);
                    updateFontSize('numberSize', 9);
                    updateFontSize('roomSize', 18);
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                >
                  Kompak
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateFontSize('nameSize', 11);
                    updateFontSize('numberSize', 11);
                    updateFontSize('roomSize', 24);
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                >
                  Jelas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateFontSize('nameSize', 13);
                    updateFontSize('numberSize', 13);
                    updateFontSize('roomSize', 28);
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                >
                  Besar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mini status indicator when panel is closed but custom fonts are active */}
        {!showFontSizePanel && (fontSizes.nameSize > 0 || fontSizes.numberSize > 0 || fontSizes.roomSize > 0) && (
          <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Ukuran Font Kustom Aktif:</strong>{' '}
                {fontSizes.nameSize > 0 ? `Nama ${fontSizes.nameSize}px` : 'Nama Auto'} •{' '}
                {fontSizes.numberSize > 0 ? `No. Peserta ${fontSizes.numberSize}px` : 'No Auto'} •{' '}
                {fontSizes.roomSize > 0 ? `Ruang ${fontSizes.roomSize}px` : 'Ruang Auto'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFontSizePanel(true)}
                className="text-[11px] text-amber-800 font-bold underline hover:text-amber-950 cursor-pointer"
              >
                Ubah Ukuran
              </button>
              <button
                type="button"
                onClick={resetFontSizes}
                className="text-[11px] text-slate-500 hover:text-red-600 cursor-pointer font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Format Selector: Image Sample Schedule vs Compact Barcode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs">
            <span className="font-bold text-indigo-950 shrink-0">Model Kartu:</span>
            <button
              type="button"
              onClick={() => {
                setCardFormat('schedule_card');
                setPaperSize('F4');
                setCardLayout('3_per_page');
              }}
              className={`flex-1 py-1.5 px-3 rounded font-bold text-center transition-all cursor-pointer ${
                cardFormat === 'schedule_card'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              📋 Format Jadwal &amp; T.Tangan Pengawas (Sesuai Gambar)
            </button>
            <button
              type="button"
              onClick={() => {
                setCardFormat('compact_card');
                setPaperSize('F4');
                setCardLayout('6_per_page');
              }}
              className={`py-1.5 px-3 rounded font-bold transition-all cursor-pointer ${
                cardFormat === 'compact_card'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              🪪 Format Ringkas (Foto &amp; Barcode)
            </button>
          </div>

          {/* Schedule Preset Switcher */}
          {cardFormat === 'schedule_card' && (
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 shrink-0">Pilihan Jadwal:</span>
              <button
                type="button"
                onClick={() => handleSelectPreset('sts')}
                className={`flex-1 min-w-[150px] py-1.5 px-2.5 rounded font-semibold text-center transition-all cursor-pointer truncate ${
                  activePreset === 'sts'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
                title="17 Sesi (Senin-Sabtu): B. Indo, IPS, TIK, Mat, Alquran Hadist, Prakarya, B. Ing, Fiqih, Seni Budaya, IPA, B. Sunda, SKI, PKn, B. Arab, Akidah, BTQ, Penjas"
              >
                ⭐ STS Ganjil (17 Mapel)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('mts')}
                className={`flex-1 min-w-[140px] py-1.5 px-2.5 rounded font-semibold text-center transition-all cursor-pointer truncate ${
                  activePreset === 'mts'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
                title="11 Sesi: Al-Qur'an Hadits, Akidah, Fikih, SKI, B. Arab, B. Indo, B. Ing, Mat, PPKn, IPA, IPS"
              >
                SAS / AM (11 Mapel)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('sample_image')}
                className={`flex-1 min-w-[140px] py-1.5 px-2.5 rounded font-semibold text-center transition-all cursor-pointer truncate ${
                  activePreset === 'sample_image'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
                title="12 Sesi: Matematika, PAI, IPA, PKn, B. Indonesia, SBK, B. Inggris, TIK, PLH, B. Jawa, IPS, BTQ"
              >
                Contoh Gambar (12 Mapel)
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari siswa atau no peserta..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Filter Ruang */}
          <div>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
            >
              <option value="ALL">Semua Ruang ({students.length} Siswa)</option>
              {rooms.map((r) => {
                const count = students.filter((s) => s.roomId === r.id).length;
                return (
                  <option key={r.id} value={r.id}>
                    {r.name} ({count} siswa)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Filter Kelas */}
          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
            >
              <option value="ALL">Semua Rombel/Kelas ({classes.length} Kelas)</option>
              {classes.map((cls) => {
                const count = students.filter((s) => s.className === cls).length;
                return (
                  <option key={cls} value={cls}>
                    {cls} ({count} siswa)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Penandatangan */}
          <div>
            <select
              value={signatory}
              onChange={(e) => setSignatory(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
            >
              <option value="committee">Tanda Tangan: Ketua Pelaksana / Panitia</option>
              <option value="principal">Tanda Tangan: Kepala Sekolah</option>
            </select>
          </div>
        </div>

        {/* Layout Options bar: F4 1 Kertas 3 Kartu & A4 Options */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-700 font-bold shrink-0">Ukuran Kertas &amp; Tata Letak:</span>
            {cardFormat === 'schedule_card' ? (
              <div className="flex flex-wrap items-center gap-2">
                {/* F4 1 Kertas 3 Kartu (Maksimal 1 Lembar) */}
                <button
                  type="button"
                  onClick={() => {
                    setPaperSize('F4');
                    setCardLayout('3_per_page');
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    cardLayout === '3_per_page' && paperSize === 'F4'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
                  }`}
                >
                  <span>📄 Kertas F4: 1 Kertas 3 Kartu</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    cardLayout === '3_per_page' && paperSize === 'F4'
                      ? 'bg-emerald-800 text-emerald-100'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Pas 1 Lembar (3 Siswa)
                  </span>
                </button>

                {/* Skala Kerapatan Cetak Otomatis */}
                {cardLayout === '3_per_page' && (
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 px-1.5">Skala:</span>
                    <button
                      type="button"
                      onClick={() => setPrintScale('100')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        printScale === '100'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 bg-white'
                      }`}
                      title="Skala standar pas 1 lembar F4"
                    >
                      100% (Standar)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintScale('94')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        printScale === '94'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 bg-white'
                      }`}
                      title="Kompak 94% - Jika printer Anda masih memotong ke lembar 2 atau menggunakan kertas A4"
                    >
                      94% (Kompak)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintScale('88')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        printScale === '88'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 bg-white'
                      }`}
                      title="Ekstra ramping 88% untuk printer dengan margin fisik lebar"
                    >
                      88% (Ekstra)
                    </button>
                  </div>
                )}

                {/* F4 1 Kertas 4 Kartu (Super Hemat) */}
                <button
                  type="button"
                  onClick={() => {
                    setPaperSize('F4');
                    setCardLayout('4_per_page');
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    cardLayout === '4_per_page' && paperSize === 'F4'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
                  }`}
                >
                  <span>📄 Kertas F4: 1 Kertas 4 Kartu</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    cardLayout === '4_per_page' && paperSize === 'F4'
                      ? 'bg-emerald-800 text-emerald-100'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Super Hemat (4 Siswa/Lembar)
                  </span>
                </button>

                {/* A4 1 Kertas 2 Kartu */}
                <button
                  type="button"
                  onClick={() => {
                    setPaperSize('A4');
                    setCardLayout('2_per_page');
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    cardLayout === '2_per_page' && paperSize === 'A4'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
                  }`}
                >
                  <span>📄 Kertas A4: 1 Kertas 2 Kartu</span>
                  <span className="text-[10px] opacity-75 font-normal">(Standar A4)</span>
                </button>

                {/* A4 1 Kertas 1 Kartu */}
                <button
                  type="button"
                  onClick={() => {
                    setPaperSize('A4');
                    setCardLayout('1_per_page');
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    cardLayout === '1_per_page'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
                  }`}
                >
                  <span>📄 Kertas A4: 1 Kertas 1 Kartu</span>
                  <span className="text-[10px] opacity-75 font-normal">(Ukuran Besar)</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {/* F4 1 Kertas 6 Kartu */}
                <button
                  type="button"
                  onClick={() => {
                    setPaperSize('F4');
                    setCardLayout('6_per_page');
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    cardLayout === '6_per_page' && paperSize === 'F4'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
                  }`}
                >
                  <span>📄 Kertas F4: 1 Kertas 6 Kartu (Grid 2×3)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    cardLayout === '6_per_page' && paperSize === 'F4'
                      ? 'bg-emerald-800 text-emerald-100'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Folio
                  </span>
                </button>

                {/* A4 1 Kertas 4 Kartu */}
                <button
                  type="button"
                  onClick={() => {
                    setPaperSize('A4');
                    setCardLayout('4_per_page');
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    cardLayout === '4_per_page' && paperSize === 'A4'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
                  }`}
                >
                  <span>📄 Kertas A4: 1 Kertas 4 Kartu (Grid 2×2)</span>
                  <span className="text-[10px] opacity-75 font-normal">(Standar A4)</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 font-medium">
              Menampilkan {filteredStudents.length} siswa • Estimasi {chunkedStudents.length} lembar {paperSize}
            </span>
          </div>
        </div>

        {/* Informative Tip when F4 is active */}
        {paperSize === 'F4' && (
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-center gap-2.5">
            <span className="text-lg">💡</span>
            <div className="flex-1 leading-relaxed">
              <strong>Jaminan Pas 3 Kartu per Lembar F4 / Folio:</strong> Seluruh dimensi kartu dan tabel jadwal telah dioptimalkan secara presisi agar 3 kartu siswa muat sempurna dalam 1 lembar utuh tanpa tumpah ke lembar kedua. Saat dialog Cetak / Print browser terbuka (<kbd className="px-1 py-0.5 bg-white border border-emerald-300 rounded font-mono text-[10px]">Ctrl+P</kbd>):
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-emerald-800">
                <li>Pilih <em>Ukuran Kertas (Paper size)</em>: <strong>Folio / F4 (8.5 × 13 in / 215 × 330 mm)</strong> atau <em>Legal</em>.</li>
                <li>Atur <em>Margin</em>: <strong>Minimum</strong> atau <strong>Default</strong>.</li>
                <li>Jika printer Anda masih mengeluarkan 2 kartu di lembar pertama, aktifkan tombol <strong>"Skala: 94% (Kompak)"</strong> di atas agar otomatis muat pas 3 kartu.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Printable Pages Container */}
      <div className="space-y-8 print:space-y-0">
        {filteredStudents.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
            Tidak ada siswa yang sesuai dengan filter pencarian.
          </div>
        ) : (
          chunkedStudents.map((pageGroup, pageIndex) => (
            <div
              key={pageIndex}
              className="f4-page-sheet page-break-after-always bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs print:border-none print:shadow-none print:p-0 print:m-0 print:bg-transparent"
            >
              {/* Page Number indicator for screen viewing */}
              <div className="text-right text-[10px] text-slate-400 font-mono mb-3 pb-1 border-b border-slate-100 no-print flex justify-between">
                <span>LEMBAR CETAK {pageIndex + 1} DARI {chunkedStudents.length} • KERTAS {paperSize}</span>
                <span>{pageGroup.length} KARTU PESERTA ({cardFormat === 'schedule_card' ? 'DENGAN JADWAL & PARAF' : 'FORMAT RINGKAS'})</span>
              </div>

              {/* Cards Layout Container */}
              <div
                className={
                  cardFormat === 'schedule_card'
                    ? cardLayout === '4_per_page'
                      ? 'print-card-stack-4 flex flex-col gap-1.5'
                      : cardLayout === '3_per_page'
                        ? 'print-card-stack-3 flex flex-col gap-1 sm:gap-1.5'
                        : 'print-card-stack-2 flex flex-col gap-5'
                    : cardLayout === '6_per_page'
                      ? 'grid grid-cols-1 md:grid-cols-2 gap-2.5 print:gap-2 print-card-grid-6'
                      : 'grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-4 print-card-grid-4'
                }
              >
                {pageGroup.map((student, idx) => (
                  <React.Fragment key={student.id}>
                    {cardFormat === 'schedule_card' ? (
                      <ScheduleExamCardItem
                        student={student}
                        config={config}
                        signatory={signatory}
                        roomDisplayNumber={getRoomDisplay(student)}
                        scheduleTitle={scheduleTitle}
                        groupedDays={groupedDays}
                        absenNumber={student.seatNumber || (pageIndex * chunkSize + idx + 1)}
                        cardDensity={cardLayout === '4_per_page' ? '4_cards' : cardLayout === '3_per_page' ? '3_cards' : 'standard'}
                        isF4ThreeCards={cardLayout === '3_per_page'}
                        fontSizes={fontSizes}
                      />
                    ) : (
                      <CompactExamCardItem
                        student={student}
                        config={config}
                        signatory={signatory}
                        isCompactDense={cardLayout === '6_per_page'}
                        fontSizes={fontSizes}
                      />
                    )}

                    {/* Cutting line guide between cards in 3_per_page layout */}
                    {cardLayout === '3_per_page' && idx < pageGroup.length - 1 && (
                      <div className="relative my-0.5 flex items-center justify-center f4-cut-line-3">
                        <div className="border-t border-dashed border-slate-400 print:border-black/60 w-full" />
                        <span className="absolute bg-white px-2 text-[7.5px] text-slate-500 print:text-black font-mono flex items-center gap-1">
                          ✂️ Garis Potong Kertas F4 ({idx + 1}/3)
                        </span>
                      </div>
                    )}

                    {/* Cutting line guide between cards in 4_per_page layout */}
                    {cardLayout === '4_per_page' && idx < pageGroup.length - 1 && (
                      <div className="relative my-0.5 flex items-center justify-center f4-cut-line-4">
                        <div className="border-t border-dashed border-slate-400 print:border-black/60 w-full" />
                        <span className="absolute bg-white px-2 text-[7.5px] text-slate-500 print:text-black font-mono flex items-center gap-1">
                          ✂️ Garis Potong Kertas F4 ({idx + 1}/4)
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Edit Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Pengaturan Jadwal Mata Pelajaran pada Kartu</h3>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Judul Tabel Jadwal (Kanan Kartu)</label>
                  {customScheduleTitle && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomScheduleTitle(null);
                        try {
                          localStorage.removeItem('custom_exam_schedule_title');
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
                      title="Kembalikan ke judul otomatis sesuai jenis ujian yang dipilih"
                    >
                      Gunakan Otomatis ({config.examType || 'STS'})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={scheduleTitle}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomScheduleTitle(val);
                    try {
                      localStorage.setItem('custom_exam_schedule_title', val);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  placeholder={defaultScheduleTitle}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-bold uppercase text-xs"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">Pilihan Cepat:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomScheduleTitle(null);
                      try {
                        localStorage.removeItem('custom_exam_schedule_title');
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer border ${
                      !customScheduleTitle 
                        ? 'bg-indigo-600 text-white border-indigo-700' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    Otomatis ({config.examType || 'STS'} {config.semester?.toUpperCase() || 'GANJIL'})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const val = `JADWAL ASESMEN ${config.examType || 'STS'} KELAS VII, VIII & IX`;
                      setCustomScheduleTitle(val);
                      try {
                        localStorage.setItem('custom_exam_schedule_title', val);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold cursor-pointer border border-slate-200"
                  >
                    Asesmen {config.examType || 'STS'}
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800">Daftar Sesi Ujian ({localSchedules.length} Mata Pelajaran)</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = 'sch-' + Date.now();
                      const updated = [
                        ...localSchedules,
                        {
                          id: newId,
                          dayName: 'Senin',
                          date: '08 Juni 2026',
                          sessionTime: '07.30–09.00',
                          subject: 'Mata Pelajaran Baru',
                          targetLevel: 'Semua Kelas',
                        },
                      ];
                      setLocalSchedules(updated);
                      setActivePreset('custom');
                    }}
                    className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Sesi</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {localSchedules.map((sch, sIdx) => (
                    <div key={sch.id} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-md">
                      <span className="w-5 text-center font-mono font-bold text-slate-400 shrink-0">{sIdx + 1}</span>
                      <input
                        type="text"
                        value={sch.dayName}
                        onChange={(e) => {
                          const copy = [...localSchedules];
                          copy[sIdx] = { ...copy[sIdx], dayName: e.target.value };
                          setLocalSchedules(copy);
                          setActivePreset('custom');
                        }}
                        placeholder="Hari"
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                      />
                      <input
                        type="text"
                        value={sch.date}
                        onChange={(e) => {
                          const copy = [...localSchedules];
                          copy[sIdx] = { ...copy[sIdx], date: e.target.value };
                          setLocalSchedules(copy);
                          setActivePreset('custom');
                        }}
                        placeholder="Tanggal"
                        className="w-28 px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                      />
                      <input
                        type="text"
                        value={sch.sessionTime}
                        onChange={(e) => {
                          const copy = [...localSchedules];
                          copy[sIdx] = { ...copy[sIdx], sessionTime: e.target.value };
                          setLocalSchedules(copy);
                          setActivePreset('custom');
                        }}
                        placeholder="Waktu"
                        className="w-28 px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                      />
                      <input
                        type="text"
                        value={sch.subject}
                        onChange={(e) => {
                          const copy = [...localSchedules];
                          copy[sIdx] = { ...copy[sIdx], subject: e.target.value };
                          setLocalSchedules(copy);
                          setActivePreset('custom');
                        }}
                        placeholder="Nama Mata Pelajaran"
                        className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs bg-white font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = localSchedules.filter((_, i) => i !== sIdx);
                          setLocalSchedules(filtered);
                          setActivePreset('custom');
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                        title="Hapus baris ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectPreset('sts')}
                  className="px-2.5 py-1 text-[11px] bg-emerald-700 text-white rounded font-bold hover:bg-emerald-800 cursor-pointer shadow-2xs"
                >
                  Gunakan STS (17 Mapel)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('mts')}
                  className="px-2.5 py-1 text-[11px] bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Reset SAS (11 Mapel)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('sample_image')}
                  className="px-2.5 py-1 text-[11px] bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Reset Gambar (12 Mapel)
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onUpdateSchedules) onUpdateSchedules(localSchedules);
                  setShowScheduleModal(false);
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs cursor-pointer shadow-xs"
              >
                Terapkan ke Kartu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Helper Modal for iFrame / Sandbox */}
      {showPrintHelperModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs no-print">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Perintah Cetak Terkirim</h3>
                  <span className="text-[10px] text-slate-500 font-medium">Informasi &amp; Solusi Cetak Browser</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintHelperModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Sistem telah memanggil fungsi cetak browser. Namun, karena aplikasi dibuka di dalam <strong>jendela pratinjau (iFrame)</strong>, sebagian peramban web (seperti Google Chrome) sering <strong>memblokir jendela cetak (print dialog) otomatis</strong>.
              </p>
              
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                  <ExternalLink className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Solusi: Buka di Tab Baru Layar Penuh</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-normal">
                  Klik tombol hijau di bawah untuk membuka kartu di tab baru browser. Di tab baru, dialog cetak (<kbd className="font-mono bg-white px-1 py-0.5 rounded border border-emerald-300">Ctrl + P</kbd>) dan penyimpanan PDF akan langsung bekerja normal 100%.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPrintHelperModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-xs cursor-pointer"
              >
                Tutup
              </button>
              <a
                href={printNewTabUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowPrintHelperModal(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors text-xs cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka di Tab Baru Sekarang</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload Logo MTs / Madrasah */}
      {showLogoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs no-print">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Upload Logo MTs / Madrasah</h3>
                  <p className="text-[11px] text-slate-500">
                    Otomatis tampil di kop kartu peserta ujian &amp; lembar administrasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner if any */}
            {logoModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{logoModalError}</span>
              </div>
            )}

            {/* Current Active Logo & Status */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white border border-slate-300 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                  {config.logoUrl ? (
                    <img src={config.logoUrl} alt="Logo MTs" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xl">🏫</span>
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {config.logoUrl ? 'Logo Kustom Sedang Digunakan' : 'Menggunakan Logo Default Standar'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {config.logoUrl ? 'Tersimpan otomatis dan siap cetak' : 'Silakan upload gambar logo MTs Anda'}
                  </span>
                </div>
              </div>

              {config.logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer font-medium"
                  title="Kembalikan ke logo standar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              )}
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsLogoModalDragging(true);
              }}
              onDragLeave={() => setIsLogoModalDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsLogoModalDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleLogoUpload(file);
              }}
              onClick={() => logoModalInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                isLogoModalDragging
                  ? 'border-emerald-500 bg-emerald-50/70'
                  : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={logoModalInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                }}
              />
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                {isProcessingLogoModal ? 'Memproses gambar...' : 'Klik atau Tarik File Logo ke Sini'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mendukung PNG transparan, JPG, SVG, atau WebP (Maksimal 5MB)
              </p>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Atau Pilih Contoh Logo Standar:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handlePresetLogoSelect(PRESET_LOGO_MTS)}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-center transition-all cursor-pointer flex flex-col items-center gap-1.5"
                >
                  <img src={PRESET_LOGO_MTS} alt="Logo MTs" className="w-8 h-8 object-contain" />
                  <span className="text-[10.5px] font-semibold text-slate-700 leading-tight">
                    Logo MTs Madrasah
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetLogoSelect(PRESET_LOGO_KEMENAG)}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-center transition-all cursor-pointer flex flex-col items-center gap-1.5"
                >
                  <img src={PRESET_LOGO_KEMENAG} alt="Logo Kemenag" className="w-8 h-8 object-contain" />
                  <span className="text-[10.5px] font-semibold text-slate-700 leading-tight">
                    Kemenag RI
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetLogoSelect(PRESET_LOGO_TUTWURI)}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-center transition-all cursor-pointer flex flex-col items-center gap-1.5"
                >
                  <img src={PRESET_LOGO_TUTWURI} alt="Logo Tut Wuri" className="w-8 h-8 object-contain" />
                  <span className="text-[10.5px] font-semibold text-slate-700 leading-tight">
                    Tut Wuri Handayani
                  </span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLogoModal(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors text-xs cursor-pointer shadow-xs"
              >
                Selesai &amp; Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload TTD & Stempel */}
      <SignatureStampModal
        isOpen={showSignatureStampModal}
        onClose={() => setShowSignatureStampModal(false)}
        config={config}
        onSaveConfig={(updated) => {
          if (onUpdateConfig) onUpdateConfig(updated);
        }}
      />
    </div>
  );
};

// ==========================================
// 1. SCHEDULE EXAM CARD ITEM (EXACT MATCH TO USER'S IMAGE)
// ==========================================
interface ScheduleExamCardItemProps {
  student: Student;
  config: ExamConfig;
  signatory: 'committee' | 'principal';
  roomDisplayNumber: string;
  scheduleTitle: string;
  groupedDays: GroupedScheduleDay[];
  absenNumber: number | string;
  isF4ThreeCards?: boolean;
  cardDensity?: '4_cards' | '3_cards' | 'standard';
  fontSizes?: CardFontSizes;
}

const ScheduleExamCardItem: React.FC<ScheduleExamCardItemProps> = ({
  student,
  config,
  signatory,
  roomDisplayNumber,
  scheduleTitle,
  groupedDays,
  absenNumber,
  isF4ThreeCards = false,
  cardDensity,
  fontSizes,
}) => {
  const effectiveSigner = config.signatureSigner || signatory;
  const isPrincipal = effectiveSigner === 'principal';
  const signerName = isPrincipal ? config.principalName : config.committeeHeadName;
  const signerNip = isPrincipal ? config.principalNip : config.committeeHeadNip;
  const signerTitle = isPrincipal 
    ? (['MTs', 'MA', 'MI'].includes(config.schoolLevel) ? 'Kepala Madrasah,' : 'Kepala Sekolah,')
    : 'Ketua Pelaksana,';

  const density: '4_cards' | '3_cards' | 'standard' =
    cardDensity || (isF4ThreeCards ? '3_cards' : 'standard');
  const isFour = density === '4_cards';
  const isThree = density === '3_cards';

  const totalSessions = useMemo(() => {
    return groupedDays.reduce((acc, d) => acc + d.sessions.length, 0);
  }, [groupedDays]);
  const isDenseSchedule = totalSessions > 12;

  return (
    <div
      className={`page-break-inside-avoid bg-white border-2 border-black text-black font-sans shadow-xs print:shadow-none w-full mx-auto select-text ${
        isFour
          ? 'p-1 max-w-[820px] f4-card-item-4'
          : isThree
            ? 'p-1 sm:p-1.5 max-w-[830px] f4-card-item-3'
            : 'p-3 sm:p-4 max-w-[850px]'
      }`}
    >
      {/* 2-Column Split: Left = Identitas & Kop, Right = Jadwal UAS & Paraf Pengawas */}
      <div className="grid grid-cols-12 gap-0 border border-black">
        
        {/* ========================================================= */}
        {/* LEFT PANEL: KOP SEKOLAH, KARTU PESERTA, BIODATA, RUANG, TTD */}
        {/* ========================================================= */}
        <div className={`col-span-6 border-r border-black flex flex-col justify-between ${
          isFour ? 'p-1 sm:p-1.5' : isThree ? 'p-1 sm:p-1.5' : 'p-3'
        }`}>
          <div>
            {/* Kop Sekolah */}
            <div className={`flex items-center gap-1.5 ${isFour ? 'pb-0.5' : isThree ? 'pb-0.5' : 'pb-1.5'}`}>
              {/* Emblem / Logo */}
              <div className={`${isFour ? 'w-7 h-7' : isThree ? 'w-7.5 h-7.5 sm:w-8 sm:h-8' : 'w-12 h-12'} shrink-0 flex items-center justify-center`}>
                {config.logoUrl ? (
                  <img
                    src={config.logoUrl}
                    alt="Logo MTs"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Outer Shield */}
                    <path d="M50 6 L88 20 C88 56 50 90 50 90 C50 90 12 56 12 20 Z" fill="#0284c7" stroke="#000" strokeWidth="2.5" />
                    {/* Inner White Shield */}
                    <path d="M50 12 L82 24 C82 52 50 82 50 82 C50 82 18 52 18 24 Z" fill="#f8fafc" stroke="#000" strokeWidth="1" />
                    {/* Star */}
                    <polygon points="50,22 53,30 62,30 55,36 58,45 50,40 42,45 45,36 38,30 47,30" fill="#f59e0b" stroke="#000" strokeWidth="0.8" />
                    {/* Open Book */}
                    <path d="M30 50 C38 46 46 48 50 52 C54 48 62 46 70 50 L70 66 C62 62 54 64 50 68 C46 64 38 62 30 66 Z" fill="#ffffff" stroke="#000" strokeWidth="1.5" />
                    <path d="M50 52 L50 68" stroke="#000" strokeWidth="1.5" />
                    {/* Ribbon base */}
                    <path d="M26 76 Q50 86 74 76" stroke="#000" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </div>

              {/* School Info */}
              <div className="flex-1 text-center pr-1">
                <h3 className={`font-extrabold uppercase tracking-wide leading-tight text-black ${
                  isFour ? 'text-[10px] sm:text-[10.5px]' : isThree ? 'text-[10.5px] sm:text-[11px]' : 'text-[13px] sm:text-sm'
                }`}>
                  {config.schoolName || 'NAMA SEKOLAH ANDA'}
                </h3>
                <p className={`${isFour ? 'text-[7px]' : isThree ? 'text-[7.5px] sm:text-[8px]' : 'text-[9.5px]'} text-black leading-tight mt-0.5`}>
                  {config.address || 'Jalan Gelang Jaya'}
                </p>
                <p className={`${isFour ? 'text-[6.5px]' : isThree ? 'text-[7px] sm:text-[7.5px]' : 'text-[8.5px]'} text-black leading-tight mt-0.5`}>
                  Telp. {config.phone || '....'} Email {config.email || '......'}
                </p>
              </div>
            </div>

            {/* Banner KARTU PESERTA */}
            <div className={`border-y-2 border-black text-center ${isFour ? 'py-0.5 my-0.5' : isThree ? 'py-0.2 my-0.5' : 'py-1 my-1'}`}>
              <h4 className={`font-extrabold uppercase tracking-widest text-black leading-tight ${
                isFour ? 'text-[9.5px] sm:text-[10px]' : isThree ? 'text-[10px] sm:text-[10.5px]' : 'text-sm sm:text-base'
              }`}>
                KARTU PESERTA
              </h4>
            </div>

            {/* Biodata Siswa */}
            <div className={`text-black ${isFour ? 'py-0.5 space-y-0.5 text-[8.5px]' : isThree ? 'py-0.5 space-y-0.2 text-[9px] sm:text-[9.5px]' : 'py-2.5 space-y-1.5 text-xs'}`}>
              <div className="flex items-baseline">
                <span className={`${isFour ? 'w-16 text-[8px]' : isThree ? 'w-18 sm:w-20 text-[8.5px]' : 'w-24 text-[11px] sm:text-xs'} font-normal text-black shrink-0`}>Nama</span>
                <span className="w-2 text-center shrink-0">:</span>
                <span 
                  className={`font-bold uppercase flex-1 truncate ${
                    fontSizes?.nameSize 
                      ? '' 
                      : isFour ? 'text-[8.5px] sm:text-[9px]' : isThree ? 'text-[9px] sm:text-[9.5px]' : 'text-[11px] sm:text-xs'
                  }`}
                  style={fontSizes?.nameSize ? { fontSize: `${fontSizes.nameSize}px`, lineHeight: 1.2 } : undefined}
                >
                  {student.name}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className={`${isFour ? 'w-16 text-[8px]' : isThree ? 'w-18 sm:w-20 text-[8.5px]' : 'w-24 text-[11px] sm:text-xs'} font-normal text-black shrink-0`}>Kelas</span>
                <span className="w-2 text-center shrink-0">:</span>
                <span className={`font-bold flex-1 ${isFour ? 'text-[8.5px] sm:text-[9px]' : isThree ? 'text-[9px] sm:text-[9.5px]' : 'text-[11px] sm:text-xs'}`}>{student.className}</span>
              </div>
              <div className="flex items-baseline">
                <span className={`${isFour ? 'w-16 text-[8px]' : isThree ? 'w-18 sm:w-20 text-[8.5px]' : 'w-24 text-[11px] sm:text-xs'} font-normal text-black shrink-0`}>No. Peserta</span>
                <span className="w-2 text-center shrink-0">:</span>
                <span 
                  className={`font-bold font-mono flex-1 ${
                    fontSizes?.numberSize 
                      ? '' 
                      : isFour ? 'text-[8.5px] sm:text-[9px]' : isThree ? 'text-[9px] sm:text-[9.5px]' : 'text-[11px] sm:text-xs'
                  }`}
                  style={fontSizes?.numberSize ? { fontSize: `${fontSizes.numberSize}px`, lineHeight: 1.2 } : undefined}
                >
                  {student.examNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom section: Ruang Box & Signature */}
          <div className={`${isFour ? 'mt-0.5' : isThree ? 'mt-0.5' : 'mt-2'}`}>
            <div className="flex items-end justify-between gap-2">
              {/* Ruang Box */}
              <div className={`border border-black text-center shrink-0 ${isFour ? 'w-14 sm:w-16' : isThree ? 'w-16 sm:w-18' : 'w-24 sm:w-28'}`}>
                <div className={`border-b border-black font-medium text-black bg-white ${isFour ? 'py-0 text-[7px]' : isThree ? 'py-0 text-[8px]' : 'py-0.5 text-[11px]'}`}>
                  Ruang
                </div>
                <div 
                  className={`font-extrabold text-black leading-none font-sans ${
                    fontSizes?.roomSize 
                      ? 'py-0.5' 
                      : isFour ? 'py-0 text-base sm:text-lg' : isThree ? 'py-0.2 text-xl sm:text-[22px]' : 'py-1 sm:py-2 text-2xl sm:text-3xl'
                  }`}
                  style={fontSizes?.roomSize ? { fontSize: `${fontSizes.roomSize}px`, lineHeight: 1 } : undefined}
                >
                  {roomDisplayNumber}
                </div>
              </div>

              {/* Tanda Tangan Block */}
              <div className={`text-right leading-tight text-black shrink-0 relative ${isFour ? 'text-[7.5px]' : isThree ? 'text-[8px] sm:text-[8.5px]' : 'text-[10px]'}`}>
                <p className="text-black">{config.issuePlace || 'Gresik'}, {config.issueDate || '30 September 2026'}</p>
                <p className="font-semibold mt-0.5 text-black">{signerTitle}</p>
                
                {/* Space for stamp/signature */}
                <div 
                  className="relative flex items-center justify-end my-0.5"
                  style={{
                    height: isFour ? '20px' : isThree ? '24px' : '36px',
                    minWidth: isFour ? '85px' : isThree ? '100px' : '130px'
                  }}
                >
                  {/* Stempel Sekolah / Madrasah (overlapping left with authentic tilt and opacity) */}
                  {config.stampEnabled && config.stampUrl && (
                    <div 
                      className="absolute z-10 pointer-events-none select-none print:opacity-100"
                      style={{
                        right: isFour ? '28px' : isThree ? '36px' : '48px',
                        bottom: isFour ? '-3px' : isThree ? '-4px' : '-6px',
                        width: isFour ? '28px' : isThree ? '34px' : '46px',
                        height: isFour ? '28px' : isThree ? '34px' : '46px',
                        opacity: 0.9,
                        transform: 'rotate(-7deg)',
                      }}
                    >
                      <img src={config.stampUrl} alt="Stempel" className="w-full h-full object-contain" />
                    </div>
                  )}

                  {/* Tanda Tangan Digital (TTD) */}
                  {config.signatureEnabled !== false && config.signatureUrl && (
                    <div 
                      className="relative z-0 flex items-center justify-end"
                      style={{
                        height: isFour ? '18px' : isThree ? '22px' : '32px',
                        maxHeight: isFour ? '18px' : isThree ? '22px' : '32px'
                      }}
                    >
                      <img 
                        src={config.signatureUrl} 
                        alt="Tanda Tangan" 
                        className="h-full w-auto object-contain max-w-[110px]" 
                      />
                    </div>
                  )}
                </div>

                <p className={`font-bold uppercase underline leading-tight text-black relative z-10 ${isFour ? 'text-[8px]' : isThree ? 'text-[9px]' : 'text-[10.5px]'}`}>{signerName}</p>
                <p className={`font-mono mt-0.5 text-black ${isFour ? 'text-[6.5px]' : isThree ? 'text-[7.5px]' : 'text-[9px]'}`}>NIP {signerNip || '-'}</p>
              </div>
            </div>

            {/* Notice Footer */}
            <div className={`text-black border-t border-dotted border-black/40 ${isFour ? 'mt-0.5 pt-0.5 text-[6.5px]' : isThree ? 'mt-0.5 pt-0.5 text-[7px]' : 'mt-3 pt-1 text-[9px]'}`}>
              <span className="underline italic font-medium">PERHATIAN :</span>
              <p className={`italic ${isFour ? 'text-[6.5px]' : isThree ? 'text-[7px]' : 'text-[8.5px]'}`}>Selama ulangan berlangsung, kartu ini harus dibawa</p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANEL: JADWAL UAS, NO. ABSEN & TABEL PARAF PENGAWAS */}
        {/* ========================================================= */}
        <div className={`col-span-6 flex flex-col justify-between bg-white ${
          isFour ? 'p-1 sm:p-1.5' : isThree ? 'p-1 sm:p-1.5' : 'p-2 sm:p-2.5'
        }`}>
          <div>
            {/* Header: Title & No. Absen */}
            <div className="flex items-start justify-between gap-2 pb-0.5 border-b border-black">
              <div className="flex-1 text-center pl-4">
                <h5 className={`font-extrabold uppercase tracking-tight text-black leading-tight ${
                  isFour ? 'text-[8.5px] sm:text-[9px]' : isThree ? 'text-[9.5px] sm:text-[10px]' : 'text-[11px] sm:text-xs'
                }`}>
                  {scheduleTitle}
                </h5>
                <p className={`font-bold uppercase text-black leading-tight mt-0.5 ${
                  isFour ? 'text-[7px] sm:text-[7.5px]' : isThree ? 'text-[7.5px] sm:text-[8px]' : 'text-[10px] sm:text-[10.5px]'
                }`}>
                  TAHUN PELAJARAN {config.academicYear || '2014/2015'}
                </p>
              </div>

              {/* No. Absen */}
              <div className="text-right shrink-0">
                <span className={`font-medium block text-black leading-none ${isFour ? 'text-[7px]' : isThree ? 'text-[7.5px]' : 'text-[9.5px]'}`}>No. Absen</span>
                <span className={`font-mono font-bold text-black block mt-0.5 leading-none ${isFour ? 'text-[10px] sm:text-[11px]' : isThree ? 'text-xs sm:text-[13px]' : 'text-xs sm:text-sm'}`}>
                  {absenNumber}
                </span>
              </div>
            </div>

            {/* Schedule Table */}
            <div className="mt-0.5 overflow-x-auto">
              <table className={`w-full border-collapse border border-black leading-tight text-black ${
                isFour 
                  ? (isDenseSchedule ? 'text-[5.5px]' : 'text-[6.5px]')
                  : isThree 
                    ? (isDenseSchedule ? 'text-[6px]' : 'text-[6.8px]')
                    : (isDenseSchedule ? 'text-[8px] sm:text-[8.5px]' : 'text-[9px] sm:text-[9.5px]')
              }`}>
                <thead>
                  <tr className="bg-slate-100 font-bold text-black border-b border-black">
                    <th className={`border border-black text-center font-bold w-[22%] ${
                      isFour ? 'p-[1px] text-[5.5px]' : isThree ? (isDenseSchedule ? 'p-[1px] text-[6px]' : 'p-0.5 text-[6.8px]') : 'p-1'
                    }`}>
                      Hari/Tgl.
                    </th>
                    <th className={`border border-black text-center font-bold w-[9%] ${
                      isFour ? 'p-[1px] text-[5.5px]' : isThree ? (isDenseSchedule ? 'p-[1px] text-[6px]' : 'p-0.5 text-[6.8px]') : 'p-1'
                    }`}>
                      Jam<br />Ke
                    </th>
                    <th className={`border border-black text-center font-bold w-[21%] ${
                      isFour ? 'p-[1px] text-[5.5px]' : isThree ? (isDenseSchedule ? 'p-[1px] text-[6px]' : 'p-0.5 text-[6.8px]') : 'p-1'
                    }`}>
                      Waktu
                    </th>
                    <th className={`border border-black text-left font-bold w-[32%] pl-1 ${
                      isFour ? 'p-[1px] pl-0.5 text-[5.5px]' : isThree ? (isDenseSchedule ? 'p-[1px] pl-0.5 text-[6px]' : 'p-0.5 pl-1 text-[6.8px]') : 'p-1 pl-1.5'
                    }`}>
                      Mata Pelajaran
                    </th>
                    <th className={`border border-black text-center font-bold w-[16%] ${
                      isFour ? 'p-[1px] text-[5.5px]' : isThree ? (isDenseSchedule ? 'p-[1px] text-[6px]' : 'p-0.5 text-[6.8px]') : 'p-1'
                    }`}>
                      T. Tangan<br />Pengawas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedDays.map((dayGroup) => {
                    const sessionCount = dayGroup.sessions.length;
                    return dayGroup.sessions.map((session, sIdx) => (
                      <tr key={session.id} className="border-b border-black">
                        {/* Day & Date (rowSpan for sessions on the same day) */}
                        {sIdx === 0 && (
                          <td
                            rowSpan={sessionCount}
                            className={`border border-black text-center align-middle font-medium leading-tight bg-white ${
                              isFour 
                                ? 'p-[1px] text-[5.2px]' 
                                : isThree 
                                  ? (isDenseSchedule ? 'p-[1px] text-[5.8px]' : 'p-0.5 text-[6.5px]')
                                  : (isDenseSchedule ? 'p-0.5 text-[7.5px]' : 'p-1')
                            }`}
                          >
                            <div className="font-bold text-black">{dayGroup.dayName}</div>
                            <div className={`text-black mt-0.5 ${
                              isFour ? 'text-[5px]' : isThree ? (isDenseSchedule ? 'text-[5.5px]' : 'text-[6.5px]') : 'text-[8px] sm:text-[8.5px]'
                            }`}>{dayGroup.date}</div>
                          </td>
                        )}

                        {/* Jam Ke */}
                        <td className={`border border-black text-center align-middle font-mono font-semibold ${
                          isFour ? 'p-[1px] text-[5.5px]' : isThree ? (isDenseSchedule ? 'p-[1px] text-[6px]' : 'p-0.5 text-[7px]') : 'p-1'
                        }`}>
                          {session.jamKe}
                        </td>

                        {/* Waktu */}
                        <td className={`border border-black text-center align-middle font-mono ${
                          isFour 
                            ? 'p-[1px] text-[5.2px]' 
                            : isThree 
                              ? (isDenseSchedule ? 'p-[1px] text-[5.8px]' : 'p-0.5 text-[6.5px]')
                              : 'p-1 text-[8.5px] sm:text-[9px]'
                        }`}>
                          {session.time}
                        </td>

                        {/* Mata Pelajaran */}
                        <td className={`border border-black text-left align-middle font-semibold text-black ${
                          isFour 
                            ? 'p-[1px] pl-0.5 text-[5.5px]' 
                            : isThree 
                              ? (isDenseSchedule ? 'p-[1px] pl-0.5 text-[6px]' : 'p-0.5 pl-1 text-[7px]')
                              : 'p-1 pl-1.5'
                        }`}>
                          {session.subject}
                        </td>

                        {/* T. Tangan Pengawas (with numbered slot 1, 2, 3...) */}
                        <td className={`border border-black text-left align-top relative bg-white ${
                          isFour 
                            ? 'p-[1px] h-2.5 text-[5px]' 
                            : isThree 
                              ? (isDenseSchedule ? 'p-[1px] h-2.5 text-[5.5px]' : 'p-0.5 h-3 text-[6px]')
                              : (isDenseSchedule ? 'p-0.5 h-4 text-[7px]' : 'p-1 h-6 sm:h-7')
                        }`}>
                          <span className={`font-mono font-bold text-black block leading-none ${
                            isFour ? 'text-[5px]' : isThree ? (isDenseSchedule ? 'text-[5.5px]' : 'text-[6.5px]') : 'text-[8.5px]'
                          }`}>
                            {session.overallIndex}
                          </span>
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`text-right text-slate-500 italic mt-0.5 ${isFour ? 'text-[6.5px]' : isThree ? 'text-[6.5px]' : 'text-[8px]'}`}>
            * Paraf pengawas ruang wajib diisi setiap sesi ujian
          </div>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// 2. COMPACT EXAM CARD ITEM (PHOTO & BARCODE)
// ==========================================
interface CompactExamCardItemProps {
  student: Student;
  config: ExamConfig;
  signatory: 'committee' | 'principal';
  isCompactDense?: boolean;
  fontSizes?: CardFontSizes;
}

const CompactExamCardItem: React.FC<CompactExamCardItemProps> = ({
  student,
  config,
  signatory,
  isCompactDense = false,
  fontSizes,
}) => {
  const effectiveSigner = config.signatureSigner || signatory;
  const isPrincipal = effectiveSigner === 'principal';
  const signerName = isPrincipal ? config.principalName : config.committeeHeadName;
  const signerNip = isPrincipal ? config.principalNip : config.committeeHeadNip;
  const signerTitle = isPrincipal 
    ? (['MTs', 'MA', 'MI'].includes(config.schoolLevel) ? 'Kepala Madrasah,' : 'Kepala Sekolah,')
    : 'Ketua Panitia Ujian,';

  return (
    <div className={`page-break-inside-avoid bg-white border-2 border-slate-900 rounded-lg shadow-xs print:shadow-none relative overflow-hidden flex flex-col justify-between text-slate-900 font-sans ${
      isCompactDense ? 'p-2.5 sm:p-3' : 'p-4 sm:p-5'
    }`}>
      <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-900"></div>

      {/* Header */}
      <div className={`flex items-start justify-between border-b border-slate-200 ${isCompactDense ? 'pb-2 mt-0.5' : 'pb-3 mt-1'}`}>
        <div className="flex gap-2.5 items-center">
          <div className={`${isCompactDense ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base'} rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-bold shrink-0 overflow-hidden`}>
            {config.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
            ) : (
              <span>🎓</span>
            )}
          </div>
          <div>
            <h4 className={`${isCompactDense ? 'text-[11px]' : 'text-xs'} font-bold text-slate-900 leading-tight uppercase tracking-tight`}>
              KARTU TANDA PESERTA UJIAN
            </h4>
            <p className="text-[10px] text-slate-600 font-semibold uppercase mt-0.5">
              {config.examTitle}
            </p>
            <p className="text-[9px] text-slate-400 font-medium truncate max-w-[220px]">
              {config.schoolName} • TP {config.academicYear}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span 
            className="text-[9px] font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-800 uppercase inline-block"
            style={fontSizes?.roomSize ? { fontSize: `${Math.min(fontSizes.roomSize, 14)}px` } : undefined}
          >
            {student.roomName || 'BELUM DIATUR'}
          </span>
          <p className="text-[9px] text-slate-500 mt-1">
            MEJA : <strong className="text-slate-900 font-mono font-bold text-[10px]">{student.seatNumber ? String(student.seatNumber).padStart(2, '0') : '-'}</strong>
          </p>
        </div>
      </div>

      {/* Main Student Bio and Photo */}
      <div className={`flex gap-3 sm:gap-4 my-auto ${isCompactDense ? 'py-2' : 'py-3'}`}>
        <div className={`${isCompactDense ? 'w-18' : 'w-22'} shrink-0 flex flex-col items-center gap-1.5`}>
          <div className="w-full aspect-[3/4] bg-slate-50 border border-slate-200 rounded flex flex-col items-center justify-center text-slate-400 shadow-2xs">
            <span className="text-sm">👤</span>
            <span className="text-[7.5px] font-mono font-semibold uppercase text-slate-400 mt-0.5">FOTO 3x4</span>
          </div>
          
          <div className="w-full bg-slate-50 py-0.5 flex flex-col items-center justify-center border border-slate-200 rounded">
            <BarcodeSVG value={student.examNumber} width={isCompactDense ? 65 : 80} height={isCompactDense ? 14 : 18} showText={false} />
            <span className="text-[7px] font-mono font-bold text-slate-700 mt-0.5">{student.examNumber}</span>
          </div>
        </div>

        <div className={`flex-1 grid grid-cols-2 gap-y-1.5 gap-x-2 text-xs ${isCompactDense ? 'text-[10px]' : 'text-xs'}`}>
          <div className="col-span-2">
            <span className="text-[7.5px] uppercase font-bold text-slate-400 tracking-wider block">Nomor Peserta</span>
            <span 
              className="font-mono font-bold text-indigo-950 tracking-wide block"
              style={fontSizes?.numberSize ? { fontSize: `${fontSizes.numberSize}px` } : { fontSize: isCompactDense ? '12px' : '13px' }}
            >
              {student.examNumber}
            </span>
          </div>

          <div className="col-span-2">
            <span className="text-[7.5px] uppercase font-bold text-slate-400 tracking-wider block">Nama Lengkap Siswa</span>
            <span 
              className="font-bold text-slate-900 uppercase truncate block"
              style={fontSizes?.nameSize ? { fontSize: `${fontSizes.nameSize}px` } : { fontSize: isCompactDense ? '11px' : '12px' }}
            >
              {student.name}
            </span>
          </div>

          <div>
            <span className="text-[7.5px] uppercase font-bold text-slate-400 tracking-wider block">NISN / NIS</span>
            <span className="font-semibold text-slate-700 font-mono text-[10.5px]">{student.nisn} / {student.nis}</span>
          </div>

          <div>
            <span className="text-[7.5px] uppercase font-bold text-slate-400 tracking-wider block">Tingkat / Kelas</span>
            <span className="font-semibold text-slate-800 text-[10.5px]">{student.className}</span>
          </div>

          <div className="col-span-2">
            <span className="text-[7.5px] uppercase font-bold text-slate-400 tracking-wider block">Jenis Kelamin</span>
            <span className="font-medium text-slate-600 text-[10.5px]">
              {student.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`border-t border-dashed border-slate-200 flex items-end justify-between ${isCompactDense ? 'pt-1.5 text-[8px]' : 'pt-2.5 text-[8.5px]'}`}>
        <div className="space-y-0.5">
          <p className="text-slate-400 italic font-medium">* Harap dibawa saat pelaksanaan ujian</p>
          <p className="text-slate-400 italic font-medium">* Tempel pada sudut kiri atas meja ujian</p>
          <p className="text-slate-400 italic font-medium">* Dilarang membawa HP / perangkat digital</p>
        </div>

        <div className="text-right relative">
          <p className="text-slate-500 font-medium">{config.issuePlace}, {config.issueDate}</p>
          <p className="font-bold text-slate-700 mt-0.5">{signerTitle}</p>
          
          <div 
            className="relative flex items-center justify-end my-0.5"
            style={{ height: isCompactDense ? '22px' : '30px', minWidth: '105px' }}
          >
            {/* Stempel */}
            {config.stampEnabled && config.stampUrl && (
              <div 
                className="absolute z-10 pointer-events-none select-none print:opacity-100"
                style={{
                  right: isCompactDense ? '28px' : '38px',
                  bottom: '-3px',
                  width: isCompactDense ? '28px' : '36px',
                  height: isCompactDense ? '28px' : '36px',
                  opacity: 0.88,
                  transform: 'rotate(-7deg)'
                }}
              >
                <img src={config.stampUrl} alt="Stempel" className="w-full h-full object-contain" />
              </div>
            )}

            {/* TTD */}
            {config.signatureEnabled !== false && config.signatureUrl ? (
              <div 
                className="relative z-0 flex items-center justify-end"
                style={{ height: isCompactDense ? '20px' : '28px' }}
              >
                <img src={config.signatureUrl} alt="TTD" className="h-full w-auto object-contain max-w-[100px]" />
              </div>
            ) : (
              <span className="font-serif italic text-slate-300 text-[9px] select-none mr-2">ttd &amp; cap</span>
            )}
          </div>

          <p className="font-bold text-slate-900 border-b border-slate-900 inline-block leading-tight relative z-10">{signerName}</p>
          <p className="text-slate-500 font-mono text-[7px] mt-0.5">NIP. {signerNip || '-'}</p>
        </div>
      </div>
    </div>
  );
};
