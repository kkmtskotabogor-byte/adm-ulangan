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
  FileText,
  Calendar,
  CheckCircle2
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
  onUpdateConfig?: (newConfig: ExamConfig) => void;
}

interface ClassRaportMeta {
  waliKelasName: string;
  waliKelasNip: string;
  issuePlace?: string;
  issueDate?: string;
  catatanTemplate?: string[];
}

const STORAGE_RAPORT_EXTRA = 'sim_ujian_raport_extra_v1';
const STORAGE_RAPORT_CLASSES = 'sim_ujian_raport_classes_v1';
const STORAGE_RAPORT_TITIMANGSA = 'sim_ujian_raport_titimangsa_v1';

export const RaportStsPrintView: React.FC<RaportStsPrintViewProps> = ({
  config,
  students,
  grades,
  gradingConfigs = {},
  subjects = [],
  initialStudentId,
  initialClass,
  onClose,
  onUpdateConfig,
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

  // Numbering style: 'kemenag' (PAI 1a-1d, Mapel 2-12, Mulok 1-2) vs 'sequential' (Nomor 1-17 berurutan)
  const [numberingStyle, setNumberingStyle] = useState<'kemenag' | 'sequential'>('kemenag');

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

  // Global Titimangsa (Tempat & Tanggal Penerbitan Raport)
  const [raportIssuePlace, setRaportIssuePlace] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RAPORT_TITIMANGSA);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.issuePlace) return parsed.issuePlace;
      }
    } catch (e) {}
    return config.issuePlace || 'Bogor';
  });

  const [raportIssueDate, setRaportIssueDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RAPORT_TITIMANGSA);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.issueDate) return parsed.issueDate;
      }
    } catch (e) {}
    return config.issueDate || '1 Oktober 2026';
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

  // Per-class Homeroom Teacher (Wali Kelas, NIP, & Titimangsa)
  const [classMetaMap, setClassMetaMap] = useState<Record<string, ClassRaportMeta>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RAPORT_CLASSES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error loading raport class meta:', e);
    }
    return {
      'VII A': { waliKelasName: 'Lia Marlianty, S.Pd.I', waliKelasNip: '-', issuePlace: 'Bogor', issueDate: '1 Oktober 2026' },
      'VII B': { waliKelasName: 'Ahmad Fauzi, S.Pd.', waliKelasNip: '-', issuePlace: 'Bogor', issueDate: '1 Oktober 2026' },
      'VIII A': { waliKelasName: 'Nurul Hidayah, S.Ag.', waliKelasNip: '-', issuePlace: 'Bogor', issueDate: '1 Oktober 2026' },
      'IX A': { waliKelasName: 'Drs. Syahrul Ramadhan', waliKelasNip: '-', issuePlace: 'Bogor', issueDate: '1 Oktober 2026' },
    };
  });

  // Current class Homeroom Teacher info & Titimangsa
  const currentClassMeta = useMemo<ClassRaportMeta>(() => {
    if (selectedClass && classMetaMap[selectedClass]) {
      return {
        ...classMetaMap[selectedClass],
        issuePlace: classMetaMap[selectedClass].issuePlace || raportIssuePlace,
        issueDate: classMetaMap[selectedClass].issueDate || raportIssueDate,
      };
    }
    return {
      waliKelasName: config.principalName ? `Wali Kelas ${selectedClass || ''}` : 'Lia Marlianty, S.Pd.I',
      waliKelasNip: '-',
      issuePlace: raportIssuePlace,
      issueDate: raportIssueDate,
    };
  }, [selectedClass, classMetaMap, config.principalName, raportIssuePlace, raportIssueDate]);

  // Form states for Settings Modal
  const [tempWaliName, setTempWaliName] = useState(currentClassMeta.waliKelasName || '');
  const [tempWaliNip, setTempWaliNip] = useState(currentClassMeta.waliKelasNip || '-');
  const [tempIssuePlace, setTempIssuePlace] = useState(currentClassMeta.issuePlace || raportIssuePlace);
  const [tempIssueDate, setTempIssueDate] = useState(currentClassMeta.issueDate || raportIssueDate);
  const [applyDateToAllClasses, setApplyDateToAllClasses] = useState(true);

  useEffect(() => {
    setTempWaliName(currentClassMeta.waliKelasName || '');
    setTempWaliNip(currentClassMeta.waliKelasNip || '-');
    setTempIssuePlace(currentClassMeta.issuePlace || raportIssuePlace);
    setTempIssueDate(currentClassMeta.issueDate || raportIssueDate);
  }, [currentClassMeta, selectedClass, raportIssuePlace, raportIssueDate]);

  // Save Settings Modal (Wali Kelas, NIP, Tempat & Tanggal Raport)
  const handleSaveClassMeta = () => {
    const cleanPlace = tempIssuePlace.trim() || 'Bogor';
    const cleanDate = tempIssueDate.trim() || '1 Oktober 2026';

    const nextMap = { ...classMetaMap };

    if (applyDateToAllClasses) {
      // Update date and place across all existing and known classes
      Object.keys(nextMap).forEach((cls) => {
        nextMap[cls] = {
          ...nextMap[cls],
          issuePlace: cleanPlace,
          issueDate: cleanDate,
        };
      });
      classList.forEach((cls) => {
        nextMap[cls] = {
          ...(nextMap[cls] || { waliKelasName: `Wali Kelas ${cls}`, waliKelasNip: '-' }),
          issuePlace: cleanPlace,
          issueDate: cleanDate,
        };
      });
    }

    // Update current selected class explicitly
    nextMap[selectedClass] = {
      ...(nextMap[selectedClass] || {}),
      waliKelasName: tempWaliName.trim() || 'Wali Kelas',
      waliKelasNip: tempWaliNip.trim() || '-',
      issuePlace: cleanPlace,
      issueDate: cleanDate,
    };

    setClassMetaMap(nextMap);
    setRaportIssuePlace(cleanPlace);
    setRaportIssueDate(cleanDate);

    try {
      localStorage.setItem(STORAGE_RAPORT_CLASSES, JSON.stringify(nextMap));
      localStorage.setItem(
        STORAGE_RAPORT_TITIMANGSA,
        JSON.stringify({ issuePlace: cleanPlace, issueDate: cleanDate })
      );
    } catch (e) {}

    // Update parent config so all other tabs, documents, and Firestore cloud stay synced
    if (onUpdateConfig) {
      onUpdateConfig({
        ...config,
        issuePlace: cleanPlace,
        issueDate: cleanDate,
      });
    }

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

      // Smart curriculum aliases with strict disambiguation
      // BTQ (Baca Tulis Al-Qur'an)
      if (cleanTarget.includes('btq') || cleanTarget.includes('bacatulis') || cleanTarget.includes('tulisquran') || cleanTarget.includes('bacaquran')) {
        return gSubClean.includes('btq') || gSubClean.includes('bacatulis') || gSubClean.includes('tulisquran') || gSubClean.includes('bacaquran');
      }

      // Al-Qur'an Hadits (must NOT match BTQ)
      if (cleanTarget.includes('hadis') || cleanTarget.includes('hadits') || (cleanTarget.includes('quran') && !cleanTarget.includes('btq') && !cleanTarget.includes('bacatulis'))) {
        return (gSubClean.includes('hadis') || gSubClean.includes('hadits') || gSubClean.includes('quran')) && !gSubClean.includes('btq') && !gSubClean.includes('bacatulis');
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

      // TIK / Informatika
      if (cleanTarget.includes('tik') || cleanTarget.includes('informatika') || cleanTarget.includes('komputer') || cleanTarget.includes('teknologiinformasi')) {
        return gSubClean.includes('tik') || gSubClean.includes('informatika') || gSubClean.includes('komputer') || gSubClean.includes('teknologiinformasi');
      }

      // Prakarya (distinct from TIK)
      if (cleanTarget.includes('prakarya')) {
        return gSubClean.includes('prakarya') && !gSubClean.includes('informatika') && !gSubClean.includes('tik');
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

  // Subject rows specification matching official Raport format exactly (17 Mapel Lengkap)
  const subjectStructure = useMemo(() => {
    if (numberingStyle === 'sequential') {
      const baseGroups = [
        {
          group: 'A',
          groupTitle: 'MATA PELAJARAN',
          items: [
            { num: '1.', title: 'Al-Qur\'an Hadits', matchKey: "Al-Qur'an Hadis" },
            { num: '2.', title: 'Akidah Akhlak', matchKey: 'Akidah Akhlak' },
            { num: '3.', title: 'Fikih', matchKey: 'Fikih' },
            { num: '4.', title: 'Sejarah Kebudayaan Islam (SKI)', matchKey: 'Sejarah Kebudayaan Islam (SKI)' },
            { num: '5.', title: 'Pendidikan Pancasila / PKn', matchKey: 'Pendidikan Pancasila / PKn' },
            { num: '6.', title: 'Bahasa Indonesia', matchKey: 'Bahasa Indonesia' },
            { num: '7.', title: 'Bahasa Arab', matchKey: 'Bahasa Arab' },
            { num: '8.', title: 'Bahasa Inggris', matchKey: 'Bahasa Inggris' },
            { num: '9.', title: 'Matematika', matchKey: 'Matematika' },
            { num: '10.', title: 'Ilmu Pengetahuan Alam (IPA)', matchKey: 'Ilmu Pengetahuan Alam (IPA)' },
            { num: '11.', title: 'Ilmu Pengetahuan Sosial (IPS)', matchKey: 'Ilmu Pengetahuan Sosial (IPS)' },
            { num: '12.', title: 'Seni Budaya', matchKey: 'Seni Budaya' },
            { num: '13.', title: 'Penjasorkes / PJOK', matchKey: 'Pendidikan Jasmani (PJOK)' },
            { num: '14.', title: 'Prakarya', matchKey: 'Prakarya' },
            { num: '15.', title: 'Informatika / TIK', matchKey: 'TIK / Informatika' },
          ],
        },
        {
          group: 'B',
          groupTitle: 'Muatan Lokal',
          items: [
            { num: '16.', title: 'Baca Tulis Al-Qur\'an (BTQ)', matchKey: 'BTQ (Baca Tulis Al-Qur\'an)' },
            { num: '17.', title: 'Bahasa Sunda', matchKey: 'Bahasa Sunda' },
          ],
        },
      ];

      return baseGroups;
    }

    // Default 'kemenag' standard format (1 PAI with a-d + 11 Mapel + 2 Mulok = 17 Mapel)
    const baseGroups = [
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
              { subNum: 'd.', title: 'Sejarah Kebudayaan Islam (SKI)', matchKey: 'Sejarah Kebudayaan Islam (SKI)' },
            ],
          },
          { num: '2.', title: 'Pendidikan Kewarganegaraan (PKn)', matchKey: 'Pendidikan Pancasila / PKn' },
          { num: '3.', title: 'Bahasa Indonesia', matchKey: 'Bahasa Indonesia' },
          { num: '4.', title: 'Bahasa Arab', matchKey: 'Bahasa Arab' },
          { num: '5.', title: 'Bahasa Inggris', matchKey: 'Bahasa Inggris' },
          { num: '6.', title: 'Matematika', matchKey: 'Matematika' },
          { num: '7.', title: 'Ilmu Pengetahuan Alam (IPA)', matchKey: 'Ilmu Pengetahuan Alam (IPA)' },
          { num: '8.', title: 'Ilmu Pengetahuan Sosial (IPS)', matchKey: 'Ilmu Pengetahuan Sosial (IPS)' },
          { num: '9.', title: 'Seni Budaya', matchKey: 'Seni Budaya' },
          { num: '10.', title: 'Penjasorkes / PJOK', matchKey: 'Pendidikan Jasmani (PJOK)' },
          { num: '11.', title: 'Prakarya', matchKey: 'Prakarya' },
          { num: '12.', title: 'Informatika / TIK', matchKey: 'TIK / Informatika' },
        ],
      },
      {
        group: 'B',
        groupTitle: 'Muatan Lokal',
        items: [
          { num: '1.', title: 'Baca Tulis Al-Qur\'an (BTQ)', matchKey: 'BTQ (Baca Tulis Al-Qur\'an)' },
          { num: '2.', title: 'Bahasa Sunda', matchKey: 'Bahasa Sunda' },
        ],
      },
    ];

    // Check if there are other custom subjects configured in the app
    const standardMatches = [
      'al-quran hadis', 'alquran hadist', 'hadis', 'hadits', 'quran',
      'akidah akhlak', 'akidah', 'akhlak',
      'fikih', 'fiqih',
      'sejarah kebudayaan islam', 'ski',
      'pendidikan pancasila', 'pkn', 'kewarganegaraan', 'ppkn',
      'bahasa indonesia', 'indonesia',
      'bahasa arab', 'arab',
      'bahasa inggris', 'inggris',
      'matematika', 'mtk',
      'ilmu pengetahuan alam', 'ipa',
      'ilmu pengetahuan sosial', 'ips',
      'seni budaya',
      'pendidikan jasmani', 'penjas', 'pjok', 'penjasorkes',
      'prakarya',
      'tik', 'informatika', 'komputer',
      'btq', 'baca tulis al-quran', 'baca tulis al-qur\'an', 'bacatulis',
      'bahasa sunda', 'sunda',
    ];

    const extraMulok: Array<{ num: string; title: string; matchKey: string }> = [];
    if (Array.isArray(subjects) && subjects.length > 0) {
      subjects.forEach((subName) => {
        const clean = subName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isStandard = standardMatches.some((std) => {
          const stdClean = std.replace(/[^a-z0-9]/g, '');
          return clean === stdClean || clean.includes(stdClean) || stdClean.includes(clean);
        });
        if (!isStandard && !extraMulok.some((e) => e.title.toLowerCase() === subName.toLowerCase())) {
          extraMulok.push({
            num: `${3 + extraMulok.length}.`,
            title: subName,
            matchKey: subName,
          });
        }
      });
    }

    if (extraMulok.length > 0) {
      baseGroups[1].items = [...baseGroups[1].items, ...extraMulok];
    }

    return baseGroups;
  }, [subjects, numberingStyle]);

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

              {/* Urutan Mapel Toggle */}
              <div className="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-slate-600">
                <span className="text-[11px] font-medium">Urutan Mapel:</span>
                <button
                  type="button"
                  onClick={() => setNumberingStyle('kemenag')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    numberingStyle === 'kemenag' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200'
                  }`}
                  title="Format standar Kemenag (1. PAI a-d, 2-12 Mapel Umum, Mulok 1-2)"
                >
                  Standar PAI (1a-d)
                </button>
                <button
                  type="button"
                  onClick={() => setNumberingStyle('sequential')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    numberingStyle === 'sequential' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200'
                  }`}
                  title="Nomor 1 sampai 17 berurutan (Mapel 15: TIK, Mapel 16: BTQ)"
                >
                  Berurutan 1 - 17
                </button>
              </div>

              {/* 17 Mapel Badge */}
              <div className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>17 Mapel Lengkap (TIK &amp; BTQ Aktif)</span>
              </div>

              {/* Tombol Ubah Titimangsa / Tanggal Raport */}
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-[11px] font-semibold cursor-pointer shadow-2xs transition-colors"
                title="Ubah Tanggal &amp; Tempat Terbit Raport (Titimangsa) atau Wali Kelas"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-slate-500 font-medium">Tanggal:</span>
                <span className="font-bold text-indigo-700 underline decoration-indigo-300">
                  {currentClassMeta.issuePlace || raportIssuePlace}, {currentClassMeta.issueDate || raportIssueDate}
                </span>
                <Edit3 className="w-3 h-3 text-indigo-400 shrink-0" />
              </button>
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
                className="raport-page bg-white shadow-lg print:shadow-none border border-slate-300 print:border-none rounded-sm mx-auto px-7 py-5 sm:px-8 sm:py-6 print:px-6 print:py-3.5 text-black font-serif text-[10px] leading-tight"
                style={{
                  width: '100%',
                  maxWidth: '210mm',
                  minHeight: '297mm',
                  margin: '0 auto',
                  pageBreakAfter: studentIndex < studentsToRender.length - 1 ? 'always' : 'auto',
                }}
              >
                {/* 1. Header (Logo, Titles, Double Separator) */}
                <div className="text-center space-y-0.5 mb-1.5">
                  {/* School / Kemenag Logo */}
                  <div className="flex justify-center mb-0.5">
                    <img
                      src={config.logoUrl || PRESET_LOGO_KEMENAG}
                      alt="Logo Lembaga"
                      className="h-14 w-auto object-contain"
                      crossOrigin="anonymous"
                    />
                  </div>

                  <h1 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide leading-tight">
                    LAPORAN PENILAIAN HASIL BELAJAR SISWA
                  </h1>
                  <h2 className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wide leading-tight">
                    {titleDisplay}
                  </h2>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider leading-tight">
                    {schoolLevelDisplay}
                  </h3>

                  {/* Thick Line Separator matching PDF */}
                  <div className="w-full border-b-[2.5px] border-black pt-1"></div>
                </div>

                {/* 2. Metadata Box (Nama Madrasah, Siswa, Kelas, Semester) */}
                <div className="border border-black p-1.5 mb-1.5 text-[10px]">
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
                <table className="w-full border-collapse border border-black text-[9.5px] mb-1.5 leading-tight">
                  <thead>
                    <tr className="bg-slate-50 text-center font-bold">
                      <th rowSpan={2} className="border border-black px-1.5 py-0.5 w-7">
                        No.
                      </th>
                      <th rowSpan={2} className="border border-black px-2 py-0.5 text-center">
                        KOMPONEN
                      </th>
                      <th colSpan={2} className="border border-black px-2 py-0.5 text-center">
                        NILAI HASIL BELAJAR
                      </th>
                      <th rowSpan={2} className="border border-black px-2 py-0.5 w-28 text-center">
                        Ketercapaian
                        <br />
                        Kompetensi
                      </th>
                    </tr>
                    <tr className="bg-slate-50 text-center font-bold">
                      <th className="border border-black px-1.5 py-0.5 w-14">Angka</th>
                      <th className="border border-black px-2 py-0.5 w-44">Huruf</th>
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
                                      <td className="border border-black text-center py-[1px]"></td>
                                      <td className="border border-black px-2 py-[1px] pl-6">
                                        <span className="mr-1">{sub.subNum}</span>
                                        <span>{sub.title}</span>
                                      </td>
                                      <td className="border border-black text-center py-[1px] font-bold">
                                        {score !== null ? Math.round(score) : '-'}
                                      </td>
                                      <td className="border border-black px-2 py-[1px] text-center capitalize">
                                        {textScore}
                                      </td>
                                      <td className="border border-black text-center py-[1px] font-medium">
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
                              <td className="border border-black text-center py-[1px] font-medium">{item.num}</td>
                              <td className="border border-black px-2 py-[1px]">{item.title}</td>
                              <td className="border border-black text-center py-[1px] font-bold">
                                {score !== null ? Math.round(score) : '-'}
                              </td>
                              <td className="border border-black px-2 py-[1px] text-center capitalize">
                                {textScore}
                              </td>
                              <td className="border border-black text-center py-[1px] font-medium">
                                {ketercapaian}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}

                    {/* Summary Row 1: Jumlah Nilai */}
                    <tr className="font-bold border-t-2 border-black">
                      <td colSpan={2} className="border border-black text-right px-4 py-0.5">
                        Jumlah Nilai :
                      </td>
                      <td className="border border-black text-center py-0.5 font-bold text-[11px]">
                        {totalScore > 0 ? Math.round(totalScore) : '-'}
                      </td>
                      <td colSpan={2} className="border border-black px-2 py-0.5 text-center capitalize font-semibold">
                        {totalScore > 0 ? terbilang(Math.round(totalScore)) : '-'}
                      </td>
                    </tr>

                    {/* Summary Row 2: Rata-rata */}
                    <tr className="font-bold border-b-2 border-black">
                      <td colSpan={2} className="border border-black text-right px-4 py-0.5">
                        Rata – rata :
                      </td>
                      <td className="border border-black text-center py-0.5 font-bold text-[11px]">
                        {avgScore > 0 ? avgScore.toFixed(2).replace('.', ',') : '-'}
                      </td>
                      <td colSpan={2} className="border border-black px-2 py-0.5 text-center capitalize font-semibold">
                        {avgScore > 0 ? terbilang(Number(avgScore.toFixed(2))) : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* On-Screen Quick Edit Button (Hidden when printed) */}
                <div className="no-print mb-2 p-1.5 bg-indigo-50/90 border border-indigo-200 rounded-lg flex items-center justify-between text-[11px] text-indigo-900 font-sans shadow-2xs">
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
                <div className="grid grid-cols-2 gap-2.5 mb-2 text-[9px] leading-tight">
                  {/* Left Column: Keperibadian & Ekstrakurikuler */}
                  <div className="space-y-1.5">
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
                  <div className="space-y-1.5">
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
                {(() => {
                  const studentClass = student.className || selectedClass;
                  const studentClassMeta = classMetaMap[studentClass] || currentClassMeta;
                  const displayWaliName = studentClassMeta.waliKelasName || currentClassMeta.waliKelasName;
                  const displayWaliNip = studentClassMeta.waliKelasNip || currentClassMeta.waliKelasNip;
                  const displayIssuePlace = studentClassMeta.issuePlace || raportIssuePlace || config.issuePlace || 'Bogor';
                  const displayIssueDate = studentClassMeta.issueDate || raportIssueDate || config.issueDate || '1 Oktober 2026';

                  return (
                    <div className="pt-1 text-[10px]">
                      <div className="flex justify-between items-start">
                        {/* Left: Orang Tua */}
                        <div className="text-center w-52 space-y-7">
                          <p className="font-semibold">Orang Tua / Wali Siswa</p>
                          <p className="border-b border-black w-44 mx-auto pb-0.5">....................................................</p>
                        </div>

                        {/* Right: Wali Kelas */}
                        <div className="text-center w-64 space-y-7">
                          <div>
                            <p className="font-normal">
                              {displayIssuePlace}, {displayIssueDate}
                            </p>
                            <p className="font-semibold">Wali Kelas</p>
                          </div>

                          <div>
                            <p className="font-bold underline text-[10.5px] leading-tight">
                              {displayWaliName}
                            </p>
                            <p className="font-normal text-[9.5px]">
                              NIP.: {displayWaliNip || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm">Pengaturan Raport &amp; Titimangsa</h3>
                  <p className="text-[11px] text-slate-400">Kelas: <span className="font-bold text-white">{selectedClass}</span></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-indigo-900">
                <span className="font-bold text-[11px] uppercase tracking-wider block mb-1">
                  📅 Tanggal &amp; Tempat Terbit Raport (Titimangsa)
                </span>
                <p className="text-[11px] text-indigo-700">
                  Akan tercetak tepat di atas tanda tangan Wali Kelas: <strong>{tempIssuePlace || 'Bogor'}, {tempIssueDate || '1 Oktober 2026'}</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tempat Penerbitan
                  </label>
                  <input
                    type="text"
                    value={tempIssuePlace}
                    onChange={(e) => setTempIssuePlace(e.target.value)}
                    placeholder="Contoh: Bogor atau Jakarta"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Raport
                  </label>
                  <input
                    type="text"
                    value={tempIssueDate}
                    onChange={(e) => setTempIssueDate(e.target.value)}
                    placeholder="Contoh: 1 Oktober 2026"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons for Date */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Pilihan Cepat Tanggal:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = new Date().toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      });
                      setTempIssueDate(todayStr);
                    }}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] cursor-pointer"
                  >
                    Hari Ini ({new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempIssueDate('1 Oktober 2026')}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] cursor-pointer"
                  >
                    1 Oktober 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempIssueDate('28 September 2026')}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] cursor-pointer"
                  >
                    28 September 2026
                  </button>
                  {config.issueDate && config.issueDate !== '1 Oktober 2026' && config.issueDate !== '28 September 2026' && (
                    <button
                      type="button"
                      onClick={() => setTempIssueDate(config.issueDate)}
                      className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-[11px] cursor-pointer"
                    >
                      Konfigurasi: {config.issueDate}
                    </button>
                  )}
                </div>
              </div>

              {/* Checkbox Apply to All Classes */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="applyDateAll"
                  checked={applyDateToAllClasses}
                  onChange={(e) => setApplyDateToAllClasses(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="applyDateAll" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  Terapkan tempat &amp; tanggal ini ke seluruh kelas ({classList.length} Kelas)
                </label>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">
                  Wali Kelas &amp; NIP (Khusus Kelas {selectedClass})
                </span>

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
                    NIP Wali Kelas ({selectedClass})
                  </label>
                  <input
                    type="text"
                    value={tempWaliNip}
                    onChange={(e) => setTempWaliNip(e.target.value)}
                    placeholder="Contoh: 19820514 200801 2 004 atau -"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
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
                  className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
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
