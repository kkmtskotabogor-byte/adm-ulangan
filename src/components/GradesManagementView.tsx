import React, { useState, useMemo, useRef } from 'react';
import { 
  ActiveTab, 
  AuthUser,
  ExamConfig, 
  ExamGradeItem, 
  ExamRoom, 
  ExamScheduleItem, 
  Student, 
  SubjectGradingConfig 
} from '../types';
import { 
  Award, 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Upload, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  RotateCcw, 
  Edit3, 
  Save, 
  Sliders, 
  Layers, 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  DoorOpen, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Table, 
  Percent, 
  TrendingUp, 
  Info, 
  Check, 
  Trash2,
  FileCheck2,
  X,
  Calculator,
  HelpCircle
} from 'lucide-react';
import { 
  calculateExamScoreFromCounts,
  getDefaultSubjectConfig,
  getGradePredicate, 
  exportGradesToExcel, 
  exportGradesTemplateToExcel, 
  parseGradesFile, 
  DEFAULT_KKM, 
  STANDARD_SCHOOL_SUBJECTS,
  generateSampleGrades
} from '../utils/gradeUtils';
import { SubjectPickerModal } from './SubjectPickerModal';
import { AdminSubjectsManager } from './AdminSubjectsManager';

interface GradesManagementViewProps {
  config: ExamConfig;
  students: Student[];
  rooms: ExamRoom[];
  schedules: ExamScheduleItem[];
  grades: ExamGradeItem[];
  gradingConfigs: Record<string, SubjectGradingConfig>;
  onUpdateGrades: (updatedGrades: ExamGradeItem[]) => void;
  onUpdateGradingConfig: (subject: string, config: SubjectGradingConfig) => void;
  showToast: (msg: string) => void;
  setActiveTab?: (tab: ActiveTab) => void;
  authUser?: AuthUser;
  initialShowSubjectPicker?: boolean;
  onCloseSubjectPicker?: () => void;
  customSubjects?: string[];
  onUpdateSubjects?: (subjects: string[]) => void;
}

