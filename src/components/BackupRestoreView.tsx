import React, { useState, useRef, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  FileJson, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Clock, 
  Calendar, 
  Users, 
  DoorOpen, 
  UserCheck, 
  ShieldCheck, 
  Copy, 
  Check, 
  Trash2, 
  HardDrive, 
  Cloud, 
  FileCheck2, 
  Sparkles, 
  Archive,
  ArrowRight,
  Info,
  Layers,
  FileCode,
  Eye,
  RefreshCw,
  HelpCircle,
  History as HistoryIcon
} from 'lucide-react';
import { 
  ActiveTab, 
  AuthUser, 
  BackupData, 
  BackupSnapshot, 
  ExamConfig, 
  ExamDispensation,
  ExamRoom, 
  ExamScheduleItem, 
  Proctor, 
  ProctorAttendanceRecord, 
  Student 
} from '../types';

interface BackupRestoreViewProps {
  config: ExamConfig;
  students: Student[];
  rooms: ExamRoom[];
  proctors: Proctor[];
  schedules: ExamScheduleItem[];
  attendanceRecords: ProctorAttendanceRecord[];
  dispensations?: ExamDispensation[];
  authUser?: AuthUser | null;
  isCloudConnected: boolean;
  onRestoreFull: (data: BackupData['data']) => Promise<void>;
  onRestoreSelective: (data: Partial<BackupData['data']>, selectedParts: string[]) => Promise<void>;
  onResetData: () => void;
  onClearDataForNewExam: () => void;
  showToast: (msg: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

const SNAPSHOTS_STORAGE_KEY = 'sim_ujian_local_snapshots_v1';

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  config,
  students,
  rooms,
  proctors,
  schedules,
  attendanceRecords,
  dispensations = [],
  authUser,
  isCloudConnected,
  onRestoreFull,
  onRestoreSelective,
  onResetData,
  onClearDataForNewExam,
  showToast,
  setActiveTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'export' | 'import' | 'snapshots' | 'maintenance'>('export');
  
  // Export states
  const [includeConfig, setIncludeConfig] = useState(true);
  const [includeStudents, setIncludeStudents] = useState(true);
  const [includeRooms, setIncludeRooms] = useState(true);
  const [includeProctors, setIncludeProctors] = useState(true);
  const [includeSchedules, setIncludeSchedules] = useState(true);
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  // Import states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedRawData, setImportedRawData] = useState<BackupData | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'full' | 'selective'>('full');
  
  // Selective checkboxes
  const [selectedToRestore, setSelectedToRestore] = useState({
    config: true,
    students: true,
    rooms: true,
    proctors: true,
    schedules: true,
    attendance: true,
  });

  // Manual JSON Paste
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedJsonText, setPastedJsonText] = useState('');

