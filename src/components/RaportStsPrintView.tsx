import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  ChevronLeft,
  ChevronRight,
  Settings,
  Users,
  Search,
  Check,
  RotateCcw,
  BookOpen,
  Award,
  Sparkles,
  ExternalLink,
  Edit3,
  X,
  FileText
} from 'lucide-react';
import { ExamConfig, ExamGradeItem, Student, SubjectGradingConfig, StudentRaportExtraData } from '../types';
import { PRESET_LOGO_KEMENAG } from '../utils/logoUtils';
import { terbilang, DEFAULT_KKM } from '../utils/gradeUtils';
import { RaportExtrasInputModal } from './RaportExtrasInputModal';
import { subscribeToRaportExtraData, saveRaportExtraDataToCloud } from '../lib/firebase';

export interface RaportStsPrintViewProps {
  config: ExamConfig;
  students: Student[];
  grades: ExamGradeItem[];
  gradingConfigs?: Record<string, SubjectGradingConfig>;
  subjects?: string[];
  initialStudentId?: string;
  initialClass?: string;
  onClose?: () => void;
}

interface ClassRaportMeta {
  waliKelasName: string;
  waliKelasNip: string;
  catatanTemplate?: string[];
}

const STORAGE_RAPORT_EXTRA = 'sim_ujian_raport_extra_v1';
const STORAGE_RAPORT_CLASSES = 'sim_ujian_raport_classes_v1';

