import React, { useState, useMemo } from 'react';
import { 
  FileSignature, 
  Plus, 
  Printer, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  FileText, 
  ShieldAlert, 
  Calendar, 
  User, 
  DoorOpen, 
  CreditCard, 
  Check, 
  X,
  FileCheck2,
  Tag,
  Info,
  Phone,
  HelpCircle,
  Eye,
  Zap,
  Scissors,
  CheckSquare,
  Square,
  RotateCcw
} from 'lucide-react';
import { 
  ExamConfig, 
  ExamDispensation, 
  ExamRoom, 
  ExamScheduleItem, 
  Student, 
  DispensationReasonCategory, 
  DispensationStatus 
} from '../types';
import { 
  SimpleDispensationSlipSheet, 
  SimpleDispensationData 
} from './SimpleDispensationSlipSheet';

interface DispensationManagementViewProps {
  config: ExamConfig;
  students: Student[];
  rooms: ExamRoom[];
  schedules: ExamScheduleItem[];
  dispensations: ExamDispensation[];
  onAddDispensation: (disp: ExamDispensation) => void;
  onUpdateDispensation: (disp: ExamDispensation) => void;
  onDeleteDispensation: (id: string) => void;
}

type PrintViewMode = 'all_letters' | 'single_letter' | 'simple_slip' | 'pocket_slips' | 'recap_table';

