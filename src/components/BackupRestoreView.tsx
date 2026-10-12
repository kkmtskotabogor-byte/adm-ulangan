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
  History as HistoryIcon,
  FileSpreadsheet,
  Award,
  BookOpen,
  FileText,
  Sliders,
  CheckSquare,
  Square
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  ActiveTab, 
  AuthUser, 
  BackupData, 
  BackupSnapshot, 
  ExamConfig, 
  ExamDispensation,
  ExamGradeItem,
  ExamRoom, 
  ExamScheduleItem, 
  Proctor, 
  ProctorAttendanceRecord, 
  Student,
  SubjectGradingConfig,
  StudentRaportExtraData
} from '../types';

interface BackupRestoreViewProps {
  config: ExamConfig;
  students: Student[];
  rooms: ExamRoom[];
  proctors: Proctor[];
  schedules: ExamScheduleItem[];
  attendanceRecords: ProctorAttendanceRecord[];
  dispensations?: ExamDispensation[];
  grades?: ExamGradeItem[];
  gradingConfigs?: Record<string, SubjectGradingConfig>;
  customSubjects?: string[];
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
const STORAGE_RAPORT_EXTRA = 'sim_ujian_raport_extra_v1';

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  config,
  students,
  rooms,
  proctors,
  schedules,
  attendanceRecords,
  dispensations = [],
  grades = [],
  gradingConfigs = {},
  customSubjects = [],
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
  
  // Export states (Selection of components)
  const [includeConfig, setIncludeConfig] = useState(true);
  const [includeStudents, setIncludeStudents] = useState(true);
  const [includeRooms, setIncludeRooms] = useState(true);
  const [includeProctors, setIncludeProctors] = useState(true);
  const [includeSchedules, setIncludeSchedules] = useState(true);
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [includeDispensations, setIncludeDispensations] = useState(true);
  const [includeGrades, setIncludeGrades] = useState(true);
  const [includeGradingConfigs, setIncludeGradingConfigs] = useState(true);
  const [includeRaportExtras, setIncludeRaportExtras] = useState(true);
  const [includeCustomSubjects, setIncludeCustomSubjects] = useState(true);
  
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
  
  // Selective checkboxes for restoration
  const [selectedToRestore, setSelectedToRestore] = useState({
    config: true,
    students: true,
    rooms: true,
    proctors: true,
    schedules: true,
    attendance: true,
    dispensations: true,
    grades: true,
    gradingConfigs: true,
    raportExtras: true,
    customSubjects: true,
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

  // Helper to read current raport extras from localStorage
  const getStoredRaportExtras = (): Record<string, StudentRaportExtraData> => {
    try {
      const saved = localStorage.getItem(STORAGE_RAPORT_EXTRA);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed reading raport extras from localStorage', e);
    }
    return {};
  };

  // Save snapshots to local storage
  const updateSnapshots = (newSnapshots: BackupSnapshot[]) => {
    setSnapshots(newSnapshots);
    try {
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(newSnapshots));
    } catch (e) {
      console.error('Failed to save snapshots to localStorage', e);
    }
  };

  // Select / Deselect All Export Components
  const handleToggleAllExport = (check: boolean) => {
    setIncludeConfig(check);
    setIncludeStudents(check);
    setIncludeRooms(check);
    setIncludeProctors(check);
    setIncludeSchedules(check);
    setIncludeAttendance(check);
    setIncludeDispensations(check);
    setIncludeGrades(check);
    setIncludeGradingConfigs(check);
    setIncludeRaportExtras(check);
    setIncludeCustomSubjects(check);
  };

  // Select / Deselect All Restore Components
  const handleToggleAllRestore = (check: boolean) => {
    setSelectedToRestore({
      config: check && !!importedRawData?.data?.config,
      students: check && Array.isArray(importedRawData?.data?.students) && importedRawData.data.students.length > 0,
      rooms: check && Array.isArray(importedRawData?.data?.rooms) && importedRawData.data.rooms.length > 0,
      proctors: check && Array.isArray(importedRawData?.data?.proctors) && importedRawData.data.proctors.length > 0,
      schedules: check && Array.isArray(importedRawData?.data?.schedules) && importedRawData.data.schedules.length > 0,
      attendance: check && Array.isArray(importedRawData?.data?.attendanceRecords) && importedRawData.data.attendanceRecords.length > 0,
      dispensations: check && Array.isArray(importedRawData?.data?.dispensations) && importedRawData.data.dispensations.length > 0,
      grades: check && Array.isArray(importedRawData?.data?.grades) && importedRawData.data.grades.length > 0,
      gradingConfigs: check && Array.isArray(importedRawData?.data?.gradingConfigs) && importedRawData.data.gradingConfigs.length > 0,
      raportExtras: check && typeof importedRawData?.data?.raportExtras === 'object' && Object.keys(importedRawData.data.raportExtras || {}).length > 0,
      customSubjects: check && Array.isArray(importedRawData?.data?.customSubjects) && importedRawData.data.customSubjects.length > 0,
    });
  };

  // Generate Current Backup Data Object (Full Comprehensive)
  const generateBackupData = (): BackupData => {
    const currentRaportExtras = getStoredRaportExtras();

    return {
      version: '1.2',
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
        totalDispensations: dispensations.length,
        totalGrades: grades.length,
        totalGradingConfigs: Object.keys(gradingConfigs).length,
        totalRaportExtras: Object.keys(currentRaportExtras).length,
        totalCustomSubjects: customSubjects.length,
      },
      data: {
        config,
        students,
        rooms,
        proctors,
        schedules,
        attendanceRecords,
        dispensations,
        grades,
        gradingConfigs: Object.values(gradingConfigs),
        raportExtras: currentRaportExtras,
        customSubjects,
      },
    };
  };