export const RaportStsPrintView: React.FC<RaportStsPrintViewProps> = ({
  config,
  students,
  grades,
  gradingConfigs = {},
  subjects = [],
  initialStudentId,
  initialClass,
  onClose,
}) => {
  // 1. Class filter state
  const classList = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [students]);

  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (initialClass && initialClass !== 'all') return initialClass;
    if (classList.length > 0) return classList[0];
    return 'all';
  });

  // Filter students based on class selection
  const filteredStudents = useMemo(() => {
    if (selectedClass === 'all') return students;
    return students.filter((s) => s.className === selectedClass);
  }, [students, selectedClass]);

  // Selected single student
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (initialStudentId) return initialStudentId;
    if (filteredStudents.length > 0) return filteredStudents[0].id;
    if (students.length > 0) return students[0].id;
    return '';
  });

  // When class changes, keep selectedStudentId valid
  useEffect(() => {
    if (filteredStudents.length > 0) {
      const exists = filteredStudents.some((s) => s.id === selectedStudentId);
      if (!exists) {
        setSelectedStudentId(filteredStudents[0].id);
      }
    }
  }, [filteredStudents, selectedStudentId]);

  // View / Print Mode: 'single' (preview 1 student) vs 'all_in_class' (kolektif semua siswa kelas)
  const [printMode, setPrintMode] = useState<'single' | 'all_in_class'>('single');

  // Search query in student selector
  const [searchStudentQuery, setSearchStudentQuery] = useState('');

  // Title variant: 'PTS' vs 'STS' vs 'AUTO'
  const [titleFormat, setTitleFormat] = useState<'PTS' | 'STS' | 'AUTO'>('PTS');

  // Modal Settings Editor (Wali Kelas, Catatan, Titimangsa)
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Modal Input Data Pelengkap Raport (Absensi, Kepribadian, Ekskul, Catatan)
  const [showInputModal, setShowInputModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string>('');

  // Extra per-student data (Keperibadian, Absensi, Ekskul, Catatan)
  const [extraDataMap, setExtraDataMap] = useState<Record<string, StudentRaportExtraData>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RAPORT_EXTRA);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error loading raport extra data:', e);
    }
    return {};
  });

  // Subscribe to real-time Cloud updates for Raport Extra Data
  useEffect(() => {
    const unsub = subscribeToRaportExtraData((cloudData) => {
      if (cloudData && typeof cloudData === 'object' && Object.keys(cloudData).length > 0) {
        setExtraDataMap((prev) => {
          const merged = { ...prev, ...cloudData };
          try {
            localStorage.setItem(STORAGE_RAPORT_EXTRA, JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }
    });
    return () => unsub();
  }, []);

  // Save handler that updates local state, localStorage, and Firestore cloud
  const handleSaveExtraData = (newMap: Record<string, StudentRaportExtraData>) => {
    setExtraDataMap(newMap);
    try {
      localStorage.setItem(STORAGE_RAPORT_EXTRA, JSON.stringify(newMap));
    } catch (e) {}
    saveRaportExtraDataToCloud(newMap).catch((err) => {
      console.warn('Failed to sync raport extra data to cloud:', err);
    });
  };

  // Per-class Homeroom Teacher (Wali Kelas & NIP)
  const [classMetaMap, setClassMetaMap] = useState<Record<string, ClassRaportMeta>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RAPORT_CLASSES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error loading raport class meta:', e);
    }
    return {
      'VII A': { waliKelasName: 'Lia Marlianty, S.Pd.I', waliKelasNip: '-' },
      'VII B': { waliKelasName: 'Ahmad Fauzi, S.Pd.', waliKelasNip: '-' },
      'VIII A': { waliKelasName: 'Nurul Hidayah, S.Ag.', waliKelasNip: '-' },
      'IX A': { waliKelasName: 'Drs. Syahrul Ramadhan', waliKelasNip: '-' },
    };
  });

  // Current class Homeroom Teacher info
  const currentClassMeta = useMemo<ClassRaportMeta>(() => {
    if (selectedClass && classMetaMap[selectedClass]) {
      return classMetaMap[selectedClass];
    }
    return {
      waliKelasName: config.principalName ? `Wali Kelas ${selectedClass || ''}` : 'Lia Marlianty, S.Pd.I',
      waliKelasNip: '-',
    };
  }, [selectedClass, classMetaMap, config.principalName]);

  // Form states for Settings Modal
  const [tempWaliName, setTempWaliName] = useState(currentClassMeta.waliKelasName);
  const [tempWaliNip, setTempWaliNip] = useState(currentClassMeta.waliKelasNip);
  const [tempIssuePlace, setTempIssuePlace] = useState(config.issuePlace || 'Bogor');
  const [tempIssueDate, setTempIssueDate] = useState(config.issueDate || '1 Oktober 2026');

  useEffect(() => {
    setTempWaliName(currentClassMeta.waliKelasName);
    setTempWaliNip(currentClassMeta.waliKelasNip);
  }, [currentClassMeta]);

  // Save Settings Modal
  const handleSaveClassMeta = () => {
    const nextMap = {
      ...classMetaMap,
      [selectedClass]: {
        waliKelasName: tempWaliName.trim() || 'Wali Kelas',
        waliKelasNip: tempWaliNip.trim() || '-',
      },
    };
    setClassMetaMap(nextMap);
    try {
      localStorage.setItem(STORAGE_RAPORT_CLASSES, JSON.stringify(nextMap));
    } catch (e) {}
    setShowSettingsModal(false);
  };

  // Student navigation (Prev / Next)
  const currentStudentIndex = filteredStudents.findIndex((s) => s.id === selectedStudentId);

  const handlePrevStudent = () => {
    if (currentStudentIndex > 0) {
      setSelectedStudentId(filteredStudents[currentStudentIndex - 1].id);
    }
  };

  const handleNextStudent = () => {
    if (currentStudentIndex < filteredStudents.length - 1) {
      setSelectedStudentId(filteredStudents[currentStudentIndex + 1].id);
    }
  };

  // Print Handlers
  const handlePrint = () => {
    window.print();
  };

  const handleOpenNewTab = () => {
    const studentParam = printMode === 'single' ? `&studentId=${encodeURIComponent(selectedStudentId)}` : '';
    const classParam = `&class=${encodeURIComponent(selectedClass)}`;
    const url = `${window.location.origin}${window.location.pathname}?tab=grades&subTab=raport${classParam}${studentParam}&autoPrint=true`;
    window.open(url, '_blank');
  };

  // Helper to extract score for student & subject
  const getSubjectScore = (student: Student, subjectTitle: string): number | null => {
    const cleanTarget = subjectTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

    const found = grades.find((g) => {
      // 1. Student match
      const studentMatch =
        g.studentId === student.id ||
        (student.examNumber && g.examNumber && g.examNumber.toLowerCase() === student.examNumber.toLowerCase()) ||
        (student.nisn && g.nisn && g.nisn === student.nisn) ||
        (student.name && g.studentName && g.studentName.toLowerCase().replace(/[^a-z0-9]/g, '') === student.name.toLowerCase().replace(/[^a-z0-9]/g, ''));

      if (!studentMatch) return false;

      // 2. Subject match
      const gSubClean = (g.subject || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (gSubClean === cleanTarget) return true;
      if (cleanTarget.includes(gSubClean) || gSubClean.includes(cleanTarget)) return true;

      // Smart curriculum aliases
      if (cleanTarget.includes('hadis') || cleanTarget.includes('hadits') || cleanTarget.includes('quran')) {
        return gSubClean.includes('hadis') || gSubClean.includes('hadits') || gSubClean.includes('quran');
      }
      if (cleanTarget.includes('akidah') || cleanTarget.includes('akhlak')) {
        return gSubClean.includes('akidah') || gSubClean.includes('akhlak');
      }
      if (cleanTarget === 'fikih' || cleanTarget === 'fiqih') {
        return gSubClean.includes('fikih') || gSubClean.includes('fiqih');
      }
      if (cleanTarget.includes('ski') || cleanTarget.includes('sejarahkebudayaan')) {
        return gSubClean.includes('ski') || gSubClean.includes('sejarahkebudayaan');
      }
      if (cleanTarget.includes('kewarganegaraan') || cleanTarget.includes('pkn') || cleanTarget.includes('pancasila')) {
        return gSubClean.includes('kewarganegaraan') || gSubClean.includes('pkn') || gSubClean.includes('pancasila');
      }
      if (cleanTarget.includes('ipa') || (cleanTarget.includes('alam') && !cleanTarget.includes('sosial'))) {
        return gSubClean.includes('ipa') || (gSubClean.includes('alam') && !gSubClean.includes('sosial'));
      }
      if (cleanTarget.includes('ips') || cleanTarget.includes('sosial')) {
        return gSubClean.includes('ips') || gSubClean.includes('sosial');
      }
      if (cleanTarget.includes('penjas') || cleanTarget.includes('pjok') || cleanTarget.includes('olahraga')) {
        return gSubClean.includes('penjas') || gSubClean.includes('pjok') || gSubClean.includes('olahraga');
      }
      if (cleanTarget.includes('prakarya') || cleanTarget.includes('informatika') || cleanTarget.includes('tik')) {
        return gSubClean.includes('prakarya') || gSubClean.includes('informatika') || gSubClean.includes('tik');
      }
      if (cleanTarget.includes('sunda')) {
        return gSubClean.includes('sunda');
      }
      if (cleanTarget.includes('arab')) {
        return gSubClean.includes('arab');
      }
      if (cleanTarget.includes('inggris')) {
        return gSubClean.includes('inggris');
      }
      if (cleanTarget.includes('indonesia')) {
        return gSubClean.includes('indonesia');
      }
      if (cleanTarget.includes('seni') || cleanTarget.includes('budaya')) {
        return gSubClean.includes('seni') || gSubClean.includes('budaya');
      }
      if (cleanTarget.includes('matematika') || cleanTarget === 'mtk') {
        return gSubClean.includes('matematika') || gSubClean === 'mtk';
      }

      return false;
    });

    if (found) {
      if (found.remedialScore !== undefined && found.remedialScore !== null && !isNaN(found.remedialScore)) {
        return Math.max(found.scoreFinal, found.remedialScore);
      }
      if (typeof found.scoreFinal === 'number' && !isNaN(found.scoreFinal)) {
        return found.scoreFinal;
      }
    }

    return null;
  };

  // Subject rows specification matching official Raport format exactly
  const subjectStructure = [
    {
      group: 'A',
      groupTitle: 'MATA PELAJARAN',
      items: [
        {
          num: '1.',
          isParent: true,
          title: 'Pendidikan Agama Islam',
          subItems: [
            { subNum: 'a.', title: 'Al-Quran Hadits', matchKey: "Al-Qur'an Hadis" },
            { subNum: 'b.', title: 'Akidah Akhlak', matchKey: 'Akidah Akhlak' },
            { subNum: 'c.', title: 'Fikih', matchKey: 'Fikih' },
            { subNum: 'd.', title: 'SKI', matchKey: 'Sejarah Kebudayaan Islam (SKI)' },
          ],
        },
        { num: '2.', title: 'Pendidikan Kewarganegaraan', matchKey: 'Pendidikan Pancasila / PKn' },
        { num: '3.', title: 'Bahasa Indonesia', matchKey: 'Bahasa Indonesia' },
        { num: '4.', title: 'Bahasa Arab', matchKey: 'Bahasa Arab' },
        { num: '5.', title: 'Bahasa Inggris', matchKey: 'Bahasa Inggris' },
        { num: '6.', title: 'Matematika', matchKey: 'Matematika' },
        { num: '7.', title: 'Ilmu Pengetahuan Alam', matchKey: 'Ilmu Pengetahuan Alam (IPA)' },
        { num: '8.', title: 'Ilmu Pengetahuan Sosial', matchKey: 'Ilmu Pengetahuan Sosial (IPS)' },
        { num: '9.', title: 'Seni Budaya', matchKey: 'Seni Budaya' },
        { num: '10.', title: 'Penjaskes', matchKey: 'Pendidikan Jasmani (PJOK)' },
        { num: '11.', title: 'Prakarya', matchKey: 'Prakarya / Informatika' },
      ],
    },
    {
      group: 'B',
      groupTitle: 'Muatan Lokal',
      items: [
        { num: '2.', title: 'Bahasa Sunda', matchKey: 'Bahasa Sunda' },
      ],
    },
  ];

  // Title display
  const titleDisplay = useMemo(() => {
    if (titleFormat === 'PTS') return 'PENILAIAN TENGAH SEMESTER (PTS)';
    if (titleFormat === 'STS') return 'SUMATIF TENGAH SEMESTER (STS)';
    return config.examTitle || 'PENILAIAN TENGAH SEMESTER (PTS)';
  }, [titleFormat, config.examTitle]);

  const schoolLevelDisplay = useMemo(() => {
    const lvl = (config.schoolLevel || '').toUpperCase();
    if (lvl.includes('MTS')) return 'TINGKAT MADRASAH TSANAWIYAH (MTs)';
    if (lvl.includes('MA')) return 'TINGKAT MADRASAH ALIYAH (MA)';
    if (lvl.includes('MI')) return 'TINGKAT MADRASAH IBTIDAIYAH (MI)';
    if (lvl.includes('SMP')) return 'TINGKAT SEKOLAH MENENGAH PERTAMA (SMP)';
    if (lvl.includes('SMA')) return 'TINGKAT SEKOLAH MENENGAH ATAS (SMA)';
    return 'TINGKAT MADRASAH TSANAWIYAH (MTs)';
  }, [config.schoolLevel]);

  // Determine students to display
  const studentsToRender = useMemo(() => {
    if (printMode === 'all_in_class') {
      return filteredStudents;
    }
    const target = filteredStudents.find((s) => s.id === selectedStudentId);
    return target ? [target] : [];
  }, [printMode, filteredStudents, selectedStudentId]);

  return (
    <div className="min-h-screen bg-slate-100/70 pb-20">
      {/* =========================================================================
          TOP ACTION BAR (Controls, Filters, Print Triggers) - Hidden on Print
          ========================================================================= */}
      <div className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Left: Title & Navigation */}
            <div className="flex items-center gap-3">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Kembali ke menu nilai"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span>Cetak Raport STS / PTS</span>
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Format Resmi A4
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Laporan Hasil Belajar Tengah Semester lengkap dengan nilai angka, terbilang huruf, dan ketercapaian kompetensi.
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingStudentId(selectedStudentId || filteredStudents[0]?.id || '');
                  setShowInputModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Input Ketidakhadiran, Kepribadian, Ekstrakurikuler, dan Catatan Wali Kelas"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Input Data Raport</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Atur Nama Wali Kelas, NIP, dan Titimangsa Cetak"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Pengaturan Raport</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewTab}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Buka pratinjau di tab baru untuk pencetakan PDF bersih tanpa dialog"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Buka Tab Baru</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Raport Sekarang</span>
              </button>
            </div>
          </div>

          {/* Sub Toolbar: Filtering & Mode Controls */}
          <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Filter Kelas */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-slate-700">Kelas:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-transparent font-bold text-indigo-700 focus:outline-hidden cursor-pointer"
                >
                  {classList.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                  <option value="all">📁 Semua Kelas ({students.length} Siswa)</option>
                </select>
              </div>

              {/* Mode Cetak Toggle */}
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPrintMode('single')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    printMode === 'single'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pratinjau 1 Siswa
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('all_in_class')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    printMode === 'all_in_class'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Cetak sekaligus semua siswa di kelas ini (otomatis pisah halaman A4)"
                >
                  Cetak Kolektif ({filteredStudents.length} Siswa)
                </button>
              </div>

              {/* Title Style Toggle */}
              <div className="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-slate-600">
                <span className="text-[11px] font-medium">Judul:</span>
                <button
                  type="button"
                  onClick={() => setTitleFormat('PTS')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    titleFormat === 'PTS' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200'
                  }`}
                >
                  PTS
                </button>
                <button
                  type="button"
                  onClick={() => setTitleFormat('STS')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    titleFormat === 'STS' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200'
                  }`}
                >
                  STS
                </button>
              </div>
            </div>

            {/* Single Student Selector & Stepper */}
            {printMode === 'single' && filteredStudents.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevStudent}
                  disabled={currentStudentIndex <= 0}
                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Siswa Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 font-medium text-slate-800 bg-white focus:outline-indigo-500 cursor-pointer max-w-[200px] sm:max-w-[260px] truncate"
                >
                  {filteredStudents.map((s, idx) => (
                    <option key={s.id} value={s.id}>
                      {idx + 1}. {s.name} ({s.className})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleNextStudent}
                  disabled={currentStudentIndex >= filteredStudents.length - 1}
                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Siswa Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                  {currentStudentIndex + 1} / {filteredStudents.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          RAPORT PRINT SHEETS (Rendered for Print & On-Screen Preview)
          ========================================================================= */}
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6 space-y-8">
        {studentsToRender.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold">Tidak ada siswa pada filter kelas ini.</p>
            <p className="text-xs text-slate-400 mt-1">Silakan pilih kelas lain pada bilah menu di atas.</p>
          </div>
        ) : (
          studentsToRender.map((student, studentIndex) => {
            const studentExtra = extraDataMap[student.id] || {};
            const keperibadian = {
              kelakuan: studentExtra.keperibadian?.kelakuan || 'Baik',
              kerajinan: studentExtra.keperibadian?.kerajinan || 'Baik',
              kerapihan: studentExtra.keperibadian?.kerapihan || 'Baik',
              kebersihan: studentExtra.keperibadian?.kebersihan || 'Baik',
            };
            const absensi = {
              sakit: studentExtra.absensi?.sakit ?? '-',
              izin: studentExtra.absensi?.izin ?? '-',
              alpa: studentExtra.absensi?.alpa ?? '-',
            };
            const ekskulList = studentExtra.ekskul || [
              { name: 'Pramuka', nilai: 'Baik' },
              { name: 'Marawis', nilai: '-' },
              { name: 'Hadrah', nilai: '-' },
              { name: '', nilai: '-' },
              { name: '', nilai: '-' },
            ];
            const catatanList = studentExtra.catatanWaliKelas || [
              'Rajinlah Terus Belajar di Rumah',
              'Tingkatkan dan pertahankan prestasi',
              'Pergunakanlah waktu belajar sebaik mungkin',
              'Disiplin dan sopan santun dalam belajar',
              'Tingkatkan motivasi dan semangat belajar',
            ];

            // Calculate total and average
            let totalScore = 0;
            let scoreCount = 0;

            subjectStructure.forEach((grp) => {
              grp.items.forEach((item) => {
                if (item.isParent && item.subItems) {
                  item.subItems.forEach((sub) => {
                    const score = getSubjectScore(student, sub.matchKey);
                    if (score !== null) {
                      totalScore += score;
                      scoreCount++;
                    }
                  });
                } else if (item.matchKey) {
                  const score = getSubjectScore(student, item.matchKey);
                  if (score !== null) {
                    totalScore += score;
                    scoreCount++;
                  }
                }
              });
            });

            const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;

            return (
              <div
                key={student.id}
                className="raport-page bg-white shadow-lg print:shadow-none border border-slate-300 print:border-none rounded-sm mx-auto p-8 sm:p-10 text-black font-serif text-[11px] leading-normal"
                style={{
                  width: '100%',
                  maxWidth: '210mm',
                  minHeight: '297mm',
                  margin: '0 auto',
                  pageBreakAfter: studentIndex < studentsToRender.length - 1 ? 'always' : 'auto',
                }}
              >
                {/* 1. Header (Logo, Titles, Double Separator) */}
                <div className="text-center space-y-1 mb-2">
                  {/* School / Kemenag Logo */}
                  <div className="flex justify-center mb-1">
                    <img
                      src={config.logoUrl || PRESET_LOGO_KEMENAG}
                      alt="Logo Lembaga"
                      className="h-16 w-auto object-contain"
                      crossOrigin="anonymous"
                    />
                  </div>

                  <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-wide leading-tight">
                    LAPORAN PENILAIAN HASIL BELAJAR SISWA
                  </h1>
                  <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide leading-tight">
                    {titleDisplay}
                  </h2>
                  <h3 className="text-xs sm:text-xs font-bold uppercase tracking-wider leading-tight">
                    {schoolLevelDisplay}
                  </h3>

                  {/* Thick Line Separator matching PDF */}
                  <div className="w-full border-b-[3px] border-black pt-1.5"></div>
                </div>

                {/* 2. Metadata Box (Nama Madrasah, Siswa, Kelas, Semester) */}
                <div className="border border-black p-2 mb-2 text-[10.5px]">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Left Column */}
                    <div className="space-y-0.5">
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">NAMA MADRASAH</span>
                        <span className="shrink-0 mr-1">:</span>
                        <span className="font-bold uppercase truncate">{config.schoolName}</span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">NAMA SISWA</span>
                        <span className="shrink-0 mr-1">:</span>
                        <span className="font-bold uppercase truncate">{student.name}</span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">NO. INDUK / NISN</span>
                        <span className="shrink-0 mr-1">:</span>
                        <span className="truncate">
                          {student.nis ? `${student.nis} / ${student.nisn || '-'}` : student.nisn || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-0.5">
                      <div className="flex">
                        <span className="w-28 font-bold shrink-0">Kelas</span>
                        <span className="shrink-0 mr-1">:</span>
                        <span className="font-bold">{student.className}</span>
                      </div>
                      <div className="flex">
                        <span className="w-28 font-bold shrink-0">Semester</span>
                        <span className="shrink-0 mr-1">:</span>
                        <span>{config.semester === 'Ganjil' ? '1 (GANJIL)' : '2 (GENAP)'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-28 font-bold shrink-0">Tahun Pelajaran</span>
                        <span className="shrink-0 mr-1">:</span>
                        <span>{config.academicYear}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Main Grades Table (NILAI HASIL BELAJAR) */}
                <table className="w-full border-collapse border border-black text-[10px] mb-2 leading-tight">
                  <thead>
                    <tr className="bg-slate-50 text-center font-bold">
                      <th rowSpan={2} className="border border-black px-1.5 py-1 w-7">
                        No.
                      </th>
                      <th rowSpan={2} className="border border-black px-2 py-1 text-center">
                        KOMPONEN
                      </th>
                      <th colSpan={2} className="border border-black px-2 py-1 text-center">
                        NILAI HASIL BELAJAR
                      </th>
                      <th rowSpan={2} className="border border-black px-2 py-1 w-28 text-center">
                        Ketercapaian
                        <br />
                        Kompetensi
                      </th>
                    </tr>
                    <tr className="bg-slate-50 text-center font-bold">
                      <th className="border border-black px-1.5 py-1 w-14">Angka</th>
                      <th className="border border-black px-2 py-1 w-44">Huruf</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectStructure.map((grp) => (
                      <React.Fragment key={grp.group}>
                        {/* Section Header (A. MATA PELAJARAN / B. Muatan Lokal) */}
                        <tr className="font-bold bg-slate-100/60">
                          <td className="border border-black text-center py-0.5">{grp.group}</td>
                          <td colSpan={4} className="border border-black px-2 py-0.5 uppercase tracking-wide">
                            {grp.groupTitle}
                          </td>
                        </tr>

                        {/* Subject Rows */}
                        {grp.items.map((item) => {
                          if (item.isParent && item.subItems) {
                            return (
                              <React.Fragment key={item.title}>
                                {/* Parent row (1. Pendidikan Agama Islam) */}
                                <tr>
                                  <td className="border border-black text-center py-0.5 font-bold">{item.num}</td>
                                  <td colSpan={4} className="border border-black px-2 py-0.5 font-semibold">
                                    {item.title}
                                  </td>
                                </tr>
                                {/* Sub-items (a. Al-Quran Hadits, b. Akidah Akhlak, c. Fikih, d. SKI) */}
                                {item.subItems.map((sub) => {
                                  const score = getSubjectScore(student, sub.matchKey);
                                  const textScore = score !== null ? terbilang(score) : '-';
                                  const kkm = gradingConfigs[sub.matchKey]?.kkm || DEFAULT_KKM;
                                  const ketercapaian =
                                    score !== null
                                      ? score >= kkm
                                        ? 'Melampaui'
                                        : 'Perlu Peningkatan'
                                      : '-';

                                  return (
                                    <tr key={sub.title} className="hover:bg-slate-50/50">
                                      <td className="border border-black text-center py-0.5"></td>
                                      <td className="border border-black px-2 py-0.5 pl-6">
                                        <span className="mr-1">{sub.subNum}</span>
                                        <span>{sub.title}</span>
                                      </td>
                                      <td className="border border-black text-center py-0.5 font-bold">
                                        {score !== null ? Math.round(score) : '-'}
                                      </td>
                                      <td className="border border-black px-2 py-0.5 text-center capitalize">
                                        {textScore}
                                      </td>
                                      <td className="border border-black text-center py-0.5 font-medium">
                                        {ketercapaian}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
                            );
                          }

                          // Regular subject row (2. PKn, 3. Bahasa Indonesia, dll.)
                          const score = getSubjectScore(student, item.matchKey);
                          const textScore = score !== null ? terbilang(score) : '-';
                          const kkm = gradingConfigs[item.matchKey]?.kkm || DEFAULT_KKM;
                          const ketercapaian =
                            score !== null
                              ? score >= kkm
                                ? 'Melampaui'
                                : 'Perlu Peningkatan'
                              : '-';

                          return (
                            <tr key={item.title} className="hover:bg-slate-50/50">
                              <td className="border border-black text-center py-0.5 font-medium">{item.num}</td>
                              <td className="border border-black px-2 py-0.5">{item.title}</td>
                              <td className="border border-black text-center py-0.5 font-bold">
                                {score !== null ? Math.round(score) : '-'}
                              </td>
                              <td className="border border-black px-2 py-0.5 text-center capitalize">
                                {textScore}
                              </td>
                              <td className="border border-black text-center py-0.5 font-medium">
                                {ketercapaian}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}

                    {/* Summary Row 1: Jumlah Nilai */}
                    <tr className="font-bold border-t-2 border-black">
                      <td colSpan={2} className="border border-black text-right px-4 py-1">
                        Jumlah Nilai :
                      </td>
                      <td className="border border-black text-center py-1 font-bold text-xs">
                        {totalScore > 0 ? Math.round(totalScore) : '-'}
                      </td>
                      <td colSpan={2} className="border border-black px-2 py-1 text-center capitalize font-semibold">
                        {totalScore > 0 ? terbilang(Math.round(totalScore)) : '-'}
                      </td>
                    </tr>

                    {/* Summary Row 2: Rata-rata */}
                    <tr className="font-bold border-b-2 border-black">
                      <td colSpan={2} className="border border-black text-right px-4 py-1">
                        Rata – rata :
                      </td>
                      <td className="border border-black text-center py-1 font-bold text-xs">
                        {avgScore > 0 ? avgScore.toFixed(2).replace('.', ',') : '-'}
                      </td>
                      <td colSpan={2} className="border border-black px-2 py-1 text-center capitalize font-semibold">
                        {avgScore > 0 ? terbilang(Number(avgScore.toFixed(2))) : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* On-Screen Quick Edit Button (Hidden when printed) */}
                <div className="no-print mb-2.5 p-2 bg-indigo-50/90 border border-indigo-200 rounded-lg flex items-center justify-between text-[11px] text-indigo-900 font-sans shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Data Raport: <strong>Absensi, Kepribadian, Ekskul &amp; Catatan Wali Kelas</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStudentId(student.id);
                      setShowInputModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-md text-[10px] shadow-2xs transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Data Siswa Ini</span>
                  </button>
                </div>

                {/* 4. Lower Section: 4 Compact Boxes (2x2 Grid) */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-[9.5px] leading-tight">
                  {/* Left Column: Keperibadian & Ekstrakurikuler */}
                  <div className="space-y-2">
                    {/* Keperibadian */}
                    <table className="w-full border-collapse border border-black">
                      <thead>
                        <tr className="bg-slate-50 font-bold">
                          <th className="border border-black px-1 py-0.5 w-6 text-center">No.</th>
                          <th className="border border-black px-2 py-0.5 text-center">Keperibadian</th>
                          <th className="border border-black px-1.5 py-0.5 w-12 text-center">KET.</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black text-center py-0.5">1.</td>
                          <td className="border border-black px-2 py-0.5">Kelakuan</td>
                          <td className="border border-black text-center py-0.5 font-bold">{keperibadian.kelakuan}</td>
                        </tr>
                        <tr>
                          <td className="border border-black text-center py-0.5">2.</td>
                          <td className="border border-black px-2 py-0.5">Kerajinan</td>
                          <td className="border border-black text-center py-0.5 font-bold">{keperibadian.kerajinan}</td>
                        </tr>
                        <tr>
                          <td className="border border-black text-center py-0.5">3.</td>
                          <td className="border border-black px-2 py-0.5">Kerapihan</td>
                          <td className="border border-black text-center py-0.5 font-bold">{keperibadian.kerapihan}</td>
                        </tr>
                        <tr>
                          <td className="border border-black text-center py-0.5">4.</td>
                          <td className="border border-black px-2 py-0.5">Kebersihan</td>
                          <td className="border border-black text-center py-0.5 font-bold">{keperibadian.kebersihan}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* EKSTRAKURIKULER */}
                    <table className="w-full border-collapse border border-black">
                      <thead>
                        <tr className="bg-slate-50 font-bold">
                          <th className="border border-black px-1 py-0.5 w-6 text-center">No.</th>
                          <th className="border border-black px-2 py-0.5 text-center">EKSTRAKURIKULER</th>
                          <th className="border border-black px-1.5 py-0.5 w-12 text-center">NILAI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ekskulList.slice(0, 5).map((ek, i) => (
                          <tr key={i}>
                            <td className="border border-black text-center py-0.5">{i + 1}.</td>
                            <td className="border border-black px-2 py-0.5">{ek.name || '-'}</td>
                            <td className="border border-black text-center py-0.5 font-semibold">{ek.nilai || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Right Column: Ketidakhadiran & Catatan Wali Kelas */}
                  <div className="space-y-2">
                    {/* Ketidakhadiran */}
                    <table className="w-full border-collapse border border-black">
                      <thead>
                        <tr className="bg-slate-50 font-bold">
                          <th className="border border-black px-1 py-0.5 w-6 text-center">No.</th>
                          <th className="border border-black px-2 py-0.5 text-center">Ketidakhadiran</th>
                          <th className="border border-black px-1.5 py-0.5 w-20 text-center">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black text-center py-0.5">1.</td>
                          <td className="border border-black px-2 py-0.5">Sakit</td>
                          <td className="border border-black text-center py-0.5">
                            {absensi.sakit !== '-' && absensi.sakit !== '' ? `${absensi.sakit} Hari` : '- Hari'}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black text-center py-0.5">2.</td>
                          <td className="border border-black px-2 py-0.5">Izin</td>
                          <td className="border border-black text-center py-0.5">
                            {absensi.izin !== '-' && absensi.izin !== '' ? `${absensi.izin} Hari` : '- Hari'}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black text-center py-0.5">3.</td>
                          <td className="border border-black px-2 py-0.5">Alpa</td>
                          <td className="border border-black text-center py-0.5">
                            {absensi.alpa !== '-' && absensi.alpa !== '' ? `${absensi.alpa} Hari` : '- Hari'}
                          </td>
                        </tr>
                        <tr className="font-bold">
                          <td colSpan={2} className="border border-black text-center py-0.5">
                            Jumlah
                          </td>
                          <td className="border border-black text-center py-0.5">
                            {(() => {
                              const s = Number(absensi.sakit) || 0;
                              const i = Number(absensi.izin) || 0;
                              const a = Number(absensi.alpa) || 0;
                              const tot = s + i + a;
                              return `${tot} Hari`;
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* CATATAN WALI KELAS */}
                    <table className="w-full border-collapse border border-black">
                      <thead>
                        <tr className="bg-slate-50 font-bold">
                          <th className="border border-black px-1 py-0.5 w-6 text-center">No.</th>
                          <th className="border border-black px-2 py-0.5 text-center">CATATAN WALI KELAS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catatanList.slice(0, 5).map((note, idx) => (
                          <tr key={idx}>
                            <td className="border border-black text-center py-0.5">{idx + 1}.</td>
                            <td className="border border-black px-2 py-0.5 leading-snug">{note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Signature Section (Orang Tua & Wali Kelas) */}
                <div className="pt-2 text-[10.5px]">
                  <div className="flex justify-between items-start">
                    {/* Left: Orang Tua */}
                    <div className="text-center w-52 space-y-12">
                      <p className="font-semibold">Orang Tua / Wali Siswa</p>
                      <p className="border-b border-black w-44 mx-auto pb-0.5">....................................................</p>
                    </div>

                    {/* Right: Wali Kelas */}
                    <div className="text-center w-64 space-y-12">
                      <div>
                        <p className="font-normal">
                          {config.issuePlace || 'Bogor'}, {config.issueDate || '1 Oktober 2026'}
                        </p>
                        <p className="font-semibold">Wali Kelas</p>
                      </div>

                      <div>
                        <p className="font-bold underline text-[11px] leading-tight">
                          {currentClassMeta.waliKelasName}
                        </p>
                        <p className="font-normal text-[10px]">
                          NIP.: {currentClassMeta.waliKelasNip || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* =========================================================================
          SETTINGS MODAL (Edit Wali Kelas, NIP, Titimangsa Cetak)
          ========================================================================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Pengaturan Raport ({selectedClass})</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Wali Kelas ({selectedClass})
                </label>
                <input
                  type="text"
                  value={tempWaliName}
                  onChange={(e) => setTempWaliName(e.target.value)}
                  placeholder="Contoh: Lia Marlianty, S.Pd.I"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  NIP Wali Kelas
                </label>
                <input
                  type="text"
                  value={tempWaliNip}
                  onChange={(e) => setTempWaliNip(e.target.value)}
                  placeholder="Contoh: 19820514 200801 2 004 atau -"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tempat Penerbitan</label>
                  <input
                    type="text"
                    value={tempIssuePlace}
                    onChange={(e) => setTempIssuePlace(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Raport</label>
                  <input
                    type="text"
                    value={tempIssueDate}
                    onChange={(e) => setTempIssueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-indigo-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                💡 Nama Wali Kelas & NIP tersimpan otomatis per rombel/kelas di memori browser. Anda dapat mengatur nama wali kelas yang berbeda untuk masing-masing kelas.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveClassMeta}
                  className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Pengaturan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Data Pelengkap Raport (Ketidakhadiran, Kepribadian, Ekskul, Catatan) */}
      <RaportExtrasInputModal
        isOpen={showInputModal}
        onClose={() => setShowInputModal(false)}
        students={students}
        selectedClass={selectedClass}
        initialStudentId={editingStudentId || selectedStudentId}
        extraDataMap={extraDataMap}
        onSaveExtraData={handleSaveExtraData}
      />
    </div>
  );
};
