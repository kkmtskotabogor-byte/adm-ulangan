import React, { useState, useEffect, useMemo } from 'react';
import { ExamConfig, ExamRoom, ExamScheduleItem, Proctor, ProctorAttendanceRecord } from '../types';
import { 
  UserCheck, 
  Plus, 
  Search, 
  RotateCcw, 
  Printer, 
  Edit3, 
  Trash2, 
  FileSpreadsheet, 
  CheckCircle2, 
  X, 
  Phone, 
  Building2, 
  Calendar, 
  Clock, 
  FileText,
  ShieldCheck,
  CheckSquare,
  Users,
  PenTool,
  ChevronRight
} from 'lucide-react';
import { initialProctors } from '../data/initialData';
import { DigitalProctorCheckIn } from './DigitalProctorCheckIn';
import { getInitialAttendanceRecords } from '../data/initialAttendance';
import { ProctorScheduleMatrixView } from './ProctorScheduleMatrixView';
import { ProctorExcelImportModal } from './ProctorExcelImportModal';
import {
  subscribeToAttendanceRecords,
  saveAttendanceRecordToCloud,
  deleteAttendanceRecordFromCloud,
} from '../lib/firebase';

interface ProctorsViewProps {
  config: ExamConfig;
  proctors: Proctor[];
  rooms: ExamRoom[];
  schedules: ExamScheduleItem[];
  onAddProctor: (proctor: Omit<Proctor, 'id'>) => void;
  onUpdateProctor: (proctor: Proctor) => void;
  onDeleteProctor: (id: string) => void;
  onBulkAddProctors: (proctors: Omit<Proctor, 'id'>[], replaceExisting?: boolean) => void;
  onResetProctors: () => void;
  onSyncRoomsWithProctors: (proctors: Proctor[]) => void;
}

type ProctorTab = 'list' | 'digital_checkin' | 'attendance_daily' | 'attendance_recap' | 'duty_schedule';

const STORAGE_KEY_ATTENDANCE = 'sim_ujian_proctor_attendance_mts_v2';
const STORAGE_KEY_MATRIX = 'sim_ujian_proctor_matrix_allocations_v2';