  // Filtered Backup for Export based on user selection
  const getExportDataPayload = (): BackupData => {
    const full = generateBackupData();
    const filteredData: Partial<BackupData['data']> = {};
    const currentRaportExtras = getStoredRaportExtras();

    if (includeConfig) filteredData.config = config;
    if (includeStudents) filteredData.students = students;
    if (includeRooms) filteredData.rooms = rooms;
    if (includeProctors) filteredData.proctors = proctors;
    if (includeSchedules) filteredData.schedules = schedules;
    if (includeAttendance) filteredData.attendanceRecords = attendanceRecords;
    if (includeDispensations) filteredData.dispensations = dispensations;
    if (includeGrades) filteredData.grades = grades;
    if (includeGradingConfigs) filteredData.gradingConfigs = Object.values(gradingConfigs);
    if (includeRaportExtras) filteredData.raportExtras = currentRaportExtras;
    if (includeCustomSubjects) filteredData.customSubjects = customSubjects;

    return {
      ...full,
      metadata: {
        totalStudents: includeStudents ? students.length : 0,
        totalRooms: includeRooms ? rooms.length : 0,
        totalProctors: includeProctors ? proctors.length : 0,
        totalSchedules: includeSchedules ? schedules.length : 0,
        totalAttendanceRecords: includeAttendance ? attendanceRecords.length : 0,
        totalDispensations: includeDispensations ? dispensations.length : 0,
        totalGrades: includeGrades ? grades.length : 0,
        totalGradingConfigs: includeGradingConfigs ? Object.keys(gradingConfigs).length : 0,
        totalRaportExtras: includeRaportExtras ? Object.keys(currentRaportExtras).length : 0,
        totalCustomSubjects: includeCustomSubjects ? customSubjects.length : 0,
      },
      data: filteredData as BackupData['data'],
    };
  };

  // 1. Download Backup File JSON (.json)
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

  // 2. Download Complete Multi-Sheet Excel Backup Archive (.xlsx)
  const handleDownloadExcelBackup = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const dateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const currentRaportExtras = getStoredRaportExtras();

      // Sheet 1: Informasi Ujian & Sekolah
      const infoRows = [
        ['ARSIP CADANGAN LENGKAP SIM UJIAN & RAPORT STS'],
        [`Tanggal Cadangan: ${dateStr}`],
        [`Diekspor Oleh: ${authUser ? `${authUser.name} (${authUser.roleLabel})` : 'Administrator'}`],
        [],
        ['PARAMETER', 'NILAI / KETERANGAN'],
        ['Nama Madrasah / Sekolah', config.schoolName || '-'],
        ['NPSN', config.npsn || '-'],
        ['Alamat Lembaga', config.address || '-'],
        ['Kecamatan / Kota', `${config.subdistrict || '-'} / ${config.district || '-'}`],
        ['Nama Kegiatan Ujian', config.examTitle || 'Sumatif Tengah Semester'],
        ['Tipe / Format Ujian', config.examType || 'STS'],
        ['Tahun Pelajaran', config.academicYear || '-'],
        ['Semester', config.semester || '-'],
        ['Kepala Madrasah', config.principalName || '-'],
        ['NIP Kepala Madrasah', config.principalNip || '-'],
        ['Ketua Panitia Ujian', config.committeeHeadName || '-'],
        ['NIP Ketua Panitia', config.committeeHeadNip || '-'],
        ['Total Peserta Terdaftar', students.length],
        ['Total Ruang Ujian', rooms.length],
        ['Total Guru Pengawas', proctors.length],
        ['Total Sesi Jadwal', schedules.length],
        ['Total Rekor Nilai Siswa', grades.length],
        ['Total Catatan Raport', Object.keys(currentRaportExtras).length],
      ];
      const infoSheet = XLSX.utils.aoa_to_sheet(infoRows);
      XLSX.utils.book_append_sheet(workbook, infoSheet, 'Info Ujian');

