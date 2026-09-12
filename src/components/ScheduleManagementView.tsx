import React, { useState, useMemo } from 'react';
import { ActiveTab, ExamConfig, ExamScheduleItem, Student } from '../types';
import { 
  Calendar, 
  Upload, 
  Download, 
  Plus, 
  Printer, 
  RotateCcw, 
  Edit3, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Coffee, 
  BookOpen, 
  CheckCircle2, 
  Search, 
  Layers, 
  Filter, 
  Sparkles,
  Info,
  Clock,
  X,
  FileSpreadsheet,
  IdCard,
  UserCheck,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { ScheduleImportModal } from './ScheduleImportModal';
import { exportSchedulesToCsv, downloadCsvFile, USER_UPLOADED_SCHEDULE_TEMPLATE_RAW, parseScheduleText } from '../utils/scheduleParser';
import { MTS_MANBAUL_ISLAM_STS_SCHEDULE } from '../data/schedulePresets';

interface ScheduleManagementViewProps {
  config: ExamConfig;
  schedules: ExamScheduleItem[];
  onUpdateSchedules: (schedules: ExamScheduleItem[]) => void;
  students?: Student[];
  setActiveTab?: (tab: ActiveTab) => void;
}

const COMMON_SUBJECT_SUGGESTIONS = [
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam (IPA)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Bahasa Inggris',
  'Pendidikan Pancasila (PPKn)',
  'Alquran Hadist',
  'Akidah Akhlak',
  'Fiqih',
  'Sejarah Kebudayaan Islam (SKI)',
  'Bahasa Arab',
  'Bahasa Sunda',
  'TIK / Informatika',
  'Prakarya',
  'Seni Budaya',
  'Penjasorkes / PJOK',
  'BTQ (Baca Tulis Al-Quran)',
  'Istirahat',
];

export const ScheduleManagementView: React.FC<ScheduleManagementViewProps> = ({
  config,
  schedules,
  onUpdateSchedules,
  setActiveTab,
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  // Edit / Add Modal State
  const [editingItem, setEditingItem] = useState<ExamScheduleItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [itemForm, setItemForm] = useState<{
    dayName: string;
    date: string;
    sessionTime: string;
    subject: string;
    targetLevel: string;
    isBreak: boolean;
  }>({
    dayName: 'Senin',
    date: '28 September 2026',
    sessionTime: '07.30-08.30',
    subject: '',
    targetLevel: 'Semua Kelas',
    isBreak: false,
  });

  // Calculate distinct days
  const distinctDays = useMemo(() => {
    const map = new Map<string, string>();
    schedules.forEach((s) => {
      if (!map.has(s.dayName)) {
        map.set(s.dayName, s.date);
      }
    });
    return Array.from(map.entries()).map(([dayName, date]) => ({ dayName, date }));
  }, [schedules]);

  // Summary counts
  const totalExams = schedules.filter((s) => !s.isBreak).length;
  const totalBreaks = schedules.filter((s) => s.isBreak).length;

  // Group schedules by day
  const groupedSchedules = useMemo(() => {
    const groups: { dayName: string; date: string; items: ExamScheduleItem[] }[] = [];
    const map = new Map<string, ExamScheduleItem[]>();

    schedules.forEach((item) => {
      const key = `${item.dayName}|${item.date}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });

    map.forEach((items, key) => {
      const [dayName, date] = key.split('|');
      groups.push({
        dayName,
        date,
        items,
      });
    });

    return groups;
  }, [schedules]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return groupedSchedules
      .filter((group) => {
        if (selectedDayFilter !== 'ALL' && group.dayName !== selectedDayFilter) return false;
        return true;
      })
      .map((group) => {
        const filteredItems = group.items.filter((item) => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          return (
            item.subject.toLowerCase().includes(q) ||
            item.sessionTime.toLowerCase().includes(q) ||
            item.dayName.toLowerCase().includes(q) ||
            item.date.toLowerCase().includes(q)
          );
        });
        return { ...group, items: filteredItems };
      })
      .filter((group) => group.items.length > 0);
  }, [groupedSchedules, selectedDayFilter, searchQuery]);

  // Import handler
  const handleImportSchedules = (newSchedules: ExamScheduleItem[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      onUpdateSchedules(newSchedules);
    } else {
      onUpdateSchedules([...schedules, ...newSchedules]);
    }
  };

  // Quick reset to the 23-session user template
  const handleResetToUserTemplate = () => {
    if (window.confirm('Muat ulang 23 sesi jadwal ulangan STS (sesuai template yang Anda upload)?')) {
      const result = parseScheduleText(USER_UPLOADED_SCHEDULE_TEMPLATE_RAW);
      onUpdateSchedules(result.schedules);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    const csv = exportSchedulesToCsv(schedules);
    downloadCsvFile(csv, `jadwal_${config.examType.toLowerCase()}_${config.schoolName.toLowerCase().replace(/\s+/g, '_')}.csv`);
  };

  // Add Item
  const handleOpenAdd = (defaultDay?: string, defaultDate?: string) => {
    const day = defaultDay || distinctDays[0]?.dayName || 'Senin';
    const date = defaultDate || distinctDays[0]?.date || '28 September 2026';
    setItemForm({
      dayName: day,
      date,
      sessionTime: '07.30-08.30',
      subject: '',
      targetLevel: 'Semua Kelas',
      isBreak: false,
    });
    setEditingItem(null);
    setIsAddingNew(true);
  };

  // Edit Item
  const handleOpenEdit = (item: ExamScheduleItem) => {
    setItemForm({
      dayName: item.dayName,
      date: item.date,
      sessionTime: item.sessionTime,
      subject: item.subject,
      targetLevel: item.targetLevel || 'Semua Kelas',
      isBreak: !!item.isBreak,
    });
    setEditingItem(item);
    setIsAddingNew(false);
  };

  // Save Item
  const handleSaveItemForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.subject.trim()) return;

    if (editingItem) {
      // Update
      const updated = schedules.map((s) => {
        if (s.id === editingItem.id) {
          return {
            ...s,
            dayName: itemForm.dayName,
            date: itemForm.date,
            sessionTime: itemForm.sessionTime,
            subject: itemForm.subject.trim(),
            targetLevel: itemForm.isBreak ? 'Semua' : itemForm.targetLevel,
            isBreak: itemForm.isBreak,
          };
        }
        return s;
      });
      onUpdateSchedules(updated);
    } else {
      // Add
      const newItem: ExamScheduleItem = {
        id: `sch-${Date.now()}`,
        dayName: itemForm.dayName,
        date: itemForm.date,
        sessionTime: itemForm.sessionTime,
        subject: itemForm.subject.trim(),
        targetLevel: itemForm.isBreak ? 'Semua' : itemForm.targetLevel,
        isBreak: itemForm.isBreak,
      };
      onUpdateSchedules([...schedules, newItem]);
    }

    setEditingItem(null);
    setIsAddingNew(false);
  };

  // Delete Item
  const handleDeleteItem = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus sesi jadwal ini?')) {
      const updated = schedules.filter((s) => s.id !== id);
      onUpdateSchedules(updated);
    }
  };

  // Clear all schedules
  const handleClearAllSchedules = () => {
    onUpdateSchedules([]);
    setShowClearConfirmModal(false);
  };

  // Move up/down within list
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= schedules.length) return;
    const next = [...schedules];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    onUpdateSchedules(next);
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Print error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Jadwal Pelaksanaan Ujian / Ulangan
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {config.examType} — Semester {config.semester}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Master Data Aktif</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Data jadwal di sini menjadi rujukan otomatis untuk <strong>Kartu Peserta Ujian</strong>,{' '}
                <strong>Jadwal Pengawas Ruang (Matriks)</strong>, <strong>Presensi Digital</strong>, dan{' '}
                <strong>Daftar Hadir Resmi</strong>.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-indigo-100"
            >
              <Upload className="w-4 h-4" />
              <span>Import Template (Excel / CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAdd()}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Tambah Sesi</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Cetak Jadwal Resmi (Format Mading / Panitia)"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak Jadwal</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all cursor-pointer"
              title="Ekspor Jadwal ke CSV"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleResetToUserTemplate}
              className="p-2 text-slate-500 hover:text-amber-600 bg-white hover:bg-amber-50 border border-slate-300 rounded-xl transition-all cursor-pointer"
              title="Muat Ulang Template 23 Sesi STS Saya"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowClearConfirmModal(true)}
              disabled={schedules.length === 0}
              className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Hapus atau kosongkan seluruh sesi jadwal ujian"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Kosongkan Jadwal</span>
            </button>
          </div>
        </div>

        {/* Counter KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Baris Sesi
            </span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">
              {schedules.length} Sesi
            </span>
          </div>

          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider block">
                Mapel Diujikan
              </span>
              <BookOpen className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-xl font-bold text-indigo-900 mt-0.5 block">
              {totalExams} Mata Pelajaran
            </span>
          </div>

          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                Jam Istirahat
              </span>
              <Coffee className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xl font-bold text-amber-900 mt-0.5 block">
              {totalBreaks} Waktu Istirahat
            </span>
          </div>

          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                Hari Pelaksanaan
              </span>
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xl font-bold text-emerald-900 mt-0.5 block">
              {distinctDays.length} Hari Ujian
            </span>
          </div>
        </div>

        {/* Integration Direct Links Banner */}
        {setActiveTab && (
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Data Terkoneksi:</strong> Jadwal ini langsung diterapkan tanpa perlu input ulang di modul:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('cards')}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <IdCard className="w-3.5 h-3.5" />
                <span>Kartu Peserta Ujian</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('proctors')}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Jadwal &amp; Absen Pengawas</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        {/* Day Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedDayFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedDayFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua Hari ({schedules.length})
          </button>
          {distinctDays.map(({ dayName, date }) => {
            const count = schedules.filter((s) => s.dayName === dayName).length;
            const isSelected = selectedDayFilter === dayName;
            return (
              <button
                key={dayName}
                type="button"
                onClick={() => setSelectedDayFilter(dayName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{dayName}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari mapel / waktu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Schedules Grouped by Day */}
      <div className="space-y-5 no-print">
        {filteredGroups.length === 0 ? (
          schedules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 sm:p-12 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3.5 border border-rose-100">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Jadwal Ujian Masih Kosong</h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                Belum ada sesi jadwal yang terdaftar atau seluruh jadwal baru saja dikosongkan. Anda dapat mengimpor file template Excel/CSV Anda, memuat template bawaan (23 sesi STS), atau menambahkan sesi baru secara manual.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer shadow-indigo-100"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import Template (Excel / CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToUserTemplate}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>Muat Template STS Bawaan (23 Sesi)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAdd()}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>Tambah Sesi Manual</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Tidak Ada Jadwal yang Cocok</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Tidak ada sesi jadwal yang sesuai dengan filter atau pencarian Anda saat ini.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedDayFilter('ALL');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Reset Filter &amp; Pencarian</span>
              </button>
            </div>
          )
        ) : (
          filteredGroups.map((group, gIdx) => {
            return (
              <div 
                key={`${group.dayName}-${group.date}-${gIdx}`}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Day Header */}
                <div className="px-5 py-3 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {group.dayName}, {group.date}
                    </h3>
                    <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      {group.items.length} sesi
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAdd(group.dayName, group.date)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Sesi di Hari Ini</span>
                  </button>
                </div>

                {/* Day Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-white text-slate-500 border-b border-slate-100 uppercase text-[10.5px] tracking-wider font-semibold">
                      <tr>
                        <th className="py-2.5 px-4 w-12 text-center">No</th>
                        <th className="py-2.5 px-4 w-36">Waktu Sesi</th>
                        <th className="py-2.5 px-4">Mata Pelajaran</th>
                        <th className="py-2.5 px-4 w-36">Sasaran Tingkat</th>
                        <th className="py-2.5 px-4 w-28 text-center">Status / Tipe</th>
                        <th className="py-2.5 px-4 w-28 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.items.map((item, idx) => {
                        const globalIndex = schedules.findIndex((s) => s.id === item.id);
                        return (
                          <tr 
                            key={item.id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              item.isBreak ? 'bg-amber-50/40' : ''
                            }`}
                          >
                            <td className="py-2.5 px-4 text-center font-mono text-slate-400 font-semibold">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-4 font-mono font-medium text-slate-700 text-[11.5px] whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{item.sessionTime}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                {item.isBreak ? (
                                  <span className="p-1 rounded-md bg-amber-100 text-amber-700">
                                    <Coffee className="w-3.5 h-3.5" />
                                  </span>
                                ) : (
                                  <span className="p-1 rounded-md bg-indigo-50 text-indigo-600">
                                    <BookOpen className="w-3.5 h-3.5" />
                                  </span>
                                )}
                                <span className={`text-xs ${item.isBreak ? 'font-semibold text-amber-900 italic' : 'font-bold text-slate-900'}`}>
                                  {item.subject}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {item.isBreak ? '-' : (item.targetLevel || 'Semua Kelas')}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {item.isBreak ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Istirahat
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Mapel Ujian
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMove(globalIndex, 'up')}
                                  disabled={globalIndex === 0}
                                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                  title="Geser Naik"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMove(globalIndex, 'down')}
                                  disabled={globalIndex === schedules.length - 1}
                                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                  title="Geser Turun"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(item)}
                                  className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                  title="Edit Sesi"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                                  title="Hapus Sesi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add / Edit Sesi */}
      {(isAddingNew || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-900 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingItem ? 'Edit Sesi Jadwal' : 'Tambah Sesi Jadwal Ujian'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsAddingNew(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemForm} className="space-y-4">
              {/* Tipe Sesi Switch */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setItemForm((prev) => ({ ...prev, isBreak: false, subject: prev.subject === 'Istirahat' ? '' : prev.subject }));
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !itemForm.isBreak ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Mata Pelajaran Ujian
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItemForm((prev) => ({ ...prev, isBreak: true, subject: 'Istirahat' }));
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    itemForm.isBreak ? 'bg-amber-100 text-amber-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Jam Istirahat (Break)
                </button>
              </div>

              {/* Hari & Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hari Pelaksanaan:
                  </label>
                  <select
                    value={itemForm.dayName}
                    onChange={(e) => setItemForm({ ...itemForm, dayName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Senin">Senin</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                    <option value="Sabtu">Sabtu</option>
                    <option value="Minggu">Minggu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal:
                  </label>
                  <input
                    type="text"
                    value={itemForm.date}
                    onChange={(e) => setItemForm({ ...itemForm, date: e.target.value })}
                    placeholder="Contoh: 28 September 2026"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Mata Pelajaran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {itemForm.isBreak ? 'Keterangan Istirahat:' : 'Nama Mata Pelajaran:'}
                </label>
                <input
                  type="text"
                  value={itemForm.subject}
                  onChange={(e) => setItemForm({ ...itemForm, subject: e.target.value })}
                  placeholder={itemForm.isBreak ? 'Istirahat' : 'Contoh: Bahasa Indonesia, Matematika, IPA'}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
                  required
                />

                {/* Suggestions chip */}
                {!itemForm.isBreak && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[10px] text-slate-400 self-center mr-1">Cepat:</span>
                    {COMMON_SUBJECT_SUGGESTIONS.slice(0, 8).map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setItemForm({ ...itemForm, subject: sub })}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Waktu Sesi & Sasaran Tingkat */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Waktu / Jam Sesi:
                  </label>
                  <input
                    type="text"
                    value={itemForm.sessionTime}
                    onChange={(e) => setItemForm({ ...itemForm, sessionTime: e.target.value })}
                    placeholder="Contoh: 07.30-08.30"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sasaran Kelas:
                  </label>
                  <input
                    type="text"
                    value={itemForm.targetLevel}
                    onChange={(e) => setItemForm({ ...itemForm, targetLevel: e.target.value })}
                    placeholder="Semua Kelas"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    disabled={itemForm.isBreak}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setIsAddingNew(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Print Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pratinjau Dokumen Jadwal Ujian Resmi (Kop Sekolah &amp; Panitia)
                </h3>
                <p className="text-xs text-slate-500">
                  Format resmi siap cetak untuk papan pengumuman/mading, ruang panitia, dan pengawas.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-8 overflow-y-auto bg-white flex-1 font-serif text-slate-900 text-xs">
              {/* Kop Surat */}
              <div className="text-center pb-3 border-b-2 border-slate-900 relative">
                {config.logoUrl && (
                  <img
                    src={config.logoUrl}
                    alt="Logo"
                    className="absolute left-2 top-0 w-16 h-16 object-contain"
                  />
                )}
                <h2 className="text-sm font-bold uppercase tracking-wide">
                  KEMENTERIAN AGAMA REPUBLIK INDONESIA
                </h2>
                <h1 className="text-base font-black uppercase tracking-wider mt-0.5">
                  {config.schoolName}
                </h1>
                <p className="text-[10px] font-sans text-slate-600 mt-0.5">
                  {config.address}, {config.subdistrict}, {config.district} - {config.province}
                </p>
                <p className="text-[10px] font-sans text-slate-600">
                  Telp: {config.phone || '-'} | Email: {config.email || '-'} | Website: {config.website || '-'}
                </p>
              </div>

              {/* Title */}
              <div className="text-center my-4 font-sans">
                <h3 className="text-xs font-bold uppercase underline tracking-wide">
                  JADWAL {config.examTitle.toUpperCase()}
                </h3>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  TAHUN PELAJARAN {config.academicYear}
                </p>
              </div>

              {/* Table */}
              <table className="w-full text-left border border-slate-900 border-collapse my-3 font-sans text-[11px]">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-900 text-center">
                    <th className="border border-slate-900 py-1.5 px-2 w-10">NO</th>
                    <th className="border border-slate-900 py-1.5 px-3 w-48">HARI / TANGGAL</th>
                    <th className="border border-slate-900 py-1.5 px-2 w-16">JAM KE</th>
                    <th className="border border-slate-900 py-1.5 px-3 w-32">WAKTU</th>
                    <th className="border border-slate-900 py-1.5 px-3">MATA PELAJARAN</th>
                    <th className="border border-slate-900 py-1.5 px-3 w-32">SASARAN</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((item, idx) => (
                    <tr 
                      key={item.id}
                      className={item.isBreak ? 'bg-slate-50 font-medium italic' : ''}
                    >
                      <td className="border border-slate-900 py-1.5 px-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-900 py-1.5 px-3 font-semibold">{item.dayName}, {item.date}</td>
                      <td className="border border-slate-900 py-1.5 px-2 text-center">{item.isBreak ? '-' : (idx + 1)}</td>
                      <td className="border border-slate-900 py-1.5 px-3 text-center font-mono text-[10.5px]">{item.sessionTime}</td>
                      <td className={`border border-slate-900 py-1.5 px-3 ${item.isBreak ? 'text-slate-600' : 'font-bold'}`}>
                        {item.subject}
                      </td>
                      <td className="border border-slate-900 py-1.5 px-3 text-center">{item.isBreak ? '-' : (item.targetLevel || 'Semua Kelas')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatory */}
              <div className="flex justify-between items-start mt-8 pt-4 font-sans text-[11px]">
                <div className="w-56 text-center">
                  <p>Mengetahui,</p>
                  <p className="font-bold">
                    {['MTs', 'MA', 'MI'].includes(config.schoolLevel) ? 'Kepala Madrasah' : 'Kepala Sekolah'}
                  </p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{config.principalName}</p>
                  <p className="text-[10px] text-slate-600">NIP. {config.principalNip || '-'}</p>
                </div>

                <div className="w-56 text-center">
                  <p>{config.issuePlace}, {config.issueDate}</p>
                  <p className="font-bold">Ketua Panitia Ujian,</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{config.committeeHeadName}</p>
                  <p className="text-[10px] text-slate-600">NIP. {config.committeeHeadNip || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Import Modal */}
      <ScheduleImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSchedules={handleImportSchedules}
        currentScheduleCount={schedules.length}
      />

      {/* Confirmation Modal for Clearing Schedules */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Kosongkan Seluruh Jadwal Ujian?
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Tindakan ini akan menghapus semua (<strong>{schedules.length} sesi</strong>) jadwal ujian yang tersimpan saat ini.
                </p>
                <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-normal">
                  <strong>Pemberitahuan Efek:</strong> Jadwal yang dikosongkan akan langsung diterapkan pada <em>Kartu Peserta Ujian</em> dan <em>Jadwal/Absen Pengawas Ruang</em>. Anda dapat mengimpor file jadwal baru atau memuat template bawaan kapan saja.
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearAllSchedules}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-rose-100"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Kosongkan Jadwal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