  // Snapshots states
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newSnapshotTitle, setNewSnapshotTitle] = useState('');
  const [newSnapshotNote, setNewSnapshotNote] = useState('');
  const [showCreateSnapshotModal, setShowCreateSnapshotModal] = useState(false);

  // Save snapshots to local storage
  const updateSnapshots = (newSnapshots: BackupSnapshot[]) => {
    setSnapshots(newSnapshots);
    try {
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(newSnapshots));
    } catch (e) {
      console.error('Failed to save snapshots to localStorage', e);
    }
  };

  // Generate Current Backup Data Object
  const generateBackupData = (): BackupData => {
    return {
      version: '1.0',
      appId: 'sim_ujian_mts',
      createdAt: new Date().toISOString(),
      exportedBy: authUser ? `${authUser.name} (${authUser.roleLabel})` : 'Administrator',
      schoolName: config.schoolName,
      examType: config.examType,
      academicYear: config.academicYear,
      metadata: {
        totalStudents: students.length,
        totalRooms: rooms.length,
        totalProctors: proctors.length,
        totalSchedules: schedules.length,
        totalAttendanceRecords: attendanceRecords.length,
        totalDispensations: (dispensations || []).length,
      },
      data: {
        config,
        students,
        rooms,
        proctors,
        schedules,
        attendanceRecords,
        dispensations: dispensations || [],
      },
    };
  };

  // Filtered Backup for Export based on user selection
  const getExportDataPayload = () => {
    const full = generateBackupData();
    const filteredData: Partial<BackupData['data']> = {};
    if (includeConfig) filteredData.config = config;
    if (includeStudents) filteredData.students = students;
    if (includeRooms) filteredData.rooms = rooms;
    if (includeProctors) filteredData.proctors = proctors;
    if (includeSchedules) filteredData.schedules = schedules;
    if (includeAttendance) filteredData.attendanceRecords = attendanceRecords;

    return {
      ...full,
      metadata: {
        totalStudents: includeStudents ? students.length : 0,
        totalRooms: includeRooms ? rooms.length : 0,
        totalProctors: includeProctors ? proctors.length : 0,
        totalSchedules: includeSchedules ? schedules.length : 0,
        totalAttendanceRecords: includeAttendance ? attendanceRecords.length : 0,
      },
      data: filteredData as BackupData['data'],
    };
  };

  // Download Backup File
  const handleDownloadBackup = () => {
    const payload = getExportDataPayload();
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // File naming: BACKUP_UJIAN_[SEKOLAH]_[JENIS]_[YYYY-MM-DD].json
    const cleanSchool = config.schoolName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `BACKUP_UJIAN_${cleanSchool}_${config.examType}_${dateStr}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`File backup berhasil diunduh: ${filename}`);
  };

  // Copy JSON to clipboard
  const handleCopyJson = () => {
    const payload = getExportDataPayload();
    const jsonStr = JSON.stringify(payload, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(jsonStr);
      setCopiedJson(true);
      showToast('Seluruh data cadangan JSON berhasil disalin ke clipboard!');
      setTimeout(() => setCopiedJson(false), 3000);
    }
  };

  // Process imported JSON string
  const processJsonText = (text: string, sourceName: string) => {
    try {
      setImportError(null);
      const parsed = JSON.parse(text);

      // Validation logic: check if structure is valid
      let validatedBackup: BackupData | null = null;

      if (parsed && typeof parsed === 'object') {
        // Format standard BackupData
        if (parsed.data && typeof parsed.data === 'object') {
          validatedBackup = parsed as BackupData;
        } 
        // Legacy or raw format containing direct keys
        else if (parsed.students || parsed.rooms || parsed.config || parsed.schedules) {
          validatedBackup = {
            version: '1.0-legacy',
            appId: 'sim_ujian_mts',
            createdAt: new Date().toISOString(),
            schoolName: parsed.config?.schoolName || config.schoolName,
            examType: parsed.config?.examType || config.examType,
            academicYear: parsed.config?.academicYear || config.academicYear,
            metadata: {
              totalStudents: Array.isArray(parsed.students) ? parsed.students.length : 0,
              totalRooms: Array.isArray(parsed.rooms) ? parsed.rooms.length : 0,
              totalProctors: Array.isArray(parsed.proctors) ? parsed.proctors.length : 0,
              totalSchedules: Array.isArray(parsed.schedules) ? parsed.schedules.length : 0,
              totalAttendanceRecords: Array.isArray(parsed.attendanceRecords) ? parsed.attendanceRecords.length : 0,
            },
            data: {
              config: parsed.config || config,
              students: Array.isArray(parsed.students) ? parsed.students : [],
              rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
              proctors: Array.isArray(parsed.proctors) ? parsed.proctors : [],
              schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
              attendanceRecords: Array.isArray(parsed.attendanceRecords) ? parsed.attendanceRecords : [],
            },
          };
        }
      }

      if (!validatedBackup || !validatedBackup.data) {
        throw new Error('Format file tidak dikenali. Pastikan file adalah hasil backup resmi aplikasi EXAM-SYNC / SIM Ujian.');
      }

      setImportedRawData(validatedBackup);
      setImportFileName(sourceName);
      
      // Auto-set selective checkboxes based on what data actually exists in backup
      setSelectedToRestore({
        config: !!validatedBackup.data.config,
        students: Array.isArray(validatedBackup.data.students) && validatedBackup.data.students.length > 0,
        rooms: Array.isArray(validatedBackup.data.rooms) && validatedBackup.data.rooms.length > 0,
        proctors: Array.isArray(validatedBackup.data.proctors) && validatedBackup.data.proctors.length > 0,
        schedules: Array.isArray(validatedBackup.data.schedules) && validatedBackup.data.schedules.length > 0,
        attendance: Array.isArray(validatedBackup.data.attendanceRecords) && validatedBackup.data.attendanceRecords.length > 0,
      });

      showToast(`File "${sourceName}" berhasil dimuat. Silakan periksa pratinjau sebelum memulihkan.`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Gagal memproses data JSON file backup.');
      setImportedRawData(null);
    }
  };

  // Handle File Input Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processJsonText(content, file.name);
    };
    reader.onerror = () => {
      setImportError('Gagal membaca file dari penyimpanan lokal.');
    };
    reader.readAsText(file);
    // Reset file input value so user can re-select same file if desired
    e.target.value = '';
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        processJsonText(content, file.name);
      };
      reader.readAsText(file);
    }
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!importedRawData) return;
    setIsRestoring(true);
    setShowConfirmModal(false);

    try {
      if (restoreMode === 'full') {
        await onRestoreFull(importedRawData.data);
        showToast('Seluruh data berhasil dipulihkan dan disinkronkan ke Cloud!');
      } else {
        const selectivePayload: Partial<BackupData['data']> = {};
        const selectedParts: string[] = [];

        if (selectedToRestore.config && importedRawData.data.config) {
          selectivePayload.config = importedRawData.data.config;
          selectedParts.push('Identitas & Konfigurasi');
        }
        if (selectedToRestore.students && importedRawData.data.students) {
          selectivePayload.students = importedRawData.data.students;
          selectedParts.push(`${importedRawData.data.students.length} Peserta Ujian`);
        }
        if (selectedToRestore.rooms && importedRawData.data.rooms) {
          selectivePayload.rooms = importedRawData.data.rooms;
          selectedParts.push(`${importedRawData.data.rooms.length} Ruang Ujian`);
        }
        if (selectedToRestore.proctors && importedRawData.data.proctors) {
          selectivePayload.proctors = importedRawData.data.proctors;
          selectedParts.push(`${importedRawData.data.proctors.length} Pengawas`);
        }
        if (selectedToRestore.schedules && importedRawData.data.schedules) {
          selectivePayload.schedules = importedRawData.data.schedules;
          selectedParts.push(`${importedRawData.data.schedules.length} Jadwal Ujian`);
        }
        if (selectedToRestore.attendance && importedRawData.data.attendanceRecords) {
          selectivePayload.attendanceRecords = importedRawData.data.attendanceRecords;
          selectedParts.push('Presensi Pengawas');
        }

        await onRestoreSelective(selectivePayload, selectedParts);
        showToast(`Data terpilih (${selectedParts.join(', ')}) berhasil dipulihkan!`);
      }
      // Reset import state
      setImportedRawData(null);
      setImportFileName('');
    } catch (err) {
      showToast('Gagal memulihkan data: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsRestoring(false);
    }
  };

  // Create Quick Snapshot
  const handleCreateSnapshot = () => {
    const backupData = generateBackupData();
    const newSnapshot: BackupSnapshot = {
      id: 'snap-' + Date.now(),
      title: newSnapshotTitle.trim() || `Titik Pemulihan #${snapshots.length + 1}`,
      createdAt: new Date().toISOString(),
      note: newSnapshotNote.trim(),
      schoolName: config.schoolName,
      totalStudents: students.length,
      totalRooms: rooms.length,
      totalSchedules: schedules.length,
      backupData,
    };

    updateSnapshots([newSnapshot, ...snapshots]);
    setNewSnapshotTitle('');
    setNewSnapshotNote('');
    setShowCreateSnapshotModal(false);
    showToast(`Titik pemulihan "${newSnapshot.title}" berhasil dibuat!`);
  };

  // Restore from Snapshot
  const handleRestoreFromSnapshot = async (snapshot: BackupSnapshot) => {
    if (window.confirm(`Pulihkan seluruh data aplikasi ke kondisi "${snapshot.title}" (${new Date(snapshot.createdAt).toLocaleString('id-ID')})? Data saat ini akan digantikan.`)) {
      setIsRestoring(true);
      try {
        await onRestoreFull(snapshot.backupData.data);
        showToast(`Berhasil memulihkan ke titik "${snapshot.title}"!`);
      } catch (e) {
        showToast('Gagal memulihkan snapshot: ' + (e instanceof Error ? e.message : String(e)));
      } finally {
        setIsRestoring(false);
      }
    }
  };

  // Download Snapshot as JSON File
  const handleDownloadSnapshot = (snapshot: BackupSnapshot) => {
    const jsonStr = JSON.stringify(snapshot.backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SNAPSHOT_${snapshot.title.replace(/[^a-zA-Z0-9]/g, '_')}_${snapshot.createdAt.slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Snapshot "${snapshot.title}" berhasil diunduh.`);
  };

  // Delete Snapshot
  const handleDeleteSnapshot = (id: string) => {
    if (window.confirm('Hapus titik pemulihan ini?')) {
      const filtered = snapshots.filter((s) => s.id !== id);
      updateSnapshots(filtered);
      showToast('Titik pemulihan berhasil dihapus.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-200">
                Pusat Keamanan &amp; Data
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold tracking-wider border border-emerald-200 flex items-center gap-1">
                <Cloud className="w-3 h-3 text-emerald-600" />
                {isCloudConnected ? 'Cloud Realtime Terkoneksi' : 'Lokal Siap'}
              </span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Database className="w-6 h-6 text-indigo-600" />
              Backup &amp; Restore Data Ujian
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              Amankan seluruh konfigurasi ujian, data peserta, plotting ruang meja, guru pengawas, dan jadwal mapel.
              Unduh cadangan ke file JSON kapan saja atau pulihkan kembali dengan validasi otomatis &amp; sinkronisasi Cloud instan.
            </p>
          </div>

          {/* Quick Stats of Current Data */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80 shrink-0">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Peserta</p>
              <p className="text-base font-extrabold text-indigo-600">{students.length}</p>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Ruang</p>
              <p className="text-base font-extrabold text-slate-800">{rooms.length}</p>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Pengawas</p>
              <p className="text-base font-extrabold text-slate-800">{proctors.length}</p>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Jadwal Sesi</p>
              <p className="text-base font-extrabold text-slate-800">{schedules.length}</p>
            </div>
          </div>
        </div>

        {/* Sub-Tab Navigation */}
        <div className="flex border-b border-slate-200 mt-6 -mb-6 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('export')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'export'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>1. Unduh Cadangan (Backup Data)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('import')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'import'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>2. Pulihkan Cadangan (Restore Data)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('snapshots')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'snapshots'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>3. Titik Pemulihan Cepat ({snapshots.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('maintenance')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'maintenance'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>4. Arsip &amp; Reset Ujian Baru</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: EXPORT / UNDUH CADANGAN */}
      {/* ========================================================================= */}
      {activeSubTab === 'export' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Export Settings & Selectors */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Download className="w-5 h-5 text-indigo-600" />
                    Pilih Komponen yang Ingin Di-Backup
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Centang data apa saja yang ingin Anda sertakan di dalam file cadangan JSON ini.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                    includeConfig ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={includeConfig}
                      onChange={(e) => setIncludeConfig(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Identitas &amp; Pengaturan Ujian</span>
                      <span className="text-[11px] text-slate-500 leading-snug block">
                        Kop madrasah, logo, stempel, TTD digital, nama kepala &amp; ketua panitia ({config.examType} - {config.academicYear})
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                    includeStudents ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={includeStudents}
                      onChange={(e) => setIncludeStudents(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block flex items-center justify-between">
                        Data Peserta Ujian
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {students.length} Siswa
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500 leading-snug block">
                        NISN, NIS, nama, rombel kelas, nomor peserta, dan posisi plotting ruang/meja
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                    includeRooms ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={includeRooms}
                      onChange={(e) => setIncludeRooms(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block flex items-center justify-between">
                        Data Ruang Ujian
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {rooms.length} Ruang
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500 leading-snug block">
                        Daftar kode ruang, nama gedung, kapasitas bangku, dan penetapan pengawas
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                    includeProctors ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={includeProctors}
                      onChange={(e) => setIncludeProctors(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block flex items-center justify-between">
                        Data Guru Pengawas
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {proctors.length} Guru
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500 leading-snug block">
                        Daftar nama guru, NIP, mapel ampu, dan penugasan pengawas 1 &amp; 2
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                    includeSchedules ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={includeSchedules}
                      onChange={(e) => setIncludeSchedules(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block flex items-center justify-between">
                        Jadwal Pelaksanaan Ujian
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {schedules.length} Sesi
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500 leading-snug block">
                        Daftar tanggal, hari, sesi waktu pelaksanaan, mapel, dan target kelas
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                    includeAttendance ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={includeAttendance}
                      onChange={(e) => setIncludeAttendance(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block flex items-center justify-between">
                        Presensi Digital Pengawas
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {attendanceRecords.length} Catatan
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500 leading-snug block">
                        Riwayat presensi kehadiran pengawas, paraf/TTD digital, dan catatan ruang
                      </span>
                    </div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh File Cadangan (.JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-xs transition-colors cursor-pointer"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Salin JSON ke Clipboard</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowJsonPreview(!showJsonPreview)}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 ml-auto cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showJsonPreview ? 'Sembunyikan Pratinjau' : 'Lihat Pratinjau JSON'}</span>
                  </button>
                </div>

                {/* JSON Preview accordion */}
                {showJsonPreview && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 font-mono flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                        Pratinjau Struktur File Cadangan (JSON)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Format Standar AI Studio &amp; Cloud Sync
                      </span>
                    </div>
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-[11px] font-mono overflow-x-auto max-h-72 leading-relaxed border border-slate-800">
                      {JSON.stringify(getExportDataPayload(), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Info & Best Practices */}
            <div className="space-y-4">
              <div className="bg-indigo-900 text-white p-5 rounded-xl shadow-xs space-y-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-800 flex items-center justify-center text-indigo-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm">Mengapa Wajib Backup?</h4>
                <p className="text-xs text-indigo-200 leading-relaxed">
                  File backup adalah salinan digital lengkap dari seluruh konfigurasi ujian Anda. Simpan file ini di:
                </p>
                <ul className="text-xs text-indigo-100 space-y-1.5 list-disc list-inside">
                  <li>Google Drive / Penyimpanan Cloud</li>
                  <li>Flashdisk Panitia Ujian Sekolah</li>
                  <li>Kirim via WhatsApp / Email Tim Panitia</li>
                </ul>
                <div className="pt-2 border-t border-indigo-800/80 text-[11px] text-indigo-300">
                  Jika komputer atau browser dibersihkan, Anda cukup klik <strong>Restore</strong> untuk mengembalikan seluruh data dalam hitungan detik.
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-600">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-600" />
                  Format File Terbuka (Open Format)
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  File backup berformat standard <code>.json</code> yang bersih dan transparan. Anda dapat membuka atau menyimpannya tanpa aplikasi pihak ketiga apa pun.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: IMPORT / PULIHKAN DATA CADANGAN */}
      {/* ========================================================================= */}
      {activeSubTab === 'import' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Drag & Drop Zone and Preview Card */}
            <div className="lg:col-span-2 space-y-6">
              {/* File Upload Box */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`p-8 rounded-xl border-2 border-dashed text-center transition-all bg-white ${
                  isDragging
                    ? 'border-indigo-600 bg-indigo-50/50 scale-[0.99]'
                    : 'border-slate-300 hover:border-indigo-400'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,application/json"
                  className="hidden"
                />

                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <FileJson className="w-7 h-7" />
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Pilih File Backup JSON untuk Dipulihkan
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  Seret dan lepas file <strong>.json</strong> hasil cadangan ke sini, atau klik tombol di bawah untuk memilih file dari komputer.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Pilih File Dari Komputer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasteModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <FileCode className="w-4 h-4 text-slate-600" />
                    <span>Tempel Kode JSON Manual</span>
                  </button>
                </div>

                {importFileName && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>File Terpilih: {importFileName}</span>
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {importError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-800">
                    <p className="font-bold mb-0.5">Terjadi Kesalahan Saat Membaca File</p>
                    <p>{importError}</p>
                  </div>
                </div>
              )}

              {/* Pratinjau Isi File Backup Sebelum Dipulihkan */}
              {importedRawData && (
                <div className="bg-white rounded-xl p-6 border-2 border-indigo-200 shadow-sm space-y-5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wide">
                          File Valid &amp; Siap Dipulihkan
                        </span>
                        <span className="text-xs text-slate-400">
                          Versi: {importedRawData.version || '1.0'}
                        </span>
                      </div>
                      <h4 className="text-lg font-extrabold text-slate-900 mt-1">
                        {importedRawData.schoolName || importedRawData.data?.config?.schoolName || 'Data Ujian Sekolah'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {importedRawData.examType || importedRawData.data?.config?.examType} • TP {importedRawData.academicYear || importedRawData.data?.config?.academicYear}
                        {importedRawData.createdAt && ` • Dibuat: ${new Date(importedRawData.createdAt).toLocaleString('id-ID')}`}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-slate-400 block">Diekspor Oleh:</span>
                      <span className="text-xs font-semibold text-slate-700">
                        {importedRawData.exportedBy || 'Administrator'}
                      </span>
                    </div>
                  </div>

                  {/* Summary counts from file */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Peserta</span>
                      <span className="text-lg font-extrabold text-indigo-600">
                        {importedRawData.data?.students?.length || 0}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Ruang</span>
                      <span className="text-lg font-extrabold text-slate-800">
                        {importedRawData.data?.rooms?.length || 0}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Pengawas</span>
                      <span className="text-lg font-extrabold text-slate-800">
                        {importedRawData.data?.proctors?.length || 0}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Jadwal Sesi</span>
                      <span className="text-lg font-extrabold text-slate-800">
                        {importedRawData.data?.schedules?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Restore Mode Selection */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-800 block">
                      Pilih Metode Pemulihan:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRestoreMode('full')}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          restoreMode === 'full'
                            ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900">
                            1. Pulihkan Total (Seluruh Data)
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-600 text-white">
                            Rekomendasi
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Menggantikan konfigurasi, siswa, ruang, pengawas, dan jadwal dengan data dari file backup ini.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRestoreMode('selective')}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          restoreMode === 'selective'
                            ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900">
                            2. Pulihkan Selektif (Pilih Data)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Hanya pulihkan bagian tertentu (misal: hanya data siswa atau hanya jadwal ujian).
                        </p>
                      </button>
                    </div>

                    {/* Checkboxes for selective restore */}
                    {restoreMode === 'selective' && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 mt-3 animate-in fade-in">
                        <span className="text-xs font-bold text-slate-700 block mb-2">
                          Centang Data yang Ingin Di-Restore:
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.config}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, config: e.target.checked })}
                              disabled={!importedRawData.data?.config}
                              className="rounded text-indigo-600"
                            />
                            <span>Identitas &amp; Pengaturan Ujian</span>
                          </label>

                          <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.students}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, students: e.target.checked })}
                              disabled={!importedRawData.data?.students?.length}
                              className="rounded text-indigo-600"
                            />
                            <span>Data Peserta ({importedRawData.data?.students?.length || 0} Siswa)</span>
                          </label>

                          <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.rooms}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, rooms: e.target.checked })}
                              disabled={!importedRawData.data?.rooms?.length}
                              className="rounded text-indigo-600"
                            />
                            <span>Data Ruang ({importedRawData.data?.rooms?.length || 0} Ruang)</span>
                          </label>

                          <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.proctors}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, proctors: e.target.checked })}
                              disabled={!importedRawData.data?.proctors?.length}
                              className="rounded text-indigo-600"
                            />
                            <span>Data Pengawas ({importedRawData.data?.proctors?.length || 0} Guru)</span>
                          </label>

                          <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.schedules}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, schedules: e.target.checked })}
                              disabled={!importedRawData.data?.schedules?.length}
                              className="rounded text-indigo-600"
                            />
                            <span>Jadwal Ujian ({importedRawData.data?.schedules?.length || 0} Sesi)</span>
                          </label>

                          <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.attendance}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, attendance: e.target.checked })}
                              disabled={!importedRawData.data?.attendanceRecords?.length}
                              className="rounded text-indigo-600"
                            />
                            <span>Presensi Pengawas ({importedRawData.data?.attendanceRecords?.length || 0} Data)</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Trigger Confirmation */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setImportedRawData(null);
                        setImportFileName('');
                      }}
                      className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Batalkan / Ganti File
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(true)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Jalankan Pemulihan (Restore) Sekarang</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Safeguards & Warnings */}
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl text-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Perhatian Saat Memulihkan
                </div>
                <p className="text-amber-900 leading-relaxed">
                  Proses <strong>Restore</strong> akan menimpa data yang saat ini aktif di aplikasi dengan data dari file backup.
                </p>
                <div className="p-3 bg-white/80 rounded-lg border border-amber-300/60 text-amber-950 text-[11px] space-y-1">
                  <p className="font-bold">Tips Keamanan:</p>
                  <p>
                    Sebelum melakukan restore, sebaiknya Anda mengunduh cadangan data saat ini terlebih dahulu di tab <strong>Unduh Cadangan</strong> atau klik tombol di bawah untuk membuat snapshot instan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleCreateSnapshot();
                  }}
                  className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer text-center"
                >
                  Amankan Snapshot Cepat Sekarang
                </button>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 text-xs space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-indigo-600" />
                  Sinkronisasi Cloud Otomatis
                </h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Ketika file cadangan dipulihkan, sistem secara otomatis memperbarui <strong>Google Cloud Firestore</strong>. Seluruh panitia atau pengawas yang membuka aplikasi di HP/laptop lain akan langsung menerima data yang dipulihkan tanpa perlu muat ulang!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: TITIK PEMULIHAN CEPAT (SNAPSHOTS BROWSER) */}
      {/* ========================================================================= */}
      {activeSubTab === 'snapshots' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Titik Pemulihan Cepat (Local Snapshots)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Simpan titik pemeriksaan sebelum melakukan perubahan besar (seperti acak nomor, plotting ruang silang, atau impor siswa baru).
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateSnapshotModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Buat Titik Pemulihan Baru</span>
            </button>
          </div>

          {snapshots.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <HistoryIcon className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">Belum Ada Titik Pemulihan</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Anda belum membuat titik pemulihan cepat di browser ini. Buat titik pemulihan sekarang agar Anda dapat membatalkan perubahan kapan pun dengan 1 klik.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateSnapshotModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Buat Titik Pemulihan Pertama</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-indigo-300 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                        {snap.title}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 shrink-0">
                        {new Date(snap.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(snap.createdAt).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>

                    {snap.note && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
                        "{snap.note}"
                      </p>
                    )}

                    {/* Metadata badge */}
                    <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">{snap.totalStudents} Siswa</span>
                      <span>•</span>
                      <span>{snap.totalRooms} Ruang</span>
                      <span>•</span>
                      <span>{snap.totalSchedules} Sesi</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestoreFromSnapshot(snap)}
                      disabled={isRestoring}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pulihkan</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadSnapshot(snap)}
                        title="Unduh snapshot ini sebagai file .json"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(snap.id)}
                        title="Hapus titik pemulihan ini"
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: ARSIP & RESET UJIAN BARU */}
      {/* ========================================================================= */}
      {activeSubTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Arsipkan lalu Kosongkan untuk Ujian Semester Baru */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Archive className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Arsipkan &amp; Kosongkan Data untuk Ujian Baru
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Gunakan fitur ini saat beralih ke periode ujian semester berikutnya (misal dari STS ke SAS, atau dari SAS ke SAT).
                  Sistem akan mengunduh file cadangan data lama terlebih dahulu, lalu mengosongkan data peserta &amp; jadwal agar Anda siap mengisi data baru.
                </p>

                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2 text-slate-700">
                  <p className="font-bold text-slate-900">Yang akan dilakukan:</p>
                  <ul className="list-disc list-inside text-[11px] space-y-1 text-slate-600">
                    <li>Mengunduh arsip lengkap ujian saat ini ke file JSON</li>
                    <li>Mengosongkan data peserta &amp; nomor meja ujian</li>
                    <li>Menyimpan identitas madrasah, ruang, dan guru pengawas</li>
                    <li>Sinkronisasi pembersihan langsung ke Cloud Firestore</li>
                  </ul>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Apakah Anda ingin mengarsipkan data saat ini ke file JSON lalu mengosongkan data peserta untuk ujian baru?')) {
                    handleDownloadBackup();
                    setTimeout(() => {
                      onClearDataForNewExam();
                    }, 500);
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Archive className="w-4 h-4" />
                <span>Unduh Arsip &amp; Bersihkan untuk Ujian Baru</span>
              </button>
            </div>

            {/* Card 2: Reset ke Contoh Data Lengkap (MTs Manbaul Islam) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Pulihkan ke Data Contoh Bawaan (Demo Lengkap)
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Kembalikan aplikasi ke dataset awal lengkap: <strong>MTs Manbaul Islam</strong> (463 peserta ujian, 24 ruang ujian kapasitas 20, 24 guru pengawas, dan jadwal lengkap 11 mapel).
                </p>

                <div className="p-3.5 bg-indigo-50/60 rounded-lg border border-indigo-100 text-xs space-y-2 text-indigo-950">
                  <p className="font-bold text-indigo-900">Sangat cocok untuk:</p>
                  <ul className="list-disc list-inside text-[11px] space-y-1 text-indigo-800">
                    <li>Simulasi dan pengujian pembagian sistem silang</li>
                    <li>Pelatihan panitia ujian sekolah/madrasah</li>
                    <li>Mencetak contoh kartu ujian &amp; lembar dokumen presensi</li>
                  </ul>
                </div>
              </div>

              <button
                type="button"
                onClick={onResetData}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-indigo-600" />
                <span>Pulihkan Contoh Data Bawaan (463 Siswa)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM RESTORE EXECUTION */}
      {/* ========================================================================= */}
      {showConfirmModal && importedRawData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h4 className="text-base font-bold text-slate-900">
                  Konfirmasi Pemulihan Data
                </h4>
                <p className="text-xs text-slate-500">
                  Anda akan memulihkan data dari file:
                </p>
                <p className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 py-1 px-2 rounded mt-1">
                  {importFileName || 'File Backup JSON'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <p className="font-bold text-slate-900">
                  Mode: {restoreMode === 'full' ? 'Pemulihan Total (Semua Data)' : 'Pemulihan Selektif'}
                </p>
                <p className="text-[11px] leading-relaxed">
                  Data yang aktif saat ini akan diperbarui dan disinkronkan ke Cloud Firestore secara real-time. Pastikan Anda telah mengunduh cadangan jika masih memerlukan data yang ada sekarang.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isRestoring}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={isRestoring}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memulihkan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ya, Pulihkan Data</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE SNAPSHOT */}
      {/* ========================================================================= */}
      {showCreateSnapshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Buat Titik Pemulihan (Snapshot)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Simpan kondisi data saat ini ke memori browser
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama / Label Titik Pemulihan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSnapshotTitle}
                    onChange={(e) => setNewSnapshotTitle(e.target.value)}
                    placeholder="Contoh: Sebelum Acak Ruang 24, Pasca Impor Kelas 9"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Catatan Tambahan (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={newSnapshotNote}
                    onChange={(e) => setNewSnapshotNote(e.target.value)}
                    placeholder="Catatan kecil tentang perubahan yang baru dilakukan..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500">
                  Titik pemulihan ini akan mencakup <strong>{students.length} Siswa</strong>, <strong>{rooms.length} Ruang</strong>, dan <strong>{schedules.length} Sesi Jadwal</strong>.
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSnapshotModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCreateSnapshot}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Simpan Titik Ini</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PASTE JSON CODE */}
      {/* ========================================================================= */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Tempel Kode JSON Cadangan
                  </h4>
                  <p className="text-xs text-slate-500">
                    Tempel teks JSON hasil salinan cadangan langsung di sini
                  </p>
                </div>
              </div>

              <div>
                <textarea
                  rows={8}
                  value={pastedJsonText}
                  onChange={(e) => setPastedJsonText(e.target.value)}
                  placeholder="Tempel string JSON yang diawali dengan { ... } di sini..."
                  className="w-full p-3 font-mono text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!pastedJsonText.trim()) {
                      showToast('Mohon tempel kode JSON terlebih dahulu.');
                      return;
                    }
                    setShowPasteModal(false);
                    processJsonText(pastedJsonText, 'Kode JSON Tempelan Manual');
                    setPastedJsonText('');
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Proses JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