export const DispensationManagementView: React.FC<DispensationManagementViewProps> = ({
  config,
  students,
  rooms,
  schedules,
  dispensations,
  onAddDispensation,
  onUpdateDispensation,
  onDeleteDispensation,
}) => {
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterRoom, setFilterRoom] = useState<string>('ALL');

  // Print Mode State
  const [printMode, setPrintMode] = useState<PrintViewMode>('all_letters');
  const [selectedDispIdForPrint, setSelectedDispIdForPrint] = useState<string>(
    dispensations[0]?.id || ''
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDisp, setEditingDisp] = useState<ExamDispensation | null>(null);

  // Form State
  const [formStudentId, setFormStudentId] = useState('');
  const [formReasonCategory, setFormReasonCategory] = useState<DispensationReasonCategory>('Administrasi Keuangan');
  const [formReasonDetail, setFormReasonDetail] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formValidUntil, setFormValidUntil] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [formCommitmentNote, setFormCommitmentNote] = useState('');
  const [formParentName, setFormParentName] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formLetterNumber, setFormLetterNumber] = useState('');
  const [formStatus, setFormStatus] = useState<DispensationStatus>('Aktif');
  const [formApprovedBy, setFormApprovedBy] = useState('Ketua Panitia & Bendahara Madrasah');
  const [formAllowedAllSubjects, setFormAllowedAllSubjects] = useState(true);
  const [formSelectedSubjects, setFormSelectedSubjects] = useState<string[]>([]);

  // Simple Slip (Tanpa Pilih Nama) States
  const [isSimpleBlank, setIsSimpleBlank] = useState<boolean>(true); // Default mode blangko kosong siap tulis pulpen
  const [simpleSlipsPerPage, setSimpleSlipsPerPage] = useState<2 | 3>(2);
  const [simplePageCopies, setSimplePageCopies] = useState<number>(1);
  const [simpleCheckIn, setSimpleCheckIn] = useState<boolean>(true); // Kotak ceklis Ijin Masuk
  const [simpleCheckOut, setSimpleCheckOut] = useState<boolean>(false); // Kotak ceklis Ijin Keluar
  const [simpleStudentName, setSimpleStudentName] = useState<string>('');
  const [simpleClassName, setSimpleClassName] = useState<string>('');
  const [simpleExamNumber, setSimpleExamNumber] = useState<string>('');
  const [simpleRoomName, setSimpleRoomName] = useState<string>('');
  const [simpleSubject, setSimpleSubject] = useState<string>('');
  const [simpleDayDate, setSimpleDayDate] = useState<string>(config.issueDate || '');
  const [simpleTimeRange, setSimpleTimeRange] = useState<string>('07.30 - Selesai');
  const [simpleReason, setSimpleReason] = useState<string>('Terlambat hadir / Selesai urusan dispensasi di panitia');
  const [simpleLetterNumber, setSimpleLetterNumber] = useState<string>('');

  // Memoized Simple Slip Data
  const simpleData: SimpleDispensationData = useMemo(() => ({
    studentName: simpleStudentName,
    className: simpleClassName,
    examNumber: simpleExamNumber,
    roomName: simpleRoomName,
    subject: simpleSubject,
    dayDate: simpleDayDate || config.issueDate,
    timeRange: simpleTimeRange,
    reason: simpleReason,
    letterNumber: simpleLetterNumber || `421/001/PAN-${config.examType || 'UJIAN'}/DISP/${new Date().getFullYear()}`,
    checkIn: simpleCheckIn,
    checkOut: simpleCheckOut,
    notes: '',
  }), [
    simpleStudentName,
    simpleClassName,
    simpleExamNumber,
    simpleRoomName,
    simpleSubject,
    simpleDayDate,
    simpleTimeRange,
    simpleReason,
    simpleLetterNumber,
    simpleCheckIn,
    simpleCheckOut,
    config,
  ]);

  // Unique classes for filter
  const classNames = useMemo(() => {
    const set = new Set(students.map((s) => s.className));
    return Array.from(set).sort();
  }, [students]);

  // Filtered Dispensations
  const filteredDispensations = useMemo(() => {
    return dispensations.filter((disp) => {
      const matchSearch =
        disp.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        disp.examNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        disp.nisn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        disp.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        disp.letterNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (disp.roomName || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = filterCategory === 'ALL' || disp.reasonCategory === filterCategory;
      const matchStatus = filterStatus === 'ALL' || disp.status === filterStatus;
      const matchClass = filterClass === 'ALL' || disp.className === filterClass;
      const matchRoom = filterRoom === 'ALL' || disp.roomId === filterRoom;

      return matchSearch && matchCategory && matchStatus && matchClass && matchRoom;
    });
  }, [dispensations, searchTerm, filterCategory, filterStatus, filterClass, filterRoom]);

  // Statistics
  const stats = useMemo(() => {
    const total = dispensations.length;
    const active = dispensations.filter((d) => d.status === 'Aktif').length;
    const completed = dispensations.filter((d) => d.status === 'Selesai').length;
    const financial = dispensations.filter((d) => d.reasonCategory === 'Administrasi Keuangan').length;
    const academic = dispensations.filter((d) => d.reasonCategory === 'Persyaratan Berkas').length;
    const health = dispensations.filter((d) => d.reasonCategory === 'Kesehatan / Sakit').length;
    return { total, active, completed, financial, academic, health };
  }, [dispensations]);

  // Helper to generate default letter number
  const generateNewLetterNumber = () => {
    const currentYear = new Date().getFullYear();
    const count = dispensations.length + 1;
    const padded = String(count).padStart(3, '0');
    return `421/${padded}/PAN-${config.examType}/DISP/${currentYear}`;
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingDisp(null);
    setFormStudentId(students[0]?.id || '');
    setFormReasonCategory('Administrasi Keuangan');
    setFormReasonDetail('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormValidUntil(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setFormCommitmentNote('Orang tua/wali murid berjanji akan menyelesaikan kewajiban administrasi sebelum batas waktu.');
    setFormParentName('');
    setFormParentPhone('');
    setFormLetterNumber(generateNewLetterNumber());
    setFormStatus('Aktif');
    setFormApprovedBy('Ketua Panitia & Bendahara');
    setFormAllowedAllSubjects(true);
    setFormSelectedSubjects([]);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (disp: ExamDispensation) => {
    setEditingDisp(disp);
    setFormStudentId(disp.studentId);
    setFormReasonCategory(disp.reasonCategory);
    setFormReasonDetail(disp.reasonDetail);
    setFormStartDate(disp.startDate);
    setFormValidUntil(disp.validUntil);
    setFormCommitmentNote(disp.commitmentNote || '');
    setFormParentName(disp.parentName || '');
    setFormParentPhone(disp.parentPhone || '');
    setFormLetterNumber(disp.letterNumber);
    setFormStatus(disp.status);
    setFormApprovedBy(disp.approvedBy);
    if (!disp.allowedSubjects || disp.allowedSubjects.length === 0 || disp.allowedSubjects.includes('Semua Mata Pelajaran')) {
      setFormAllowedAllSubjects(true);
      setFormSelectedSubjects([]);
    } else {
      setFormAllowedAllSubjects(false);
      setFormSelectedSubjects(disp.allowedSubjects);
    }
    setIsModalOpen(true);
  };

  // Save Modal Form
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === formStudentId);
    if (!student) return;

    const allowed = formAllowedAllSubjects ? ['Semua Mata Pelajaran'] : formSelectedSubjects;

    if (editingDisp) {
      const updated: ExamDispensation = {
        ...editingDisp,
        studentId: student.id,
        studentName: student.name,
        nisn: student.nisn || '-',
        nis: student.nis || '-',
        className: student.className,
        examNumber: student.examNumber,
        roomId: student.roomId,
        roomName: student.roomName,
        reasonCategory: formReasonCategory,
        reasonDetail: formReasonDetail,
        startDate: formStartDate,
        validUntil: formValidUntil,
        commitmentNote: formCommitmentNote,
        parentName: formParentName,
        parentPhone: formParentPhone,
        letterNumber: formLetterNumber,
        status: formStatus,
        approvedBy: formApprovedBy,
        allowedSubjects: allowed,
      };
      onUpdateDispensation(updated);
    } else {
      const newDisp: ExamDispensation = {
        id: `disp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        studentId: student.id,
        studentName: student.name,
        nisn: student.nisn || '-',
        nis: student.nis || '-',
        className: student.className,
        examNumber: student.examNumber,
        roomId: student.roomId,
        roomName: student.roomName,
        reasonCategory: formReasonCategory,
        reasonDetail: formReasonDetail,
        startDate: formStartDate,
        validUntil: formValidUntil,
        commitmentNote: formCommitmentNote,
        parentName: formParentName,
        parentPhone: formParentPhone,
        letterNumber: formLetterNumber || generateNewLetterNumber(),
        status: formStatus,
        approvedBy: formApprovedBy,
        createdAt: new Date().toISOString().split('T')[0],
        allowedSubjects: allowed,
      };
      onAddDispensation(newDisp);
    }

    setIsModalOpen(false);
  };

  const handleToggleStatus = (disp: ExamDispensation) => {
    const nextStatus: DispensationStatus = disp.status === 'Aktif' ? 'Selesai' : 'Aktif';
    onUpdateDispensation({
      ...disp,
      status: nextStatus,
    });
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Print error:', err);
    }
  };

  const printNewTabUrl = typeof window !== 'undefined' ? (() => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('tab', 'dispensation');
      u.searchParams.set('autoPrint', 'true');
      return u.toString();
    } catch {
      return window.location.href;
    }
  })() : '#';

  // Category badge colors
  const getCategoryBadgeClass = (category: DispensationReasonCategory) => {
    switch (category) {
      case 'Administrasi Keuangan':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'Persyaratan Berkas':
        return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'Kesehatan / Sakit':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'Keterlambatan Hadir':
        return 'bg-purple-50 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  // Status badge colors
  const getStatusBadgeClass = (status: DispensationStatus) => {
    switch (status) {
      case 'Aktif':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'Selesai':
        return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'Dibatalkan':
        return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  // Selected single disp for print
  const singleDisp = dispensations.find((d) => d.id === selectedDispIdForPrint) || dispensations[0];

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar - Screen Only */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-indigo-600" />
              <span>Manajemen Surat Dispensasi &amp; Izin Ujian</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Penerbitan surat dispensasi resmi dan slip izin saku ujian bagi siswa yang memiliki tanggungan administrasi keuangan, berkas, atau kondisi khusus.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Dispensasi Baru</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Pratinjau (A4)</span>
            </button>

            <a
              href={printNewTabUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
              title="Buka di tab baru untuk dialog cetak browser PDF langsung"
            >
              <ExternalLink className="w-4 h-4 text-emerald-100" />
              <span>Tab Baru (PDF)</span>
            </a>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Dispensasi</span>
            <div className="text-xl font-black text-slate-900 mt-1">{stats.total}</div>
            <span className="text-[10px] text-slate-400">Semua siswa terdaftar</span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Status Aktif</span>
            <div className="text-xl font-black text-emerald-900 mt-1">{stats.active}</div>
            <span className="text-[10px] text-emerald-600">Berhak ikut ujian</span>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">Selesai / Lunas</span>
            <div className="text-xl font-black text-blue-900 mt-1">{stats.completed}</div>
            <span className="text-[10px] text-blue-600">Kewajiban tuntas</span>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">Admin. Keuangan</span>
            <div className="text-xl font-black text-amber-900 mt-1">{stats.financial}</div>
            <span className="text-[10px] text-amber-600">SPP / Komite / Iuran</span>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">Syarat Berkas</span>
            <div className="text-xl font-black text-indigo-900 mt-1">{stats.academic}</div>
            <span className="text-[10px] text-indigo-600">Foto / Perpustakaan</span>
          </div>

          <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">Kesehatan / Sakit</span>
            <div className="text-xl font-black text-rose-900 mt-1">{stats.health}</div>
            <span className="text-[10px] text-rose-600">Izin dokter / Khusus</span>
          </div>
        </div>

        {/* Print Format Selector Tabs */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>Format Cetak &amp; Pratinjau:</span>
            </span>

            {[
              { id: 'all_letters', label: '📄 Surat Resmi Semua Siswa (A4)', desc: '1 lembar per siswa dari database' },
              { id: 'single_letter', label: '📝 Surat Siswa Terpilih (1 Siswa)', desc: 'Pilih siswa spesifik dari database' },
              { id: 'simple_slip', label: '⚡ Surat Dispensasi Simple (Masuk & Keluar)', desc: 'Tanpa pilih nama, dengan kotak ceklis ijin masuk & keluar ruangan' },
              { id: 'pocket_slips', label: '🏷️ Kartu / Slip Saku (Hemat 4/Lembar)', desc: 'Untuk Pengawas Ruang' },
              { id: 'recap_table', label: '📊 Rekapitulasi Daftar Dispensasi', desc: 'Arsip Panitia' },
            ].map((mode) => {
              const isActive = printMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setPrintMode(mode.id as PrintViewMode)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                  title={mode.desc}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>

          {printMode === 'single_letter' && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700">Pilih Siswa:</label>
              <select
                value={selectedDispIdForPrint}
                onChange={(e) => setSelectedDispIdForPrint(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white font-medium"
              >
                {dispensations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.studentName} ({d.className} - {d.examNumber})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* TOOLBAR KHUSUS: SURAT DISPENSASI SIMPLE (MASUK & KELUAR RUANGAN) */}
        {printMode === 'simple_slip' && (
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-indigo-200/80">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <Zap className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider">
                    Pengaturan Surat Dispensasi Simple (Tanpa Pilih Siswa)
                  </h4>
                  <p className="text-[11px] text-indigo-700">
                    Dilengkapi <strong>kotak ceklis ijin masuk dan keluar ruangan</strong>. Bisa dicetak blangko kosong siap tulis tangan atau diketik cepat langsung.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-900">Mode Tampilan:</span>
                <div className="inline-flex rounded-lg border border-indigo-300 bg-white p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setIsSimpleBlank(true)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      isSimpleBlank
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-indigo-800 hover:bg-indigo-50'
                    }`}
                  >
                    📝 Blangko Kosong (Siap Tulis Pulpen)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSimpleBlank(false)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      !isSimpleBlank
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-indigo-800 hover:bg-indigo-50'
                    }`}
                  >
                    ⌨️ Ketik Cepat di Layar
                  </button>
                </div>
              </div>
            </div>

            {/* Kotak Ceklis Ijin Masuk & Keluar Ruangan Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Status Ceklis */}
              <div className="bg-white p-3 rounded-lg border border-indigo-200 space-y-2">
                <label className="text-xs font-black text-slate-900 flex items-center justify-between">
                  <span>Kotak Ceklis Izin pada Cetakan:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSimpleCheckIn(false);
                      setSimpleCheckOut(false);
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-800 underline font-normal cursor-pointer"
                  >
                    Kosongkan Semua
                  </button>
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer p-1.5 rounded hover:bg-indigo-50/50">
                    <input
                      type="checkbox"
                      checked={simpleCheckIn}
                      onChange={(e) => setSimpleCheckIn(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">MASUK</span>
                      <span>Beri Ceklis [✓] Ijin Masuk Ruangan</span>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer p-1.5 rounded hover:bg-indigo-50/50">
                    <input
                      type="checkbox"
                      checked={simpleCheckOut}
                      onChange={(e) => setSimpleCheckOut(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">KELUAR</span>
                      <span>Beri Ceklis [✓] Ijin Keluar Ruangan</span>
                    </span>
                  </label>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  *Bila keduanya tidak dicentang, kotak ceklis akan tercetak kosong [ &nbsp; ] untuk dicentang pulpen oleh pengawas ruang.
                </p>
              </div>

              {/* Layout per Lembar A4 */}
              <div className="bg-white p-3 rounded-lg border border-indigo-200 space-y-2">
                <label className="text-xs font-black text-slate-900 block">
                  Layout &amp; Pembagian Lembar A4:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimpleSlipsPerPage(2)}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      simpleSlipsPerPage === 2
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs">2 Slip / Lembar</div>
                    <div className="text-[10px] text-slate-500 font-normal">Setengah A4 (Standar)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimpleSlipsPerPage(3)}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      simpleSlipsPerPage === 3
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs">3 Slip / Lembar</div>
                    <div className="text-[10px] text-slate-500 font-normal">Super Hemat Kertas</div>
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Scissors className="w-3 h-3 text-slate-400" />
                  <span>Dilengkapi garis putus-putus batas gunting potong.</span>
                </div>
              </div>

              {/* Jumlah Lembar Cetak Blangko */}
              <div className="bg-white p-3 rounded-lg border border-indigo-200 space-y-2">
                <label className="text-xs font-black text-slate-900 block">
                  Jumlah Lembar yang Dicetak:
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSimplePageCopies(num)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md border transition-all cursor-pointer ${
                        simplePageCopies === num
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {num} Lembar
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-indigo-800 font-medium">
                  Total slip yang dicetak: <span className="font-bold underline">{simplePageCopies * simpleSlipsPerPage} slip izin</span>.
                </p>
              </div>
            </div>

            {/* Input Form Cepat jika memilih Mode Ketik di Layar */}
            {!isSimpleBlank && (
              <div className="bg-white p-3.5 rounded-lg border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Isi Cepat Data Siswa (Opsional):
                  </span>
                  <div className="flex items-center gap-2">
                    {students.length > 0 && (
                      <select
                        onChange={(e) => {
                          const s = students.find((st) => st.id === e.target.value);
                          if (s) {
                            setSimpleStudentName(s.name);
                            setSimpleClassName(s.className);
                            setSimpleExamNumber(s.examNumber);
                            setSimpleRoomName(s.roomName || '');
                          }
                        }}
                        defaultValue=""
                        className="px-2 py-1 text-xs border border-indigo-200 rounded bg-indigo-50 text-indigo-900 font-medium cursor-pointer"
                      >
                        <option value="" disabled>-- Ambil Cepat dari Database (Opsional) --</option>
                        {students.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} ({st.className} - {st.examNumber})
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSimpleStudentName('');
                        setSimpleClassName('');
                        setSimpleExamNumber('');
                        setSimpleRoomName('');
                        setSimpleSubject('');
                        setSimpleReason('');
                      }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Bersihkan</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Nama Siswa:</label>
                    <input
                      type="text"
                      placeholder="e.g. Muhammad Al Fatih"
                      value={simpleStudentName}
                      onChange={(e) => setSimpleStudentName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Kelas / Rombel:</label>
                    <input
                      type="text"
                      placeholder="e.g. IX-A"
                      value={simpleClassName}
                      onChange={(e) => setSimpleClassName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">No. Peserta Ujian:</label>
                    <input
                      type="text"
                      placeholder="e.g. 25-04-09-01-001"
                      value={simpleExamNumber}
                      onChange={(e) => setSimpleExamNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Ruang Ujian:</label>
                    <input
                      type="text"
                      placeholder="e.g. Ruang 01 (Lab Komputer)"
                      value={simpleRoomName}
                      onChange={(e) => setSimpleRoomName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Mata Pelajaran:</label>
                    <input
                      type="text"
                      placeholder="e.g. Matematika / Bahasa Indonesia"
                      value={simpleSubject}
                      onChange={(e) => setSimpleSubject(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Hari / Tanggal:</label>
                    <input
                      type="text"
                      placeholder="e.g. Senin, 25 September 2026"
                      value={simpleDayDate}
                      onChange={(e) => setSimpleDayDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Pukul / Jam Ke-:</label>
                    <input
                      type="text"
                      placeholder="e.g. 07.30 - 09.00 / Jam Ke-1"
                      value={simpleTimeRange}
                      onChange={(e) => setSimpleTimeRange(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Nomor Surat:</label>
                    <input
                      type="text"
                      placeholder="e.g. 421/001/PAN-STS/DISP/2026"
                      value={simpleLetterNumber}
                      onChange={(e) => setSimpleLetterNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 font-mono text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Alasan / Keperluan Dispensasi:</label>
                  <input
                    type="text"
                    placeholder="e.g. Terlambat hadir karena kendala transportasi / Izin keluar mengambil kartu peserta"
                    value={simpleReason}
                    onChange={(e) => setSimpleReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama, NISN, no ujian..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="Administrasi Keuangan">Administrasi Keuangan</option>
              <option value="Persyaratan Berkas">Persyaratan Berkas</option>
              <option value="Kesehatan / Sakit">Kesehatan / Sakit</option>
              <option value="Keterlambatan Hadir">Keterlambatan Hadir</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
            >
              <option value="ALL">Semua Status</option>
              <option value="Aktif">Status: Aktif</option>
              <option value="Selesai">Status: Selesai</option>
              <option value="Dibatalkan">Status: Dibatalkan</option>
            </select>
          </div>

          <div>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
            >
              <option value="ALL">Semua Kelas</option>
              {classNames.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
            >
              <option value="ALL">Semua Ruang</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.roomCode})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Screen View: Interactive Table of Dispensations */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden no-print">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>Daftar Siswa Penerima Dispensasi</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              {filteredDispensations.length} dari {dispensations.length}
            </span>
          </h3>

          <span className="text-xs text-slate-500">
            Klik tombol aksi untuk cetak per siswa, edit rincian, atau tandai status lunas.
          </span>
        </div>

        {filteredDispensations.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Info className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-medium">Tidak ada data dispensasi yang sesuai filter.</p>
            <p className="text-xs text-slate-400 mt-1">Silakan sesuaikan filter atau tambahkan surat dispensasi baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3">No. Surat &amp; Tgl</th>
                  <th className="py-2.5 px-3">Identitas Siswa</th>
                  <th className="py-2.5 px-3">Kelas &amp; Ruang</th>
                  <th className="py-2.5 px-3">Kategori &amp; Rincian Alasan</th>
                  <th className="py-2.5 px-3">Batas Janji / Waktu</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDispensations.map((disp, idx) => (
                  <tr key={disp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800">
                      <div className="font-bold">{disp.letterNumber}</div>
                      <div className="text-[10px] text-slate-500">{disp.startDate}</div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 text-xs">{disp.studentName}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-mono">
                        <span>No: {disp.examNumber}</span>
                        <span>•</span>
                        <span>NISN: {disp.nisn}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-800">{disp.className}</span>
                      <div className="text-[10px] text-indigo-600 font-medium">
                        {disp.roomName || 'Ruang belum diatur'}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 max-w-xs">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mb-1 ${getCategoryBadgeClass(disp.reasonCategory)}`}>
                        {disp.reasonCategory}
                      </span>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {disp.reasonDetail}
                      </p>
                      {disp.commitmentNote && (
                        <p className="text-[10px] text-amber-700 italic mt-0.5">
                          Janji: {disp.commitmentNote}
                        </p>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <div className="font-semibold text-slate-800">{disp.validUntil}</div>
                      <div className="text-[10px] text-slate-400">s/d selesai sesi</div>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleToggleStatus(disp)}
                        title="Klik untuk mengubah status (Aktif / Selesai)"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${getStatusBadgeClass(disp.status)}`}
                      >
                        {disp.status === 'Aktif' ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        <span>{disp.status}</span>
                      </button>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedDispIdForPrint(disp.id);
                            setPrintMode('single_letter');
                            handlePrint();
                          }}
                          title="Cetak Surat Resmi Siswa Ini (A4)"
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded border border-indigo-200 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedDispIdForPrint(disp.id);
                            setPrintMode('pocket_slips');
                            handlePrint();
                          }}
                          title="Cetak Slip Masuk Ruang Siswa Ini"
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors cursor-pointer"
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(disp)}
                          title="Edit Dispensasi"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Hapus data dispensasi untuk ${disp.studentName}?`)) {
                              onDeleteDispensation(disp.id);
                            }
                          }}
                          title="Hapus Dispensasi"
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded border border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRINT VIEW CONTAINER - Only visible when printing or in preview below */}
      <div className="mt-8">
        <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 mb-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Printer className="w-4 h-4 text-indigo-600" />
            <span>Pratinjau Hasil Cetakan (Sesuai Format yang Dipilih):</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Tampilan di bawah adalah format cetak resmi yang akan tercetak di kertas A4 / F4.
          </span>
        </div>

        {/* PRINT MODE 1 & 2: SURAT RESMI (ALL or SINGLE) */}
        {(printMode === 'all_letters' || printMode === 'single_letter') && (
          <div className="space-y-8 print:space-y-0">
            {(printMode === 'single_letter' ? (singleDisp ? [singleDisp] : []) : filteredDispensations).map((disp) => (
              <OfficialDispensationLetterSheet
                key={disp.id}
                config={config}
                disp={disp}
                schedules={schedules}
              />
            ))}
          </div>
        )}

        {/* PRINT MODE 3: KARTU / SLIP SAKU (4 PER LEMBAR A4) */}
        {printMode === 'pocket_slips' && (
          <PocketDispensationSlipsSheet
            config={config}
            dispensations={filteredDispensations}
          />
        )}

        {/* PRINT MODE: SURAT DISPENSASI SIMPLE (MASUK & KELUAR RUANGAN) */}
        {printMode === 'simple_slip' && (
          <SimpleDispensationSlipSheet
            config={config}
            data={simpleData}
            isBlankMode={isSimpleBlank}
            slipsPerPage={simpleSlipsPerPage}
            pageCopies={simplePageCopies}
          />
        )}

        {/* PRINT MODE 4: REKAPITULASI TABEL DISPENSASI */}
        {printMode === 'recap_table' && (
          <RecapDispensationTableSheet
            config={config}
            dispensations={filteredDispensations}
          />
        )}
      </div>

      {/* MODAL: Tambah / Edit Dispensasi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <FileSignature className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingDisp ? 'Edit Surat Dispensasi Ujian' : 'Terbitkan Surat Dispensasi Ujian Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lengkapi identitas siswa, alasan dispensasi, batas janji, dan komitmen penyelesaian.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4">
              {/* Pilih Siswa */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Pilih Peserta Ujian / Siswa: <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formStudentId}
                  onChange={(e) => setFormStudentId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                >
                  <option value="">-- Pilih Siswa dari Database --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} • {s.className} • No. {s.examNumber} (NISN: {s.nisn || '-'})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Data NISN, kelas, nomor ujian, dan ruang akan terisi secara otomatis dari data siswa.
                </p>
              </div>

              {/* Nomor Surat & Pejabat Pemberi Izin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nomor Surat Dispensasi: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formLetterNumber}
                    onChange={(e) => setFormLetterNumber(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. 421/014/PAN-STS/DISP/2026"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Pejabat Pemberi Izin:
                  </label>
                  <input
                    type="text"
                    value={formApprovedBy}
                    onChange={(e) => setFormApprovedBy(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Ketua Panitia & Bendahara Madrasah"
                  />
                </div>
              </div>

              {/* Kategori Dispensasi & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Kategori Alasan Dispensasi: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formReasonCategory}
                    onChange={(e) => setFormReasonCategory(e.target.value as DispensationReasonCategory)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="Administrasi Keuangan">Administrasi Keuangan (SPP / Iuran Komite)</option>
                    <option value="Persyaratan Berkas">Persyaratan Berkas (Foto, Kartu, Buku Perpus)</option>
                    <option value="Kesehatan / Sakit">Kesehatan / Sakit (Ujian Khusus / Diizinkan)</option>
                    <option value="Keterlambatan Hadir">Keterlambatan Hadir / Izin Mendesak</option>
                    <option value="Lainnya">Lainnya / Khusus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Status Dispensasi:
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as DispensationStatus)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="Aktif">Aktif (Sedang Berjalan / Diizinkan Ikut Ujian)</option>
                    <option value="Selesai">Selesai (Kewajiban Sudah Dilunasi / Dipenuhi)</option>
                    <option value="Dibatalkan">Dibatalkan</option>
                  </select>
                </div>
              </div>

              {/* Detail Rincian Alasan */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Uraian Alasan / Permohonan Dispensasi: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formReasonDetail}
                  onChange={(e) => setFormReasonDetail(e.target.value)}
                  required
                  placeholder="Contoh: Penyelesaian SPP bulan September sedang menunggu pencairan dana orang tua siswa."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Masa Berlaku: Mulai s/d Batas Janji */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tanggal Izin Mulai:
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Batas Akhir / Janji Penyelesaian: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Komitmen / Perjanjian Orang Tua / Siswa */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Klausul Perjanjian / Pernyataan Janji:
                </label>
                <textarea
                  rows={2}
                  value={formCommitmentNote}
                  onChange={(e) => setFormCommitmentNote(e.target.value)}
                  placeholder="Contoh: Orang tua siswa berjanji akan menyelesaikan administrasi sebelum tanggal batas akhir."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Orang Tua / Wali Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nama Orang Tua / Wali:
                  </label>
                  <input
                    type="text"
                    value={formParentName}
                    onChange={(e) => setFormParentName(e.target.value)}
                    placeholder="Contoh: Bpk. H. Suherman"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    No. HP / WhatsApp Orang Tua:
                  </label>
                  <input
                    type="text"
                    value={formParentPhone}
                    onChange={(e) => setFormParentPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Pilihan Mata Pelajaran */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Cakupan Mata Pelajaran yang Diizinkan:
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAllowedAllSubjects}
                      onChange={(e) => setFormAllowedAllSubjects(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Semua Mata Pelajaran Ujian</span>
                  </label>
                </div>

                {!formAllowedAllSubjects && (
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                    {schedules.map((sch) => {
                      const isChecked = formSelectedSubjects.includes(sch.subject);
                      return (
                        <label key={sch.id} className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormSelectedSubjects([...formSelectedSubjects, sch.subject]);
                              } else {
                                setFormSelectedSubjects(formSelectedSubjects.filter((s) => s !== sch.subject));
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="truncate">{sch.subject} ({sch.dayName})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {editingDisp ? 'Simpan Perubahan' : 'Terbitkan Surat Dispensasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: Surat Resmi Dispensasi (A4)
// ==========================================
interface OfficialDispensationLetterSheetProps {
  config: ExamConfig;
  disp: ExamDispensation;
  schedules: ExamScheduleItem[];
}

export const OfficialDispensationLetterSheet: React.FC<OfficialDispensationLetterSheetProps> = ({
  config,
  disp,
  schedules,
}) => {
  const isMadrasah = ['MTs', 'MA', 'MI'].includes(config.schoolLevel);

  return (
    <div className="bg-white p-8 sm:p-10 border border-slate-300 rounded-xl shadow-xs print:shadow-none print:border-none print:m-0 print:p-8 max-w-[210mm] mx-auto page-break-after-always">
      {/* Official Header */}
      <div className="border-b-2 border-slate-950 pb-2">
        <div className="flex items-center gap-3">
          {config.logoUrl && (
            <div className="w-16 h-16 shrink-0 flex items-center justify-center">
              <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
          <div className="flex-1 text-center font-serif text-slate-950">
            {isMadrasah ? (
              <>
                <div className="text-[11px] uppercase font-bold text-slate-700 tracking-wider leading-tight">
                  KEMENTERIAN AGAMA REPUBLIK INDONESIA
                </div>
                <div className="text-[11px] uppercase font-bold text-slate-700 tracking-wider leading-tight">
                  KANTOR KEMENTERIAN AGAMA {config.district.toUpperCase()}
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] uppercase font-bold text-slate-700 tracking-wider leading-tight">
                  PEMERINTAH DAERAH PROVINSI {config.province.toUpperCase()}
                </div>
                <div className="text-[11px] uppercase font-bold text-slate-700 tracking-wider leading-tight">
                  DINAS PENDIDIKAN DAN KEBUDAYAAN
                </div>
              </>
            )}
            <div className="text-lg font-black uppercase text-slate-950 mt-0.5 tracking-wide leading-tight">
              {config.schoolName}
            </div>
            <div className="text-[10px] font-sans text-slate-600 mt-0.5 leading-tight">
              {config.address} • Telp: {config.phone} • Email: {config.email}
            </div>
          </div>
        </div>
        <div className="border-b border-slate-950 mt-1"></div>
        <div className="border-b-2 border-slate-950 mt-0.5"></div>
      </div>

      {/* Letter Title & Number */}
      <div className="text-center my-4">
        <h3 className="text-sm font-black uppercase tracking-wider underline text-slate-950">
          SURAT KETERANGAN DISPENSASI MENGIKUTI UJIAN
        </h3>
        <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">
          Nomor: {disp.letterNumber}
        </p>
      </div>

      {/* Opening statement */}
      <div className="text-xs text-slate-800 leading-relaxed space-y-3 font-serif">
        <p className="text-justify indent-6">
          Yang bertanda tangan di bawah ini, Panitia Penyelenggara {config.examTitle} Tahun Ajaran {config.academicYear} {config.schoolName}, dengan ini menerangkan dan memberikan izin dispensasi kepada:
        </p>

        {/* Student Biodata Table */}
        <div className="my-2 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded font-sans text-xs">
          <table className="w-full">
            <tbody>
              <tr>
                <td className="w-40 py-1 font-semibold text-slate-700">Nama Lengkap Siswa</td>
                <td className="w-4 py-1 text-center font-bold">:</td>
                <td className="py-1 font-bold text-slate-950 uppercase">{disp.studentName}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold text-slate-700">Nomor Peserta Ujian</td>
                <td className="py-1 text-center font-bold">:</td>
                <td className="py-1 font-mono font-bold text-slate-900">{disp.examNumber}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold text-slate-700">NISN / NIS</td>
                <td className="py-1 text-center font-bold">:</td>
                <td className="py-1 font-mono text-slate-900">{disp.nisn} / {disp.nis || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold text-slate-700">Kelas / Ruang Ujian</td>
                <td className="py-1 text-center font-bold">:</td>
                <td className="py-1 font-bold text-slate-900">
                  Kelas {disp.className} — {disp.roomName || 'Ruang Ujian'}
                </td>
              </tr>
              <tr>
                <td className="py-1 font-semibold text-slate-700">Nama Orang Tua / Wali</td>
                <td className="py-1 text-center font-bold">:</td>
                <td className="py-1 text-slate-900">{disp.parentName || '-'} {disp.parentPhone ? `(Telp: ${disp.parentPhone})` : ''}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Grounds & Details */}
        <p className="text-justify indent-6">
          Diberikan izin untuk <strong>tetap mengikuti pelaksanaan {config.examTitle}</strong> dengan rincian pertimbangan dan komitmen penyelesaian sebagai berikut:
        </p>

        <div className="px-4 py-2 border-l-4 border-slate-900 bg-slate-100/70 font-sans text-xs space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="font-bold text-slate-900 w-36 shrink-0">Kategori Dispensasi:</span>
            <span className="font-bold text-indigo-900">{disp.reasonCategory}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-slate-900 w-36 shrink-0">Alasan / Keterangan:</span>
            <span className="text-slate-800">{disp.reasonDetail}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-slate-900 w-36 shrink-0">Masa Berlaku Izin:</span>
            <span className="font-semibold text-slate-900">
              {disp.startDate} s/d {disp.validUntil}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-slate-900 w-36 shrink-0">Batas Komitmen Janji:</span>
            <span className="font-bold text-rose-700 underline">
              {disp.validUntil}
            </span>
          </div>
          {disp.commitmentNote && (
            <div className="flex items-start gap-2">
              <span className="font-bold text-slate-900 w-36 shrink-0">Pernyataan Komitmen:</span>
              <span className="text-slate-800 italic">"{disp.commitmentNote}"</span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <span className="font-bold text-slate-900 w-36 shrink-0">Cakupan Ujian:</span>
            <span className="text-slate-800">
              {disp.allowedSubjects && disp.allowedSubjects.length > 0
                ? disp.allowedSubjects.join(', ')
                : 'Semua Mata Pelajaran'}
            </span>
          </div>
        </div>

        {/* Closing paragraph */}
        <p className="text-justify indent-6 leading-relaxed">
          Surat dispensasi ini <strong>wajib dibawa dan ditunjukkan kepada Pengawas Ruang Ujian</strong> pada setiap sesi ujian. Apabila sampai dengan batas waktu yang telah disepakati di atas kewajiban belum dapat dipenuhi, maka hasil ujian dan administrasi tindak lanjut akan ditangguhkan sesuai ketentuan yang berlaku.
        </p>

        <p className="text-justify indent-6">
          Demikian surat keterangan dispensasi ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.
        </p>
      </div>

      {/* Date and Signatures */}
      <div className="mt-6 font-sans">
        <div className="text-right text-xs text-slate-800 font-serif mb-3">
          {config.issuePlace}, {disp.startDate || config.issueDate}
        </div>

        {/* 4 Signatures Grid */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {/* Siswa */}
          <div className="flex flex-col justify-between h-28">
            <p className="font-medium text-slate-700">Siswa Ybs.,</p>
            <div>
              <p className="font-bold underline text-slate-950 uppercase">{disp.studentName}</p>
              <p className="text-[10px] text-slate-500">NISN: {disp.nisn}</p>
            </div>
          </div>

          {/* Orang Tua / Wali */}
          <div className="flex flex-col justify-between h-28">
            <p className="font-medium text-slate-700">Orang Tua / Wali,</p>
            <div>
              <p className="font-bold underline text-slate-950">{disp.parentName || '(..........................)'}</p>
              <p className="text-[10px] text-slate-500">Tanda Tangan &amp; Nama Terang</p>
            </div>
          </div>

          {/* Panitia / Bendahara */}
          <div className="flex flex-col justify-between h-28">
            <p className="font-medium text-slate-700">Panitia / Bendahara,</p>
            <div>
              <p className="font-bold underline text-slate-950">{config.committeeHeadName}</p>
              <p className="text-[10px] text-slate-500">NIP: {config.committeeHeadNip || '-'}</p>
            </div>
          </div>

          {/* Mengetahui Kepala Madrasah */}
          <div className="flex flex-col justify-between h-28 relative">
            <p className="font-medium text-slate-700">
              Mengetahui,<br />
              Kepala {config.schoolLevel}
            </p>

            {/* Stamp if enabled */}
            {config.stampEnabled && config.stampUrl && (
              <div
                className="absolute left-1/2 top-8 pointer-events-none transform -translate-x-1/2"
                style={{
                  width: `${(config.stampSize || 100) * 0.7}px`,
                  opacity: (config.stampOpacity || 90) / 100,
                  transform: `translateX(-50%) rotate(${config.stampRotation || -7}deg)`,
                }}
              >
                <img src={config.stampUrl} alt="Cap Stempel" className="w-full h-auto object-contain" />
              </div>
            )}

            <div>
              <p className="font-bold underline text-slate-950 uppercase">{config.principalName}</p>
              <p className="text-[10px] text-slate-500">NIP: {config.principalNip || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: Kartu / Slip Saku (4 per lembar A4)
// ==========================================
interface PocketDispensationSlipsSheetProps {
  config: ExamConfig;
  dispensations: ExamDispensation[];
}

export const PocketDispensationSlipsSheet: React.FC<PocketDispensationSlipsSheetProps> = ({
  config,
  dispensations,
}) => {
  // Chunk dispensations into groups of 4 for A4 pages
  const chunks = useMemo(() => {
    const res: ExamDispensation[][] = [];
    for (let i = 0; i < dispensations.length; i += 4) {
      res.push(dispensations.slice(i, i + 4));
    }
    return res;
  }, [dispensations]);

  return (
    <div className="space-y-8 print:space-y-0 max-w-[210mm] mx-auto">
      {chunks.map((chunk, pageIndex) => (
        <div
          key={pageIndex}
          className="bg-white p-6 border border-slate-300 rounded-xl shadow-xs print:shadow-none print:border-none print:m-0 print:p-4 min-h-[297mm] max-h-[297mm] page-break-after-always flex flex-col justify-between"
        >
          <div className="grid grid-cols-2 gap-4">
            {chunk.map((disp) => (
              <div
                key={disp.id}
                className="border-2 border-slate-900 rounded-lg p-3.5 bg-white relative flex flex-col justify-between h-[135mm]"
              >
                {/* Header Card */}
                <div>
                  <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1.5">
                    {config.logoUrl && (
                      <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                        <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1 text-center">
                      <div className="text-[8px] uppercase font-bold text-slate-700 leading-tight">
                        PANITIA {config.examTitle}
                      </div>
                      <div className="text-[10px] font-black uppercase text-slate-950 leading-tight">
                        {config.schoolName}
                      </div>
                    </div>
                  </div>

                  {/* Title Badge */}
                  <div className="mt-1.5 text-center">
                    <span className="inline-block bg-slate-900 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded tracking-wider">
                      KARTU IZIN DISPENSASI UJIAN
                    </span>
                    <div className="text-[8px] font-mono font-bold text-slate-700 mt-0.5">
                      No: {disp.letterNumber}
                    </div>
                  </div>

                  {/* Student Details */}
                  <div className="mt-2 space-y-1 text-[10px] font-sans">
                    <div className="flex">
                      <span className="w-20 text-slate-600 font-semibold">Nama Siswa</span>
                      <span className="font-bold text-slate-950 uppercase truncate">: {disp.studentName}</span>
                    </div>
                    <div className="flex">
                      <span className="w-20 text-slate-600 font-semibold">No. Peserta</span>
                      <span className="font-mono font-bold text-indigo-700">: {disp.examNumber}</span>
                    </div>
                    <div className="flex">
                      <span className="w-20 text-slate-600 font-semibold">NISN / Kelas</span>
                      <span className="font-semibold text-slate-900">: {disp.nisn} / {disp.className}</span>
                    </div>
                    <div className="flex">
                      <span className="w-20 text-slate-600 font-semibold">Ruang Ujian</span>
                      <span className="font-bold text-slate-900">: {disp.roomName || 'Ruang Ujian'}</span>
                    </div>
                  </div>

                  {/* Dispensation reason box */}
                  <div className="mt-2 p-1.5 bg-slate-50 border border-slate-300 rounded text-[9px] space-y-0.5">
                    <div>
                      <span className="font-bold text-slate-700">Kategori: </span>
                      <span className="font-bold text-amber-800">{disp.reasonCategory}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Masa Berlaku: </span>
                      <span className="font-semibold text-slate-900">{disp.startDate} s/d {disp.validUntil}</span>
                    </div>
                    <p className="text-slate-600 italic line-clamp-2">
                      "{disp.reasonDetail}"
                    </p>
                  </div>
                </div>

                {/* Footer Notice & Signatures */}
                <div className="mt-2 pt-1.5 border-t border-slate-200">
                  <p className="text-[7.5px] text-rose-700 font-bold leading-tight mb-2">
                    *Wajib ditunjukkan kepada Pengawas Ruang sebelum memasuki sesi ujian.
                  </p>

                  <div className="flex items-center justify-between text-[8px] font-sans">
                    <div className="text-center">
                      <p className="text-slate-500 text-[7.5px]">Siswa Ybs,</p>
                      <div className="h-6"></div>
                      <p className="font-bold underline text-slate-900 uppercase truncate max-w-[80px]">
                        {disp.studentName}
                      </p>
                    </div>

                    <div className="text-center relative">
                      <p className="text-slate-500 text-[7.5px]">Panitia Ujian,</p>
                      <div className="h-6"></div>
                      <p className="font-bold underline text-slate-900 uppercase">
                        {config.committeeHeadName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-[9px] text-slate-400 font-mono pt-2">
            Gunting sesuai garis batas untuk memisahkan kartu saku dispensasi (✂)
          </div>
        </div>
      ))}
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: Rekapitulasi Daftar Dispensasi
// ==========================================
interface RecapDispensationTableSheetProps {
  config: ExamConfig;
  dispensations: ExamDispensation[];
}

export const RecapDispensationTableSheet: React.FC<RecapDispensationTableSheetProps> = ({
  config,
  dispensations,
}) => {
  const isMadrasah = ['MTs', 'MA', 'MI'].includes(config.schoolLevel);

  return (
    <div className="bg-white p-8 border border-slate-300 rounded-xl shadow-xs print:shadow-none print:border-none print:m-0 print:p-6 max-w-[210mm] mx-auto page-break-after-always">
      {/* Official Header */}
      <div className="border-b-2 border-slate-950 pb-2">
        <div className="flex items-center gap-3">
          {config.logoUrl && (
            <div className="w-14 h-14 shrink-0 flex items-center justify-center">
              <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
          <div className="flex-1 text-center font-serif text-slate-950">
            <div className="text-[10px] uppercase font-bold text-slate-700 tracking-wider leading-tight">
              {isMadrasah ? 'KEMENTERIAN AGAMA REPUBLIK INDONESIA' : 'DINAS PENDIDIKAN DAN KEBUDAYAAN'}
            </div>
            <div className="text-base font-black uppercase text-slate-950 mt-0.5 leading-tight">
              {config.schoolName}
            </div>
            <div className="text-[9px] font-sans text-slate-600 mt-0.5 leading-tight">
              {config.address} • Telp: {config.phone}
            </div>
          </div>
        </div>
        <div className="border-b border-slate-950 mt-1"></div>
        <div className="border-b-2 border-slate-950 mt-0.5"></div>
      </div>

      <div className="text-center my-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-950 underline">
          REKAPITULASI PESERTA DISPENSASI UJIAN
        </h3>
        <p className="text-xs font-semibold text-slate-700 mt-0.5">
          {config.examTitle} — TAHUN AJARAN {config.academicYear}
        </p>
      </div>

      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse border border-slate-950 text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-950 font-bold uppercase text-[10px] tracking-wider text-center">
              <th className="border border-slate-950 p-2 w-8">No</th>
              <th className="border border-slate-950 p-2 w-28">No. Surat</th>
              <th className="border border-slate-950 p-2 text-left">Nama Peserta</th>
              <th className="border border-slate-950 p-2 w-20">No. Peserta</th>
              <th className="border border-slate-950 p-2 w-14">Kelas</th>
              <th className="border border-slate-950 p-2 w-20">Ruang</th>
              <th className="border border-slate-950 p-2 text-left">Kategori &amp; Janji</th>
              <th className="border border-slate-950 p-2 w-20">Batas Waktu</th>
              <th className="border border-slate-950 p-2 w-14">Status</th>
              <th className="border border-slate-950 p-2 w-16">Paraf Pengawas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {dispensations.map((d, i) => (
              <tr key={d.id} className="text-slate-900 text-[11px]">
                <td className="border border-slate-950 p-1.5 text-center font-mono">{i + 1}</td>
                <td className="border border-slate-950 p-1.5 font-mono text-[9.5px]">{d.letterNumber}</td>
                <td className="border border-slate-950 p-1.5 font-bold uppercase">{d.studentName}</td>
                <td className="border border-slate-950 p-1.5 font-mono text-center">{d.examNumber}</td>
                <td className="border border-slate-950 p-1.5 text-center font-semibold">{d.className}</td>
                <td className="border border-slate-950 p-1.5 text-center">{d.roomName || '-'}</td>
                <td className="border border-slate-950 p-1.5 text-[10px]">
                  <div className="font-bold text-slate-950">{d.reasonCategory}</div>
                  <div className="text-slate-600 line-clamp-1">{d.reasonDetail}</div>
                </td>
                <td className="border border-slate-950 p-1.5 font-mono text-center text-[10px]">{d.validUntil}</td>
                <td className="border border-slate-950 p-1.5 text-center font-semibold text-[10px]">{d.status}</td>
                <td className="border border-slate-950 p-1.5 text-center"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Signatures */}
      <div className="mt-8 flex justify-between text-xs font-serif">
        <div className="text-center w-56">
          <p className="text-slate-700">Koordinator Pengawas Ruang,</p>
          <div className="h-16"></div>
          <p className="font-bold underline text-slate-950">(...........................................)</p>
          <p className="text-[10px] text-slate-500">NIP: .......................................</p>
        </div>

        <div className="text-center w-56">
          <p className="text-slate-700">{config.issuePlace}, {config.issueDate}</p>
          <p className="text-slate-700">Ketua Panitia Ujian,</p>
          <div className="h-16"></div>
          <p className="font-bold underline text-slate-950">{config.committeeHeadName}</p>
          <p className="text-[10px] text-slate-500">NIP: {config.committeeHeadNip || '-'}</p>
        </div>
      </div>
    </div>
  );
};