export const GradesManagementView: React.FC<GradesManagementViewProps> = ({
  config,
  students,
  rooms,
  schedules,
  grades,
  gradingConfigs,
  onUpdateGrades,
  onUpdateGradingConfig,
  showToast,
  setActiveTab,
  authUser,
  initialShowSubjectPicker,
  onCloseSubjectPicker,
  customSubjects,
  onUpdateSubjects,
}) => {
  // 1. Subjects catalog state: loaded from customSubjects prop, localStorage, or standard defaults
  const [subjectsList, setSubjectsList] = useState<string[]>(() => {
    if (customSubjects && customSubjects.length > 0) return customSubjects;
    try {
      const saved = localStorage.getItem('sim_ujian_subjects_catalog_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading subject catalog:', e);
    }
    const list: string[] = [];
    schedules.forEach((s) => {
      if (s.subject && !s.isBreak && !list.includes(s.subject)) {
        list.push(s.subject);
      }
    });
    // Add standard subjects not in list
    STANDARD_SCHOOL_SUBJECTS.forEach((sub) => {
      if (!list.includes(sub)) {
        list.push(sub);
      }
    });
    return list;
  });

  // Keep state synced if customSubjects prop updates
  React.useEffect(() => {
    if (customSubjects && customSubjects.length > 0) {
      setSubjectsList(customSubjects);
    }
  }, [customSubjects]);

  const availableSubjects = subjectsList;

  // Persist and notify subject changes
  const updateSubjectsList = (newList: string[]) => {
    setSubjectsList(newList);
    localStorage.setItem('sim_ujian_subjects_catalog_v1', JSON.stringify(newList));
    if (onUpdateSubjects) onUpdateSubjects(newList);
  };

  // Add Subject Handler
  const handleAddSubject = (newSubject: string, newConfig: SubjectGradingConfig) => {
    if (!subjectsList.includes(newSubject)) {
      const updated = [...subjectsList, newSubject];
      updateSubjectsList(updated);
    }
    onUpdateGradingConfig(newSubject, newConfig);
    setSelectedSubject(newSubject);
  };

  // Edit Subject Handler
  const handleEditSubject = (oldName: string, newName: string, newConfig: SubjectGradingConfig) => {
    const updated = subjectsList.map((s) => (s === oldName ? newName : s));
    updateSubjectsList(updated);

    // If subject name changed, migrate existing student grades so they are preserved
    if (oldName !== newName) {
      const updatedGrades = grades.map((g) => {
        if (g.subject === oldName) {
          return {
            ...g,
            id: `${g.studentId}_${newName}`,
            subject: newName,
            updatedAt: new Date().toISOString(),
          };
        }
        return g;
      });
      onUpdateGrades(updatedGrades);

      if (selectedSubject === oldName) {
        setSelectedSubject(newName);
      }
    }

    onUpdateGradingConfig(newName, newConfig);
  };

  // Delete Subject Handler
  const handleDeleteSubject = (subjectName: string, deleteGrades: boolean) => {
    const updated = subjectsList.filter((s) => s !== subjectName);
    updateSubjectsList(updated);

    if (deleteGrades) {
      const remainingGrades = grades.filter((g) => g.subject !== subjectName);
      onUpdateGrades(remainingGrades);
    }

    if (selectedSubject === subjectName) {
      setSelectedSubject(updated[0] || 'Matematika');
    }
  };

  // Reset to Default Subjects Handler
  const handleResetToDefaultSubjects = () => {
    const defaultList = [...STANDARD_SCHOOL_SUBJECTS];
    updateSubjectsList(defaultList);
    if (!defaultList.includes(selectedSubject)) {
      setSelectedSubject(defaultList[0] || 'Matematika');
    }
  };

  // View mode: 'input' (interactive table), 'print' (official document A4), 'leger' (matrix all subjects), 'subjects' (admin subject management)
  const [activeSubTab, setActiveSubTab] = useState<'input' | 'print' | 'leger' | 'subjects'>('input');

  // Print mode type: 'filled' (terisi nilai) vs 'blank' (blanko kosong untuk korektor guru)
  const [printDocType, setPrintDocType] = useState<'filled' | 'blank'>('filled');

  // Selected subject: check if authUser has a subject, otherwise default
  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    if (authUser?.subject && availableSubjects.includes(authUser.subject)) {
      return authUser.subject;
    }
    return availableSubjects[0] || 'Matematika';
  });

  // Subject Picker Modal: open automatically right after login for teacher, or when requested
  const [showSubjectPickerModal, setShowSubjectPickerModal] = useState<boolean>(() => {
    if (initialShowSubjectPicker !== undefined) return initialShowSubjectPicker;
    return authUser?.role === 'teacher';
  });

  // Watch initialShowSubjectPicker changes from App.tsx
  React.useEffect(() => {
    if (initialShowSubjectPicker) {
      setShowSubjectPickerModal(true);
    }
  }, [initialShowSubjectPicker]);

  // Filter mode: 'all' | 'class' | 'room'
  const [filterMode, setFilterMode] = useState<'all' | 'class' | 'room'>('class');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'remedial' | 'unscored'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Config settings drawer toggle
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(true);

  // Import Modal state
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract distinct classes from students
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [students]);

  // Current Subject Grading Config (with default total questions and weights)
  const currentGradingConfig: SubjectGradingConfig = useMemo(() => {
    return gradingConfigs[selectedSubject] || getDefaultSubjectConfig(selectedSubject);
  }, [gradingConfigs, selectedSubject]);

  // Helper variables for current subject
  const totalPg = currentGradingConfig.totalPgQuestions ?? 40;
  const totalEssay = currentGradingConfig.totalEssayQuestions ?? 5;
  const maxEssay = currentGradingConfig.maxEssayScore ?? (totalEssay > 0 ? totalEssay : 1);
  const weightPg = currentGradingConfig.weightPg ?? 70;
  const weightEssay = currentGradingConfig.weightEssay ?? 30;

  // Update current grading config handler
  const handleConfigChange = (partial: Partial<SubjectGradingConfig>) => {
    const updated = {
      ...currentGradingConfig,
      ...partial,
    };
    onUpdateGradingConfig(selectedSubject, updated);

    // Recalculate all existing grades for this subject with new weights/counts
    const subjectGrades = grades.filter((g) => g.subject === selectedSubject);
    if (subjectGrades.length > 0) {
      const recalculated = subjectGrades.map((g) => {
        const correctPg = g.correctPg ?? 0;
        const correctEssay = g.correctEssay ?? 0;
        const calc = calculateExamScoreFromCounts(correctPg, correctEssay, updated);
        return {
          ...g,
          correctPg: calc.correctPg,
          wrongPg: calc.wrongPg,
          correctEssay: calc.correctEssay,
          scorePg: calc.scorePg,
          scoreEssay: calc.scoreEssay,
          scoreFinal: calc.scoreFinal,
          passed: calc.passed,
          notes: calc.passed ? 'Tuntas' : 'Remedial',
          updatedAt: new Date().toISOString(),
        };
      });

      const otherGrades = grades.filter((g) => g.subject !== selectedSubject);
      onUpdateGrades([...otherGrades, ...recalculated]);
    }
  };

  // Grade Map for fast O(1) lookup
  const currentSubjectGradeMap = useMemo(() => {
    const map = new Map<string, ExamGradeItem>();
    grades
      .filter((g) => g.subject === selectedSubject)
      .forEach((g) => {
        map.set(g.studentId, g);
      });
    return map;
  }, [grades, selectedSubject]);

  // Filtered Students list based on filterMode, selectedClass/Room, and Search query
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Class filter
      if (filterMode === 'class' && selectedClass !== 'all') {
        if (s.className !== selectedClass) return false;
      }

      // Room filter
      if (filterMode === 'room' && selectedRoomId !== 'all') {
        if (s.roomId !== selectedRoomId) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const grade = currentSubjectGradeMap.get(s.id);
        const hasScore = grade && typeof grade.scoreFinal === 'number';

        if (statusFilter === 'unscored') {
          if (hasScore) return false;
        } else if (statusFilter === 'passed') {
          if (!hasScore || !grade.passed) return false;
        } else if (statusFilter === 'remedial') {
          if (!hasScore || grade.passed) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.name.toLowerCase().includes(q);
        const matchNisn = (s.nisn || '').includes(q);
        const matchExamNo = (s.examNumber || '').toLowerCase().includes(q);
        const matchClass = s.className.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchExamNo && !matchClass) return false;
      }

      return true;
    });
  }, [students, filterMode, selectedClass, selectedRoomId, statusFilter, searchQuery, currentSubjectGradeMap]);

  // Statistics for currently filtered students
  const stats = useMemo(() => {
    const scoredGrades: ExamGradeItem[] = [];
    filteredStudents.forEach((s) => {
      const g = currentSubjectGradeMap.get(s.id);
      if (g && typeof g.scoreFinal === 'number') {
        scoredGrades.push(g);
      }
    });

    const totalStudents = filteredStudents.length;
    const scoredCount = scoredGrades.length;
    const unscoredCount = totalStudents - scoredCount;

    if (scoredCount === 0) {
      return {
        totalStudents,
        scoredCount,
        unscoredCount,
        avgScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passedCount: 0,
        remedialCount: 0,
        passPercentage: 0,
        predicateCounts: { A: 0, B: 0, C: 0, D: 0 },
      };
    }

    let sum = 0;
    let high = -1;
    let low = 101;
    let passed = 0;
    const predicates = { A: 0, B: 0, C: 0, D: 0 };

    scoredGrades.forEach((g) => {
      sum += g.scoreFinal;
      if (g.scoreFinal > high) high = g.scoreFinal;
      if (g.scoreFinal < low) low = g.scoreFinal;
      if (g.passed) passed++;

      const p = getGradePredicate(g.scoreFinal, currentGradingConfig.kkm).predicate;
      predicates[p] = (predicates[p] || 0) + 1;
    });

    const avgScore = Math.round((sum / scoredCount) * 10) / 10;
    const passPercentage = Math.round((passed / scoredCount) * 100);

    return {
      totalStudents,
      scoredCount,
      unscoredCount,
      avgScore,
      highestScore: high,
      lowestScore: low,
      passedCount: passed,
      remedialCount: scoredCount - passed,
      passPercentage,
      predicateCounts: predicates,
    };
  }, [filteredStudents, currentSubjectGradeMap, currentGradingConfig.kkm]);

  // Handle Count Change: Benar PG, Salah PG, or Skor Esai
  const handleCountChange = (
    student: Student,
    field: 'correctPg' | 'wrongPg' | 'correctEssay' | 'remedialScore' | 'notes',
    value: string
  ) => {
    const existing = currentSubjectGradeMap.get(student.id);

    let updatedCorrectPg = existing?.correctPg ?? 0;
    let updatedCorrectEssay = existing?.correctEssay ?? 0;
    let updatedRemedial = existing?.remedialScore ?? null;
    let updatedNotes = existing?.notes ?? '';

    if (field === 'correctPg') {
      const num = value === '' ? 0 : Math.min(totalPg, Math.max(0, parseInt(value) || 0));
      updatedCorrectPg = num;
    } else if (field === 'wrongPg') {
      const wrong = value === '' ? 0 : Math.min(totalPg, Math.max(0, parseInt(value) || 0));
      updatedCorrectPg = Math.max(0, totalPg - wrong);
    } else if (field === 'correctEssay') {
      const num = value === '' ? 0 : Math.min(maxEssay, Math.max(0, parseFloat(value) || 0));
      updatedCorrectEssay = num;
    } else if (field === 'remedialScore') {
      updatedRemedial = value === '' ? null : Math.min(100, Math.max(0, parseFloat(value) || 0));
    } else if (field === 'notes') {
      updatedNotes = value;
    }

    // Run exact calculation:
    // If correctPg === totalPg and correctEssay === maxEssay -> scoreFinal is 100!
    const calc = calculateExamScoreFromCounts(updatedCorrectPg, updatedCorrectEssay, currentGradingConfig);

    const newGradeItem: ExamGradeItem = {
      id: `${student.id}_${selectedSubject}`,
      studentId: student.id,
      studentName: student.name,
      nisn: student.nisn || '',
      nis: student.nis || '',
      className: student.className,
      examNumber: student.examNumber || '',
      roomId: student.roomId || '',
      roomName: student.roomName || '',
      seatNumber: student.seatNumber,
      subject: selectedSubject,
      correctPg: calc.correctPg,
      wrongPg: calc.wrongPg,
      correctEssay: calc.correctEssay,
      scorePg: calc.scorePg,
      scoreEssay: calc.scoreEssay,
      scoreFinal: calc.scoreFinal,
      remedialScore: updatedRemedial,
      passed: calc.passed,
      notes: updatedNotes || (calc.passed ? 'Tuntas' : 'Remedial'),
      updatedAt: new Date().toISOString(),
    };

    const otherGrades = grades.filter((g) => !(g.studentId === student.id && g.subject === selectedSubject));
    onUpdateGrades([...otherGrades, newGradeItem]);
  };

  // Bulk Actions
  const handleGenerateSampleScores = () => {
    const sample = generateSampleGrades(students, [selectedSubject], currentGradingConfig.kkm);
    const otherGrades = grades.filter((g) => g.subject !== selectedSubject);
    onUpdateGrades([...otherGrades, ...sample]);
    showToast(`Nilai simulasi Benar-Salah untuk mata pelajaran ${selectedSubject} berhasil dibuat!`);
  };

  const handleSetAllPerfectScores = () => {
    const otherGrades = grades.filter((g) => g.subject !== selectedSubject);
    const newItems: ExamGradeItem[] = filteredStudents.map((s) => {
      const calc = calculateExamScoreFromCounts(totalPg, maxEssay, currentGradingConfig);
      return {
        id: `${s.id}_${selectedSubject}`,
        studentId: s.id,
        studentName: s.name,
        nisn: s.nisn || '',
        nis: s.nis || '',
        className: s.className,
        examNumber: s.examNumber || '',
        roomId: s.roomId || '',
        roomName: s.roomName || '',
        seatNumber: s.seatNumber,
        subject: selectedSubject,
        correctPg: totalPg,
        wrongPg: 0,
        correctEssay: maxEssay,
        scorePg: 100,
        scoreEssay: 100,
        scoreFinal: 100,
        remedialScore: null,
        passed: true,
        notes: 'Sempurna - Benar Semua (Nilai 100)',
        updatedAt: new Date().toISOString(),
      };
    });

    onUpdateGrades([...otherGrades, ...newItems]);
    showToast(`Seluruh siswa (${newItems.length} siswa) berhasil diset Benar Semua (Nilai 100)!`);
  };

  const handleSetAllPassed = () => {
    const kkm = currentGradingConfig.kkm || DEFAULT_KKM;
    const otherGrades = grades.filter((g) => g.subject !== selectedSubject);
    
    // Estimate minimum correct count to achieve KKM
    const minPg = Math.min(totalPg, Math.ceil(totalPg * (kkm / 100)));
    const minEssay = Math.min(maxEssay, Math.ceil(maxEssay * (kkm / 100)));

    const newItems: ExamGradeItem[] = filteredStudents.map((s) => {
      const calc = calculateExamScoreFromCounts(minPg, minEssay, currentGradingConfig);
      return {
        id: `${s.id}_${selectedSubject}`,
        studentId: s.id,
        studentName: s.name,
        nisn: s.nisn || '',
        nis: s.nis || '',
        className: s.className,
        examNumber: s.examNumber || '',
        roomId: s.roomId || '',
        roomName: s.roomName || '',
        seatNumber: s.seatNumber,
        subject: selectedSubject,
        correctPg: calc.correctPg,
        wrongPg: calc.wrongPg,
        correctEssay: calc.correctEssay,
        scorePg: calc.scorePg,
        scoreEssay: calc.scoreEssay,
        scoreFinal: calc.scoreFinal,
        remedialScore: null,
        passed: true,
        notes: 'Tuntas memenuhi KKM',
        updatedAt: new Date().toISOString(),
      };
    });

    onUpdateGrades([...otherGrades, ...newItems]);
    showToast(`Seluruh siswa (${newItems.length} siswa) berhasil diset Tuntas KKM!`);
  };

  const handleClearSubjectGrades = () => {
    if (!window.confirm(`Yakin ingin mengosongkan seluruh nilai mata pelajaran "${selectedSubject}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    const otherGrades = grades.filter((g) => g.subject !== selectedSubject);
    onUpdateGrades(otherGrades);
    showToast(`Seluruh nilai mata pelajaran ${selectedSubject} telah dikosongkan.`);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const filterLabel =
      filterMode === 'class'
        ? selectedClass === 'all'
          ? 'Semua Kelas'
          : `Kelas ${selectedClass}`
        : filterMode === 'room'
        ? selectedRoomId === 'all'
          ? 'Semua Ruang'
          : rooms.find((r) => r.id === selectedRoomId)?.name || 'Ruang'
        : 'Semua Siswa';

    exportGradesToExcel(
      filteredStudents,
      grades,
      config,
      selectedSubject,
      currentGradingConfig,
      filterLabel
    );
    showToast(`File Excel nilai mata pelajaran ${selectedSubject} berhasil diunduh.`);
  };

  // Export Template Excel
  const handleExportTemplate = () => {
    const filterLabel =
      filterMode === 'class'
        ? selectedClass === 'all'
          ? 'Semua Kelas'
          : `Kelas ${selectedClass}`
        : 'Semua Siswa';

    exportGradesTemplateToExcel(
      filteredStudents,
      config,
      selectedSubject,
      currentGradingConfig,
      filterLabel
    );
    showToast(`Template Excel nilai Benar-Salah ${selectedSubject} berhasil diunduh.`);
  };

  // Import Excel / CSV Handler
  const handleExecuteImport = async () => {
    if (!importFile) return;
    setIsImporting(true);
    try {
      const result = await parseGradesFile(
        importFile,
        students,
        selectedSubject,
        currentGradingConfig
      );

      if (result.errors.length > 0 && result.importedCount === 0) {
        alert(result.errors.join('\n'));
        setIsImporting(false);
        return;
      }

      // Merge imported grades
      const importedIds = new Set(result.updatedGrades.map((g) => g.id));
      const untouchedGrades = grades.filter((g) => !importedIds.has(g.id));
      onUpdateGrades([...untouchedGrades, ...result.updatedGrades]);

      showToast(`Berhasil mengimpor ${result.importedCount} data nilai dari file Excel!`);
      setShowImportModal(false);
      setImportFile(null);
    } catch (err: any) {
      alert(`Gagal memproses file: ${err.message || String(err)}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Print Document Handler
  const handlePrint = () => {
    window.print();
  };

  const targetFilterDisplay =
    filterMode === 'class'
      ? selectedClass === 'all'
        ? 'Seluruh Rombongan Belajar'
        : `Kelas ${selectedClass}`
      : filterMode === 'room'
      ? selectedRoomId === 'all'
        ? 'Seluruh Ruangan Ujian'
        : rooms.find((r) => r.id === selectedRoomId)?.name || 'Ruang Ujian'
      : 'Seluruh Peserta';

  return (
    <div className="space-y-6">
      {/* 1. Header Hero Card with Clean Minimalism & Badges */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-200/60">
                Menu Penilaian Benar &amp; Salah
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200/60">
                KKM: {currentGradingConfig.kkm || DEFAULT_KKM}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold uppercase tracking-wider border border-amber-200/60">
                {totalPg} PG • {totalEssay} Esai (100 jika benar semua)
              </span>
              <span className="text-xs text-slate-400">
                {config.examType} • {config.schoolName}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <Award className="w-6 h-6 text-indigo-600" />
              <span>Daftar Nilai Hasil Ujian</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              Perhitungan nilai akurat berbasis jumlah butir soal <strong>Pilihan Ganda (PG)</strong> dan <strong>Esai</strong>. Cukup input jumlah jawaban Benar atau Salah, sistem otomatis mengonversi ke skala 100 (jika benar semua otomatis bernilai 100).
            </p>
          </div>

          {/* Quick Sub-Tab Selector */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveSubTab('input')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeSubTab === 'input'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Input &amp; Rekap</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('print')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeSubTab === 'print'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Dokumen A4</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('leger')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeSubTab === 'leger'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Leger Kolektif</span>
              </button>

              {/* Tab 4: Daftar Mata Pelajaran (Khusus Role Admin) */}
              {(!authUser || authUser.role === 'admin') && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('subjects')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeSubTab === 'subjects'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Daftar Mata Pelajaran</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-bold font-mono">
                    {availableSubjects.length}
                  </span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Halaman</span>
            </button>
          </div>
        </div>

        {/* Dedicated Teacher Role Welcome Banner */}
        {authUser?.role === 'teacher' && (
          <div className="mt-4 p-3 bg-purple-50/80 border border-purple-200/80 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-purple-950">
                  Ruang Kerja Guru Mata Pelajaran — Akses Penginputan &amp; Pengelolaan Nilai Ujian
                </p>
                <p className="text-[11px] text-purple-700">
                  Silakan pilih mata pelajaran Anda, atur butir soal (PG &amp; Esai), dan isi jumlah jawaban benar/salah. Pada tampilan layar HP/mobile, isian nilai tersusun rapi langsung di bawah nama siswa tanpa perlu digeser ke kanan.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-purple-200 rounded-lg text-[11px] font-semibold text-purple-800 shrink-0 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Login: <strong>{authUser.username}</strong> ({authUser.roleLabel})</span>
            </div>
          </div>
        )}

        {/* Mata Pelajaran Selector Horizontal Strip (Hidden when in Subjects Manager) */}
        {activeSubTab !== 'subjects' && (
          <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                Mata Pelajaran:
              </span>
              <button
                type="button"
                onClick={() => setShowSubjectPickerModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
                title="Pilih Mata Pelajaran Lainnya"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Pilih / Ganti Mapel ({availableSubjects.length})</span>
                <span className="bg-purple-800/80 px-1.5 py-0.5 rounded text-[10px] text-purple-200">
                  {selectedSubject}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{showConfigDrawer ? 'Sembunyikan Pengaturan Soal & Bobot' : 'Atur Jumlah Soal & Bobot Mapel'}</span>
              {showConfigDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none items-center">
            {/* Quick Open Catalog button */}
            <button
              type="button"
              onClick={() => setShowSubjectPickerModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100 shadow-2xs"
            >
              <Search className="w-3.5 h-3.5 text-purple-600" />
              <span>Katalog Semua Mapel</span>
            </button>

            {availableSubjects.map((sub) => {
              const isSelected = selectedSubject === sub;
              const hasGrades = grades.some((g) => g.subject === sub);
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : hasGrades
                      ? 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{sub}</span>
                  {hasGrades && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Collapsible Config Drawer: Setup Jumlah Soal PG & Esai serta Bobot */}
          {showConfigDrawer && (
            <div className="mt-4 p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* 1. Jml Soal PG */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <span>Jumlah Soal PG</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">(Butir)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={totalPg}
                    onChange={(e) => handleConfigChange({ totalPgQuestions: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Contoh: 40 atau 30 soal</span>
                </div>

                {/* 2. Jml Soal Esai */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <span>Jumlah Soal Esai</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">(Butir)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={totalEssay}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      handleConfigChange({ 
                        totalEssayQuestions: val, 
                        maxEssayScore: val > 0 ? val : 0 
                      });
                    }}
                    className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Contoh: 5 butir (0 jika tanpa esai)</span>
                </div>

                {/* 3. Bobot PG & Esai */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Bobot PG / Esai (%)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <span className="text-[9px] text-slate-500">PG:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={weightPg}
                        onChange={(e) => handleConfigChange({ weightPg: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs font-bold bg-white border border-slate-300 rounded-md text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500">Esai:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={weightEssay}
                        onChange={(e) => handleConfigChange({ weightEssay: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs font-bold bg-white border border-slate-300 rounded-md text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. KKM */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Kriteria KKM / KKTP
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={currentGradingConfig.kkm}
                    onChange={(e) => handleConfigChange({ kkm: parseInt(e.target.value) || DEFAULT_KKM })}
                    className="w-full px-3 py-1.5 text-xs font-bold text-emerald-700 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standar kelulusan (75)</span>
                </div>

                {/* 5. Guru Pengampu */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Guru Pengampu
                  </label>
                  <input
                    type="text"
                    placeholder="Nama & Gelar"
                    value={currentGradingConfig.teacherName || ''}
                    onChange={(e) => handleConfigChange({ teacherName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Untuk tanda tangan</span>
                </div>

                {/* 6. NIP Guru */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    NIP Guru Pengampu
                  </label>
                  <input
                    type="text"
                    placeholder="19800101... atau -"
                    value={currentGradingConfig.teacherNip || ''}
                    onChange={(e) => handleConfigChange({ teacherNip: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">NIP pada titimangsa</span>
                </div>
              </div>

              {/* Informative Formula Banner */}
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-100/70 text-indigo-900 rounded-lg text-xs">
                <Calculator className="w-4 h-4 text-indigo-700 shrink-0" />
                <div className="leading-snug">
                  <strong>Rumus Aktif Mapel {selectedSubject}:</strong>{' '}
                  <span className="font-mono text-[11px]">
                    Nilai Akhir = (Benar PG / {totalPg} × {weightPg}%) + (Skor Esai / {maxEssay} × {weightEssay}%)
                  </span>
                  {' '}— <span className="text-emerald-700 font-bold">Jika benar semua ({totalPg} PG &amp; {totalEssay} Esai), Nilai Akhir pasti 100!</span>
                </div>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* 2. Top Analytics Metrics Strip (Clean Cards - Hidden when in Subjects Manager) */}
      {activeSubTab !== 'subjects' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 no-print">
        {/* Rata-Rata Nilai */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Rata-Rata Nilai
          </span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold tracking-tight ${stats.avgScore >= currentGradingConfig.kkm ? 'text-emerald-600' : 'text-slate-900'}`}>
              {stats.avgScore || '-'}
            </span>
            <span className="text-[10px] text-slate-400">/ 100</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            KKM: {currentGradingConfig.kkm}
          </span>
        </div>

        {/* Nilai Tertinggi */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Nilai Tertinggi
          </span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-indigo-600">
              {stats.highestScore || '-'}
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-1 block">
            {stats.highestScore === 100 ? 'Sempurna (100)' : 'Nilai Maksimal'}
          </span>
        </div>

        {/* Nilai Terendah */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Nilai Terendah
          </span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-rose-600">
              {stats.lowestScore === 101 ? '-' : stats.lowestScore}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Perlu bimbingan
          </span>
        </div>

        {/* Ketuntasan */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Ketuntasan Belajar
          </span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-emerald-600">
              {stats.passPercentage}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block truncate">
            {stats.passedCount} Tuntas • {stats.remedialCount} Remedial
          </span>
        </div>

        {/* Peserta Dinilai */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Peserta Dinilai
          </span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {stats.scoredCount}
            </span>
            <span className="text-[10px] text-slate-400">/ {stats.totalStudents}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {stats.unscoredCount > 0 ? `${stats.unscoredCount} belum dinilai` : '100% Selesai dinilai'}
          </span>
        </div>

        {/* Distribusi Predikat */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Predikat (A/B/C/D)
          </span>
          <div className="mt-2 flex items-center justify-between text-xs font-bold gap-1">
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title="A (>=90)">
              A:{stats.predicateCounts.A}
            </span>
            <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" title="B (80-89)">
              B:{stats.predicateCounts.B}
            </span>
            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="C (KKM-79)">
              C:{stats.predicateCounts.C}
            </span>
            <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" title="D (<KKM)">
              D:{stats.predicateCounts.D}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 mt-1.5 block">
            Distribusi perolehan
          </span>
        </div>
      </div>
      )}

      {/* 3. SUB-TAB 1: INPUT & REKAP NILAI INTERAKTIF BERDASARKAN BENAR & SALAH */}
      {activeSubTab === 'input' && (
        <div className="space-y-4">
          {/* Action & Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
            {/* Left Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter By Mode */}
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFilterMode('class')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    filterMode === 'class' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Per Kelas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('room')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    filterMode === 'room' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Per Ruang
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    filterMode === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Semua
                </button>
              </div>

              {/* Class Selector */}
              {filterMode === 'class' && (
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden"
                >
                  <option value="all">Semua Rombel ({availableClasses.length} Kelas)</option>
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))}
                </select>
              )}

              {/* Room Selector */}
              {filterMode === 'room' && (
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden"
                >
                  <option value="all">Semua Ruang ({rooms.length} Ruang)</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.roomCode})
                    </option>
                  ))}
                </select>
              )}

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden"
              >
                <option value="all">Semua Status</option>
                <option value="passed">Hanya Tuntas</option>
                <option value="remedial">Hanya Remedial</option>
                <option value="unscored">Belum Dinilai</option>
              </select>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama / NISN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-40 focus:w-56 transition-all focus:bg-white focus:outline-hidden"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateSampleScores}
                title="Isi jumlah benar & salah acak realistis untuk demo"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Isi Contoh Benar-Salah</span>
              </button>

              <button
                type="button"
                onClick={handleSetAllPerfectScores}
                title="Tandai seluruh siswa benar semua sehingga mendapat nilai sempurna 100"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>Semua Benar (100)</span>
              </button>

              <button
                type="button"
                onClick={handleSetAllPassed}
                title="Tandai seluruh siswa lulus KKM"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Set KKM</span>
              </button>

              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                title="Impor nilai dari file Excel atau CSV"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Import Excel</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                title="Unduh daftar nilai format Microsoft Excel (.xlsx)"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={handleClearSubjectGrades}
                title="Kosongkan nilai mapel ini"
                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Benar-Salah Table Container */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            {/* Mobile View Notification */}
            <div className="md:hidden px-3.5 py-2 bg-purple-50/90 border-b border-purple-200/80 text-[11px] text-purple-900 flex items-center justify-between gap-2">
              <span className="font-semibold flex items-center gap-1.5">
                <span>📱</span>
                <span>Tampilan Mobile: Isian nilai ditaruh tepat di bawah nama siswa tanpa perlu digeser ke kanan.</span>
              </span>
              <span className="text-[10px] bg-purple-200/70 text-purple-800 px-2 py-0.5 rounded font-mono shrink-0">
                {filteredStudents.length} Siswa
              </span>
            </div>

            {/* Desktop Table View (>= md breakpoint): Wide spreadsheet view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-2 w-10 text-center">No</th>
                    <th className="py-3 px-2.5 w-28">No. Peserta</th>
                    <th className="py-3 px-2.5 w-24">NISN</th>
                    <th className="py-3 px-3 min-w-[170px]">Nama Siswa</th>
                    <th className="py-3 px-2 w-14 text-center">Kelas</th>
                    <th className="py-3 px-2 w-20 text-center">Ruang</th>

                    {/* Columns for Benar & Salah PG */}
                    <th className="py-3 px-2.5 w-24 text-center bg-blue-50/70 text-blue-900 border-l border-blue-200">
                      Benar PG <span className="block text-[9px] font-normal text-blue-700">(Max {totalPg})</span>
                    </th>
                    <th className="py-3 px-2 w-20 text-center bg-blue-50/50 text-blue-900">
                      Salah PG
                    </th>
                    <th className="py-3 px-2 w-20 text-center bg-blue-50/30 text-blue-800">
                      Nilai PG
                    </th>

                    {/* Columns for Esai */}
                    <th className="py-3 px-2.5 w-24 text-center bg-amber-50/70 text-amber-900 border-l border-amber-200">
                      Skor Esai <span className="block text-[9px] font-normal text-amber-700">(Max {maxEssay})</span>
                    </th>
                    <th className="py-3 px-2 w-20 text-center bg-amber-50/40 text-amber-800">
                      Nilai Esai
                    </th>

                    {/* Final Score (100 if all correct) */}
                    <th className="py-3 px-3 w-28 text-center font-bold bg-indigo-100 text-indigo-950 border-l border-indigo-200">
                      Nilai Akhir <span className="block text-[9px] font-normal text-indigo-700">(100 jika benar semua)</span>
                    </th>
                    <th className="py-3 px-2 w-20 text-center">Remedial</th>
                    <th className="py-3 px-2 w-16 text-center">Pred</th>
                    <th className="py-3 px-2.5 w-24 text-center">Status</th>
                    <th className="py-3 px-3 min-w-[140px]">Catatan / Evaluasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-12 text-center text-slate-400">
                        Tidak ada data siswa yang cocok dengan filter atau kata kunci pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, index) => {
                      const grade = currentSubjectGradeMap.get(student.id);
                      const hasFinal = grade && typeof grade.scoreFinal === 'number';
                      const finalScore = hasFinal ? grade.scoreFinal : null;
                      const isPassed = hasFinal ? grade.passed : false;
                      const predicateInfo = hasFinal ? getGradePredicate(grade.scoreFinal, currentGradingConfig.kkm) : null;

                      const currentCorrectPg = grade?.correctPg ?? '';
                      const currentWrongPg = grade?.wrongPg ?? (typeof grade?.correctPg === 'number' ? Math.max(0, totalPg - grade.correctPg) : '');
                      const currentCorrectEssay = grade?.correctEssay ?? '';
                      const currentScorePg = grade?.scorePg ?? (typeof grade?.correctPg === 'number' ? Math.round((grade.correctPg / (totalPg || 1)) * 100) : '-');
                      const currentScoreEssay = grade?.scoreEssay ?? (typeof grade?.correctEssay === 'number' ? Math.round((grade.correctEssay / (maxEssay || 1)) * 100) : '-');

                      return (
                        <tr
                          key={student.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                          }`}
                        >
                          {/* No */}
                          <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px]">
                            {index + 1}
                          </td>

                          {/* No. Peserta */}
                          <td className="py-2 px-2.5 font-mono font-bold text-slate-800 text-[11px]">
                            {student.examNumber || '-'}
                          </td>

                          {/* NISN */}
                          <td className="py-2 px-2.5 text-slate-500 font-mono text-[11px]">
                            {student.nisn || '-'}
                          </td>

                          {/* Nama Lengkap */}
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[170px]" title={student.name}>
                                {student.name}
                              </span>
                              <span
                                className={`text-[9px] px-1 py-0.2 rounded font-bold shrink-0 ${
                                  student.gender === 'L'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-pink-50 text-pink-700'
                                }`}
                              >
                                {student.gender}
                              </span>
                            </div>
                          </td>

                          {/* Kelas */}
                          <td className="py-2 px-2 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {student.className}
                            </span>
                          </td>

                          {/* Ruang */}
                          <td className="py-2 px-2 text-center text-[10px] text-slate-600">
                            {student.roomName ? student.roomName.replace('Ruang ', 'R.') : '-'}
                          </td>

                          {/* 1. Benar PG Input */}
                          <td className="py-1.5 px-2.5 text-center bg-blue-50/30 border-l border-blue-100">
                            <input
                              type="number"
                              min={0}
                              max={totalPg}
                              placeholder={`0-${totalPg}`}
                              value={currentCorrectPg}
                              onChange={(e) => handleCountChange(student, 'correctPg', e.target.value)}
                              className="w-16 px-1.5 py-1 text-center font-mono font-bold text-xs bg-white border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            />
                          </td>

                          {/* 2. Salah PG Input / Display */}
                          <td className="py-1.5 px-2 text-center bg-blue-50/20">
                            <input
                              type="number"
                              min={0}
                              max={totalPg}
                              placeholder="0"
                              value={currentWrongPg}
                              onChange={(e) => handleCountChange(student, 'wrongPg', e.target.value)}
                              className="w-14 px-1 py-1 text-center font-mono text-xs bg-white/80 border border-slate-300 rounded focus:ring-1 focus:ring-blue-400 focus:outline-hidden"
                            />
                          </td>

                          {/* 3. Nilai PG (Scale 100) */}
                          <td className="py-2 px-2 text-center font-mono text-[11px] text-blue-800 font-semibold bg-blue-50/10">
                            {currentScorePg}
                          </td>

                          {/* 4. Skor Esai Input */}
                          <td className="py-1.5 px-2.5 text-center bg-amber-50/30 border-l border-amber-100">
                            {totalEssay > 0 ? (
                              <input
                                type="number"
                                step="0.5"
                                min={0}
                                max={maxEssay}
                                placeholder={`0-${maxEssay}`}
                                value={currentCorrectEssay}
                                onChange={(e) => handleCountChange(student, 'correctEssay', e.target.value)}
                                className="w-16 px-1.5 py-1 text-center font-mono font-bold text-xs bg-white border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                              />
                            ) : (
                              <span className="text-slate-300 text-[10px]">-</span>
                            )}
                          </td>

                          {/* 5. Nilai Esai (Scale 100) */}
                          <td className="py-2 px-2 text-center font-mono text-[11px] text-amber-800 font-semibold bg-amber-50/10">
                            {totalEssay > 0 ? currentScoreEssay : '-'}
                          </td>

                          {/* 6. Nilai Akhir (100 jika benar semua!) */}
                          <td className="py-2 px-2 text-center bg-indigo-50/50 border-l border-indigo-200">
                            <div className="flex items-center justify-center">
                              <span
                                className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded ${
                                  hasFinal
                                    ? finalScore === 100
                                      ? 'text-indigo-800 bg-indigo-100 ring-1 ring-indigo-400'
                                      : isPassed
                                      ? 'text-emerald-700 bg-emerald-50'
                                      : 'text-rose-700 bg-rose-50'
                                    : 'text-slate-300'
                                }`}
                              >
                                {hasFinal ? finalScore : '-'}
                              </span>
                            </div>
                          </td>

                          {/* Remedial Score */}
                          <td className="py-1.5 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              placeholder="Rem"
                              value={grade?.remedialScore ?? ''}
                              onChange={(e) => handleCountChange(student, 'remedialScore', e.target.value)}
                              className="w-12 px-1 py-1 text-center font-mono text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-400 focus:outline-hidden"
                            />
                          </td>

                          {/* Predikat */}
                          <td className="py-2 px-2 text-center">
                            {predicateInfo ? (
                              <span
                                className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded border ${predicateInfo.badgeClass}`}
                                title={predicateInfo.label}
                              >
                                {predicateInfo.predicate}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* Status Ketuntasan */}
                          <td className="py-2 px-2.5 text-center">
                            {hasFinal ? (
                              isPassed ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  TUNTAS
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  REMEDIAL
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Belum Dinilai</span>
                            )}
                          </td>

                          {/* Catatan / Evaluasi */}
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              placeholder="Catatan..."
                              value={grade?.notes || ''}
                              onChange={(e) => handleCountChange(student, 'notes', e.target.value)}
                              className="w-full px-2 py-1 text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View (< md): Tampilan Pengisian Nilai Vertikal (Isian Nilai Tepat di Bawah Nama Siswa, Tanpa Perlu Geser Kanan) */}
            <div className="md:hidden divide-y divide-slate-200 bg-white">
              {filteredStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 p-4">
                  Tidak ada data siswa yang cocok dengan filter atau kata kunci pencarian.
                </div>
              ) : (
                filteredStudents.map((student, index) => {
                  const grade = currentSubjectGradeMap.get(student.id);
                  const hasFinal = grade && typeof grade.scoreFinal === 'number';
                  const finalScore = hasFinal ? grade.scoreFinal : null;
                  const isPassed = hasFinal ? grade.passed : false;
                  const predicateInfo = hasFinal ? getGradePredicate(grade.scoreFinal, currentGradingConfig.kkm) : null;

                  const currentCorrectPg = grade?.correctPg ?? '';
                  const currentWrongPg = grade?.wrongPg ?? (typeof grade?.correctPg === 'number' ? Math.max(0, totalPg - grade.correctPg) : '');
                  const currentCorrectEssay = grade?.correctEssay ?? '';
                  const currentScorePg = grade?.scorePg ?? (typeof grade?.correctPg === 'number' ? Math.round((grade.correctPg / (totalPg || 1)) * 100) : '-');
                  const currentScoreEssay = grade?.scoreEssay ?? (typeof grade?.correctEssay === 'number' ? Math.round((grade.correctEssay / (maxEssay || 1)) * 100) : '-');

                  return (
                    <div key={student.id} className="p-3.5 space-y-3 hover:bg-slate-50/60 transition-colors">
                      {/* Baris 1: Identitas Siswa & Skor Akhir */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-sm text-slate-900 leading-snug">
                                {student.name}
                              </h4>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                                  student.gender === 'L'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-pink-50 text-pink-700 border border-pink-200'
                                }`}
                              >
                                {student.gender}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                              <span className="font-mono font-semibold text-slate-700">{student.examNumber || '-'}</span>
                              <span>•</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px] border border-slate-200">
                                {student.className}
                              </span>
                              <span>•</span>
                              <span className="text-slate-600 text-[10px]">
                                {student.roomName ? student.roomName.replace('Ruang ', 'R.') : '-'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Skor Nilai Akhir & Status Badge (Kanan Atas) */}
                        <div className="text-right shrink-0">
                          <div className="flex items-center justify-end gap-1.5">
                            <div
                              className={`px-2.5 py-1 rounded-lg font-mono font-bold text-base leading-none shadow-2xs border ${
                                hasFinal
                                  ? finalScore === 100
                                    ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-300'
                                    : isPassed
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                  : 'bg-slate-100 text-slate-400 border-slate-200'
                              }`}
                              title="Nilai Akhir (100 jika benar semua)"
                            >
                              {hasFinal ? finalScore : '-'}
                            </div>
                            {predicateInfo && (
                              <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${predicateInfo.badgeClass}`}>
                                {predicateInfo.predicate}
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            {hasFinal ? (
                              isPassed ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Tuntas
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" /> Remedial
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Belum Dinilai</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Baris 2: Isian Nilai Tepat di Bawah Nama Siswa (Tanpa Perlu Geser Kanan) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                        {/* 1. Blok Pilihan Ganda (PG) */}
                        <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-950 flex items-center gap-1">
                              <span>Pilihan Ganda</span>
                              <span className="text-[10px] font-normal text-blue-700">({weightPg}%)</span>
                            </span>
                            <span className="text-[11px] font-bold text-blue-800 font-mono bg-white px-2 py-0.5 rounded border border-blue-200 shadow-2xs">
                              Nilai PG: {currentScorePg}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-blue-900 mb-1">
                                Benar (Max {totalPg})
                              </label>
                              <input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min={0}
                                max={totalPg}
                                placeholder={`0-${totalPg}`}
                                value={currentCorrectPg}
                                onChange={(e) => handleCountChange(student, 'correctPg', e.target.value)}
                                className="w-full px-2 py-1.5 text-center font-mono font-bold text-sm bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden shadow-2xs text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                                Salah PG
                              </label>
                              <input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min={0}
                                max={totalPg}
                                placeholder="0"
                                value={currentWrongPg}
                                onChange={(e) => handleCountChange(student, 'wrongPg', e.target.value)}
                                className="w-full px-2 py-1.5 text-center font-mono text-sm bg-white/90 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-400 focus:outline-hidden text-slate-900"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 2. Blok Soal Esai */}
                        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                              <span>Soal Esai</span>
                              <span className="text-[10px] font-normal text-amber-700">({weightEssay}%)</span>
                            </span>
                            <span className="text-[11px] font-bold text-amber-800 font-mono bg-white px-2 py-0.5 rounded border border-amber-200 shadow-2xs">
                              Nilai Esai: {totalEssay > 0 ? currentScoreEssay : '-'}
                            </span>
                          </div>

                          {totalEssay > 0 ? (
                            <div>
                              <label className="block text-[10px] font-semibold text-amber-900 mb-1">
                                Skor Jawaban Benar (Max {maxEssay})
                              </label>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.5"
                                min={0}
                                max={maxEssay}
                                placeholder={`0-${maxEssay}`}
                                value={currentCorrectEssay}
                                onChange={(e) => handleCountChange(student, 'correctEssay', e.target.value)}
                                className="w-full px-2 py-1.5 text-center font-mono font-bold text-sm bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden shadow-2xs text-slate-900"
                              />
                            </div>
                          ) : (
                            <div className="h-14 flex items-center justify-center text-[11px] text-slate-400 italic bg-white/60 rounded-lg border border-dashed border-amber-200">
                              Mapel ini tanpa butir esai
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Baris 3: Catatan & Remedial (jika belum tuntas) */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Catatan / evaluasi siswa..."
                            value={grade?.notes || ''}
                            onChange={(e) => handleCountChange(student, 'notes', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:outline-hidden text-slate-900 placeholder-slate-400"
                          />
                        </div>
                        {(!hasFinal || !isPassed) && (
                          <div className="w-24 shrink-0">
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={100}
                              placeholder="Remedial"
                              value={grade?.remedialScore ?? ''}
                              onChange={(e) => handleCountChange(student, 'remedialScore', e.target.value)}
                              className="w-full px-2 py-1.5 text-center font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden text-slate-900"
                              title="Nilai Remedial Siswa"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom summary bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
              <div>
                Menampilkan <strong className="text-slate-900">{filteredStudents.length}</strong> peserta dari total{' '}
                <strong className="text-slate-900">{students.length}</strong> siswa aktif.
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Tuntas: <strong>{stats.passedCount}</strong>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  Remedial: <strong>{stats.remedialCount}</strong>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                  Belum Dinilai: <strong>{stats.unscoredCount}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-TAB 2: CETAK DOKUMEN RESMI A4 (PRINT SHEET) */}
      {activeSubTab === 'print' && (
        <div className="space-y-4">
          {/* Print Toolbar controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Tipe Dokumen Cetak:</span>
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPrintDocType('filled')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    printDocType === 'filled' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Daftar Nilai Hasil (Terisi)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintDocType('blank')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    printDocType === 'blank' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Formulir Blanko Nilai Kosong (Untuk Korektor Guru)
                </button>
              </div>

              {/* Scope filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Target Rombel:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setFilterMode('class');
                    setSelectedClass(e.target.value);
                  }}
                  className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="all">Semua Rombongan Belajar</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Blanko Excel</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Dokumen Sekarang (A4)</span>
              </button>
            </div>
          </div>

          {/* Official Printable Sheet Container */}
          <div className="bg-white p-8 sm:p-12 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0 max-w-[210mm] mx-auto text-slate-900">
            {/* 1. Official School Letterhead Kop */}
            <div className="border-b-4 border-double border-slate-900 pb-3 mb-4 text-center relative">
              {config.logoUrl && (
                <div className="absolute left-1 top-0 w-16 h-16 flex items-center justify-center">
                  <img
                    src={config.logoUrl}
                    alt="Logo Sekolah"
                    className="max-h-16 max-w-16 object-contain"
                  />
                </div>
              )}
              <div className="px-16">
                <h4 className="text-[12px] font-semibold uppercase tracking-wider text-slate-700">
                  KEMENTERIAN AGAMA / DINAS PENDIDIKAN
                </h4>
                <h3 className="text-base sm:text-lg font-bold uppercase tracking-tight text-slate-950">
                  {config.schoolName}
                </h3>
                <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">
                  {config.address} {config.subdistrict ? `• ${config.subdistrict}` : ''} {config.district ? `• ${config.district}` : ''}
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5 font-mono">
                  NPSN: {config.npsn || '-'} | Telp: {config.phone || '-'} | Email: {config.email || '-'}
                </p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-3">
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-wide underline underline-offset-4">
                {printDocType === 'blank' ? 'FORMULIR DAFTAR NILAI UJIAN (BLANKO KOREKTOR)' : 'DAFTAR NILAI HASIL UJIAN RESMI'}
              </h3>
              <p className="text-xs font-semibold text-slate-700 mt-1 uppercase">
                {config.examTitle} — TAHUN AJARAN {config.academicYear}
              </p>
            </div>

            {/* Metadata Info Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs border border-slate-300 p-3 rounded-md bg-slate-50/50 mb-4">
              <div className="flex">
                <span className="w-32 font-semibold text-slate-700">Mata Pelajaran</span>
                <span className="font-bold text-slate-950">: {selectedSubject}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-semibold text-slate-700">Kriteria KKM</span>
                <span className="font-bold text-slate-950">: {currentGradingConfig.kkm || DEFAULT_KKM}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-semibold text-slate-700">Jumlah Butir Soal</span>
                <span className="font-bold text-slate-950">: {totalPg} Soal PG &amp; {totalEssay} Soal Esai</span>
              </div>
              <div className="flex">
                <span className="w-32 font-semibold text-slate-700">Bobot Penilaian</span>
                <span className="text-slate-900">: PG {weightPg}% | Esai {weightEssay}% (Benar semua = 100)</span>
              </div>
              <div className="flex">
                <span className="w-32 font-semibold text-slate-700">Rombel / Sasaran</span>
                <span className="text-slate-900">: {targetFilterDisplay}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-semibold text-slate-700">Guru Pengampu</span>
                <span className="font-medium text-slate-900">: {currentGradingConfig.teacherName || '-'}</span>
              </div>
            </div>

            {/* Printable Scores Table */}
            <table className="w-full text-left text-[11px] border-collapse border border-slate-900">
              <thead>
                <tr className="bg-slate-100 text-center font-bold text-slate-900">
                  <th className="border border-slate-900 py-1.5 px-1.5 w-8">No</th>
                  <th className="border border-slate-900 py-1.5 px-2 w-28">No. Peserta</th>
                  <th className="border border-slate-900 py-1.5 px-2 w-24">NISN</th>
                  <th className="border border-slate-900 py-1.5 px-2 text-left">Nama Lengkap Siswa</th>
                  <th className="border border-slate-900 py-1.5 px-1.5 w-8">L/P</th>
                  <th className="border border-slate-900 py-1.5 px-1.5 w-12">Kelas</th>
                  <th className="border border-slate-900 py-1.5 px-1.5 w-12">Ruang</th>
                  
                  {/* Benar & Salah PG */}
                  <th className="border border-slate-900 py-1.5 px-1.5 w-16">
                    Benar PG <span className="block text-[9px] font-normal">({totalPg})</span>
                  </th>
                  <th className="border border-slate-900 py-1.5 px-1.5 w-14">
                    Salah PG
                  </th>
                  <th className="border border-slate-900 py-1.5 px-1.5 w-16">
                    Skor Esai <span className="block text-[9px] font-normal">({maxEssay})</span>
                  </th>
                  
                  {/* Final Score */}
                  <th className="border border-slate-900 py-1.5 px-2 w-16 font-bold bg-slate-200">
                    Nilai Akhir
                  </th>
                  <th className="border border-slate-900 py-1.5 px-1.5 w-14">Remedial</th>
                  <th className="border border-slate-900 py-1.5 px-1.5 w-10">Pred</th>
                  <th className="border border-slate-900 py-1.5 px-2 w-20">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => {
                  const grade = currentSubjectGradeMap.get(student.id);
                  const hasFinal = grade && typeof grade.scoreFinal === 'number';
                  const isPassed = hasFinal ? grade.passed : false;
                  const predicate = hasFinal ? getGradePredicate(grade.scoreFinal, currentGradingConfig.kkm).predicate : '';

                  const correctPg = grade?.correctPg ?? '';
                  const wrongPg = grade?.wrongPg ?? (typeof grade?.correctPg === 'number' ? Math.max(0, totalPg - grade.correctPg) : '');
                  const correctEssay = grade?.correctEssay ?? '';

                  return (
                    <tr key={student.id} className="text-slate-900">
                      <td className="border border-slate-900 py-1 px-1.5 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-900 py-1 px-2 font-mono text-[10px]">{student.examNumber || '-'}</td>
                      <td className="border border-slate-900 py-1 px-2 font-mono text-[10px]">{student.nisn || '-'}</td>
                      <td className="border border-slate-900 py-1 px-2 font-semibold truncate max-w-[190px]">{student.name}</td>
                      <td className="border border-slate-900 py-1 px-1.5 text-center">{student.gender}</td>
                      <td className="border border-slate-900 py-1 px-1.5 text-center">{student.className}</td>
                      <td className="border border-slate-900 py-1 px-1.5 text-center text-[10px]">{student.roomName ? student.roomName.replace('Ruang ', 'R.') : '-'}</td>
                      
                      {/* Benar PG */}
                      <td className="border border-slate-900 py-1 px-1.5 text-center font-mono font-bold">
                        {printDocType === 'blank' ? '' : correctPg !== '' ? correctPg : '-'}
                      </td>

                      {/* Salah PG */}
                      <td className="border border-slate-900 py-1 px-1.5 text-center font-mono">
                        {printDocType === 'blank' ? '' : wrongPg !== '' ? wrongPg : '-'}
                      </td>

                      {/* Skor Esai */}
                      <td className="border border-slate-900 py-1 px-1.5 text-center font-mono">
                        {printDocType === 'blank' ? '' : totalEssay > 0 ? (correctEssay !== '' ? correctEssay : '-') : '-'}
                      </td>

                      {/* Nilai Akhir (100 jika benar semua) */}
                      <td className="border border-slate-900 py-1 px-2 text-center font-bold font-mono bg-slate-50">
                        {printDocType === 'blank' ? '' : hasFinal ? grade.scoreFinal : '-'}
                      </td>

                      {/* Remedial */}
                      <td className="border border-slate-900 py-1 px-1.5 text-center font-mono">
                        {printDocType === 'blank' ? '' : grade?.remedialScore ?? '-'}
                      </td>

                      {/* Predikat */}
                      <td className="border border-slate-900 py-1 px-1.5 text-center font-bold">
                        {printDocType === 'blank' ? '' : predicate}
                      </td>

                      {/* Keterangan */}
                      <td className="border border-slate-900 py-1 px-2 text-center text-[10px] font-bold">
                        {printDocType === 'blank' ? (
                          ''
                        ) : hasFinal ? (
                          isPassed ? (
                            'TUNTAS'
                          ) : (
                            'REMEDIAL'
                          )
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Official Summary Statistics Box */}
            <div className="mt-4 border border-slate-900 p-2.5 text-[11px] grid grid-cols-4 gap-2 bg-slate-50">
              <div>
                <span className="font-semibold block text-slate-600">Total Peserta:</span>
                <span className="font-bold text-slate-900">{filteredStudents.length} Siswa</span>
              </div>
              <div>
                <span className="font-semibold block text-slate-600">Peserta Tuntas (KKM {currentGradingConfig.kkm}):</span>
                <span className="font-bold text-emerald-800">
                  {printDocType === 'blank' ? '-' : `${stats.passedCount} Siswa (${stats.passPercentage}%)`}
                </span>
              </div>
              <div>
                <span className="font-semibold block text-slate-600">Nilai Rata-Rata:</span>
                <span className="font-bold text-slate-900">
                  {printDocType === 'blank' ? '-' : stats.avgScore}
                </span>
              </div>
              <div>
                <span className="font-semibold block text-slate-600">Tertinggi / Terendah:</span>
                <span className="font-bold text-slate-900">
                  {printDocType === 'blank' ? '-' : `${stats.highestScore} / ${stats.lowestScore === 101 ? '-' : stats.lowestScore}`}
                </span>
              </div>
            </div>

            {/* Dual Official Signatures Block with Stamp */}
            <div className="mt-8 pt-4 grid grid-cols-2 text-center text-xs break-inside-avoid">
              <div>
                <p className="text-slate-600">Mengetahui,</p>
                <p className="font-bold text-slate-900 uppercase">
                  Kepala {config.schoolName}
                </p>

                {/* Stamp & Principal Signature */}
                <div className="h-20 flex items-center justify-center relative my-1">
                  {config.stampEnabled && config.stampUrl && (
                    <img
                      src={config.stampUrl}
                      alt="Stempel Sekolah"
                      className="absolute opacity-80 pointer-events-none max-h-16"
                      style={{
                        transform: `rotate(${config.stampRotation ?? -7}deg) scale(${
                          (config.stampSize ?? 100) / 100
                        })`,
                      }}
                    />
                  )}
                  {config.signatureEnabled && config.signatureUrl && (
                    <img
                      src={config.signatureUrl}
                      alt="Tanda Tangan Kepala"
                      className="max-h-14 relative z-10"
                    />
                  )}
                </div>

                <p className="font-bold text-slate-900 underline underline-offset-2">
                  {config.principalName || 'Kepala Sekolah'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  NIP. {config.principalNip || '-'}
                </p>
              </div>

              <div>
                <p className="text-slate-600">
                  {config.issuePlace || 'Bogor'}, {config.issueDate || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="font-bold text-slate-900">
                  Guru Mata Pelajaran / Korektor,
                </p>

                <div className="h-20 flex items-center justify-center">
                  {/* Space for manual or digital signature */}
                </div>

                <p className="font-bold text-slate-900 underline underline-offset-2">
                  {currentGradingConfig.teacherName || 'Guru Mata Pelajaran'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  NIP. {currentGradingConfig.teacherNip || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 3: LEGER NILAI KOLEKTIF (ALL SUBJECTS MATRIX) */}
      {activeSubTab === 'leger' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Pilih Rombongan Belajar:</span>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setFilterMode('class');
                  setSelectedClass(e.target.value);
                }}
                className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="all">Semua Rombongan Belajar</option>
                {availableClasses.map((c) => (
                  <option key={c} value={c}>
                    Kelas {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Leger Nilai</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 uppercase">
                Leger Rekapitulasi Nilai Ujian Siswa ({targetFilterDisplay})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Matriks perolehan nilai seluruh mata pelajaran, akumulasi jumlah nilai dan rata-rata per siswa.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-2 text-center border-r border-slate-200 w-10">No</th>
                    <th className="py-2.5 px-2.5 border-r border-slate-200 w-28">No. Peserta</th>
                    <th className="py-2.5 px-2.5 border-r border-slate-200 min-w-[160px]">Nama Lengkap</th>
                    <th className="py-2.5 px-2 text-center border-r border-slate-200 w-12">Kelas</th>
                    
                    {/* Columns for primary subjects */}
                    {availableSubjects.slice(0, 8).map((sub) => (
                      <th key={sub} className="py-2 px-2 text-center border-r border-slate-200 min-w-[70px]">
                        <span className="truncate block" title={sub}>
                          {sub.length > 10 ? sub.slice(0, 10) + '..' : sub}
                        </span>
                      </th>
                    ))}

                    <th className="py-2.5 px-2.5 text-center border-r border-slate-200 w-16 bg-indigo-50 font-bold">
                      Total
                    </th>
                    <th className="py-2.5 px-2.5 text-center w-16 bg-indigo-100 font-bold">
                      Rata2
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.map((student, idx) => {
                    let total = 0;
                    let count = 0;

                    const studentSubjectScores = availableSubjects.slice(0, 8).map((sub) => {
                      const g = grades.find((gr) => gr.studentId === student.id && gr.subject === sub);
                      if (g && typeof g.scoreFinal === 'number') {
                        total += g.scoreFinal;
                        count++;
                        return g.scoreFinal;
                      }
                      return null;
                    });

                    const average = count > 0 ? (total / count).toFixed(1) : '-';

                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-2 text-center text-slate-400 font-mono border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-[11px] font-bold text-slate-800 border-r border-slate-200">
                          {student.examNumber || '-'}
                        </td>
                        <td className="py-2 px-2.5 font-semibold text-slate-900 border-r border-slate-200 truncate max-w-[200px]">
                          {student.name}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-slate-600 border-r border-slate-200 text-[11px]">
                          {student.className}
                        </td>

                        {studentSubjectScores.map((score, sIdx) => (
                          <td
                            key={sIdx}
                            className={`py-2 px-2 text-center font-mono border-r border-slate-200 text-xs ${
                              score !== null
                                ? score >= (currentGradingConfig.kkm || DEFAULT_KKM)
                                  ? 'text-slate-900 font-semibold'
                                  : 'text-rose-600 font-bold bg-rose-50/40'
                                : 'text-slate-300'
                            }`}
                          >
                            {score ?? '-'}
                          </td>
                        ))}

                        <td className="py-2 px-2.5 text-center font-mono font-bold text-indigo-700 bg-indigo-50/40 border-r border-slate-200">
                          {total || '-'}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-indigo-900 bg-indigo-100/40">
                          {average}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 4: DAFTAR & MANAJEMEN MATA PELAJARAN (ROLE ADMIN) */}
      {activeSubTab === 'subjects' && (
        <AdminSubjectsManager
          subjects={availableSubjects}
          gradingConfigs={gradingConfigs}
          grades={grades}
          totalStudents={students.length}
          onAddSubject={handleAddSubject}
          onEditSubject={handleEditSubject}
          onDeleteSubject={handleDeleteSubject}
          onResetToDefaultSubjects={handleResetToDefaultSubjects}
          onSelectSubjectToGrade={(sub) => {
            setSelectedSubject(sub);
            setActiveSubTab('input');
            showToast(`Mata pelajaran "${sub}" dipilih. Silakan masukkan nilai siswa.`);
          }}
          showToast={showToast}
        />
      )}

      {/* 6. MODAL: IMPORT EXCEL / CSV NILAI */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Import Nilai dari File Excel
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div className="p-3 bg-indigo-50 rounded-lg text-xs text-indigo-900 leading-relaxed">
                <strong>Petunjuk:</strong> Unggah file spreadsheet (<strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>). Sistem akan otomatis membaca kolom <strong>Benar PG</strong>, <strong>Salah PG</strong>, atau <strong>Skor Esai</strong> berdasarkan NISN, No. Peserta, atau Nama Siswa untuk mapel <strong>{selectedSubject}</strong>.
              </div>

              {/* Upload Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-indigo-50/30 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setImportFile(file);
                  }}
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  {importFile ? importFile.name : 'Klik untuk memilih file Excel (.xlsx / .csv)'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Format disarankan menggunakan template resmi aplikasi ini.
                </p>
              </div>

              {/* Download Template helper */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Belum punya formatnya?</span>
                <button
                  type="button"
                  onClick={handleExportTemplate}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Template Excel Kosong
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!importFile || isImporting}
                onClick={handleExecuteImport}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isImporting ? 'Memproses...' : 'Proses & Impor Nilai'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog Pilihan Mata Pelajaran (Muncul setelah Login Guru atau saat diklik) */}
      <SubjectPickerModal
        isOpen={showSubjectPickerModal}
        onClose={() => {
          setShowSubjectPickerModal(false);
          if (onCloseSubjectPicker) onCloseSubjectPicker();
        }}
        subjects={availableSubjects}
        selectedSubject={selectedSubject}
        onSelectSubject={(sub) => {
          setSelectedSubject(sub);
          setActiveSubTab('input');
          showToast(`Mata pelajaran "${sub}" dipilih. Silakan masukkan nilai Benar & Salah siswa.`);
        }}
        gradingConfigs={gradingConfigs}
        grades={grades}
        totalStudents={students.length}
        examTitle={config.examTitle}
        schoolName={config.schoolName}
        teacherName={authUser?.name}
      />
    </div>
  );
};