      // Sheet 2: Data Peserta Ujian
      if (students.length > 0) {
        const studentHeaders = [
          'No',
          'Nomor Peserta',
          'NISN',
          'NIS',
          'Nama Siswa',
          'Kelas',
          'Jenis Kelamin',
          'Sesi',
          'Ruang',
          'Nomor Meja'
        ];
        const studentRows = students.map((s, idx) => [
          idx + 1,
          s.examNumber || '',
          s.nisn || '',
          s.nis || '',
          s.name || '',
          s.className || '',
          s.gender || 'L',
          s.session || 1,
          s.roomName || s.roomId || '',
          s.seatNumber || ''
        ]);
        const studentSheet = XLSX.utils.aoa_to_sheet([studentHeaders, ...studentRows]);
        XLSX.utils.book_append_sheet(workbook, studentSheet, 'Peserta Ujian');
      }

      // Sheet 3: Ruang & Denah Meja
      if (rooms.length > 0) {
        const roomHeaders = ['No', 'Kode Ruang', 'Nama Ruang / Gedung', 'Kapasitas Meja', 'Lokasi', 'Pengawas 1', 'Pengawas 2'];
        const roomRows = rooms.map((r, idx) => [
          idx + 1,
          r.roomCode || '',
          r.name || '',
          r.capacity || 20,
          r.location || '',
          r.proctor1 || '',
          r.proctor2 || ''
        ]);
        const roomSheet = XLSX.utils.aoa_to_sheet([roomHeaders, ...roomRows]);
        XLSX.utils.book_append_sheet(workbook, roomSheet, 'Ruang Ujian');
      }

      // Sheet 4: Jadwal Ujian
      if (schedules.length > 0) {
        const scheduleHeaders = ['No', 'Hari', 'Tanggal', 'Sesi / Waktu', 'Mata Pelajaran', 'Sasaran Kelas'];
        const scheduleRows = schedules.map((sch, idx) => [
          idx + 1,
          sch.dayName || '',
          sch.date || '',
          sch.sessionTime || '',
          sch.subject || '',
          sch.targetLevel || 'Semua Kelas'
        ]);
        const scheduleSheet = XLSX.utils.aoa_to_sheet([scheduleHeaders, ...scheduleRows]);
        XLSX.utils.book_append_sheet(workbook, scheduleSheet, 'Jadwal Ujian');
      }

      // Sheet 5: Daftar Pengawas
      if (proctors.length > 0) {
        const proctorHeaders = ['No', 'Nama Pengawas', 'NIP', 'Mata Pelajaran Ampu', 'Peran Pengawas', 'No Telepon/WA'];
        const proctorRows = proctors.map((p, idx) => [
          idx + 1,
          p.name || '',
          p.nip || '',
          p.subject || '',
          p.role || 'Pengawas Ruang',
          p.phone || ''
        ]);
        const proctorSheet = XLSX.utils.aoa_to_sheet([proctorHeaders, ...proctorRows]);
        XLSX.utils.book_append_sheet(workbook, proctorSheet, 'Guru Pengawas');
      }

      // Sheet 6: Daftar Nilai Siswa
      if (grades.length > 0) {
        const gradeHeaders = [
          'No',
          'Nomor Peserta',
          'Nama Siswa',
          'Kelas',
          'Mata Pelajaran',
          'Benar PG',
          'Salah PG',
          'Skor Esai',
          'Nilai Akhir',
          'Nilai Remedial',
          'KKM',
          'Status Ketuntasan'
        ];
        const gradeRows = grades.map((g, idx) => {
          const kkm = gradingConfigs[g.subject]?.kkm || 75;
          const finalScore = g.remedialScore !== null && g.remedialScore !== undefined ? Math.max(g.scoreFinal, g.remedialScore) : g.scoreFinal;
          return [
            idx + 1,
            g.examNumber || '',
            g.studentName || '',
            g.className || '',
            g.subject || '',
            g.correctPg ?? 0,
            g.wrongPg ?? 0,
            g.correctEssay ?? 0,
            g.scoreFinal || 0,
            g.remedialScore ?? '',
            kkm,
            finalScore >= kkm ? 'Tuntas' : 'Remedial'
          ];
        });
        const gradeSheet = XLSX.utils.aoa_to_sheet([gradeHeaders, ...gradeRows]);
        XLSX.utils.book_append_sheet(workbook, gradeSheet, 'Daftar Nilai Siswa');
      }

