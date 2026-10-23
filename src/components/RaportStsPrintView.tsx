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
import { initialRaportExtras } from '../data/initialData';
import { PRESET_LOGO_KEMENAG } from '../utils/logoUtils';
import { terbilang, DEFAULT_KKM, isSameOrAliasSubject } from '../utils/gradeUtils';
import { RaportExtrasInputModal } from './RaportExtrasInputModal';
import { subscribeToRaportExtraData, saveRaportExtraDataToCloud } from '../lib/firebase';
import { fetchServerRaportExtras, saveServerRaportExtras } from '../lib/api';
import { isPramukaStudent } from '../utils/ekskulUtils';

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
const STORAGE_RAPORT_HEADER_SCHOOL = 'sim_ujian_raport_header_school_v1';

// Helper to format ISO YYYY-MM-DD into Indonesian text "17 Oktober 2026"
const formatIndonesianDate = (isoString: string): string => {
  if (!isoString) return '';
  const parts = isoString.split('-');
  if (parts.length < 3) return isoString;
  const year = parts[0];
  const monthNum = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  if (monthNum >= 1 && monthNum <= 12 && !isNaN(day)) {
    return `${day} ${monthNames[monthNum - 1]} ${year}`;
  }
  return isoString;
};

// Helper to parse Indonesian text "17 Oktober 2026" into ISO YYYY-MM-DD for date input
const parseIndonesianDateToIso = (dateStr: string): string => {
  if (!dateStr) return '';
  const monthNames = [
    'januari', 'februari', 'maret', 'april', 'mei', 'juni',
    'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
  ];
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length >= 3) {
    const day = parts[0].padStart(2, '0');
    const monthIdx = monthNames.findIndex((m) => parts[1].toLowerCase().startsWith(m.slice(0, 3)));
    const year = parts[2];
    if (monthIdx !== -1 && !isNaN(Number(day)) && !isNaN(Number(year))) {
      const month = String(monthIdx + 1).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return '';
};

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

  // Dedicated Date Editor Modal
  const [showDateModal, setShowDateModal] = useState(false);

  // Modal Input Data Pelengkap Raport (Absensi, Kepribadian, Ekskul, Catatan)
  const [showInputModal, setShowInputModal] = useState(false);
  const [modalSection, setModalSection] = useState<'all' | 'ekskul' | 'catatan' | 'absensi' | 'kepribadian'>('all');
  const [editingStudentId, setEditingStudentId] = useState<string>('');

  // Toast notification feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showRaportToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Extra per-student data (Keperibadian, Absensi, Ekskul, Catatan)
  const [extraDataMap, setExtraDataMap] = useState<Record<string, StudentRaportExtraData>>(() => {
    let localData: Record<string, StudentRaportExtraData> = {};
    try {
      const saved = localStorage.getItem(STORAGE_RAPORT_EXTRA);
      if (saved) {
        localData = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error loading raport extra data:', e);
    }

    const merged = { ...initialRaportExtras, ...localData };
    // For students with ekskul entries in initialRaportExtras (Futsal, Taekwondo, Pramuka), ensure they are merged cleanly
    for (const [sId, initEx] of Object.entries(initialRaportExtras)) {
      if (!localData[sId]) {
        merged[sId] = initEx;
      } else {
        const curEkskul = localData[sId].ekskul || [];
        const initEkskuls = initEx.ekskul || [];
        const nextEkskul = [...curEkskul];
        for (const ie of initEkskuls) {
          if (ie.name && ie.nilai !== '-' && !nextEkskul.some((e) => e.name && e.name.toLowerCase() === ie.name.toLowerCase())) {
            // Replace placeholder or push
            const emptyIdx = nextEkskul.findIndex((e) => !e.name || e.nilai === '-');
            if (emptyIdx !== -1) {
              nextEkskul.splice(emptyIdx, 1, ie);
            } else {
              nextEkskul.push(ie);
            }
          }
        }
        merged[sId] = {
          ...localData[sId],
          ekskul: nextEkskul,
        };
      }
    }

    // Strip out leftover default Pramuka from any student not enrolled in official Pramuka roster
    for (const [key, extra] of Object.entries(merged)) {
      if (extra && extra.ekskul && Array.isArray(extra.ekskul)) {
        const check = isPramukaStudent(key, key);
        if (!check.allowed && extra.ekskul.some((e) => e.name && e.name.toLowerCase() === 'pramuka')) {
          merged[key] = {
            ...extra,
            ekskul: extra.ekskul.filter((e) => e.name && e.name.toLowerCase() !== 'pramuka'),
          };
        }
      }
    }

    return merged;
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

  // Subscribe to real-time Cloud updates & backend server for Raport Extra Data
  useEffect(() => {
    // 1. Initial fetch from high-speed backend server
    fetchServerRaportExtras().then((serverData) => {
      if (serverData && typeof serverData === 'object' && Object.keys(serverData).length > 0) {
        setExtraDataMap((prev) => {
          const merged = { ...prev, ...serverData };
          try {
            localStorage.setItem(STORAGE_RAPORT_EXTRA, JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }
    });

    // 2. Real-time Cloud listener
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

  // Save handler that updates local state, localStorage, backend server, and Firestore cloud
  const handleSaveExtraData = (newMap: Record<string, StudentRaportExtraData>) => {
    setExtraDataMap(newMap);
    try {
      localStorage.setItem(STORAGE_RAPORT_EXTRA, JSON.stringify(newMap));
    } catch (e) {}
    saveServerRaportExtras(newMap).catch(() => {});
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
        issuePlace: raportIssuePlace || classMetaMap[selectedClass].issuePlace || config.issuePlace || 'Bogor',
        issueDate: raportIssueDate || classMetaMap[selectedClass].issueDate || config.issueDate || '1 Oktober 2026',
      };
    }
    return {
      waliKelasName: config.principalName ? `Wali Kelas ${selectedClass || ''}` : 'Lia Marlianty, S.Pd.I',
      waliKelasNip: '-',
      issuePlace: raportIssuePlace || config.issuePlace || 'Bogor',
      issueDate: raportIssueDate || config.issueDate || '1 Oktober 2026',
    };
  }, [selectedClass, classMetaMap, config.principalName, config.issuePlace, config.issueDate, raportIssuePlace, raportIssueDate]);

  // Master School Header in Raport Title (Defaults to "MTs Manba'ul Islam")
  const [raportSchoolHeader, setRaportSchoolHeader] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RAPORT_HEADER_SCHOOL);
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {}
    if (config.schoolName && config.schoolName.trim()) {
      const clean = config.schoolName.trim().toLowerCase().replace(/[^a-z]/g, '');
      if (clean.includes('manbaul') || clean.includes('manba')) {
        return "MTs Manba'ul Islam";
      }
      return config.schoolName;
    }
    return "MTs Manba'ul Islam";
  });

  // Form states for Settings Modal
  const [tempWaliName, setTempWaliName] = useState('');
  const [tempWaliNip, setTempWaliNip] = useState('-');
  const [tempIssuePlace, setTempIssuePlace] = useState('');
  const [tempIssueDate, setTempIssueDate] = useState('');
  const [tempSchoolHeader, setTempSchoolHeader] = useState('');
  const [applyDateToAllClasses, setApplyDateToAllClasses] = useState(true);

  // Form states for Dedicated Date Modal
  const [dateModalPlace, setDateModalPlace] = useState('');
  const [dateModalDateText, setDateModalDateText] = useState('');
  const [dateModalIso, setDateModalIso] = useState('');
  const [dateModalApplyAll, setDateModalApplyAll] = useState(true);

  // Open Date Modal with fresh values
  const openDateModal = () => {
    const curPlace = raportIssuePlace || currentClassMeta.issuePlace || config.issuePlace || 'Bogor';
    const curDate = raportIssueDate || currentClassMeta.issueDate || config.issueDate || '1 Oktober 2026';
    setDateModalPlace(curPlace);
    setDateModalDateText(curDate);
    setDateModalIso(parseIndonesianDateToIso(curDate));
    setDateModalApplyAll(true);
    setShowDateModal(true);
  };

  // Open Settings Modal with fresh values
  const openSettingsModal = () => {
    setTempWaliName(currentClassMeta.waliKelasName || '');
    setTempWaliNip(currentClassMeta.waliKelasNip || '-');
    setTempIssuePlace(raportIssuePlace || currentClassMeta.issuePlace || config.issuePlace || 'Bogor');
    setTempIssueDate(raportIssueDate || currentClassMeta.issueDate || config.issueDate || '1 Oktober 2026');
    setTempSchoolHeader(raportSchoolHeader || "MTs Manba'ul Islam");
    setApplyDateToAllClasses(true);
    setShowSettingsModal(true);
  };

  // Save Dedicated Date Modal (instant, bulletproof, updates all classes & config)
  const handleSaveDateModal = () => {
    const cleanPlace = dateModalPlace.trim() || 'Bogor';
    const cleanDate = dateModalDateText.trim() || '1 Oktober 2026';

    const nextMap = { ...classMetaMap };

    if (dateModalApplyAll) {
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

    if (selectedClass && selectedClass !== 'all') {
      const prev = nextMap[selectedClass] || {
        waliKelasName: `Wali Kelas ${selectedClass}`,
        waliKelasNip: '-',
      };
      nextMap[selectedClass] = {
        ...prev,
        issuePlace: cleanPlace,
        issueDate: cleanDate,
      };
    }

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

    if (onUpdateConfig) {
      onUpdateConfig({
        ...config,
        issuePlace: cleanPlace,
        issueDate: cleanDate,
      });
    }

    showRaportToast(`Tanggal raport berhasil diubah: ${cleanPlace}, ${cleanDate}`);
    setShowDateModal(false);
  };

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

    const cleanSchoolHeader = tempSchoolHeader.trim() || "MTs Manba'ul Islam";
    setRaportSchoolHeader(cleanSchoolHeader);

    try {
      localStorage.setItem(STORAGE_RAPORT_CLASSES, JSON.stringify(nextMap));
      localStorage.setItem(
        STORAGE_RAPORT_TITIMANGSA,
        JSON.stringify({ issuePlace: cleanPlace, issueDate: cleanDate })
      );
      localStorage.setItem(STORAGE_RAPORT_HEADER_SCHOOL, cleanSchoolHeader);
    } catch (e) {}

    // Update parent config so all other tabs, documents, and Firestore cloud stay synced
    if (onUpdateConfig) {
      onUpdateConfig({
        ...config,
        schoolName: cleanSchoolHeader,
        issuePlace: cleanPlace,
        issueDate: cleanDate,
      });
    }

    showRaportToast(`Pengaturan raport dan kop madrasah berhasil disimpan!`);
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

  // Helper to extract score for student & subject with strict priority matching
  const getSubjectScore = (student: Student, subjectTitle: string): number | null => {
    // 1. Filter grades that match this subject (handles all curriculum aliases: IPA, Alquran Hadist, PKn, Fikih, etc.)
    const candidates = grades.filter((g) => isSameOrAliasSubject(g.subject, subjectTitle));
    if (candidates.length === 0) return null;

    // 2. Strict Student Matching Hierarchy:
    // Tier 1: Exact studentId match (Highest authority, e.g. std-import-...)
    const byId = candidates.filter((g) => Boolean(g.studentId && student.id && g.studentId === student.id));

    // Tier 2: Exact non-dash examNumber match
    const cleanExam = student.examNumber && student.examNumber.trim() !== '' && student.examNumber.trim() !== '-'
      ? student.examNumber.trim().toLowerCase()
      : null;
    const byExam = cleanExam
      ? candidates.filter((g) => g.examNumber && g.examNumber.trim().toLowerCase() === cleanExam)
      : [];

    // Tier 3: Valid non-dash NISN match
    const cleanNisn = student.nisn && student.nisn.trim() !== '' && student.nisn.trim() !== '-' && student.nisn.trim() !== '0' && student.nisn.trim().length > 3
      ? student.nisn.trim()
      : null;
    const byNisn = cleanNisn
      ? candidates.filter((g) => g.nisn && g.nisn.trim() === cleanNisn)
      : [];

    // Tier 4: Matching student name AND class
    const sNameClean = student.name ? student.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const sClassClean = student.className ? student.className.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const byNameAndClass = (sNameClean.length > 2 && sClassClean)
      ? candidates.filter((g) => {
          const gName = g.studentName ? g.studentName.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
          const gClass = g.className ? g.className.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
          return gName === sNameClean && gClass === sClassClean;
        })
      : [];

    // Tier 5: Matching student name alone (fallback if class missing in imported grade record)
    const byName = (sNameClean.length > 2)
      ? candidates.filter((g) => {
          const gName = g.studentName ? g.studentName.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
          return gName === sNameClean;
        })
      : [];

    // Select the highest priority match tier that has records
    const matchedPool = byId.length > 0 ? byId
      : byExam.length > 0 ? byExam
      : byNisn.length > 0 ? byNisn
      : byNameAndClass.length > 0 ? byNameAndClass
      : byName.length > 0 ? byName
      : [];

    if (matchedPool.length === 0) return null;

    // Within matchedPool, sort to pick the most authentic entered score:
    // 1. Records with actual score (scoreFinal > 0 or has entered parts)
    // 2. Records with real studentId (std-import-) over dummy placeholder (std-)
    // 3. Newest updatedAt timestamp
    matchedPool.sort((a, b) => {
      const aHasScore = (typeof a.scoreFinal === 'number' && !isNaN(a.scoreFinal) && a.scoreFinal > 0);
      const bHasScore = (typeof b.scoreFinal === 'number' && !isNaN(b.scoreFinal) && b.scoreFinal > 0);
      if (aHasScore && !bHasScore) return -1;
      if (!aHasScore && bHasScore) return 1;

      const aIsReal = Boolean(a.studentId && a.studentId.startsWith('std-import-'));
      const bIsReal = Boolean(b.studentId && b.studentId.startsWith('std-import-'));
      if (aIsReal && !bIsReal) return -1;
      if (!aIsReal && bIsReal) return 1;

      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });

    const best = matchedPool[0];
    if (best) {
      if (best.remedialScore !== undefined && best.remedialScore !== null && !isNaN(best.remedialScore)) {
        return Math.max(best.scoreFinal, best.remedialScore);
      }
      if (typeof best.scoreFinal === 'number' && !isNaN(best.scoreFinal)) {
        return best.scoreFinal;
      }
    }

    return null;
  };

  // Helper to resolve KKM with fallback across alias subject names (e.g. Pendidikan Pancasila / PKn)
  const getSubjectKkm = (matchKey: string): number => {
    if (gradingConfigs[matchKey]?.kkm) return gradingConfigs[matchKey].kkm;
    const clean = matchKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [k, v] of Object.entries(gradingConfigs)) {
      const kClean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (kClean === clean || kClean.includes(clean) || clean.includes(kClean)) {
        if (v?.kkm) return v.kkm;
      }
      if (
        (clean.includes('pancasila') || clean.includes('pkn') || clean.includes('kewarganegaraan')) &&
        (kClean.includes('pancasila') || kClean.includes('pkn') || kClean.includes('kewarganegaraan'))
      ) {
        if (v?.kkm) return v.kkm;
      }
    }
    return DEFAULT_KKM;
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
            { num: '5.', title: 'Pendidikan Pancasila', matchKey: 'Pendidikan Pancasila' },
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
          { num: '2.', title: 'Pendidikan Pancasila', matchKey: 'Pendidikan Pancasila' },
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
    return raportSchoolHeader || "MTs Manba'ul Islam";
  }, [raportSchoolHeader]);

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
              {/* Menu 1: Edit Ekstrakurikuler */}
              <button
                type="button"
                onClick={() => {
                  setEditingStudentId(selectedStudentId || filteredStudents[0]?.id || '');
                  setModalSection('ekskul');
                  setShowInputModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Edit Nilai & Kegiatan Ekstrakurikuler Siswa (Pramuka, PMR, Marawis, dll)"
              >
                <Award className="w-4 h-4 text-amber-950" />
                <span>Edit Ekstrakurikuler</span>
              </button>

              {/* Menu 2: Edit Catatan Wali Kelas */}
              <button
                type="button"
                onClick={() => {
                  setEditingStudentId(selectedStudentId || filteredStudents[0]?.id || '');
                  setModalSection('catatan');
                  setShowInputModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Edit Catatan Wali Kelas untuk Perhatian Orang Tua Siswa"
              >
                <BookOpen className="w-4 h-4" />
                <span>Edit Catatan Wali Kelas</span>
              </button>

              {/* Menu 3: Input Data Raport Lengkap */}
              <button
                type="button"
                onClick={() => {
                  setEditingStudentId(selectedStudentId || filteredStudents[0]?.id || '');
                  setModalSection('all');
                  setShowInputModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Input Lengkap (Absensi, Sikap, Ekskul, dan Catatan)"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Data Raport Lengkap</span>
              </button>

              {/* Menu 4: Ubah Tanggal Raport */}
              <button
                type="button"
                onClick={openDateModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Ubah Tanggal Terbit & Tempat Raport"
              >
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Ubah Tanggal</span>
              </button>

              {/* Menu 5: Pengaturan Wali Kelas & NIP */}
              <button
                type="button"
                onClick={openSettingsModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Atur Nama Wali Kelas & NIP per Kelas"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline">Wali Kelas</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewTab}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Buka pratinjau di tab baru untuk pencetakan PDF bersih tanpa dialog"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Tab Baru</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Raport</span>
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
                onClick={openDateModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-[11px] font-semibold cursor-pointer shadow-2xs transition-colors"
                title="Klik untuk mengubah Tempat & Tanggal Raport"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-slate-500 font-medium">Tanggal:</span>
                <span className="font-bold text-indigo-700 underline decoration-indigo-300">
                  {raportIssuePlace || currentClassMeta.issuePlace || config.issuePlace || 'Bogor'}, {raportIssueDate || currentClassMeta.issueDate || config.issueDate || '1 Oktober 2026'}
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
            const normName = (student.name || '').toUpperCase().trim();
            const masterExtra =
              initialRaportExtras[student.id] ||
              (normName ? initialRaportExtras[normName] : undefined) ||
              {};

            const studentExtra =
              extraDataMap[student.id] ||
              (normName ? extraDataMap[normName] : undefined) ||
              masterExtra ||
              {};

            const keperibadian = {
              kelakuan: studentExtra.keperibadian?.kelakuan || masterExtra.keperibadian?.kelakuan || 'Baik',
              kerajinan: studentExtra.keperibadian?.kerajinan || masterExtra.keperibadian?.kerajinan || 'Baik',
              kerapihan: studentExtra.keperibadian?.kerapihan || masterExtra.keperibadian?.kerapihan || 'Baik',
              kebersihan: studentExtra.keperibadian?.kebersihan || masterExtra.keperibadian?.kebersihan || 'Baik',
            };
            const absensi = {
              sakit: studentExtra.absensi?.sakit ?? masterExtra.absensi?.sakit ?? '-',
              izin: studentExtra.absensi?.izin ?? masterExtra.absensi?.izin ?? '-',
              alpa: studentExtra.absensi?.alpa ?? masterExtra.absensi?.alpa ?? '-',
            };

            // Smart ekskul list: combine any known master ekskul (e.g. Futsal, Taekwondo) with student's ekskuls
            const rawEkskul = (studentExtra.ekskul && Array.isArray(studentExtra.ekskul)) ? studentExtra.ekskul : [];
            const masterEkskul = (masterExtra.ekskul && Array.isArray(masterExtra.ekskul)) ? masterExtra.ekskul : [];

            const activeEkskulMap = new Map<string, string>();

            // 1. Pramuka is ONLY added if student belongs to the official 16-student Pramuka list
            const pramukaCheck = isPramukaStudent(student.id, student.name);
            if (pramukaCheck.allowed) {
              activeEkskulMap.set('Pramuka', pramukaCheck.grade || 'Baik');
            }

            // 2. Add master ekskuls (Futsal, Taekwondo, etc.)
            masterEkskul.forEach((me) => {
              if (me.name && me.name.trim() !== '' && me.name !== '-' && !me.name.includes('Marawis') && me.nilai !== '-') {
                if (me.name.toLowerCase() === 'pramuka') {
                  if (pramukaCheck.allowed) {
                    activeEkskulMap.set('Pramuka', pramukaCheck.grade || me.nilai || 'Baik');
                  }
                } else {
                  activeEkskulMap.set(me.name.trim(), me.nilai || 'Baik');
                }
              }
            });

            // 3. Add any user-customized ekskuls (filtering out Pramuka if not enrolled)
            rawEkskul.forEach((re) => {
              if (re.name && re.name.trim() !== '' && re.name !== '-' && re.nilai !== '-') {
                if (re.name.toLowerCase() === 'pramuka') {
                  if (pramukaCheck.allowed) {
                    activeEkskulMap.set('Pramuka', pramukaCheck.grade || re.nilai || 'Baik');
                  }
                } else {
                  activeEkskulMap.set(re.name.trim(), re.nilai || 'Baik');
                }
              }
            });

            const combinedEkskuls: Array<{ name: string; nilai: string }> = [];
            activeEkskulMap.forEach((nilai, name) => {
              combinedEkskuls.push({ name, nilai });
            });

            // Pad up to 5 lines with empty row placeholders
            while (combinedEkskuls.length < 5) {
              combinedEkskuls.push({ name: '', nilai: '-' });
            }

            const ekskulList = combinedEkskuls;
            const catatanList = studentExtra.catatanWaliKelas || masterExtra.catatanWaliKelas || [
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
                  <h3 className="text-[10px] sm:text-[11px] font-bold tracking-wider leading-tight">
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
                                  const kkm = getSubjectKkm(sub.matchKey);
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

                          // Regular subject row (2. Pendidikan Pancasila, 3. Bahasa Indonesia, dll.)
                          const score = getSubjectScore(student, item.matchKey);
                          const textScore = score !== null ? terbilang(score) : '-';
                          const kkm = getSubjectKkm(item.matchKey);
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
                <div className="no-print mb-2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-800 font-sans shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900">Menu Data Siswa ({student.name}):</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStudentId(student.id);
                        setModalSection('ekskul');
                        setShowInputModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-md text-[10px] border border-amber-300 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Award className="w-3 h-3 text-amber-700" />
                      <span>Edit Ekstrakurikuler</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStudentId(student.id);
                        setModalSection('catatan');
                        setShowInputModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold rounded-md text-[10px] border border-indigo-300 shadow-2xs transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3 h-3 text-indigo-700" />
                      <span>Edit Catatan Wali Kelas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStudentId(student.id);
                        setModalSection('all');
                        setShowInputModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-md text-[10px] border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Data Lengkap</span>
                    </button>
                  </div>
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
                    <div>
                      <div className="no-print flex items-center justify-between pb-0.5">
                        <span className="text-[10px] font-bold text-amber-900 flex items-center gap-1">
                          <Award className="w-3 h-3 text-amber-600" />
                          <span>Ekstrakurikuler</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStudentId(student.id);
                            setModalSection('ekskul');
                            setShowInputModal(true);
                          }}
                          className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded border border-amber-300 cursor-pointer shadow-2xs"
                          title="Edit nilai dan kegiatan ekstrakurikuler siswa ini"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>Edit Ekskul</span>
                        </button>
                      </div>
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
                    <div>
                      <div className="no-print flex items-center justify-between pb-0.5">
                        <span className="text-[10px] font-bold text-indigo-900 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-indigo-600" />
                          <span>Catatan Wali Kelas</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStudentId(student.id);
                            setModalSection('catatan');
                            setShowInputModal(true);
                          }}
                          className="inline-flex items-center gap-1 text-[9.5px] font-bold text-indigo-800 bg-indigo-100 hover:bg-indigo-200 px-2 py-0.5 rounded border border-indigo-300 cursor-pointer shadow-2xs"
                          title="Edit catatan wali kelas untuk siswa ini"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>Edit Catatan</span>
                        </button>
                      </div>
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
                </div>

                {/* 5. Signature Section (Orang Tua & Wali Kelas) */}
                {(() => {
                  const studentClass = student.className || selectedClass;
                  const studentClassMeta = classMetaMap[studentClass] || currentClassMeta;
                  const displayWaliName = studentClassMeta.waliKelasName || currentClassMeta.waliKelasName;
                  const displayWaliNip = studentClassMeta.waliKelasNip || currentClassMeta.waliKelasNip;
                  const displayIssuePlace = raportIssuePlace || studentClassMeta.issuePlace || config.issuePlace || 'Bogor';
                  const displayIssueDate = raportIssueDate || studentClassMeta.issueDate || config.issueDate || '1 Oktober 2026';

                  return (
                    <div className="pt-1 text-[10px]">
                      {/* On-screen quick links for signature & titimangsa */}
                      <div className="no-print flex items-center justify-end gap-1.5 pb-1">
                        <button
                          type="button"
                          onClick={openDateModal}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[9.5px] font-bold cursor-pointer"
                          title="Ubah Tanggal Terbit Raport"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Ubah Tanggal ({displayIssueDate})</span>
                        </button>
                        <button
                          type="button"
                          onClick={openSettingsModal}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[9.5px] font-bold cursor-pointer"
                          title="Edit Nama Wali Kelas & NIP"
                        >
                          <Settings className="w-3 h-3" />
                          <span>Edit Wali Kelas</span>
                        </button>
                      </div>

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

              {/* Header School Name Customization */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <label className="block font-semibold text-slate-700">
                  Nama Madrasah / Lembaga di Header Raport (Baris ke-3)
                </label>
                <input
                  type="text"
                  value={tempSchoolHeader}
                  onChange={(e) => setTempSchoolHeader(e.target.value)}
                  placeholder="Contoh: MTs Manba'ul Islam"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-indigo-500 font-semibold"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">Pilihan cepat:</span>
                  <button
                    type="button"
                    onClick={() => setTempSchoolHeader("MTs Manba'ul Islam")}
                    className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10.5px] font-bold cursor-pointer"
                  >
                    MTs Manba'ul Islam
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempSchoolHeader("MTS MANBAUL ISLAM")}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-medium cursor-pointer"
                  >
                    MTS MANBAUL ISLAM
                  </button>
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

      {/* =========================================================================
          DEDICATED MODAL: UBAH TANGGAL & TEMPAT RAPORT (TITIMANGSA)
          ========================================================================= */}
      {showDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-indigo-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Ubah Tanggal Raport</h3>
                  <p className="text-xs text-indigo-200">Tempat dan Tanggal Penerbitan (Titimangsa)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDateModal(false)}
                className="p-1 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Tempat Terbit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tempat Penerbitan (Kota / Kabupaten)
                </label>
                <input
                  type="text"
                  value={dateModalPlace}
                  onChange={(e) => setDateModalPlace(e.target.value)}
                  placeholder="Contoh: Bogor, Gresik, Jakarta"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm font-semibold focus:outline-indigo-500 focus:border-indigo-500"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">Pilihan cepat:</span>
                  {['Bogor', 'Gresik', 'Jakarta', 'Bandung', 'Surabaya'].map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setDateModalPlace(city)}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-medium cursor-pointer"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tanggal Raport */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Raport (Teks Resmi Bahasa Indonesia)
                </label>
                
                {/* 1. Freeform Text Input */}
                <input
                  type="text"
                  value={dateModalDateText}
                  onChange={(e) => {
                    setDateModalDateText(e.target.value);
                    const iso = parseIndonesianDateToIso(e.target.value);
                    if (iso) setDateModalIso(iso);
                  }}
                  placeholder="Contoh: 1 Oktober 2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm font-bold focus:outline-indigo-500 focus:border-indigo-500"
                />

                {/* 2. Visual Browser Date Picker Helper */}
                <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="text-[11px] font-medium">Atau pilih dari kalender:</span>
                  </div>
                  <input
                    type="date"
                    value={dateModalIso}
                    onChange={(e) => {
                      const iso = e.target.value;
                      setDateModalIso(iso);
                      if (iso) {
                        const indo = formatIndonesianDate(iso);
                        setDateModalDateText(indo);
                      }
                    }}
                    className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-indigo-500 cursor-pointer"
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
                      setDateModalDateText(todayStr);
                      setDateModalIso(parseIndonesianDateToIso(todayStr));
                    }}
                    className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] cursor-pointer"
                  >
                    Hari Ini ({new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateModalDateText('1 Oktober 2026');
                      setDateModalIso('2026-10-01');
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] cursor-pointer"
                  >
                    1 Oktober 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateModalDateText('28 September 2026');
                      setDateModalIso('2026-09-28');
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] cursor-pointer"
                  >
                    28 September 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateModalDateText('30 September 2026');
                      setDateModalIso('2026-09-30');
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] cursor-pointer"
                  >
                    30 September 2026
                  </button>
                  {config.issueDate && config.issueDate !== '1 Oktober 2026' && config.issueDate !== '28 September 2026' && config.issueDate !== '30 September 2026' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDateModalDateText(config.issueDate);
                        setDateModalIso(parseIndonesianDateToIso(config.issueDate));
                      }}
                      className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium text-[11px] cursor-pointer"
                    >
                      Konfigurasi: {config.issueDate}
                    </button>
                  )}
                </div>
              </div>

              {/* Checkbox Apply to All Classes */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <input
                  type="checkbox"
                  id="dateApplyAllModal"
                  checked={dateModalApplyAll}
                  onChange={(e) => setDateModalApplyAll(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="dateApplyAllModal" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  Terapkan tempat &amp; tanggal ini ke seluruh kelas ({classList.length} Kelas)
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDateModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveDateModal}
                  className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 text-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan &amp; Terapkan Tanggal</span>
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
        initialSection={modalSection}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 text-xs font-medium animate-in fade-in slide-in-from-bottom-4 duration-200 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