export const ProctorsView: React.FC<ProctorsViewProps> = ({
  config,
  proctors,
  rooms,
  schedules,
  onAddProctor,
  onUpdateProctor,
  onDeleteProctor,
  onBulkAddProctors,
  onResetProctors,
  onSyncRoomsWithProctors,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ProctorTab>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'Pengawas Ruang' | 'Pengawas Cadangan' | 'Koordinator'>('all');

  // Filter exam schedules (exclude breaks for proctor attendance)
  const examSchedules = useMemo(() => {
    return schedules.filter((s) => !s.isBreak && !s.subject.toLowerCase().includes('istirahat'));
  }, [schedules]);

  // Daily attendance selection
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(() => {
    return examSchedules[0]?.id || schedules[0]?.id || '';
  });

  // Keep in sync if schedules change
  useEffect(() => {
    if (!schedules.some((s) => s.id === selectedScheduleId)) {
      const firstValid = examSchedules[0]?.id || schedules[0]?.id || '';
      setSelectedScheduleId(firstValid);
    }
  }, [schedules, selectedScheduleId, examSchedules]);

  const [includeStampAndSig, setIncludeStampAndSig] = useState<boolean>(true);
  const [showDigitalSignatures, setShowDigitalSignatures] = useState<boolean>(true);

  // Digital Proctor Attendance Records with localStorage Persistence & Cloud Real-time
  const [attendanceRecords, setAttendanceRecords] = useState<ProctorAttendanceRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return getInitialAttendanceRecords(initialProctors, schedules[0]?.id || 'sch-1', schedules[0]?.subject || 'Matematika');
  });

  // Subscribe to Cloud Firestore Real-time Attendance Updates
  useEffect(() => {
    const unsubscribe = subscribeToAttendanceRecords(
      (cloudRecords) => {
        if (cloudRecords && cloudRecords.length > 0) {
          setAttendanceRecords(cloudRecords);
        }
      },
      (err) => {
        console.warn('Real-time attendance listener note:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  const handleSaveAttendance = (record: ProctorAttendanceRecord) => {
    setAttendanceRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === record.id || (r.proctorId === record.proctorId && r.scheduleId === record.scheduleId));
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = record;
        return updated;
      }
      return [record, ...prev];
    });
    // Persist to Cloud Firestore in real-time
    saveAttendanceRecordToCloud(record).catch((err) => {
      console.warn('Failed to sync attendance record to cloud:', err);
    });
  };

  const handleDeleteAttendance = (recordId: string) => {
    setAttendanceRecords((prev) => prev.filter((r) => r.id !== recordId));
    deleteAttendanceRecordFromCloud(recordId).catch((err) => {
      console.warn('Failed to delete attendance record from cloud:', err);
    });
  };

  const handleResetSessionAttendance = (scheduleId: string) => {
    if (window.confirm('Reset seluruh presensi untuk sesi ujian ini? Pengawas dapat melakukan presensi dan input TTD ulang.')) {
      const toDelete = attendanceRecords.filter((r) => r.scheduleId === scheduleId);
      setAttendanceRecords((prev) => prev.filter((r) => r.scheduleId !== scheduleId));
      toDelete.forEach((r) => {
        deleteAttendanceRecordFromCloud(r.id).catch(() => {});
      });
    }
  };

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProctor, setEditingProctor] = useState<Proctor | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form State for Add/Edit (Pure Master Data)
  const [formData, setFormData] = useState<Omit<Proctor, 'id'>>({
    name: '',
    nip: '',
    subject: '',
    role: 'Pengawas Ruang',
    phone: '',
  });

  // Calculate stats for master data
  const totalProctors = proctors.length;
  const pengawasRuangCount = proctors.filter((p) => p.role === 'Pengawas Ruang').length;
  const cadanganDanKoordinatorCount = proctors.filter((p) => p.role !== 'Pengawas Ruang').length;
  const withPhoneCount = proctors.filter((p) => p.phone && p.phone.trim().length > 0).length;

  // Filtered Proctors (pure Master Data search & role filter)
  const filteredProctors = proctors.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.nip && p.nip.includes(searchQuery)) ||
      (p.subject && p.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.phone && p.phone.includes(searchQuery));

    const matchesRole = filterRole === 'all' || p.role === filterRole;

    return matchesSearch && matchesRole;
  });

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      nip: '',
      subject: '',
      role: 'Pengawas Ruang',
      phone: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (proctor: Proctor) => {
    setEditingProctor(proctor);
    setFormData({
      name: proctor.name,
      nip: proctor.nip || '',
      subject: proctor.subject || '',
      role: proctor.role || 'Pengawas Ruang',
      phone: proctor.phone || '',
    });
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const payload = {
      ...formData,
    };

    if (editingProctor) {
      onUpdateProctor({ 
        ...editingProctor,
        ...payload,
        id: editingProctor.id 
      });
      setEditingProctor(null);
    } else {
      onAddProctor(payload);
      setShowAddModal(false);
    }
  };

  // Helper to read proctor allocated in matrix schedule
  const getProctorFromMatrix = (scheduleId: string, roomId: string): { proctorName: string; nip?: string; proctorId?: string } | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MATRIX);
      if (saved) {
        const matrix = JSON.parse(saved);
        const alloc = matrix[`${scheduleId}__${roomId}`];
        if (alloc && alloc.proctorName && alloc.proctorName !== '-') {
          return alloc;
        }
      }
    } catch {
      // ignore
    }
    return null;
  };

  const currentSchedule = schedules.find((s) => s.id === selectedScheduleId) || schedules[0] || {
    id: 'default',
    subject: 'Mata Pelajaran',
    dayName: 'Senin',
    date: config.issueDate,
    sessionTime: '07.30 - 09.30 WIB',
    targetLevel: 'Semua Kelas',
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  Manajemen Pengawas &amp; Absen Ujian
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kelola master data pengawas ruang, import file Excel, presensi digital, dan cetak format daftar hadir resmi.
                </p>
              </div>
            </div>
          </div>

          {/* Sub-Tab Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200">
              <button
                onClick={() => setActiveSubTab('list')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSubTab === 'list'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Data Pengawas</span>
              </button>
              <button
                onClick={() => setActiveSubTab('digital_checkin')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSubTab === 'digital_checkin'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Presensi Digital (Input TTD)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                  activeSubTab === 'digital_checkin' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  Aplikasi
                </span>
              </button>
              <button
                onClick={() => setActiveSubTab('attendance_daily')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSubTab === 'attendance_daily'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Absen Harian / Sesi</span>
              </button>
              <button
                onClick={() => setActiveSubTab('attendance_recap')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSubTab === 'attendance_recap'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Rekap Kehadiran Pengawas</span>
              </button>
              <button
                onClick={() => setActiveSubTab('duty_schedule')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSubTab === 'duty_schedule'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Jadwal &amp; Matriks Pengawas</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                  activeSubTab === 'duty_schedule' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  Plotting Sesi
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                title="Import data pengawas dari file Excel (.xlsx / .xls)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Excel Pengawas</span>
              </button>

              {activeSubTab !== 'list' && activeSubTab !== 'digital_checkin' && (
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Dokumen (PDF)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Pengawas</span>
            <div className="text-lg font-black text-slate-900 mt-0.5">{totalProctors} Orang</div>
          </div>
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-2.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700">Pengawas Ruang</span>
            <div className="text-lg font-black text-indigo-950 mt-0.5">{pengawasRuangCount} Guru</div>
          </div>
          <div className="bg-amber-50/70 border border-amber-100 rounded-lg p-2.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700">Cadangan &amp; Panitia</span>
            <div className="text-lg font-black text-amber-950 mt-0.5">{cadanganDanKoordinatorCount} Orang</div>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-2.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">No. Kontak Terdata</span>
            <div className="text-lg font-black text-emerald-950 mt-0.5">{withPhoneCount} / {totalProctors} Kontak</div>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: DATA PENGAWAS (MASTER DATA ONLY, NO PLOTTING HERE) */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          {/* Info Banner pointing to Jadwal & Matriks Pengawas */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
                <Calendar className="w-4 h-4" />
              </span>
              <div>
                <span className="font-bold text-emerald-950 block text-xs">
                  Plotting &amp; Jadwal Tugas Pengawas
                </span>
                <span className="text-slate-600 text-[11px]">
                  Pengaturan jadwal dan plotting pembagian ruang untuk pengawas dikelola secara terpusat pada menu <strong>Jadwal &amp; Matriks Pengawas</strong>.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('duty_schedule')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <span>Buka Jadwal &amp; Matriks Pengawas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Pengawas</span>
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                title="Unggah data pengawas dari file Excel (.xlsx / .xls) atau salin baris spreadsheet"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-xs transition-colors cursor-pointer border border-emerald-800"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>Import File Excel</span>
                <span className="bg-emerald-600 text-emerald-100 text-[9px] px-1.5 py-0.2 rounded font-mono">
                  .xlsx
                </span>
              </button>

              <button
                onClick={onResetProctors}
                title="Kembalikan ke data 24 guru pengawas standar madrasah"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Contoh</span>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama, NIP, mapel, no WA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none w-48 sm:w-60"
                />
              </div>

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
              >
                <option value="all">Semua Peran</option>
                <option value="Pengawas Ruang">Pengawas Ruang</option>
                <option value="Pengawas Cadangan">Pengawas Cadangan</option>
                <option value="Koordinator">Koordinator / Panitia</option>
              </select>
            </div>
          </div>

          {/* Table List of Proctors (Clean Master Data) */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3">Nama Pengawas &amp; Gelar</th>
                    <th className="py-2.5 px-3">NIP / Identitas</th>
                    <th className="py-2.5 px-3">Mata Pelajaran / Unit</th>
                    <th className="py-2.5 px-3">Status / Peran</th>
                    <th className="py-2.5 px-3">No. WhatsApp / HP</th>
                    <th className="py-2.5 px-3 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProctors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        {proctors.length === 0 ? (
                          <div className="max-w-md mx-auto space-y-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                              <FileSpreadsheet className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">
                                Belum Ada Data Pengawas Ruang
                              </h4>
                              <p className="text-xs text-slate-500 mt-1">
                                Anda dapat mengunggah file Excel data guru atau menambahkan pengawas secara manual.
                              </p>
                            </div>
                            <div className="flex items-center justify-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setShowImportModal(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Import File Excel (.xlsx)</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleOpenAddModal}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tambah Manual</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span>Tidak ada data pengawas yang sesuai dengan filter pencarian.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredProctors.map((p, idx) => {
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-semibold">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {p.name}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                            {p.nip || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">
                            {p.subject || '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.role === 'Pengawas Ruang'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : p.role === 'Koordinator'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {p.role || 'Pengawas Ruang'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {p.phone ? (
                              <div className="flex items-center gap-1 text-slate-800">
                                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{p.phone}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(p)}
                                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                title="Edit data pengawas"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteProctor(p.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Hapus pengawas"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PRESENSI DIGITAL & INPUT TTD */}
      {activeSubTab === 'digital_checkin' && (
        <DigitalProctorCheckIn
          config={config}
          proctors={proctors}
          rooms={rooms}
          schedules={schedules}
          attendanceRecords={attendanceRecords}
          onSaveAttendance={handleSaveAttendance}
          onDeleteAttendance={handleDeleteAttendance}
          onResetSessionAttendance={handleResetSessionAttendance}
          onViewPrintSheet={() => setActiveSubTab('attendance_daily')}
        />
      )}

      {/* SUB-TAB 3: ABSEN HARIAN / SESI */}
      {activeSubTab === 'attendance_daily' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pilih Sesi &amp; Mata Pelajaran:
                </label>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                >
                  {examSchedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.dayName}, {s.date} — {s.subject} ({s.sessionTime})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end pb-1 gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeStampAndSig}
                    onChange={(e) => setIncludeStampAndSig(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>TTD &amp; Stempel Kepala/Panitia</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-indigo-700 cursor-pointer select-none bg-indigo-50/70 px-2.5 py-1 rounded-md border border-indigo-200">
                  <input
                    type="checkbox"
                    checked={showDigitalSignatures}
                    onChange={(e) => setShowDigitalSignatures(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Tampilkan TTD Digital Pengawas</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('digital_checkin')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Input TTD via Aplikasi</span>
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Daftar Hadir Pengawas</span>
              </button>
            </div>
          </div>

          {/* Printable Daily Attendance Sheet */}
          <div className="bg-white border border-slate-300 rounded-xl p-6 sm:p-8 shadow-xs font-sans text-slate-900 page-break-after-always">
            {/* Kop Surat Resmi */}
            <OfficialKopHeader config={config} />

            {/* Document Title */}
            <div className="text-center my-4">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-950">
                DAFTAR HADIR PENGAWAS RUANG UJIAN
              </h2>
              <p className="text-xs font-bold uppercase text-slate-800 mt-0.5">
                {config.examTitle} • TAHUN PELAJARAN {config.academicYear}
              </p>
              <p className="text-[11px] font-semibold text-slate-600 uppercase">
                SEMESTER {config.semester.toUpperCase()}
              </p>
            </div>

            {/* Exam & Schedule Metadata Box */}
            <div className="border border-slate-900 rounded p-3 bg-slate-50/70 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Hari / Tanggal</span>
                <span className="font-bold text-slate-900">{currentSchedule.dayName}, {currentSchedule.date}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Mata Pelajaran</span>
                <span className="font-bold text-slate-900">{currentSchedule.subject}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Waktu / Sesi</span>
                <span className="font-mono font-bold text-slate-900">{currentSchedule.sessionTime} WIB</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Tingkat Kelas</span>
                <span className="font-bold text-slate-900">{currentSchedule.targetLevel || 'Semua Kelas'}</span>
              </div>
            </div>

            {/* Attendance Table */}
            <table className="w-full border-collapse border border-slate-900 text-xs mb-4">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900 text-center">
                  <th className="border border-slate-900 py-1.5 px-2 w-10">No</th>
                  <th className="border border-slate-900 py-1.5 px-2 w-24">Ruang</th>
                  <th className="border border-slate-900 py-1.5 px-3 text-left">Nama Pengawas Ruang</th>
                  <th className="border border-slate-900 py-1.5 px-2 text-left">NIP / Identitas</th>
                  <th className="border border-slate-900 py-1.5 px-2 text-left">Mata Pelajaran</th>
                  <th className="border border-slate-900 py-1.5 px-2 w-24">Jam Hadir</th>
                  <th className="border border-slate-900 py-1.5 px-3 w-36">Tanda Tangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {rooms.map((room, rIdx) => {
                  const matrixP = getProctorFromMatrix(currentSchedule.id, room.id);
                  const p1 = matrixP
                    ? { id: matrixP.proctorId || '', name: matrixP.proctorName, nip: matrixP.nip || '-', subject: '-' }
                    : proctors.find((p) => p.assignedRoomId === room.id) 
                      || { id: '', name: room.proctor1 || '...........................................', nip: '-', subject: '-' };

                  const rec1 = attendanceRecords.find(
                    (r) => (r.scheduleId === currentSchedule.id || r.subject === currentSchedule.subject) &&
                           ((p1.id && r.proctorId === p1.id) || (p1.name && p1.name !== '-' && r.proctorName.includes(p1.name)))
                  );

                  return (
                    <tr key={room.id}>
                      <td className="border border-slate-900 py-2 px-2 text-center font-bold">
                        {rIdx + 1}
                      </td>
                      <td className="border border-slate-900 py-2 px-2 text-center font-black bg-slate-50">
                        <div>{room.roomCode}</div>
                        <div className="text-[10px] font-normal text-slate-600">{room.name}</div>
                      </td>
                      <td className="border border-slate-900 py-1.5 px-3 font-semibold text-slate-950">
                        {p1.name}
                      </td>
                      <td className="border border-slate-900 py-1.5 px-2 font-mono text-[11px] text-slate-700">
                        {p1.nip || '-'}
                      </td>
                      <td className="border border-slate-900 py-1.5 px-2 text-slate-700 text-[11px]">
                        {p1.subject || '-'}
                      </td>
                      <td className="border border-slate-900 py-1.5 px-2 text-center font-mono text-slate-800 text-[11px]">
                        {showDigitalSignatures && rec1?.checkInTime ? rec1.checkInTime : '...... : ......'}
                      </td>
                      <td className="border border-slate-900 py-1 px-3 text-left">
                        {showDigitalSignatures && rec1?.signatureUrl ? (
                          <div className="flex items-center gap-1.5 py-0.5">
                            <span className="text-[10px] text-slate-400 font-mono">{rIdx + 1}.</span>
                            <img 
                              src={rec1.signatureUrl} 
                              alt="TTD" 
                              className="h-8 w-auto max-w-[85px] object-contain inline-block" 
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">{rIdx + 1}. ...........</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Pengawas Cadangan Rows */}
                {proctors.filter((p) => p.role === 'Pengawas Cadangan' || p.role === 'Koordinator').length > 0 && (
                  <>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                      <td colSpan={7} className="border border-slate-900 py-1 px-3 text-[10.5px] uppercase tracking-wide">
                        Pengawas Cadangan &amp; Sekretariat
                      </td>
                    </tr>
                    {proctors
                      .filter((p) => p.role === 'Pengawas Cadangan' || p.role === 'Koordinator')
                      .slice(0, 4)
                      .map((cad, cIdx) => {
                        const recCad = attendanceRecords.find(
                          (r) => (r.scheduleId === currentSchedule.id || r.subject === currentSchedule.subject) &&
                                 (r.proctorId === cad.id || r.proctorName.includes(cad.name))
                        );

                        return (
                          <tr key={cad.id}>
                            <td className="border border-slate-900 py-1.5 px-2 text-center font-medium text-slate-500">
                              C.{cIdx + 1}
                            </td>
                            <td className="border border-slate-900 py-1.5 px-2 text-center font-medium text-slate-600 text-[11px]">
                              Cadangan
                            </td>
                            <td className="border border-slate-900 py-1.5 px-3 font-medium text-slate-900">
                              {cad.name}
                            </td>
                            <td className="border border-slate-900 py-1.5 px-2 font-mono text-[11px] text-slate-700">
                              {cad.nip || '-'}
                            </td>
                            <td className="border border-slate-900 py-1.5 px-2 text-slate-700 text-[11px]">
                              {cad.subject || '-'}
                            </td>
                            <td className="border border-slate-900 py-1.5 px-2 text-center font-mono text-slate-800 text-[11px]">
                              {showDigitalSignatures && recCad?.checkInTime ? recCad.checkInTime : '...... : ......'}
                            </td>
                            <td className="border border-slate-900 py-1 px-3">
                              {showDigitalSignatures && recCad?.signatureUrl ? (
                                <div className={`flex items-center gap-1.5 py-0.5 ${cIdx % 2 === 0 ? '' : 'justify-end'}`}>
                                  {cIdx % 2 === 0 && <span className="text-[10px] text-slate-400 font-mono">1.</span>}
                                  <img 
                                    src={recCad.signatureUrl} 
                                    alt="TTD" 
                                    className="h-8 w-auto max-w-[85px] object-contain inline-block" 
                                  />
                                  {cIdx % 2 !== 0 && <span className="text-[10px] text-slate-400 font-mono">2.</span>}
                                </div>
                              ) : (
                                <span className={`text-[10px] text-slate-400 font-mono block ${cIdx % 2 === 0 ? 'text-left' : 'text-right'}`}>
                                  {cIdx % 2 === 0 ? '1.' : '2.'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </>
                )}
              </tbody>
            </table>

            {/* Note & Signatures */}
            <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
              <div className="text-[11px] text-slate-600 space-y-1">
                <span className="font-bold block text-slate-900">Catatan Pengawasan:</span>
                <p>1. Pengawas hadir di ruang panitia 15 menit sebelum ujian dimulai.</p>
                <p>2. Memeriksa segel naskah soal dan membuka di depan peserta bersama 2 saksi.</p>
                <p>3. Mengisi Berita Acara Pelaksanaan dan menghitung kelengkapan LJK.</p>
              </div>

              {/* Tanda Tangan Pengesahan Panitia */}
              <div className="text-right flex flex-col items-end">
                <div className="text-[11px] text-slate-700">
                  {config.issuePlace}, {currentSchedule.date}
                </div>
                <div className="text-[11px] font-bold text-slate-900">
                  Ketua Panitia Ujian,
                </div>

                <div className="relative w-48 h-14 my-1 flex items-center justify-center">
                  {includeStampAndSig && config.stampEnabled && config.stampUrl && (
                    <div 
                      className="absolute left-2 -bottom-1 w-12 h-12 pointer-events-none select-none"
                      style={{ opacity: 0.88, transform: 'rotate(-8deg)' }}
                    >
                      <img src={config.stampUrl} alt="Stempel" className="w-full h-full object-contain" />
                    </div>
                  )}

                  {includeStampAndSig && config.signatureEnabled !== false && config.signatureUrl ? (
                    <img src={config.signatureUrl} alt="TTD" className="h-full w-auto object-contain max-w-[120px]" />
                  ) : (
                    <span className="font-serif italic text-slate-300 text-xs">(tanda tangan)</span>
                  )}
                </div>

                <div className="font-bold underline text-slate-950 text-xs">
                  {config.committeeHeadName || 'Ust. Ahmad Fauzan, S.Pd.I.'}
                </div>
                <div className="text-[10px] text-slate-600 font-mono">
                  NIP. {config.committeeHeadNip || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: REKAP KEHADIRAN PENGAWAS SELURUH HARI UJIAN */}
      {activeSubTab === 'attendance_recap' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Format Rekapitulasi Presensi &amp; Kehadiran Pengawas
              </h3>
              <p className="text-xs text-slate-500">
                Format matrik multi-hari ujian untuk pencatatan kehadiran &amp; dasar honorarium pengawas.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap Presensi</span>
            </button>
          </div>

          <div className="bg-white border border-slate-300 rounded-xl p-6 sm:p-8 shadow-xs font-sans text-slate-900 page-break-after-always overflow-x-auto">
            <OfficialKopHeader config={config} />

            <div className="text-center my-4">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-950">
                REKAPITULASI DAFTAR HADIR PENGAWAS UJIAN
              </h2>
              <p className="text-xs font-bold uppercase text-slate-800 mt-0.5">
                {config.examTitle} • TAHUN PELAJARAN {config.academicYear}
              </p>
            </div>

            <table className="w-full border-collapse border border-slate-900 text-[11px] mb-4">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900 text-center">
                  <th className="border border-slate-900 py-2 px-1.5 w-8">No</th>
                  <th className="border border-slate-900 py-2 px-2 text-left w-48">Nama Pengawas</th>
                  <th className="border border-slate-900 py-2 px-2 text-left w-28">NIP</th>
                  <th className="border border-slate-900 py-2 px-1.5 w-16">Ruang</th>
                  {schedules.slice(0, 6).map((sch, sIdx) => (
                    <th key={sch.id} className="border border-slate-900 py-2 px-1 text-center min-w-[48px]">
                      <div>H-{sIdx + 1}</div>
                      <div className="text-[9px] font-normal text-slate-600">{sch.dayName}</div>
                    </th>
                  ))}
                  <th className="border border-slate-900 py-2 px-1.5 w-14 text-center">Total Hadir</th>
                  <th className="border border-slate-900 py-2 px-2 w-28 text-center">Paraf Pengawas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {proctors.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="border border-slate-900 py-1.5 px-1.5 text-center font-bold">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-900 py-1.5 px-2 font-semibold text-slate-900">
                      {p.name}
                    </td>
                    <td className="border border-slate-900 py-1.5 px-2 font-mono text-[10px] text-slate-600">
                      {p.nip || '-'}
                    </td>
                    <td className="border border-slate-900 py-1.5 px-1.5 text-center font-bold text-slate-800">
                      {p.assignedRoomCode || 'Cad'}
                    </td>
                    {schedules.slice(0, 6).map((sch) => (
                      <td key={sch.id} className="border border-slate-900 py-1.5 px-1 text-center font-serif text-slate-400">
                        ✓
                      </td>
                    ))}
                    <td className="border border-slate-900 py-1.5 px-1.5 text-center font-bold text-slate-900">
                      {schedules.slice(0, 6).length}
                    </td>
                    <td className="border border-slate-900 py-1.5 px-2 text-center text-slate-400 font-serif italic text-[10px]">
                      (paraf)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signature Box */}
            <div className="flex justify-between items-end pt-4 text-xs">
              <div>
                <div className="text-slate-600 text-[11px]">Keterangan:</div>
                <div className="text-slate-500 text-[10px]">H-1 s.d H-6: Hari Pelaksanaan Ujian Resmi</div>
              </div>

              <div className="text-right">
                <div className="text-[11px] text-slate-700">{config.issuePlace}, {config.issueDate}</div>
                <div className="text-[11px] font-bold text-slate-900">Kepala Madrasah / Sekolah,</div>
                <div className="h-14"></div>
                <div className="font-bold underline text-slate-950 text-xs">
                  {config.principalName}
                </div>
                <div className="text-[10px] text-slate-600 font-mono">
                  NIP. {config.principalNip || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: JADWAL & MATRIKS PENGAWAS (SESUAI GAMBAR DOKUMEN RESMI) */}
      {activeSubTab === 'duty_schedule' && (
        <ProctorScheduleMatrixView
          config={config}
          proctors={proctors}
          rooms={rooms}
          schedules={schedules}
        />
      )}

      {/* MODAL: ADD / EDIT PROCTOR */}
      {(showAddModal || editingProctor) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">
                  {editingProctor ? 'Edit Data Pengawas' : 'Tambah Pengawas Baru'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProctor(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap beserta Gelar: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Drs. M. Sobirin, M.Pd."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    NIP / No. Identitas:
                  </label>
                  <input
                    type="text"
                    placeholder="19800512 200801 1 008"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Guru Mapel / Unit Kerja:
                  </label>
                  <input
                    type="text"
                    placeholder="Bahasa Indonesia"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Peran / Jabatan:
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Proctor['role'] })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Pengawas Ruang">Pengawas Ruang</option>
                    <option value="Pengawas Cadangan">Pengawas Cadangan</option>
                    <option value="Koordinator">Koordinator / Panitia</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    No. Handphone (WA):
                  </label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-700 block mb-0.5">Informasi Plotting Ruang:</span>
                Plotting dan penetapan ruang tugas pengawas diatur per sesi ujian pada menu <strong>Jadwal &amp; Matriks Pengawas</strong>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProctor(null);
                  }}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-bold shadow-xs"
                >
                  {editingProctor ? 'Simpan Perubahan' : 'Tambah Pengawas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT DATA PENGAWAS DARI FILE EXCEL (.XLSX) */}
      <ProctorExcelImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        rooms={rooms}
        existingProctorsCount={proctors.length}
        onImportConfirm={(newProctors, replaceExisting) => {
          onBulkAddProctors(newProctors, replaceExisting);
        }}
      />
    </div>
  );
};

/* --- KOP SURAT RESMI SHARED --- */
const OfficialKopHeader: React.FC<{ config: ExamConfig }> = ({ config }) => {
  const isMadrasah = ['MTs', 'MA', 'MI'].includes(config.schoolLevel);
  return (
    <div className="border-b-2 border-slate-900 pb-2 mb-3">
      <div className="flex items-center gap-3">
        {config.logoUrl && (
          <div className="w-14 h-14 shrink-0 flex items-center justify-center">
            <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
        <div className="flex-1 text-center font-serif">
          {isMadrasah ? (
            <>
              <div className="text-[10px] uppercase font-bold text-slate-700 tracking-wider">
                KEMENTERIAN AGAMA REPUBLIK INDONESIA
              </div>
              <div className="text-[10px] uppercase font-bold text-slate-700 tracking-wider">
                KANTOR KEMENTERIAN AGAMA {config.district.toUpperCase()}
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] uppercase font-bold text-slate-700 tracking-wider">
                PEMERINTAH DAERAH PROVINSI {config.province.toUpperCase()}
              </div>
              <div className="text-[10px] uppercase font-bold text-slate-700 tracking-wider">
                DINAS PENDIDIKAN DAN KEBUDAYAAN
              </div>
            </>
          )}
          <div className="text-base font-black uppercase text-slate-950 mt-0.5">
            {config.schoolName}
          </div>
          <div className="text-[9px] font-sans text-slate-600">
            {config.address} • Telp: {config.phone} • Email: {config.email}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-900 mt-1"></div>
    </div>
  );
};