      // Sheet 7: Catatan Raport STS (Ketidakhadiran, Kepribadian, Ekskul, Catatan)
      const studentMap = new Map(students.map((s) => [s.id, s]));
      const extraKeys = Object.keys(currentRaportExtras);
      if (extraKeys.length > 0) {
        const extraHeaders = [
          'No',
          'Nama Siswa',
          'Kelas',
          'Sakit (Hari)',
          'Izin (Hari)',
          'Tanpa Keterangan (Hari)',
          'Kelakuan',
          'Kerajinan',
          'Kerapihan',
          'Ekstrakurikuler',
          'Catatan Wali Kelas'
        ];
        const extraRows = extraKeys.map((stdId, idx) => {
          const ext = currentRaportExtras[stdId] || {};
          const std = studentMap.get(stdId);
          const ekskulStr = (ext.ekskul || [])
            .map((e) => `${e.name || '-'}: ${e.nilai || '-'}`)
            .join('; ');
          const catatanStr = Array.isArray(ext.catatanWaliKelas)
            ? ext.catatanWaliKelas.join('; ')
            : '-';

          return [
            idx + 1,
            std?.name || stdId,
            std?.className || '-',
            ext.absensi?.sakit || 0,
            ext.absensi?.izin || 0,
            ext.absensi?.alpa || 0,
            ext.keperibadian?.kelakuan || 'B',
            ext.keperibadian?.kerajinan || 'B',
            ext.keperibadian?.kerapihan || 'B',
            ekskulStr || '-',
            catatanStr || '-'
          ];
        });
        const extraSheet = XLSX.utils.aoa_to_sheet([extraHeaders, ...extraRows]);
        XLSX.utils.book_append_sheet(workbook, extraSheet, 'Ekstra Raport');
      }

