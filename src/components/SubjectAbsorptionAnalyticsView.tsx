import React, { useState, useMemo } from 'react';
import {
  ExamConfig,
  ExamGradeItem,
  Student,
  SubjectGradingConfig
} from '../types';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  CheckCircle2,
  Printer,
  FileSpreadsheet,
  Sparkles,
  Target,
  Users,
  Filter,
  Layers,
  GraduationCap,
  ArrowUpDown,
  Search,
  BookOpen,
  Split,
  TableProperties
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DEFAULT_KKM, getSubjectCategory, getStudentSubjectScore } from '../utils/gradeUtils';

export type GradeLevel = 'all' | '7' | '8' | '9';

export interface SubjectAbsorptionItem {
  subject: string;
  category: string;
  kkm: number;
  totalStudentsInScope: number;
  studentsWithGrades: number;
  avgScore: number;
  minScore: number;
  maxScore: number;
  passedCount: number;
  remedialCount: number;
  passRate: number; // 0 - 100 %
  absorptionRate: number; // 0 - 100 %
  absorptionCategory: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
  kkmComparison: number; // avgScore - kkm
  status: 'Melampaui KKM' | 'Mencapai KKM' | 'Di Bawah KKM';
}

export interface LevelAnalyticsSummary {
  level: '7' | '8' | '9' | 'all';
  label: string;
  romanLabel: string;
  classes: string[];
  totalStudents: number;
  totalGradedStudents: number;
  overallAvg: number;
  overallAbsorption: number;
  overallPassRate: number;
  topSubject: SubjectAbsorptionItem | null;
  lowestSubject: SubjectAbsorptionItem | null;
  needsAttentionCount: number;
  items: SubjectAbsorptionItem[];
}

export interface MultiLevelComparisonRow {
  subject: string;
  category: string;
  kkm: number;
  l7: { avg: number; absorption: number; passRate: number; gradedCount: number; passed: number; remedial: number };
  l8: { avg: number; absorption: number; passRate: number; gradedCount: number; passed: number; remedial: number };
  l9: { avg: number; absorption: number; passRate: number; gradedCount: number; passed: number; remedial: number };
  overall: { avg: number; absorption: number; passRate: number; gradedCount: number; passed: number; remedial: number };
  bestLevel: '7' | '8' | '9' | 'Sama' | '-';
  status: 'Melampaui KKM' | 'Mencapai KKM' | 'Di Bawah KKM';
}

interface SubjectAbsorptionAnalyticsViewProps {
  config: ExamConfig;
  students: Student[];
  grades: ExamGradeItem[];
  subjects: string[];
  gradingConfigs: Record<string, SubjectGradingConfig>;
  availableClasses: string[];
  onSelectSubject?: (subject: string) => void;
}

/**
 * Classify a class name into grade level '7', '8', '9', or 'other'
 */
export const classifyGradeLevel = (cls?: string): '7' | '8' | '9' | 'other' => {
  if (!cls) return 'other';
  const c = cls.trim().toUpperCase();
  if (
    c.startsWith('VIII') ||
    c.startsWith('8') ||
    c.includes('KELAS 8') ||
    c.includes('KELAS VIII') ||
    c.includes('KL 8') ||
    c.includes('KLAS 8') ||
    c.includes('KLS 8')
  ) {
    return '8';
  }
  if (
    c.startsWith('VII') ||
    c.startsWith('7') ||
    c.includes('KELAS 7') ||
    c.includes('KELAS VII') ||
    c.includes('KL 7') ||
    c.includes('KLAS 7') ||
    c.includes('KLS 7')
  ) {
    return '7';
  }
  if (
    c.startsWith('IX') ||
    c.startsWith('9') ||
    c.includes('KELAS 9') ||
    c.includes('KELAS IX') ||
    c.includes('KL 9') ||
    c.includes('KLAS 9') ||
    c.includes('KLS 9')
  ) {
    return '9';
  }
  return 'other';
};

/**
 * Compute analytics items and summaries for a specific student subset
 */
const computeItemsForStudentList = (
  scopeStudents: Student[],
  grades: ExamGradeItem[],
  subjects: string[],
  gradingConfigs: Record<string, SubjectGradingConfig>
): {
  items: SubjectAbsorptionItem[];
  overallAvg: number;
  overallAbsorption: number;
  overallPassRate: number;
  totalEvaluatedGrades: number;
  topSubject: SubjectAbsorptionItem | null;
  lowestSubject: SubjectAbsorptionItem | null;
  needsAttentionCount: number;
} => {
  const scopeStudentIds = new Set(scopeStudents.map((s) => s.id));

  const items: SubjectAbsorptionItem[] = subjects.map((sub) => {
    const kkm = gradingConfigs[sub]?.kkm || DEFAULT_KKM;
    const category = getSubjectCategory(sub);

    const scores = scopeStudents
      .map((student) => getStudentSubjectScore(student, sub, grades))
      .filter((s): s is number => typeof s === 'number' && !isNaN(s));

    const studentsWithGrades = scores.length;

    if (studentsWithGrades === 0) {
      return {
        subject: sub,
        category,
        kkm,
        totalStudentsInScope: scopeStudents.length,
        studentsWithGrades: 0,
        avgScore: 0,
        minScore: 0,
        maxScore: 0,
        passedCount: 0,
        remedialCount: 0,
        passRate: 0,
        absorptionRate: 0,
        absorptionCategory: 'Kurang',
        kkmComparison: -kkm,
        status: 'Di Bawah KKM'
      };
    }

    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    const avgScore = Math.round((sum / studentsWithGrades) * 10) / 10;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const passedCount = scores.filter((s) => s >= kkm).length;
    const remedialCount = studentsWithGrades - passedCount;
    const passRate = Math.round((passedCount / studentsWithGrades) * 1000) / 10;
    const absorptionRate = Math.min(100, Math.round((avgScore / 100) * 1000) / 10);

    let absorptionCategory: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
    if (absorptionRate >= 85) absorptionCategory = 'Sangat Baik';
    else if (absorptionRate >= 75) absorptionCategory = 'Baik';
    else if (absorptionRate >= 65) absorptionCategory = 'Cukup';
    else absorptionCategory = 'Kurang';

    let status: 'Melampaui KKM' | 'Mencapai KKM' | 'Di Bawah KKM';
    if (avgScore >= kkm + 2) status = 'Melampaui KKM';
    else if (avgScore >= kkm) status = 'Mencapai KKM';
    else status = 'Di Bawah KKM';

    return {
      subject: sub,
      category,
      kkm,
      totalStudentsInScope: scopeStudents.length,
      studentsWithGrades,
      avgScore,
      minScore,
      maxScore,
      passedCount,
      remedialCount,
      passRate,
      absorptionRate,
      absorptionCategory,
      kkmComparison: Math.round((avgScore - kkm) * 10) / 10,
      status
    };
  });

  const activeItems = items.filter((item) => item.studentsWithGrades > 0);
  if (activeItems.length === 0) {
    return {
      items,
      overallAvg: 0,
      overallAbsorption: 0,
      overallPassRate: 0,
      totalEvaluatedGrades: 0,
      topSubject: null,
      lowestSubject: null,
      needsAttentionCount: 0
    };
  }

  const sumAvg = activeItems.reduce((acc, curr) => acc + curr.avgScore, 0);
  const overallAvg = Math.round((sumAvg / activeItems.length) * 10) / 10;
  const overallAbsorption = Math.min(100, Math.round((overallAvg / 100) * 1000) / 10);

  const totalStudentsPassed = activeItems.reduce((acc, curr) => acc + curr.passedCount, 0);
  const totalStudentsEvaluated = activeItems.reduce((acc, curr) => acc + curr.studentsWithGrades, 0);
  const overallPassRate =
    totalStudentsEvaluated > 0
      ? Math.round((totalStudentsPassed / totalStudentsEvaluated) * 1000) / 10
      : 0;

  const sortedByAvg = [...activeItems].sort((a, b) => b.avgScore - a.avgScore);
  const topSubject = sortedByAvg[0] || null;
  const lowestSubject = sortedByAvg[sortedByAvg.length - 1] || null;

  const needsAttentionCount = activeItems.filter(
    (item) => item.avgScore < item.kkm || item.passRate < 75
  ).length;

  return {
    items,
    overallAvg,
    overallAbsorption,
    overallPassRate,
    totalEvaluatedGrades: totalStudentsEvaluated,
    topSubject,
    lowestSubject,
    needsAttentionCount
  };
};