      const cleanSchool = config.schoolName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
      const filename = `ARSIP_EXCEL_UJIAN_${cleanSchool}_${Date.now()}.xlsx`;
      XLSX.writeFile(workbook, filename);
      showToast(`Arsip Excel lengkap berhasil diunduh: ${filename}`);
    } catch (err) {
      console.error('Failed exporting Excel backup:', err);
      showToast('Gagal membuat arsip Excel: ' + (err instanceof Error ? err.message : String(err)));
    }
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
              totalDispensations: Array.isArray(parsed.dispensations) ? parsed.dispensations.length : 0,
              totalGrades: Array.isArray(parsed.grades) ? parsed.grades.length : 0,
              totalGradingConfigs: Array.isArray(parsed.gradingConfigs) ? parsed.gradingConfigs.length : 0,
            },
            data: {
              config: parsed.config || config,
              students: Array.isArray(parsed.students) ? parsed.students : [],
              rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
              proctors: Array.isArray(parsed.proctors) ? parsed.proctors : [],
              schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
              attendanceRecords: Array.isArray(parsed.attendanceRecords) ? parsed.attendanceRecords : [],
              dispensations: Array.isArray(parsed.dispensations) ? parsed.dispensations : [],
              grades: Array.isArray(parsed.grades) ? parsed.grades : [],
              gradingConfigs: Array.isArray(parsed.gradingConfigs) ? parsed.gradingConfigs : [],
              raportExtras: parsed.raportExtras || {},
              customSubjects: Array.isArray(parsed.customSubjects) ? parsed.customSubjects : [],
            },
          };
        }
      }

      if (!validatedBackup || !validatedBackup.data) {
        throw new Error('Format file tidak dikenali. Pastikan file adalah hasil backup resmi aplikasi SIM Ujian.');
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
        dispensations: Array.isArray(validatedBackup.data.dispensations) && validatedBackup.data.dispensations.length > 0,
        grades: Array.isArray(validatedBackup.data.grades) && validatedBackup.data.grades.length > 0,
        gradingConfigs: Array.isArray(validatedBackup.data.gradingConfigs) && validatedBackup.data.gradingConfigs.length > 0,
        raportExtras: typeof validatedBackup.data.raportExtras === 'object' && Object.keys(validatedBackup.data.raportExtras || {}).length > 0,
        customSubjects: Array.isArray(validatedBackup.data.customSubjects) && validatedBackup.data.customSubjects.length > 0,
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
        if (selectedToRestore.dispensations && importedRawData.data.dispensations) {
          selectivePayload.dispensations = importedRawData.data.dispensations;
          selectedParts.push(`${importedRawData.data.dispensations.length} Dispensasi`);
        }
        if (selectedToRestore.grades && importedRawData.data.grades) {
          selectivePayload.grades = importedRawData.data.grades;
          selectedParts.push(`${importedRawData.data.grades.length} Rekor Nilai`);
        }
        if (selectedToRestore.gradingConfigs && importedRawData.data.gradingConfigs) {
          selectivePayload.gradingConfigs = importedRawData.data.gradingConfigs;
          selectedParts.push('Bobot KKM');
        }
        if (selectedToRestore.raportExtras && importedRawData.data.raportExtras) {
          selectivePayload.raportExtras = importedRawData.data.raportExtras;
          selectedParts.push('Catatan Raport');
        }
        if (selectedToRestore.customSubjects && importedRawData.data.customSubjects) {
          selectivePayload.customSubjects = importedRawData.data.customSubjects;
          selectedParts.push('Master Mata Pelajaran');
        }

        await onRestoreSelective(selectivePayload, selectedParts);
        showToast(`Data terpilih (${selectedParts.join(', ')}) berhasil dipulihkan!`);
      }
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

  const currentRaportExtras = getStoredRaportExtras();

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Pusat Manajemen Backup &amp; Pemulihan Data
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {config.schoolName || 'SIM Ujian'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Amankan seluruh data ujian, peserta, denah ruang, jadwal, nilai, dan raport siswa ke file cadangan resmi (.JSON) atau arsip spreadsheet (.XLSX).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Unduh backup 1-klik format JSON"
            >
              <Download className="w-4 h-4" />
              <span>1-Klik Download JSON</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadExcelBackup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Unduh seluruh data ke arsip Excel multi-sheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Arsip Excel (.XLSX)</span>
            </button>
          </div>
        </div>

        {/* Quick Data Protection Status Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-5 pt-4 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-medium block">Peserta Ujian</span>
            <strong className="text-sm font-extrabold text-slate-900">{students.length} Siswa</strong>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-medium block">Ruang &amp; Meja</span>
            <strong className="text-sm font-extrabold text-slate-900">{rooms.length} Ruang</strong>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-medium block">Jadwal Sesi</span>
            <strong className="text-sm font-extrabold text-slate-900">{schedules.length} Sesi</strong>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-medium block">Guru Pengawas</span>
            <strong className="text-sm font-extrabold text-slate-900">{proctors.length} Guru</strong>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-medium block">Rekor Nilai</span>
            <strong className="text-sm font-extrabold text-indigo-700">{grades.length} Nilai</strong>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-medium block">Catatan Raport</span>
            <strong className="text-sm font-extrabold text-purple-700">{Object.keys(currentRaportExtras).length} Siswa</strong>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Download className="w-5 h-5 text-indigo-600" />
                      Pilih Komponen yang Ingin Di-Backup
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Centang data apa saja yang ingin Anda sertakan di dalam file cadangan ini.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleAllExport(true)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAllExport(false)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 cursor-pointer"
                    >
                      Batal Semua
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. Config */}
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

                  {/* 2. Students */}
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

                  {/* 3. Rooms */}
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

                  {/* 4. Proctors */}
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

                  {/* 5. Schedules */}
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

                  {/* 6. Attendance */}
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

                  {/* 7. Grades */}
                  <label className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                    includeGrades ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={includeGrades}
                      onChange={(e) => setIncludeGrades(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block flex items-center justify-between">
                        Daftar Nilai Siswa
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {grades.length} Rekor
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500 leading-snug block">
                        Skor PG, esai, nilai akhir, remedial, dan predikat seluruh mata pelajaran
                      </span>
                    </div>
                  </label>

                  {/* 8. Grading Configs (KKM & Bobot) */}
                  <label className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                    includeGradingConfigs ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={includeGradingConfigs}
                      onChange={(e) => setIncludeGradingConfigs(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block flex items-center justify-between">
                        Bobot &amp; Standar KKM Mapel
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {Object.keys(gradingConfigs).length} Mapel
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500 leading-snug block">
                        Standar KKM, jumlah soal PG/Esai, bobot nilai, dan nama guru pengampu
                      </span>
                    </div>
                  </label>

                  {/* 9. Raport Extras */}
                  <label className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                    includeRaportExtras ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={includeRaportExtras}
                      onChange={(e) => setIncludeRaportExtras(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block flex items-center justify-between">
                        Catatan Raport STS
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                          {Object.keys(currentRaportExtras).length} Siswa
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500 leading-snug block">
                        Ketidakhadiran (S/I/A), kepribadian, ekstrakurikuler, dan catatan walikelas
                      </span>
                    </div>
                  </label>

                  {/* 10. Dispensations */}
                  <label className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                    includeDispensations ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={includeDispensations}
                      onChange={(e) => setIncludeDispensations(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block flex items-center justify-between">
                        Dispensasi Peserta
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {dispensations.length} Siswa
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500 leading-snug block">
                        Riwayat izin dan kartu dispensasi ujian yang telah diterbitkan panitia
                      </span>
                    </div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh File Cadangan (.JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadExcelBackup}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Unduh Arsip Excel (.XLSX)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-xs transition-colors cursor-pointer"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Salin JSON</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowJsonPreview(!showJsonPreview)}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 ml-auto cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showJsonPreview ? 'Tutup Pratinjau' : 'Pratinjau JSON'}</span>
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
                        Format Standar SIM Ujian &amp; Cloud Sync
                      </span>
                    </div>
                    <pre className="max-h-72 overflow-y-auto p-4 bg-slate-950 text-emerald-400 rounded-lg text-[11px] font-mono leading-relaxed select-all">
                      {JSON.stringify(getExportDataPayload(), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Best Practice & Security Guidance */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 p-5 rounded-xl border border-indigo-100 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-indigo-900">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-bold text-sm">Mengapa Wajib Backup?</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  File backup adalah salinan digital lengkap dari seluruh data madrasah Anda. Simpan file ini di:
                </p>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li><strong>Flashdisk Panitia:</strong> Aman saat listrik mati atau ganti laptop.</li>
                  <li><strong>Google Drive / Email:</strong> Dapat diakses dari mana saja saat darurat.</li>
                  <li><strong>Sebelum Import Baru:</strong> Buat backup sebelum mengubah daftar siswa/jadwal besar-besaran.</li>
                </ul>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <HardDrive className="w-4 h-4 text-slate-500" />
                  <h4 className="font-bold text-xs uppercase tracking-wider">Format Standar Terbuka</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  File backup berformat standard <code>.json</code> yang bersih dan transparan, serta arsip <code>.xlsx</code> yang siap dicetak atau diedit manual di Microsoft Excel.
                </p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>Cloud Database:</span>
                  <span className={`font-bold inline-flex items-center gap-1 ${isCloudConnected ? 'text-emerald-700' : 'text-slate-500'}`}>
                    <Cloud className="w-3.5 h-3.5" />
                    {isCloudConnected ? 'Realtime Aktif' : 'Offline Mode'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: IMPORT / PULIHKAN CADANGAN */}
      {/* ========================================================================= */}
      {activeSubTab === 'import' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Dropzone Area */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-indigo-600 bg-indigo-50/80 scale-[1.01]'
                    : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,application/json"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Pilih File Backup JSON untuk Dipulihkan
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Tarik dan lepas file cadangan <code>.json</code> Anda ke area ini, atau klik untuk mencari file dari komputer Anda.
                </p>

                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPasteModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Atau Tempel / Paste Teks JSON</span>
                  </button>
                </div>
              </div>

              {/* Error Notification */}
              {importError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold">Gagal Membaca File Cadangan</h5>
                    <p className="mt-0.5 text-rose-700">{importError}</p>
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Peserta</span>
                      <span className="text-base font-extrabold text-indigo-600">
                        {importedRawData.data?.students?.length || 0} Siswa
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Ruang</span>
                      <span className="text-base font-extrabold text-slate-800">
                        {importedRawData.data?.rooms?.length || 0} Ruang
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Pengawas</span>
                      <span className="text-base font-extrabold text-slate-800">
                        {importedRawData.data?.proctors?.length || 0} Guru
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Jadwal Sesi</span>
                      <span className="text-base font-extrabold text-slate-800">
                        {importedRawData.data?.schedules?.length || 0} Sesi
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Rekor Nilai</span>
                      <span className="text-base font-extrabold text-indigo-700">
                        {importedRawData.data?.grades?.length || 0} Nilai
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Catatan Raport</span>
                      <span className="text-base font-extrabold text-purple-700">
                        {Object.keys(importedRawData.data?.raportExtras || {}).length} Siswa
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Bobot KKM</span>
                      <span className="text-base font-extrabold text-slate-800">
                        {importedRawData.data?.gradingConfigs?.length || 0} Mapel
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Dispensasi</span>
                      <span className="text-base font-extrabold text-slate-800">
                        {importedRawData.data?.dispensations?.length || 0} Siswa
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
                          {restoreMode === 'full' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Menggantikan konfigurasi, siswa, ruang, pengawas, jadwal, nilai, dan raport dengan data dari file backup ini secara utuh.
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
                            2. Pulihkan Selektif (Pilih Bagian)
                          </span>
                          {restoreMode === 'selective' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Pilih hanya bagian tertentu saja yang ingin dipulihkan (misal: hanya Nilai Siswa, atau hanya Data Peserta).
                        </p>
                      </button>
                    </div>

                    {/* Selective options */}
                    {restoreMode === 'selective' && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 mt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            Pilih data yang ingin Anda terapkan ke sistem:
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleAllRestore(true)}
                              className="text-[11px] text-indigo-600 font-bold hover:underline"
                            >
                              Pilih Semua
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => handleToggleAllRestore(false)}
                              className="text-[11px] text-slate-500 font-medium hover:underline"
                            >
                              Batal Semua
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.config}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, config: e.target.checked })}
                              disabled={!importedRawData.data?.config}
                              className="rounded text-indigo-600"
                            />
                            <span>Identitas &amp; Pengaturan</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.students}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, students: e.target.checked })}
                              disabled={!importedRawData.data?.students?.length}
                              className="rounded text-indigo-600"
                            />
                            <span>Data Siswa ({importedRawData.data?.students?.length || 0})</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.rooms}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, rooms: e.target.checked })}
                              disabled={!importedRawData.data?.rooms?.length}
                              className="rounded text-indigo-600"
                            />
                            <span>Ruang &amp; Meja ({importedRawData.data?.rooms?.length || 0})</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.proctors}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, proctors: e.target.checked })}
                              disabled={!importedRawData.data?.proctors?.length}
                              className="rounded text-indigo-600"
                            />
                            <span>Pengawas ({importedRawData.data?.proctors?.length || 0})</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.schedules}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, schedules: e.target.checked })}
                              disabled={!importedRawData.data?.schedules?.length}
                              className="rounded text-indigo-600"
                            />
                            <span>Jadwal Ujian ({importedRawData.data?.schedules?.length || 0})</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.attendance}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, attendance: e.target.checked })}
                              disabled={!importedRawData.data?.attendanceRecords?.length}
                              className="rounded text-indigo-600"
                            />
                            <span>Presensi Pengawas</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.grades}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, grades: e.target.checked })}
                              disabled={!importedRawData.data?.grades?.length}
                              className="rounded text-indigo-600"
                            />
                            <span>Daftar Nilai ({importedRawData.data?.grades?.length || 0})</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.gradingConfigs}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, gradingConfigs: e.target.checked })}
                              disabled={!importedRawData.data?.gradingConfigs?.length}
                              className="rounded text-indigo-600"
                            />
                            <span>Bobot KKM</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.raportExtras}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, raportExtras: e.target.checked })}
                              disabled={!Object.keys(importedRawData.data?.raportExtras || {}).length}
                              className="rounded text-indigo-600"
                            />
                            <span>Catatan Raport</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedToRestore.dispensations}
                              onChange={(e) => setSelectedToRestore({ ...selectedToRestore, dispensations: e.target.checked })}
                              disabled={!importedRawData.data?.dispensations?.length}
                              className="rounded text-indigo-600"
                            />
                            <span>Dispensasi</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Execute Button */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setImportedRawData(null);
                        setImportFileName('');
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Batal
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(true)}
                      disabled={isRestoring}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                      <span>{isRestoring ? 'Memproses Pemulihan...' : 'Terapkan & Pulihkan Data Sekarang'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Info Warnings */}
            <div className="space-y-4">
              <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-2.5">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Peringatan Keamanan Restore</span>
                </div>
                <p className="leading-relaxed text-amber-800">
                  Proses <strong>Restore</strong> akan menimpa data yang saat ini aktif di aplikasi dengan data dari file backup.
                </p>
                <p className="leading-relaxed text-amber-800">
                  Pastikan Anda telah mengunduh cadangan terkini sebelum melakukan pemulihan jika Anda ingin menyimpan kondisi saat ini.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 text-xs space-y-3">
                <h5 className="font-bold text-slate-800">Sinkronisasi Otomatis</h5>
                <p className="text-slate-500 leading-relaxed">
                  Setelah data dipulihkan, sistem akan secara otomatis memperbarui database Cloud Firestore real-time sehingga perangkat laptop panitia lain langsung sinkron.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: SNAPSHOTS (TITIK PEMULIHAN CEPAT) */}
      {/* ========================================================================= */}
      {activeSubTab === 'snapshots' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HistoryIcon className="w-5 h-5 text-indigo-600" />
                  Daftar Titik Pemulihan Cepat (Snapshots)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Simpan kondisi data saat ini sebagai titik aman yang bisa Anda pulihkan kapan pun hanya dalam 1 klik tanpa perlu memilih file manual.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateSnapshotModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-center"
              >
                <Sparkles className="w-4 h-4" />
                <span>+ Buat Titik Pemulihan Baru</span>
              </button>
            </div>

            {snapshots.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <Clock className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs">Belum ada titik pemulihan lokal yang disimpan.</p>
                <button
                  type="button"
                  onClick={() => setShowCreateSnapshotModal(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Buat Titik Pemulihan Pertama</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {snapshots.map((snap) => (
                  <div key={snap.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 p-2.5 rounded-xl transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-slate-900">{snap.title}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(snap.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                      {snap.note && (
                        <p className="text-xs text-slate-500 mt-0.5">{snap.note}</p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 font-mono">
                        <span>{snap.totalStudents} Siswa</span>
                        <span>•</span>
                        <span>{snap.totalRooms} Ruang</span>
                        <span>•</span>
                        <span>{snap.totalSchedules} Jadwal</span>
                        {snap.backupData?.data?.grades && (
                          <>
                            <span>•</span>
                            <span>{snap.backupData.data.grades.length} Nilai</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestoreFromSnapshot(snap)}
                        disabled={isRestoring}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 cursor-pointer"
                      >
                        Pulihkan
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadSnapshot(snap)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
                        title="Unduh file JSON dari snapshot ini"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(snap.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 cursor-pointer"
                        title="Hapus snapshot ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: MAINTENANCE / ARSIP & RESET */}
      {/* ========================================================================= */}
      {activeSubTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Reset ke Data Contoh Default */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3 text-slate-900">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Kembalikan ke Data Contoh (Demo)</h4>
                  <p className="text-xs text-slate-500">Isi ulang sistem dengan data contoh MTs lengkap</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tindakan ini akan mengembalikan data identitas madrasah, siswa (25 siswa), ruang, pengawas, dan jadwal ke data bawaan simulasi.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Kembalikan seluruh data ke contoh demo? Data saat ini akan diganti.')) {
                    onResetData();
                    showToast('Data berhasil dikembalikan ke contoh bawaan.');
                  }
                }}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Reset ke Data Contoh Bawaan
              </button>
            </div>

            {/* Card 2: Bersihkan Data untuk Ujian Baru */}
            <div className="bg-white p-6 rounded-xl border border-rose-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3 text-rose-950">
                <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-rose-900">Mulai Kegiatan Ujian Baru (Kosongkan)</h4>
                  <p className="text-xs text-slate-500">Bersihkan siswa, nilai, jadwal, dan presensi</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Menyimpan identitas madrasah dan daftar ruang, tetapi menghapus data siswa, jadwal, dispensasi, dan nilai agar siap diimpor untuk semester/ujian berikutnya.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('PERINGATAN: Apakah Anda yakin ingin mengosongkan data siswa, jadwal, dan nilai untuk memulai ujian baru? Pastikan Anda sudah mengunduh file backup terlebih dahulu!')) {
                    handleDownloadBackup();
                    onClearDataForNewExam();
                    showToast('Data dibersihkan untuk ujian baru. File backup otomatis diunduh.');
                  }
                }}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Kosongkan &amp; Siapkan Ujian Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION RESTORE MODAL */}
      {showConfirmModal && importedRawData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                Konfirmasi Pemulihan Data
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Anda akan memulihkan data dari file <strong>{importFileName || 'cadangan'}</strong>. Data saat ini akan diperbarui dan disinkronkan ke Cloud Firestore.
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 font-mono text-slate-700">
              <div>Mode: <strong>{restoreMode === 'full' ? 'Pulihkan Penuh (Semua)' : 'Pulihkan Selektif'}</strong></div>
              <div>Madrasah: {importedRawData.schoolName || importedRawData.data?.config?.schoolName}</div>
              <div>Peserta: {importedRawData.data?.students?.length || 0} Siswa</div>
              <div>Nilai: {importedRawData.data?.grades?.length || 0} Rekor</div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                Ya, Pulihkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SNAPSHOT MODAL */}
      {showCreateSnapshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Buat Titik Pemulihan Cepat
            </h3>
            <p className="text-xs text-slate-500">
              Beri nama titik pemulihan agar mudah dikenali jika ingin dikembalikan di masa mendatang.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama / Judul Titik Pemulihan:
                </label>
                <input
                  type="text"
                  value={newSnapshotTitle}
                  onChange={(e) => setNewSnapshotTitle(e.target.value)}
                  placeholder={`Contoh: Sebelum Input Nilai Raport STS`}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan Tambahan (Opsional):
                </label>
                <textarea
                  value={newSnapshotNote}
                  onChange={(e) => setNewSnapshotNote(e.target.value)}
                  placeholder="Keterangan singkat..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateSnapshotModal(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateSnapshot}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                Simpan Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASTE JSON MODAL */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-600" />
              Tempel / Paste Kode JSON Cadangan
            </h3>
            <p className="text-xs text-slate-500">
              Salin dan tempelkan teks JSON hasil cadangan aplikasi ke dalam kotak teks di bawah ini.
            </p>

            <textarea
              value={pastedJsonText}
              onChange={(e) => setPastedJsonText(e.target.value)}
              placeholder="Tempelkan kode JSON lengkap di sini..."
              rows={8}
              className="w-full p-3 text-xs font-mono border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
            />

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPastedJsonText('');
                  setShowPasteModal(false);
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pastedJsonText.trim()) {
                    processJsonText(pastedJsonText, 'Teks JSON yang Ditempel');
                    setShowPasteModal(false);
                    setPastedJsonText('');
                  }
                }}
                disabled={!pastedJsonText.trim()}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-50"
              >
                Proses JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