export const SubjectAbsorptionAnalyticsView: React.FC<SubjectAbsorptionAnalyticsViewProps> = ({
  config,
  students,
  grades,
  subjects,
  gradingConfigs,
  availableClasses,
  onSelectSubject
}) => {
  // Navigation & Filter State
  const [selectedLevel, setSelectedLevel] = useState<GradeLevel>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [chartMetric, setChartMetric] = useState<'avgScore' | 'absorptionRate' | 'passRate'>('avgScore');
  const [diagramViewMode, setDiagramViewMode] = useState<'standard' | 'multiLevelCompare'>('standard');
  const [tableViewMode, setTableViewMode] = useState<'standard' | 'levelMatrix'>('standard');
  const [sortBy, setSortBy] = useState<'name' | 'highest' | 'lowest' | 'absorption' | 'passRate'>('highest');
  const [activeViewMode, setActiveViewMode] = useState<'dashboard' | 'table' | 'printPreview'>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredSubject, setHoveredSubject] = useState<SubjectAbsorptionItem | null>(null);

  // Group students per grade level
  const students7 = useMemo(() => students.filter((s) => classifyGradeLevel(s.className) === '7'), [students]);
  const students8 = useMemo(() => students.filter((s) => classifyGradeLevel(s.className) === '8'), [students]);
  const students9 = useMemo(() => students.filter((s) => classifyGradeLevel(s.className) === '9'), [students]);

  // Classes list per grade level
  const classes7 = useMemo(() => {
    return Array.from(new Set(students7.map((s) => s.className).filter(Boolean))).sort();
  }, [students7]);

  const classes8 = useMemo(() => {
    return Array.from(new Set(students8.map((s) => s.className).filter(Boolean))).sort();
  }, [students8]);

  const classes9 = useMemo(() => {
    return Array.from(new Set(students9.map((s) => s.className).filter(Boolean))).sort();
  }, [students9]);

  // Classes options based on selected level
  const filteredAvailableClasses = useMemo(() => {
    if (selectedLevel === '7') return classes7;
    if (selectedLevel === '8') return classes8;
    if (selectedLevel === '9') return classes9;
    return availableClasses;
  }, [selectedLevel, classes7, classes8, classes9, availableClasses]);

  // When selectedLevel changes, ensure selectedClass is valid or reset to 'all'
  const handleLevelChange = (newLevel: GradeLevel) => {
    setSelectedLevel(newLevel);
    setSelectedClass('all');
  };

  // Compute scope students based on level and class filter
  const scopeStudents = useMemo(() => {
    let pool = students;
    if (selectedLevel === '7') pool = students7;
    else if (selectedLevel === '8') pool = students8;
    else if (selectedLevel === '9') pool = students9;

    if (selectedClass !== 'all') {
      return pool.filter((s) => s.className === selectedClass);
    }
    return pool;
  }, [students, students7, students8, students9, selectedLevel, selectedClass]);

  // Calculations for current selected scope
  const currentScopeResult = useMemo(() => {
    return computeItemsForStudentList(scopeStudents, grades, subjects, gradingConfigs);
  }, [scopeStudents, grades, subjects, gradingConfigs]);

  const subjectAnalytics = currentScopeResult.items;
  const overallMetrics = currentScopeResult;

  // Separate calculations specifically for Level 7, Level 8, and Level 9
  const summaryL7: LevelAnalyticsSummary = useMemo(() => {
    const res = computeItemsForStudentList(students7, grades, subjects, gradingConfigs);
    return {
      level: '7',
      label: 'Kelas 7',
      romanLabel: 'Tingkat VII',
      classes: classes7,
      totalStudents: students7.length,
      totalGradedStudents: res.totalEvaluatedGrades,
      overallAvg: res.overallAvg,
      overallAbsorption: res.overallAbsorption,
      overallPassRate: res.overallPassRate,
      topSubject: res.topSubject,
      lowestSubject: res.lowestSubject,
      needsAttentionCount: res.needsAttentionCount,
      items: res.items
    };
  }, [students7, classes7, grades, subjects, gradingConfigs]);

  const summaryL8: LevelAnalyticsSummary = useMemo(() => {
    const res = computeItemsForStudentList(students8, grades, subjects, gradingConfigs);
    return {
      level: '8',
      label: 'Kelas 8',
      romanLabel: 'Tingkat VIII',
      classes: classes8,
      totalStudents: students8.length,
      totalGradedStudents: res.totalEvaluatedGrades,
      overallAvg: res.overallAvg,
      overallAbsorption: res.overallAbsorption,
      overallPassRate: res.overallPassRate,
      topSubject: res.topSubject,
      lowestSubject: res.lowestSubject,
      needsAttentionCount: res.needsAttentionCount,
      items: res.items
    };
  }, [students8, classes8, grades, subjects, gradingConfigs]);

  const summaryL9: LevelAnalyticsSummary = useMemo(() => {
    const res = computeItemsForStudentList(students9, grades, subjects, gradingConfigs);
    return {
      level: '9',
      label: 'Kelas 9',
      romanLabel: 'Tingkat IX',
      classes: classes9,
      totalStudents: students9.length,
      totalGradedStudents: res.totalEvaluatedGrades,
      overallAvg: res.overallAvg,
      overallAbsorption: res.overallAbsorption,
      overallPassRate: res.overallPassRate,
      topSubject: res.topSubject,
      lowestSubject: res.lowestSubject,
      needsAttentionCount: res.needsAttentionCount,
      items: res.items
    };
  }, [students9, classes9, grades, subjects, gradingConfigs]);

  // Multi-level comparison matrix across Grade 7, Grade 8, and Grade 9
  const multiLevelMatrix: MultiLevelComparisonRow[] = useMemo(() => {
    const map7 = new Map(summaryL7.items.map((i) => [i.subject, i]));
    const map8 = new Map(summaryL8.items.map((i) => [i.subject, i]));
    const map9 = new Map(summaryL9.items.map((i) => [i.subject, i]));
    const allRes = computeItemsForStudentList(students, grades, subjects, gradingConfigs);
    const mapAll = new Map(allRes.items.map((i) => [i.subject, i]));

    return subjects.map((sub) => {
      const kkm = gradingConfigs[sub]?.kkm || DEFAULT_KKM;
      const category = getSubjectCategory(sub);
      const i7 = map7.get(sub);
      const i8 = map8.get(sub);
      const i9 = map9.get(sub);
      const iAll = mapAll.get(sub);

      const a7 = i7?.avgScore || 0;
      const a8 = i8?.avgScore || 0;
      const a9 = i9?.avgScore || 0;

      let bestLevel: '7' | '8' | '9' | 'Sama' | '-' = '-';
      if (a7 > 0 || a8 > 0 || a9 > 0) {
        if (a7 > a8 && a7 > a9) bestLevel = '7';
        else if (a8 > a7 && a8 > a9) bestLevel = '8';
        else if (a9 > a7 && a9 > a8) bestLevel = '9';
        else bestLevel = 'Sama';
      }

      const overallAvg = iAll?.avgScore || 0;
      let status: 'Melampaui KKM' | 'Mencapai KKM' | 'Di Bawah KKM';
      if (overallAvg >= kkm + 2) status = 'Melampaui KKM';
      else if (overallAvg >= kkm) status = 'Mencapai KKM';
      else status = 'Di Bawah KKM';

      return {
        subject: sub,
        category,
        kkm,
        l7: {
          avg: a7,
          absorption: i7?.absorptionRate || 0,
          passRate: i7?.passRate || 0,
          gradedCount: i7?.studentsWithGrades || 0,
          passed: i7?.passedCount || 0,
          remedial: i7?.remedialCount || 0
        },
        l8: {
          avg: a8,
          absorption: i8?.absorptionRate || 0,
          passRate: i8?.passRate || 0,
          gradedCount: i8?.studentsWithGrades || 0,
          passed: i8?.passedCount || 0,
          remedial: i8?.remedialCount || 0
        },
        l9: {
          avg: a9,
          absorption: i9?.absorptionRate || 0,
          passRate: i9?.passRate || 0,
          gradedCount: i9?.studentsWithGrades || 0,
          passed: i9?.passedCount || 0,
          remedial: i9?.remedialCount || 0
        },
        overall: {
          avg: overallAvg,
          absorption: iAll?.absorptionRate || 0,
          passRate: iAll?.passRate || 0,
          gradedCount: iAll?.studentsWithGrades || 0,
          passed: iAll?.passedCount || 0,
          remedial: iAll?.remedialCount || 0
        },
        bestLevel,
        status
      };
    });
  }, [subjects, summaryL7, summaryL8, summaryL9, students, grades, gradingConfigs]);

  // Distinct categories available
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    subjectAnalytics.forEach((item) => set.add(item.category));
    return Array.from(set);
  }, [subjectAnalytics]);

  // Filtered and sorted analytics for single-level view
  const filteredAnalytics = useMemo(() => {
    let result = subjectAnalytics.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSearch =
        !searchQuery ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return a.subject.localeCompare(b.subject);
      if (sortBy === 'highest') return b.avgScore - a.avgScore;
      if (sortBy === 'lowest') return a.avgScore - b.avgScore;
      if (sortBy === 'absorption') return b.absorptionRate - a.absorptionRate;
      if (sortBy === 'passRate') return b.passRate - a.passRate;
      return 0;
    });

    return result;
  }, [subjectAnalytics, selectedCategory, searchQuery, sortBy]);

  // Filtered multi-level matrix for comparison view
  const filteredMultiLevelMatrix = useMemo(() => {
    let result = multiLevelMatrix.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSearch =
        !searchQuery ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return a.subject.localeCompare(b.subject);
      if (sortBy === 'highest') return b.overall.avg - a.overall.avg;
      if (sortBy === 'lowest') return a.overall.avg - b.overall.avg;
      if (sortBy === 'absorption') return b.overall.absorption - a.overall.absorption;
      if (sortBy === 'passRate') return b.overall.passRate - a.overall.passRate;
      return 0;
    });

    return result;
  }, [multiLevelMatrix, selectedCategory, searchQuery, sortBy]);

  // Category breakdown metrics
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { items: SubjectAbsorptionItem[]; avgSum: number; count: number }>();
    subjectAnalytics.forEach((item) => {
      if (item.studentsWithGrades === 0) return;
      if (!map.has(item.category)) {
        map.set(item.category, { items: [], avgSum: 0, count: 0 });
      }
      const entry = map.get(item.category)!;
      entry.items.push(item);
      entry.avgSum += item.avgScore;
      entry.count++;
    });

    return Array.from(map.entries())
      .map(([cat, data]) => {
        const avg = data.count > 0 ? Math.round((data.avgSum / data.count) * 10) / 10 : 0;
        const absorption = Math.round((avg / 100) * 1000) / 10;
        return {
          category: cat,
          count: data.count,
          avg,
          absorption,
          items: data.items
        };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [subjectAnalytics]);

  // Display label for current target filter
  const targetFilterDisplay = useMemo(() => {
    const levelName =
      selectedLevel === '7'
        ? 'Tingkat Kelas 7 (VII)'
        : selectedLevel === '8'
        ? 'Tingkat Kelas 8 (VIII)'
        : selectedLevel === '9'
        ? 'Tingkat Kelas 9 (IX)'
        : 'Semua Tingkat (Kelas 7, 8, 9)';

    if (selectedClass === 'all') {
      return levelName;
    }
    return `${levelName} • Rombel Kelas ${selectedClass}`;
  }, [selectedLevel, selectedClass]);

  // Export to multi-sheet Excel function
  const handleExportExcel = () => {
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const workbook = XLSX.utils.book_new();

    // 1. Sheet Komparasi Tingkat 7, 8, 9
    const compRows: any[] = [
      [config.schoolName || 'MADRASAH TSANAWIYAH'],
      ['KOMPARASI RATA-RATA NILAI & DAYA SERAP ANTAR TINGKAT (KELAS 7, 8, 9)'],
      [
        `Kegiatan: ${config.examTitle || 'Sumatif Tengah Semester (STS)'} • Tahun Pelajaran ${
          config.academicYear || '2024/2025'
        } (${config.semester || 'Ganjil'}) • Tanggal: ${dateStr}`
      ],
      [],
      [
        'No',
        'Mata Pelajaran',
        'Bidang Studi',
        'KKM',
        'Rata-rata Kls 7',
        '% Serap Kls 7',
        '% Tuntas Kls 7',
        'Rata-rata Kls 8',
        '% Serap Kls 8',
        '% Tuntas Kls 8',
        'Rata-rata Kls 9',
        '% Serap Kls 9',
        '% Tuntas Kls 9',
        'Rata-rata Gabungan',
        '% Serap Gabungan',
        'Tingkat Tertinggi'
      ]
    ];

    multiLevelMatrix.forEach((r, idx) => {
      compRows.push([
        idx + 1,
        r.subject,
        r.category,
        r.kkm,
        r.l7.avg || 0,
        `${r.l7.absorption}%`,
        `${r.l7.passRate}%`,
        r.l8.avg || 0,
        `${r.l8.absorption}%`,
        `${r.l8.passRate}%`,
        r.l9.avg || 0,
        `${r.l9.absorption}%`,
        `${r.l9.passRate}%`,
        r.overall.avg,
        `${r.overall.absorption}%`,
        r.bestLevel === '7' ? 'Kelas 7' : r.bestLevel === '8' ? 'Kelas 8' : r.bestLevel === '9' ? 'Kelas 9' : r.bestLevel
      ]);
    });

    const compSheet = XLSX.utils.aoa_to_sheet(compRows);
    XLSX.utils.book_append_sheet(workbook, compSheet, 'Komparasi Tingkat 7-8-9');

    // Helper to generate a detailed sheet for a specific level
    const appendLevelSheet = (sheetName: string, titleLevel: string, summary: LevelAnalyticsSummary) => {
      const rows: any[] = [
        [config.schoolName || 'MADRASAH TSANAWIYAH'],
        [`REKAPITULASI NILAI & DAYA SERAP - ${titleLevel}`],
        [
          `Rombel: ${summary.classes.join(', ') || '-'} • Total Siswa: ${summary.totalStudents} • Tanggal: ${dateStr}`
        ],
        [],
        [
          'No',
          'Mata Pelajaran',
          'Bidang Studi',
          'KKM',
          'Peserta',
          'Rata-rata Nilai',
          'Min',
          'Max',
          'Siswa Tuntas',
          'Siswa Remedial',
          '% Ketuntasan Klasikal',
          '% Daya Serap Kurikulum',
          'Kategori Serapan',
          'Status KKM'
        ]
      ];

      summary.items.forEach((item, idx) => {
        rows.push([
          idx + 1,
          item.subject,
          item.category,
          item.kkm,
          item.studentsWithGrades,
          item.avgScore,
          item.minScore,
          item.maxScore,
          item.passedCount,
          item.remedialCount,
          `${item.passRate}%`,
          `${item.absorptionRate}%`,
          item.absorptionCategory,
          item.status
        ]);
      });

      // Footer
      rows.push([]);
      rows.push([
        '',
        'RATA-RATA TINGKAT',
        '',
        DEFAULT_KKM,
        summary.totalGradedStudents,
        summary.overallAvg,
        '',
        '',
        '',
        '',
        `${summary.overallPassRate}%`,
        `${summary.overallAbsorption}%`,
        summary.overallAbsorption >= 85 ? 'Sangat Baik' : summary.overallAbsorption >= 75 ? 'Baik' : 'Cukup',
        summary.overallAvg >= DEFAULT_KKM ? 'Tuntas' : 'Perlu Remedial'
      ]);

      const sheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    };

    appendLevelSheet('Rincian Kelas 7', 'TINGKAT KELAS 7 (VII)', summaryL7);
    appendLevelSheet('Rincian Kelas 8', 'TINGKAT KELAS 8 (VIII)', summaryL8);
    appendLevelSheet('Rincian Kelas 9', 'TINGKAT KELAS 9 (IX)', summaryL9);

    const cleanFileName = `Rekap_Daya_Serap_Tingkat_7_8_9_${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, cleanFileName);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & TINGKAT QUICK FILTER TABS (No Print) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  Rekapitulasi Rata-rata Nilai &amp; Daya Serap Mapel
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {targetFilterDisplay}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Analisis mendalam ketercapaian kompetensi dan persentase serapan materi kurikulum dirinci per tingkat (Kelas 7, 8, dan 9).
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Unduh laporan daya serap lengkap per tingkat ke Microsoft Excel (Multi-Sheet)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Excel (Per Tingkat)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Cetak lembar laporan daya serap resmi A4 (Format Standar Kemenag/Kemdikbud)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan Resmi A4</span>
            </button>
          </div>
        </div>

        {/* 1.1 TINGKAT FILTER BAR (KELAS 7, KELAS 8, KELAS 9, SEMUA TINGKAT) */}
        <div className="pt-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              Pilih Rincian Tingkat Jenjang:
            </span>
            <span className="text-slate-400 font-normal">
              Klik tingkat untuk melihat analisis spesifik atau komparasi
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Tab: Semua Tingkat */}
            <button
              type="button"
              onClick={() => handleLevelChange('all')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedLevel === 'all'
                  ? 'bg-indigo-50/80 border-indigo-400 shadow-xs ring-1 ring-indigo-400'
                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Split className="w-3.5 h-3.5 text-indigo-600" />
                  Semua Tingkat
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-white border border-slate-200 text-slate-600">
                  Agregat
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between text-[11px]">
                <span className="text-slate-500">{students.length} Siswa</span>
                <span className="font-extrabold text-indigo-900">
                  {overallMetrics.overallAvg > 0 ? `${overallMetrics.overallAvg} (${overallMetrics.overallAbsorption}%)` : '-'}
                </span>
              </div>
            </button>

            {/* Tab: Kelas 7 */}
            <button
              type="button"
              onClick={() => handleLevelChange('7')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedLevel === '7'
                  ? 'bg-blue-50/80 border-blue-400 shadow-xs ring-1 ring-blue-400'
                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  Kelas 7 (VII)
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-blue-100/70 text-blue-800">
                  {classes7.length} Rombel
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between text-[11px]">
                <span className="text-slate-500">{students7.length} Siswa</span>
                <span className="font-extrabold text-blue-900">
                  {summaryL7.overallAvg > 0 ? `${summaryL7.overallAvg} (${summaryL7.overallAbsorption}%)` : 'Belum Ada'}
                </span>
              </div>
            </button>

            {/* Tab: Kelas 8 */}
            <button
              type="button"
              onClick={() => handleLevelChange('8')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedLevel === '8'
                  ? 'bg-emerald-50/80 border-emerald-400 shadow-xs ring-1 ring-emerald-400'
                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Kelas 8 (VIII)
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-emerald-100/70 text-emerald-800">
                  {classes8.length} Rombel
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between text-[11px]">
                <span className="text-slate-500">{students8.length} Siswa</span>
                <span className="font-extrabold text-emerald-900">
                  {summaryL8.overallAvg > 0 ? `${summaryL8.overallAvg} (${summaryL8.overallAbsorption}%)` : 'Belum Ada'}
                </span>
              </div>
            </button>

            {/* Tab: Kelas 9 */}
            <button
              type="button"
              onClick={() => handleLevelChange('9')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedLevel === '9'
                  ? 'bg-purple-50/80 border-purple-400 shadow-xs ring-1 ring-purple-400'
                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                  Kelas 9 (IX)
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-purple-100/70 text-purple-800">
                  {classes9.length} Rombel
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between text-[11px]">
                <span className="text-slate-500">{students9.length} Siswa</span>
                <span className="font-extrabold text-purple-900">
                  {summaryL9.overallAvg > 0 ? `${summaryL9.overallAvg} (${summaryL9.overallAbsorption}%)` : 'Belum Ada'}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* 1.2 SECONDARY FILTER STRIP (Rombel spesifik, Rumpun Bidang, Urutan & View Mode) */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left filters: Specific Class within level, Subject Category, Sorting */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Rombel:
              </span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-800 font-semibold cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">
                  {selectedLevel === 'all'
                    ? 'Semua Kelas (Agregat)'
                    : `Semua Kelas ${selectedLevel === '7' ? '7 (VII)' : selectedLevel === '8' ? '8 (VIII)' : '9 (IX)'}`}
                </option>
                {filteredAvailableClasses.map((c) => (
                  <option key={c} value={c}>
                    Kelas {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Bidang:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-800 font-medium cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">Semua Bidang Studi</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Urutkan:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-800 font-medium cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="highest">Nilai Rata-rata Tertinggi</option>
                <option value="lowest">Nilai Rata-rata Terendah</option>
                <option value="absorption">Daya Serap Tertinggi</option>
                <option value="passRate">% Ketuntasan Tertinggi</option>
                <option value="name">Nama Mata Pelajaran (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Right toggles: View Mode */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveViewMode('dashboard')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'dashboard'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Diagram &amp; Grafik</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('table')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'table'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tabel Rinci</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('printPreview')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'printPreview'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Format Cetak</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KOMPARASI DAYA SERAP ANTAR TINGKAT (KELAS 7, KELAS 8, KELAS 9) */}
      <div className="space-y-3 no-print">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Split className="w-4 h-4 text-indigo-600" />
            <span>Komparasi Kinerja Daya Serap Antar Tingkat (Kelas 7 vs 8 vs 9)</span>
          </h3>
          <span className="text-[11px] text-slate-500">
            Total {students.length} Siswa Terdaftar di {availableClasses.length} Rombel
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card Tingkat Kelas 7 */}
          <div
            onClick={() => handleLevelChange('7')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              selectedLevel === '7'
                ? 'bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white border-blue-400 shadow-sm ring-2 ring-blue-300'
                : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-blue-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">
                  7
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Tingkat Kelas 7 (VII)</h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {classes7.length} Rombel ({classes7.join(', ') || 'Belum ada kelas'})
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  summaryL7.overallAbsorption >= 85
                    ? 'bg-emerald-100 text-emerald-800'
                    : summaryL7.overallAbsorption >= 75
                    ? 'bg-blue-100 text-blue-800'
                    : summaryL7.overallAbsorption >= 65
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {summaryL7.overallAbsorption >= 85
                  ? 'Sangat Baik'
                  : summaryL7.overallAbsorption >= 75
                  ? 'Baik'
                  : summaryL7.overallAbsorption >= 65
                  ? 'Cukup'
                  : 'Perlu Remedial'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
              <div>
                <span className="text-[10px] font-medium text-slate-500 block">Rata-rata Nilai</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-blue-950">
                    {summaryL7.overallAvg > 0 ? summaryL7.overallAvg : '-'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">/ 100</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-500 block">Daya Serap</span>
                <span className="text-xl font-extrabold text-blue-700">
                  {summaryL7.overallAbsorption}%
                </span>
              </div>
            </div>

            {/* Absorption Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, summaryL7.overallAbsorption)}%` }}
              />
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Ketuntasan Klasikal:</span>
                <strong className="text-emerald-700">{summaryL7.overallPassRate}%</strong>
              </div>
              <div className="flex justify-between truncate" title={summaryL7.topSubject?.subject || '-'}>
                <span>Mapel Unggul:</span>
                <strong className="text-slate-800 truncate">{summaryL7.topSubject?.subject || '-'} ({summaryL7.topSubject?.avgScore ?? 0})</strong>
              </div>
              <div className="flex justify-between truncate" title={summaryL7.lowestSubject?.subject || '-'}>
                <span>Perlu Perhatian:</span>
                <strong className="text-rose-700 truncate">{summaryL7.lowestSubject?.subject || '-'} ({summaryL7.lowestSubject?.avgScore ?? 0})</strong>
              </div>
            </div>
          </div>

          {/* Card Tingkat Kelas 8 */}
          <div
            onClick={() => handleLevelChange('8')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              selectedLevel === '8'
                ? 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-emerald-400 shadow-sm ring-2 ring-emerald-300'
                : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-emerald-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center">
                  8
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Tingkat Kelas 8 (VIII)</h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {classes8.length} Rombel ({classes8.join(', ') || 'Belum ada kelas'})
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  summaryL8.overallAbsorption >= 85
                    ? 'bg-emerald-100 text-emerald-800'
                    : summaryL8.overallAbsorption >= 75
                    ? 'bg-blue-100 text-blue-800'
                    : summaryL8.overallAbsorption >= 65
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {summaryL8.overallAbsorption >= 85
                  ? 'Sangat Baik'
                  : summaryL8.overallAbsorption >= 75
                  ? 'Baik'
                  : summaryL8.overallAbsorption >= 65
                  ? 'Cukup'
                  : 'Perlu Remedial'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
              <div>
                <span className="text-[10px] font-medium text-slate-500 block">Rata-rata Nilai</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-emerald-950">
                    {summaryL8.overallAvg > 0 ? summaryL8.overallAvg : '-'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">/ 100</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-500 block">Daya Serap</span>
                <span className="text-xl font-extrabold text-emerald-700">
                  {summaryL8.overallAbsorption}%
                </span>
              </div>
            </div>

            {/* Absorption Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, summaryL8.overallAbsorption)}%` }}
              />
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Ketuntasan Klasikal:</span>
                <strong className="text-emerald-700">{summaryL8.overallPassRate}%</strong>
              </div>
              <div className="flex justify-between truncate" title={summaryL8.topSubject?.subject || '-'}>
                <span>Mapel Unggul:</span>
                <strong className="text-slate-800 truncate">{summaryL8.topSubject?.subject || '-'} ({summaryL8.topSubject?.avgScore ?? 0})</strong>
              </div>
              <div className="flex justify-between truncate" title={summaryL8.lowestSubject?.subject || '-'}>
                <span>Perlu Perhatian:</span>
                <strong className="text-rose-700 truncate">{summaryL8.lowestSubject?.subject || '-'} ({summaryL8.lowestSubject?.remedialCount ?? 0} rem)</strong>
              </div>
            </div>
          </div>

          {/* Card Tingkat Kelas 9 */}
          <div
            onClick={() => handleLevelChange('9')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              selectedLevel === '9'
                ? 'bg-gradient-to-br from-purple-50 via-fuchsia-50/50 to-white border-purple-400 shadow-sm ring-2 ring-purple-300'
                : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-purple-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center">
                  9
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Tingkat Kelas 9 (IX)</h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {classes9.length} Rombel ({classes9.join(', ') || 'Belum ada kelas'})
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  summaryL9.overallAbsorption >= 85
                    ? 'bg-emerald-100 text-emerald-800'
                    : summaryL9.overallAbsorption >= 75
                    ? 'bg-blue-100 text-blue-800'
                    : summaryL9.overallAbsorption >= 65
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {summaryL9.overallAbsorption >= 85
                  ? 'Sangat Baik'
                  : summaryL9.overallAbsorption >= 75
                  ? 'Baik'
                  : summaryL9.overallAbsorption >= 65
                  ? 'Cukup'
                  : 'Perlu Remedial'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
              <div>
                <span className="text-[10px] font-medium text-slate-500 block">Rata-rata Nilai</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-purple-950">
                    {summaryL9.overallAvg > 0 ? summaryL9.overallAvg : '-'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">/ 100</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-500 block">Daya Serap</span>
                <span className="text-xl font-extrabold text-purple-700">
                  {summaryL9.overallAbsorption}%
                </span>
              </div>
            </div>

            {/* Absorption Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, summaryL9.overallAbsorption)}%` }}
              />
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Ketuntasan Klasikal:</span>
                <strong className="text-emerald-700">{summaryL9.overallPassRate}%</strong>
              </div>
              <div className="flex justify-between truncate" title={summaryL9.topSubject?.subject || '-'}>
                <span>Mapel Unggul:</span>
                <strong className="text-slate-800 truncate">{summaryL9.topSubject?.subject || '-'} ({summaryL9.topSubject?.avgScore ?? 0})</strong>
              </div>
              <div className="flex justify-between truncate" title={summaryL9.lowestSubject?.subject || '-'}>
                <span>Perlu Perhatian:</span>
                <strong className="text-rose-700 truncate">{summaryL9.lowestSubject?.subject || '-'} ({summaryL9.lowestSubject?.remedialCount ?? 0} rem)</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. EXECUTIVE SUMMARY CARDS (STATISTIK KUNCI LINGKUP AKTIF) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 no-print">
        {/* Card 1: Rata-rata Daya Serap */}
        <div className="p-4 bg-gradient-to-br from-indigo-50/70 to-indigo-100/50 border border-indigo-200/80 rounded-2xl relative overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between text-indigo-600 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Daya Serap Lingkup</span>
            <Target className="w-4 h-4 text-indigo-700" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-950">
              {overallMetrics.overallAbsorption}%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            <span
              className={`font-bold px-2 py-0.5 rounded-md ${
                overallMetrics.overallAbsorption >= 85
                  ? 'bg-emerald-100 text-emerald-800'
                  : overallMetrics.overallAbsorption >= 75
                  ? 'bg-blue-100 text-blue-800'
                  : overallMetrics.overallAbsorption >= 65
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {overallMetrics.overallAbsorption >= 85
                ? 'Sangat Baik'
                : overallMetrics.overallAbsorption >= 75
                ? 'Kategori Baik'
                : overallMetrics.overallAbsorption >= 65
                ? 'Kategori Cukup'
                : 'Perlu Remedial'}
            </span>
          </div>
        </div>

        {/* Card 2: Rata-rata Nilai Sekolah / Tingkat */}
        <div className="p-4 bg-gradient-to-br from-emerald-50/70 to-emerald-100/50 border border-emerald-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rata-rata Nilai</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
              {overallMetrics.overallAvg}
            </span>
            <span className="text-xs text-slate-500 font-semibold">/ 100</span>
          </div>
          <p className="mt-2 text-[11px] text-emerald-800 font-medium">
            KKM: <strong>{DEFAULT_KKM}</strong> ({overallMetrics.overallAvg >= DEFAULT_KKM ? `+${(overallMetrics.overallAvg - DEFAULT_KKM).toFixed(1)} poin` : `${(overallMetrics.overallAvg - DEFAULT_KKM).toFixed(1)} poin`})
          </p>
        </div>

        {/* Card 3: Ketuntasan Klasikal */}
        <div className="p-4 bg-gradient-to-br from-blue-50/70 to-blue-100/50 border border-blue-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-blue-700 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ketuntasan Klasikal</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-950">
              {overallMetrics.overallPassRate}%
            </span>
          </div>
          <p className="mt-2 text-[11px] text-blue-800 font-medium truncate" title={`${overallMetrics.totalEvaluatedGrades} nilai siswa dinilai`}>
            {overallMetrics.totalEvaluatedGrades} nilai dinilai
          </p>
        </div>

        {/* Card 4: Mata Pelajaran Tertinggi */}
        <div className="p-4 bg-gradient-to-br from-amber-50/70 to-amber-100/50 border border-amber-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Serapan Tertinggi</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-extrabold text-amber-950 truncate" title={overallMetrics.topSubject?.subject || '-'}>
              {overallMetrics.topSubject?.subject || '-'}
            </p>
            <p className="text-xs font-bold text-amber-800 mt-1">
              Rata-rata: {overallMetrics.topSubject?.avgScore ?? 0} • {overallMetrics.topSubject?.absorptionRate ?? 0}%
            </p>
          </div>
        </div>

        {/* Card 5: Mapel Butuh Perhatian */}
        <div className="p-4 bg-gradient-to-br from-rose-50/70 to-rose-100/50 border border-rose-200/80 rounded-2xl shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-rose-700 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Perlu Perhatian</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-extrabold text-rose-950 truncate" title={overallMetrics.lowestSubject?.subject || '-'}>
              {overallMetrics.lowestSubject?.subject || '-'}
            </p>
            <p className="text-xs font-bold text-rose-800 mt-1">
              Rata-rata: {overallMetrics.lowestSubject?.avgScore ?? 0} ({overallMetrics.lowestSubject?.remedialCount ?? 0} remedial)
            </p>
          </div>
        </div>
      </div>

      {/* 4. DIAGRAM & GRAFIK VIEW */}
      {(activeViewMode === 'dashboard' || activeViewMode === 'printPreview') && (
        <div className="space-y-6">
          {/* Main Diagram: With Toggle between Standard Bar Chart & Multi-Level Grouped Comparison */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 no-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>
                    {diagramViewMode === 'multiLevelCompare'
                      ? 'Diagram Komparasi 3 Tingkat (Kelas 7 vs 8 vs 9 Bersandingan)'
                      : `Diagram Batang Capaian Mata Pelajaran - ${targetFilterDisplay}`}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {diagramViewMode === 'multiLevelCompare'
                    ? 'Membandingkan rata-rata nilai dan serapan kurikulum antar jenjang kelas 7 (biru), kelas 8 (hijau), dan kelas 9 (ungu).'
                    : `Garis putus-putus merah menandakan batas KKM standar (${DEFAULT_KKM}).`}
                </p>
              </div>

              {/* View & Metric Mode Switchers */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Diagram Mode Toggle: Standar vs Multi-Tingkat */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDiagramViewMode('standard')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      diagramViewMode === 'standard'
                        ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tingkat Aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiagramViewMode('multiLevelCompare')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                      diagramViewMode === 'multiLevelCompare'
                        ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Split className="w-3 h-3 text-indigo-600" />
                    <span>Komparasi 7-8-9</span>
                  </button>
                </div>

                {/* Metric Selector Buttons (for standard mode) */}
                {diagramViewMode === 'standard' && (
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setChartMetric('avgScore')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                        chartMetric === 'avgScore'
                          ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Rata-rata
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric('absorptionRate')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                        chartMetric === 'absorptionRate'
                          ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      % Serap
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric('passRate')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                        chartMetric === 'passRate'
                          ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      % Tuntas
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* DIAGRAM VIEW A: STANDARD HORIZONTAL BAR CHART */}
            {diagramViewMode === 'standard' && (
              <div className="relative pt-4 pb-2 overflow-x-auto scrollbar-thin">
                {filteredAnalytics.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada data mata pelajaran yang cocok dengan filter yang dipilih.
                  </div>
                ) : (
                  <div className="min-w-[640px] space-y-3">
                    {/* Benchmark legend */}
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2 px-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                          <span>≥ 80 (Sangat Baik)</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" />
                          <span>75 - 79.9 (Baik)</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                          <span>65 - 74.9 (Cukup)</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                          <span>&lt; 65 (Kurang)</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-rose-700 font-bold font-mono">
                        <span className="w-4 h-0.5 border-b-2 border-dashed border-rose-500 inline-block" />
                        <span>Garis KKM: {DEFAULT_KKM}</span>
                      </div>
                    </div>

                    {/* Horizontal Bar Items */}
                    <div className="space-y-2.5">
                      {filteredAnalytics.map((item) => {
                        const displayVal =
                          chartMetric === 'avgScore'
                            ? item.avgScore
                            : chartMetric === 'absorptionRate'
                            ? item.absorptionRate
                            : item.passRate;

                        const unit = chartMetric === 'avgScore' ? '' : '%';
                        const pctWidth = Math.min(100, Math.max(0, displayVal));

                        let barColor = 'from-blue-500 to-indigo-600';
                        let badgeColor = 'text-blue-700 bg-blue-50 border-blue-200';
                        if (displayVal >= 80) {
                          barColor = 'from-emerald-500 to-teal-600';
                          badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                        } else if (displayVal >= 75) {
                          barColor = 'from-blue-500 to-indigo-600';
                          badgeColor = 'text-indigo-700 bg-indigo-50 border-indigo-200';
                        } else if (displayVal >= 65) {
                          barColor = 'from-amber-400 to-amber-600';
                          badgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
                        } else {
                          barColor = 'from-rose-500 to-red-600';
                          badgeColor = 'text-rose-700 bg-rose-50 border-rose-200';
                        }

                        return (
                          <div
                            key={item.subject}
                            onMouseEnter={() => setHoveredSubject(item)}
                            onMouseLeave={() => setHoveredSubject(null)}
                            className="group p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                            onClick={() => {
                              if (onSelectSubject) onSelectSubject(item.subject);
                            }}
                          >
                            <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                  {item.subject}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.2 rounded-md bg-slate-100">
                                  {item.category}
                                </span>
                                {item.studentsWithGrades > 0 && (
                                  <span className="text-[10px] text-slate-500">
                                    ({item.studentsWithGrades} siswa dinilai)
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                                  {displayVal} {unit}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono w-20 text-right">
                                  {item.kkmComparison >= 0 ? `+${item.kkmComparison}` : item.kkmComparison} dr KKM
                                </span>
                              </div>
                            </div>

                            {/* Bar Progress Container with KKM Guide Line */}
                            <div className="relative h-4.5 bg-slate-100 rounded-lg overflow-hidden flex items-center">
                              <div
                                className="absolute top-0 bottom-0 z-10 border-r-2 border-dashed border-rose-500/80"
                                style={{ left: `${(item.kkm / 100) * 100}%` }}
                                title={`Garis KKM: ${item.kkm}`}
                              />

                              <div
                                className={`h-full rounded-lg bg-gradient-to-r ${barColor} transition-all duration-500 flex items-center justify-end pr-2`}
                                style={{ width: `${pctWidth}%` }}
                              >
                                {pctWidth > 20 && (
                                  <span className="text-[10px] font-extrabold text-white drop-shadow-xs">
                                    {displayVal}{unit}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DIAGRAM VIEW B: MULTI-LEVEL COMPARISON GROUPED BARS (KELAS 7 VS KELAS 8 VS KELAS 9) */}
            {diagramViewMode === 'multiLevelCompare' && (
              <div className="pt-2 pb-2 space-y-4 overflow-x-auto scrollbar-thin">
                {/* Level color legends */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-slate-800">Keterangan Tingkat:</span>
                    <span className="flex items-center gap-1.5 font-bold text-blue-800">
                      <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
                      <span>Kelas 7 (VII)</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-bold text-emerald-800">
                      <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
                      <span>Kelas 8 (VIII)</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-bold text-purple-800">
                      <span className="w-3 h-3 rounded-xs bg-purple-600 inline-block" />
                      <span>Kelas 9 (IX)</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-rose-700 font-bold font-mono">
                    <span className="w-4 h-0.5 border-b-2 border-dashed border-rose-500 inline-block" />
                    <span>Ambang Batas KKM ({DEFAULT_KKM})</span>
                  </div>
                </div>

                <div className="min-w-[680px] space-y-4">
                  {filteredMultiLevelMatrix.map((row) => {
                    const w7 = Math.min(100, Math.max(0, row.l7.avg));
                    const w8 = Math.min(100, Math.max(0, row.l8.avg));
                    const w9 = Math.min(100, Math.max(0, row.l9.avg));

                    return (
                      <div
                        key={`compare-${row.subject}`}
                        className="p-3 bg-white hover:bg-slate-50/70 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{row.subject}</span>
                            <span className="text-[10px] text-slate-500 font-semibold px-1.5 py-0.2 bg-slate-100 rounded-md">
                              {row.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] font-mono">
                            <span className="text-slate-500">KKM {row.kkm}</span>
                            <span className="font-extrabold text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                              Rata-rata Total: {row.overall.avg} ({row.overall.absorption}%)
                            </span>
                            {row.bestLevel !== '-' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                Tertinggi: Kls {row.bestLevel}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Grouped 3 Bars */}
                        <div className="space-y-1.5">
                          {/* Row Kelas 7 */}
                          <div className="flex items-center gap-2">
                            <span className="w-14 text-[10px] font-bold text-blue-800 text-right shrink-0">
                              Kelas 7
                            </span>
                            <div className="relative flex-1 h-3.5 bg-slate-100 rounded-md overflow-hidden flex items-center">
                              <div
                                className="absolute top-0 bottom-0 z-10 border-r border-dashed border-rose-500"
                                style={{ left: `${row.kkm}%` }}
                              />
                              <div
                                className="h-full bg-blue-600 rounded-md flex items-center justify-end pr-1.5 transition-all duration-300"
                                style={{ width: `${w7}%` }}
                              >
                                {w7 > 15 && (
                                  <span className="text-[9px] font-extrabold text-white">{row.l7.avg}</span>
                                )}
                              </div>
                            </div>
                            <span className="w-20 text-[10px] font-mono text-slate-600 shrink-0 text-right">
                              {row.l7.avg > 0 ? `${row.l7.avg} (${row.l7.absorption}%)` : '-'}
                            </span>
                          </div>

                          {/* Row Kelas 8 */}
                          <div className="flex items-center gap-2">
                            <span className="w-14 text-[10px] font-bold text-emerald-800 text-right shrink-0">
                              Kelas 8
                            </span>
                            <div className="relative flex-1 h-3.5 bg-slate-100 rounded-md overflow-hidden flex items-center">
                              <div
                                className="absolute top-0 bottom-0 z-10 border-r border-dashed border-rose-500"
                                style={{ left: `${row.kkm}%` }}
                              />
                              <div
                                className="h-full bg-emerald-600 rounded-md flex items-center justify-end pr-1.5 transition-all duration-300"
                                style={{ width: `${w8}%` }}
                              >
                                {w8 > 15 && (
                                  <span className="text-[9px] font-extrabold text-white">{row.l8.avg}</span>
                                )}
                              </div>
                            </div>
                            <span className="w-20 text-[10px] font-mono text-slate-600 shrink-0 text-right">
                              {row.l8.avg > 0 ? `${row.l8.avg} (${row.l8.absorption}%)` : '-'}
                            </span>
                          </div>

                          {/* Row Kelas 9 */}
                          <div className="flex items-center gap-2">
                            <span className="w-14 text-[10px] font-bold text-purple-800 text-right shrink-0">
                              Kelas 9
                            </span>
                            <div className="relative flex-1 h-3.5 bg-slate-100 rounded-md overflow-hidden flex items-center">
                              <div
                                className="absolute top-0 bottom-0 z-10 border-r border-dashed border-rose-500"
                                style={{ left: `${row.kkm}%` }}
                              />
                              <div
                                className="h-full bg-purple-600 rounded-md flex items-center justify-end pr-1.5 transition-all duration-300"
                                style={{ width: `${w9}%` }}
                              >
                                {w9 > 15 && (
                                  <span className="text-[9px] font-extrabold text-white">{row.l9.avg}</span>
                                )}
                              </div>
                            </div>
                            <span className="w-20 text-[10px] font-mono text-slate-600 shrink-0 text-right">
                              {row.l9.avg > 0 ? `${row.l9.avg} (${row.l9.absorption}%)` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Diagram 2: Stacked Bar Ketuntasan Klasikal (% Tuntas vs % Remedial) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 no-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Komparasi Ketuntasan Belajar Siswa (% Tuntas vs % Remedial)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualisasi proporsi siswa yang telah mencapai ketuntasan KKM (hijau) berbanding remedial (merah) pada {targetFilterDisplay}.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span>Siswa Tuntas</span>
                </span>
                <span className="flex items-center gap-1.5 text-rose-700">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                  <span>Siswa Remedial</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {filteredAnalytics.map((item) => {
                const passPct = item.passRate;
                const remPct = Math.max(0, 100 - passPct);

                return (
                  <div
                    key={`stacked-${item.subject}`}
                    className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-900 truncate" title={item.subject}>
                        {item.subject}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-slate-600 shrink-0">
                        KKM {item.kkm} • {item.studentsWithGrades} Siswa
                      </span>
                    </div>

                    {/* Stacked Bar */}
                    <div className="h-5 bg-slate-200 rounded-lg overflow-hidden flex text-[10px] font-bold text-white leading-none">
                      {passPct > 0 && (
                        <div
                          className="bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center overflow-hidden"
                          style={{ width: `${passPct}%` }}
                          title={`Tuntas: ${item.passedCount} siswa (${passPct}%)`}
                        >
                          {passPct >= 15 ? `${passPct}%` : ''}
                        </div>
                      )}
                      {remPct > 0 && (
                        <div
                          className="bg-rose-500 hover:bg-rose-600 transition-colors flex items-center justify-center overflow-hidden"
                          style={{ width: `${remPct}%` }}
                          title={`Remedial: ${item.remedialCount} siswa (${remPct}%)`}
                        >
                          {remPct >= 15 ? `${remPct}%` : ''}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 font-medium">
                      <span className="text-emerald-700 font-semibold">
                        ✓ {item.passedCount} Siswa Tuntas ({passPct}%)
                      </span>
                      <span className={item.remedialCount > 0 ? 'text-rose-700 font-semibold' : 'text-slate-400'}>
                        ✗ {item.remedialCount} Siswa Remedial ({remPct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. PERFORMA KELOMPOK BIDANG STUDI */}
          {categoryBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 no-print">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>Ketercapaian Berdasarkan Kelompok Bidang Studi</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rata-rata serapan kurikulum pada rumpun keilmuan untuk {targetFilterDisplay}.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {categoryBreakdown.map((cat) => (
                  <div
                    key={cat.category}
                    className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 truncate" title={cat.category}>
                        {cat.category}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {cat.count} Mapel
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-extrabold text-slate-900">
                        {cat.avg}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        (Daya Serap: {cat.absorption}%)
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 rounded-full"
                        style={{ width: `${Math.min(100, cat.absorption)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ANALISIS NARATIF & REKOMENDASI PEMBELAJARAN */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-blue-50/60 rounded-2xl border border-indigo-200/80 text-xs text-slate-800 space-y-3 shadow-2xs no-print">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Analisis Akademik &amp; Rekomendasi Tindak Lanjut:</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
              <div className="space-y-1.5 p-3 bg-white/80 rounded-xl border border-indigo-100">
                <span className="font-bold text-indigo-900 block">
                  1. Evaluasi Ketercapaian Serapan Kurikulum
                </span>
                <p className="text-slate-700 text-[11px]">
                  Secara umum, daya serap siswa pada <strong>{targetFilterDisplay}</strong> mencapai rata-rata{' '}
                  <strong className="text-indigo-950">{overallMetrics.overallAbsorption}%</strong> dengan tingkat ketuntasan klasikal{' '}
                  <strong className="text-emerald-700">{overallMetrics.overallPassRate}%</strong>.
                  {overallMetrics.overallAbsorption >= 80 ? (
                    ' Capaian ini menunjukkan pemahaman materi yang sangat baik oleh mayoritas siswa.'
                  ) : overallMetrics.overallAbsorption >= 75 ? (
                    ' Capaian ini memenuhi standar target KKM madrasah, namun beberapa topik memerlukan pendalaman.'
                  ) : (
                    ' Diperlukan program remedial terstruktur dan pendampingan intensif pada materi-materi esensial.'
                  )}
                </p>
              </div>

              <div className="space-y-1.5 p-3 bg-white/80 rounded-xl border border-indigo-100">
                <span className="font-bold text-indigo-900 block">
                  2. Rekomendasi Tindak Lanjut Guru &amp; Kurikulum
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                  <li>
                    <strong>Program Pengayaan:</strong> Berikan materi pengayaan atau latihan soal HOTS untuk mata pelajaran berdaya serap tinggi seperti{' '}
                    <em>{overallMetrics.topSubject?.subject || 'PAI/Bahasa'}</em>.
                  </li>
                  <li>
                    <strong>Program Remedial:</strong> Lakukan remedial klasikal dan pendampingan tutor sebaya untuk mata pelajaran{' '}
                    <em>{overallMetrics.lowestSubject?.subject || 'MIPA'}</em> yang memiliki tingkat ketuntasan terendah.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TABEL REKAPITULASI RINCI VIEW */}
      {(activeViewMode === 'table' || activeViewMode === 'printPreview') && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-0 no-print">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase">
                  {tableViewMode === 'levelMatrix'
                    ? 'Matriks Komparasi Rata-rata Nilai & Daya Serap (Kelas 7, 8, 9)'
                    : `Tabel Rekapitulasi Rata-rata Nilai & Analisis Daya Serap (${targetFilterDisplay})`}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {tableViewMode === 'levelMatrix'
                  ? 'Perbandingan rata-rata nilai, persentase daya serap, dan ketuntasan antar kelas 7, kelas 8, dan kelas 9.'
                  : `Data statistik lengkap per mata pelajaran pada ${targetFilterDisplay}.`}
              </p>
            </div>

            {/* Table view mode toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTableViewMode('standard')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    tableViewMode === 'standard'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tabel Rinci Tingkat
                </button>
                <button
                  type="button"
                  onClick={() => setTableViewMode('levelMatrix')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    tableViewMode === 'levelMatrix'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TableProperties className="w-3.5 h-3.5" />
                  <span>Matriks 7-8-9</span>
                </button>
              </div>

              <span className="text-xs text-slate-500 font-medium ml-2">
                Total: <strong>{filteredAnalytics.length}</strong> Mapel
              </span>
            </div>
          </div>

          {/* TABEL A: MATRIKS KOMPARASI KELAS 7, 8, 9 */}
          {tableViewMode === 'levelMatrix' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase border-b border-slate-200 tracking-wider">
                  <tr>
                    <th rowSpan={2} className="py-2.5 px-2.5 text-center border-r border-slate-200 w-10">No</th>
                    <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 min-w-[160px]">Mata Pelajaran</th>
                    <th rowSpan={2} className="py-2.5 px-2 text-center border-r border-slate-200 w-12">KKM</th>
                    {/* Header Group Tingkat 7 */}
                    <th colSpan={3} className="py-1.5 px-2 text-center border-r border-slate-200 bg-blue-50/80 text-blue-900">
                      Kelas 7 (VII)
                    </th>
                    {/* Header Group Tingkat 8 */}
                    <th colSpan={3} className="py-1.5 px-2 text-center border-r border-slate-200 bg-emerald-50/80 text-emerald-900">
                      Kelas 8 (VIII)
                    </th>
                    {/* Header Group Tingkat 9 */}
                    <th colSpan={3} className="py-1.5 px-2 text-center border-r border-slate-200 bg-purple-50/80 text-purple-900">
                      Kelas 9 (IX)
                    </th>
                    {/* Header Group Gabungan */}
                    <th colSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-indigo-50/80 text-indigo-950 font-extrabold">
                      Rata-rata Sekolah
                    </th>
                    <th rowSpan={2} className="py-2.5 px-2 text-center w-20">Tertinggi</th>
                  </tr>
                  <tr className="border-t border-slate-200 text-[9px]">
                    {/* Subheaders 7 */}
                    <th className="py-1.5 px-1.5 text-center border-r border-slate-200 bg-blue-50/40">Rata-rata</th>
                    <th className="py-1.5 px-1.5 text-center border-r border-slate-200 bg-blue-50/40">% Serap</th>
                    <th className="py-1.5 px-1.5 text-center border-r border-slate-200 bg-blue-50/40">% Tuntas</th>
                    {/* Subheaders 8 */}
                    <th className="py-1.5 px-1.5 text-center border-r border-slate-200 bg-emerald-50/40">Rata-rata</th>
                    <th className="py-1.5 px-1.5 text-center border-r border-slate-200 bg-emerald-50/40">% Serap</th>
                    <th className="py-1.5 px-1.5 text-center border-r border-slate-200 bg-emerald-50/40">% Tuntas</th>
                    {/* Subheaders 9 */}
                    <th className="py-1.5 px-1.5 text-center border-r border-slate-200 bg-purple-50/40">Rata-rata</th>
                    <th className="py-1.5 px-1.5 text-center border-r border-slate-200 bg-purple-50/40">% Serap</th>
                    <th className="py-1.5 px-1.5 text-center border-r border-slate-200 bg-purple-50/40">% Tuntas</th>
                    {/* Subheaders Gabungan */}
                    <th className="py-1.5 px-2 text-center border-r border-slate-200 bg-indigo-50/60 font-bold">Rata-rata</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200 bg-indigo-50/60 font-bold">% Serap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMultiLevelMatrix.map((r, idx) => (
                    <tr
                      key={`matrix-${r.subject}`}
                      className="hover:bg-indigo-50/30 transition-colors"
                      onClick={() => {
                        if (onSelectSubject) onSelectSubject(r.subject);
                      }}
                    >
                      <td className="py-2.5 px-2.5 text-center font-mono text-[11px] text-slate-400 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-100">
                        {r.subject}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-600 border-r border-slate-100">
                        {r.kkm}
                      </td>

                      {/* Data Kelas 7 */}
                      <td className="py-2.5 px-1.5 text-center font-mono font-bold text-blue-900 border-r border-slate-100 bg-blue-50/20">
                        {r.l7.avg > 0 ? r.l7.avg : '-'}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-mono text-blue-800 border-r border-slate-100">
                        {r.l7.avg > 0 ? `${r.l7.absorption}%` : '-'}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-mono text-slate-600 border-r border-slate-100">
                        {r.l7.avg > 0 ? `${r.l7.passRate}%` : '-'}
                      </td>

                      {/* Data Kelas 8 */}
                      <td className="py-2.5 px-1.5 text-center font-mono font-bold text-emerald-900 border-r border-slate-100 bg-emerald-50/20">
                        {r.l8.avg > 0 ? r.l8.avg : '-'}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-mono text-emerald-800 border-r border-slate-100">
                        {r.l8.avg > 0 ? `${r.l8.absorption}%` : '-'}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-mono text-slate-600 border-r border-slate-100">
                        {r.l8.avg > 0 ? `${r.l8.passRate}%` : '-'}
                      </td>

                      {/* Data Kelas 9 */}
                      <td className="py-2.5 px-1.5 text-center font-mono font-bold text-purple-900 border-r border-slate-100 bg-purple-50/20">
                        {r.l9.avg > 0 ? r.l9.avg : '-'}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-mono text-purple-800 border-r border-slate-100">
                        {r.l9.avg > 0 ? `${r.l9.absorption}%` : '-'}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-mono text-slate-600 border-r border-slate-100">
                        {r.l9.avg > 0 ? `${r.l9.passRate}%` : '-'}
                      </td>

                      {/* Gabungan */}
                      <td className="py-2.5 px-2 text-center font-mono font-extrabold text-indigo-900 border-r border-slate-100 bg-indigo-50/40">
                        {r.overall.avg}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-extrabold text-emerald-900 border-r border-slate-100 bg-emerald-50/40">
                        {r.overall.absorption}%
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-700">
                          {r.bestLevel === '7'
                            ? 'Kelas 7'
                            : r.bestLevel === '8'
                            ? 'Kelas 8'
                            : r.bestLevel === '9'
                            ? 'Kelas 9'
                            : r.bestLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* TABEL B: TABEL RINCI TINGKAT TERPILIH */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="py-3 px-2.5 text-center border-r border-slate-200 w-10">No</th>
                    <th className="py-3 px-3 border-r border-slate-200 min-w-[160px]">Mata Pelajaran</th>
                    <th className="py-3 px-2.5 border-r border-slate-200 min-w-[120px]">Rumpun / Bidang</th>
                    <th className="py-3 px-2 text-center border-r border-slate-200 w-12">KKM</th>
                    <th className="py-3 px-2 text-center border-r border-slate-200 w-16">Peserta</th>
                    <th className="py-3 px-2 text-center border-r border-slate-200 w-16 font-extrabold text-indigo-900 bg-indigo-50/60">Rata-rata</th>
                    <th className="py-3 px-2 text-center border-r border-slate-200 w-12 text-slate-500">Min</th>
                    <th className="py-3 px-2 text-center border-r border-slate-200 w-12 text-slate-500">Max</th>
                    <th className="py-3 px-2 text-center border-r border-slate-200 w-14 text-emerald-800">Tuntas</th>
                    <th className="py-3 px-2 text-center border-r border-slate-200 w-14 text-rose-800">Remedial</th>
                    <th className="py-3 px-2.5 text-center border-r border-slate-200 w-20 font-bold text-blue-900 bg-blue-50/40">% Tuntas</th>
                    <th className="py-3 px-2.5 text-center border-r border-slate-200 w-20 font-extrabold text-emerald-900 bg-emerald-50/40">% Serap</th>
                    <th className="py-3 px-2.5 text-center border-r border-slate-200 w-24">Kategori</th>
                    <th className="py-3 px-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAnalytics.map((item, idx) => {
                    const isPass = item.avgScore >= item.kkm;

                    return (
                      <tr
                        key={item.subject}
                        className="hover:bg-indigo-50/30 transition-colors"
                        onClick={() => {
                          if (onSelectSubject) onSelectSubject(item.subject);
                        }}
                      >
                        <td className="py-2.5 px-2.5 text-center font-mono text-[11px] text-slate-400 border-r border-slate-100">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-100">
                          {item.subject}
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-600 border-r border-slate-100 text-[11px]">
                          {item.category}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-700 border-r border-slate-100 font-semibold">
                          {item.kkm}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-600 border-r border-slate-100">
                          {item.studentsWithGrades}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-extrabold text-indigo-700 border-r border-slate-100 bg-indigo-50/30">
                          {item.avgScore}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-500 border-r border-slate-100">
                          {item.minScore}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-500 border-r border-slate-100">
                          {item.maxScore}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-emerald-700 font-bold border-r border-slate-100">
                          {item.passedCount}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-rose-700 font-bold border-r border-slate-100">
                          {item.remedialCount}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono font-bold text-blue-900 border-r border-slate-100 bg-blue-50/20">
                          {item.passRate}%
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono font-extrabold text-emerald-900 border-r border-slate-100 bg-emerald-50/20">
                          {item.absorptionRate}%
                        </td>
                        <td className="py-2.5 px-2 text-center border-r border-slate-100">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.absorptionCategory === 'Sangat Baik'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.absorptionCategory === 'Baik'
                                ? 'bg-blue-100 text-blue-800'
                                : item.absorptionCategory === 'Cukup'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.absorptionCategory}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded-sm text-[10px] font-semibold ${
                              isPass ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                            }`}
                          >
                            {isPass ? '✓ Tuntas' : '✗ Remedial'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-800 text-[11px]">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-right uppercase tracking-wider">
                      Rata-rata {targetFilterDisplay}:
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-slate-600">
                      {DEFAULT_KKM}
                    </td>
                    <td className="py-3 px-2 text-center font-mono">
                      {overallMetrics.totalEvaluatedGrades}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-indigo-900 font-extrabold bg-indigo-100/50">
                      {overallMetrics.overallAvg}
                    </td>
                    <td colSpan={4} className="py-3 px-2 text-center text-slate-400">
                      —
                    </td>
                    <td className="py-3 px-2.5 text-center font-mono text-blue-900 font-bold bg-blue-100/50">
                      {overallMetrics.overallPassRate}%
                    </td>
                    <td className="py-3 px-2.5 text-center font-mono text-emerald-900 font-extrabold bg-emerald-100/50">
                      {overallMetrics.overallAbsorption}%
                    </td>
                    <td colSpan={2} className="py-3 px-2.5 text-center">
                      <span className="text-emerald-800 font-bold">
                        {overallMetrics.overallAbsorption >= 85 ? 'Sangat Baik' : overallMetrics.overallAbsorption >= 75 ? 'Baik' : 'Cukup'}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. OFFICIAL PRINTABLE DOCUMENT (Visible on Print or Print Preview Mode) */}
      <div
        className={`${
          activeViewMode === 'printPreview' ? 'block' : 'hidden'
        } print:block bg-white p-6 sm:p-10 border border-slate-300 rounded-2xl shadow-sm text-slate-900 text-xs font-serif print:m-0 print:p-4 print:border-none print:shadow-none print:rounded-none`}
      >
        {/* Kop Madrasah / Sekolah */}
        <div className="text-center pb-3 border-b-2 border-slate-900 border-double">
          <p className="text-[11px] font-sans font-bold uppercase tracking-wider text-slate-600">
            KEMENTERIAN AGAMA REPUBLIK INDONESIA
          </p>
          <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-wide font-sans text-slate-900">
            {config.schoolName || 'MADRASAH TSANAWIYAH KOTA BOGOR'}
          </h1>
          <p className="text-[10px] font-sans text-slate-600 mt-0.5">
            {config.address || 'Jl. Raya Pendidikan No. 01'} • Kecamatan {config.subdistrict || 'Bogor Tengah'} • Kota {config.district || 'Bogor'}
          </p>
          <p className="text-[10px] font-sans text-slate-500">
            Telp: {config.phone || '-'} • Email: {config.email || '-'} • NPSN: {config.npsn || '-'}
          </p>
        </div>

        {/* Judul Dokumen */}
        <div className="text-center my-4">
          <h2 className="text-sm font-extrabold uppercase underline underline-offset-4 tracking-wide font-sans">
            LAPORAN REKAPITULASI RATA-RATA NILAI DAN ANALISIS DAYA SERAP SISWA
          </h2>
          <p className="text-[11px] font-sans font-semibold text-slate-700 mt-1">
            Kegiatan: {config.examTitle || 'Sumatif Tengah Semester (STS)'} • Tahun Pelajaran {config.academicYear || '2024/2025'} (Semester {config.semester || 'Ganjil'})
          </p>
          <p className="text-[10px] font-sans text-slate-600">
            Sasaran: <strong>{targetFilterDisplay}</strong> • Jumlah Siswa: <strong>{scopeStudents.length} Orang</strong>
          </p>
        </div>

        {/* Ringkasan Eksekutif Cetak: Komparasi 3 Tingkat */}
        <div className="grid grid-cols-4 gap-2 text-center my-3 p-2.5 bg-slate-50 border border-slate-300 text-[10px] font-sans">
          <div className="border-r border-slate-200">
            <span className="block text-slate-500 font-bold text-blue-900">Tingkat Kelas 7 (VII)</span>
            <span className="text-slate-700">Rata-rata: <strong>{summaryL7.overallAvg}</strong></span>
            <span className="block text-slate-600">Daya Serap: <strong>{summaryL7.overallAbsorption}%</strong></span>
          </div>
          <div className="border-r border-slate-200">
            <span className="block text-slate-500 font-bold text-emerald-900">Tingkat Kelas 8 (VIII)</span>
            <span className="text-slate-700">Rata-rata: <strong>{summaryL8.overallAvg}</strong></span>
            <span className="block text-slate-600">Daya Serap: <strong>{summaryL8.overallAbsorption}%</strong></span>
          </div>
          <div className="border-r border-slate-200">
            <span className="block text-slate-500 font-bold text-purple-900">Tingkat Kelas 9 (IX)</span>
            <span className="text-slate-700">Rata-rata: <strong>{summaryL9.overallAvg}</strong></span>
            <span className="block text-slate-600">Daya Serap: <strong>{summaryL9.overallAbsorption}%</strong></span>
          </div>
          <div>
            <span className="block text-slate-500 font-bold text-slate-900">Rata-rata Sekolah</span>
            <span className="text-slate-700">Rata-rata: <strong>{overallMetrics.overallAvg}</strong></span>
            <span className="block text-slate-600">Daya Serap: <strong>{overallMetrics.overallAbsorption}%</strong></span>
          </div>
        </div>

        {/* Tabel Rekapitulasi Cetak */}
        <div className="my-3 overflow-x-auto">
          <table className="w-full text-left text-[10px] font-sans border border-slate-400 border-collapse">
            <thead className="bg-slate-100 font-bold text-slate-900 uppercase">
              <tr className="border-b border-slate-400">
                <th className="py-1.5 px-1.5 text-center border-r border-slate-400 w-6">No</th>
                <th className="py-1.5 px-2 border-r border-slate-400">Mata Pelajaran</th>
                <th className="py-1.5 px-1.5 text-center border-r border-slate-400 w-10">KKM</th>
                <th className="py-1.5 px-1.5 text-center border-r border-slate-400 w-12 text-blue-900">Rata Kls 7</th>
                <th className="py-1.5 px-1.5 text-center border-r border-slate-400 w-12 text-emerald-900">Rata Kls 8</th>
                <th className="py-1.5 px-1.5 text-center border-r border-slate-400 w-12 text-purple-900">Rata Kls 9</th>
                <th className="py-1.5 px-1.5 text-center border-r border-slate-400 w-12 font-bold bg-slate-200/50">Rata Total</th>
                <th className="py-1.5 px-1.5 text-center border-r border-slate-400 w-12 font-bold">% Serap</th>
                <th className="py-1.5 px-1.5 text-center border-r border-slate-400 w-12 font-bold">% Tuntas</th>
                <th className="py-1.5 px-2 text-center border-r border-slate-400 w-16">Kategori</th>
                <th className="py-1.5 px-1.5 text-center w-14">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {filteredMultiLevelMatrix.map((item, idx) => (
                <tr key={`print-matrix-${item.subject}`}>
                  <td className="py-1 px-1 text-center border-r border-slate-300 font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-1 px-2 border-r border-slate-300 font-semibold">
                    {item.subject}
                  </td>
                  <td className="py-1 px-1.5 text-center border-r border-slate-300 font-mono">
                    {item.kkm}
                  </td>
                  <td className="py-1 px-1.5 text-center border-r border-slate-300 font-mono text-blue-900">
                    {item.l7.avg > 0 ? item.l7.avg : '-'}
                  </td>
                  <td className="py-1 px-1.5 text-center border-r border-slate-300 font-mono text-emerald-900">
                    {item.l8.avg > 0 ? item.l8.avg : '-'}
                  </td>
                  <td className="py-1 px-1.5 text-center border-r border-slate-300 font-mono text-purple-900">
                    {item.l9.avg > 0 ? item.l9.avg : '-'}
                  </td>
                  <td className="py-1 px-1.5 text-center border-r border-slate-300 font-mono font-bold bg-slate-50">
                    {item.overall.avg}
                  </td>
                  <td className="py-1 px-1.5 text-center border-r border-slate-300 font-mono font-bold">
                    {item.overall.absorption}%
                  </td>
                  <td className="py-1 px-1.5 text-center border-r border-slate-300 font-mono font-bold">
                    {item.overall.passRate}%
                  </td>
                  <td className="py-1 px-2 text-center border-r border-slate-300">
                    {item.overall.absorption >= 85 ? 'Sangat Baik' : item.overall.absorption >= 75 ? 'Baik' : 'Cukup'}
                  </td>
                  <td className="py-1 px-1.5 text-center">
                    {item.overall.avg >= item.kkm ? 'Tuntas' : 'Remedial'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t border-slate-400">
              <tr>
                <td colSpan={3} className="py-1.5 px-2 text-right uppercase">
                  Rata-rata Keseluruhan:
                </td>
                <td className="py-1.5 px-1.5 text-center font-mono font-bold border-r border-slate-300 text-blue-900">
                  {summaryL7.overallAvg}
                </td>
                <td className="py-1.5 px-1.5 text-center font-mono font-bold border-r border-slate-300 text-emerald-900">
                  {summaryL8.overallAvg}
                </td>
                <td className="py-1.5 px-1.5 text-center font-mono font-bold border-r border-slate-300 text-purple-900">
                  {summaryL9.overallAvg}
                </td>
                <td className="py-1.5 px-1.5 text-center font-mono font-bold border-r border-slate-300 bg-slate-200">
                  {overallMetrics.overallAvg}
                </td>
                <td className="py-1.5 px-1.5 text-center font-mono font-bold border-r border-slate-300">
                  {overallMetrics.overallAbsorption}%
                </td>
                <td className="py-1.5 px-1.5 text-center font-mono font-bold border-r border-slate-300">
                  {overallMetrics.overallPassRate}%
                </td>
                <td colSpan={2} className="py-1.5 px-2 text-center">
                  {overallMetrics.overallAbsorption >= 85 ? 'Sangat Baik' : 'Baik'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Kesimpulan & Tindak Lanjut Cetak */}
        <div className="my-3 p-2.5 border border-slate-300 text-[10px] font-sans leading-relaxed">
          <p className="font-bold uppercase text-slate-800 mb-0.5">
            Kesimpulan &amp; Catatan Tindak Lanjut Pembelajaran:
          </p>
          <p>
            1. Rata-rata daya serap materi secara berurutan: <strong>Kelas 7 ({summaryL7.overallAbsorption}%)</strong>, <strong>Kelas 8 ({summaryL8.overallAbsorption}%)</strong>, dan <strong>Kelas 9 ({summaryL9.overallAbsorption}%)</strong>.
          </p>
          <p>
            2. Nilai rata-rata tertinggi dicapai pada mata pelajaran <strong>{overallMetrics.topSubject?.subject || '-'}</strong> ({overallMetrics.topSubject?.avgScore ?? '-'}).
          </p>
          <p>
            3. Mata pelajaran yang memerlukan pembinaan/remedial terprogram: <strong>{overallMetrics.lowestSubject?.subject || '-'}</strong>.
          </p>
        </div>

        {/* Tanda Tangan Resmi */}
        <div className="grid grid-cols-2 gap-4 mt-6 text-center text-[10px] font-sans avoid-break">
          <div>
            <p className="text-slate-600">Mengetahui,</p>
            <p className="font-bold">Waka Kurikulum / Tim Penilai</p>
            <div className="h-16 flex items-center justify-center">
              {config.signatureEnabled && config.signatureUrl && config.signatureSigner === 'committee' ? (
                <img src={config.signatureUrl} alt="TTD" className="h-12 object-contain" />
              ) : (
                <span className="text-slate-300 italic text-[9px]">(Tanda Tangan)</span>
              )}
            </div>
            <p className="font-bold underline underline-offset-2">
              {config.committeeHeadName || 'Waka Kurikulum Madrasah'}
            </p>
            <p className="text-slate-600 font-mono">
              NIP. {config.committeeHeadNip || '-'}
            </p>
          </div>

          <div>
            <p className="text-slate-600">
              {config.issuePlace || 'Bogor'}, {config.issueDate || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="font-bold">Kepala Madrasah / Sekolah</p>
            <div className="h-16 flex items-center justify-center relative">
              {config.signatureEnabled && config.signatureUrl && (config.signatureSigner === 'principal' || !config.signatureSigner) && (
                <img src={config.signatureUrl} alt="TTD" className="h-12 object-contain" />
              )}
              {config.stampEnabled && config.stampUrl && (
                <img
                  src={config.stampUrl}
                  alt="Stempel"
                  className="absolute w-14 h-14 object-contain opacity-80"
                  style={{
                    transform: `rotate(${config.stampRotation ?? -7}deg) scale(${(config.stampSize ?? 100) / 100})`,
                  }}
                />
              )}
              {!config.signatureUrl && !config.stampUrl && (
                <span className="text-slate-300 italic text-[9px]">(Tanda Tangan &amp; Stempel)</span>
              )}
            </div>
            <p className="font-bold underline underline-offset-2">
              {config.principalName || 'Kepala Madrasah'}
            </p>
            <p className="text-slate-600 font-mono">
              NIP. {config.principalNip || '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
