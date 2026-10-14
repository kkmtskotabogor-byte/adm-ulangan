import { ExamConfig, ExamGradeItem, Student, SubjectGradingConfig } from '../types';
import * as XLSX from 'xlsx';

export const DEFAULT_KKM = 75;

export const STANDARD_SCHOOL_SUBJECTS = [
  'Al-Qur\'an Hadis',
  'Akidah Akhlak',
  'Fikih',
  'Sejarah Kebudayaan Islam (SKI)',
  'Bahasa Arab',
  'Pendidikan Pancasila / PKn',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam (IPA)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Bahasa Inggris',
  'Seni Budaya',
  'Pendidikan Jasmani (PJOK)',
  'Prakarya / Informatika',
  'Bahasa Sunda',
  'BTQ (Baca Tulis Al-Qur\'an)',
];

export function getSubjectCategory(subject: string): string {
  const s = subject.toLowerCase();
  if (
    s.includes("qur'an") ||
    s.includes('hadis') ||
    s.includes('akidah') ||
    s.includes('akhlak') ||
    s.includes('fikih') ||
    s.includes('ski') ||
    s.includes('sejarah kebudayaan') ||
    s.includes('btq') ||
    s.includes('tahfidz') ||
    s.includes('pai') ||
    s.includes('agama')
  ) {
    return 'PAI / Keagamaan';
  }
  if (
    s.includes('matematika') ||
    s.includes('ipa') ||
    s.includes('alam') ||
    s.includes('fisika') ||
    s.includes('biologi') ||
    s.includes('kimia')
  ) {
    return 'MIPA & Sains';
  }
  if (
    s.includes('indonesia') ||
    s.includes('inggris') ||
    s.includes('arab') ||
    s.includes('jepang') ||
    s.includes('jerman') ||
    s.includes('mandarin')
  ) {
    return 'Bahasa & Sastra';
  }
  if (
    s.includes('sunda') ||
    s.includes('jawa') ||
    s.includes('madura') ||
    s.includes('mulok') ||
    s.includes('muatan lokal')
  ) {
    return 'Muatan Lokal';
  }
  if (
    s.includes('ips') ||
    s.includes('sosial') ||
    s.includes('sejarah') ||
    s.includes('geografi') ||
    s.includes('ekonomi') ||
    s.includes('sosiologi') ||
    s.includes('pancasila') ||
    s.includes('pkn')
  ) {
    return 'Sosial & Humaniora';
  }
  return 'Umum';
}

export function getSubjectCode(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes('matematika')) return 'MTK';
  if (s.includes('ipa') || s.includes('alam')) return 'IPA';
  if (s.includes('ips') || s.includes('sosial')) return 'IPS';
  if (s.includes('indonesia')) return 'BIN';
  if (s.includes('inggris')) return 'BIG';
  if (s.includes('arab')) return 'ARB';
  if (s.includes("qur'an") || s.includes('hadis')) return 'QRD';
  if (s.includes('akidah') || s.includes('akhlak')) return 'AAK';
  if (s.includes('fikih')) return 'FKH';
  if (s.includes('ski') || s.includes('sejarah kebudayaan')) return 'SKI';
  if (s.includes('pancasila') || s.includes('pkn')) return 'PKN';
  if (s.includes('pjok') || s.includes('jasmani')) return 'PJK';
  if (s.includes('seni')) return 'SBD';
  if (s.includes('prakarya') || s.includes('informatika') || s.includes('tik')) return 'INF';
  if (s.includes('sunda')) return 'SND';
  if (s.includes('btq')) return 'BTQ';
  if (s.includes('tahfidz')) return 'THF';

  // Fallback abbreviation
  const words = subject.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
}

/**
 * Default preset for subject question counts and weights
 */
export function getDefaultSubjectConfig(subject: string): SubjectGradingConfig {
  const s = subject.toLowerCase();
  const code = getSubjectCode(subject);
  const category = getSubjectCategory(subject);
  
  // Matematika & IPA usually have fewer questions due to calculations
  if (s.includes('matematika')) {
    return {
      subject,
      code,
      category,
      kkm: 75,
      totalPgQuestions: 30,
      totalEssayQuestions: 5,
      maxEssayScore: 5,
      weightPg: 70,
      weightEssay: 30,
      teacherName: 'Guru Matematika',
      teacherNip: '-',
      scoringMode: 'item_count',
    };
  }
  if (s.includes('ipa') || s.includes('alam')) {
    return {
      subject,
      code,
      category,
      kkm: 75,
      totalPgQuestions: 35,
      totalEssayQuestions: 5,
      maxEssayScore: 5,
      weightPg: 70,
      weightEssay: 30,
      teacherName: 'Guru IPA',
      teacherNip: '-',
      scoringMode: 'item_count',
    };
  }
  if (s.includes('informatika') || s.includes('tik')) {
    return {
      subject,
      code,
      category,
      kkm: 75,
      totalPgQuestions: 50,
      totalEssayQuestions: 0,
      maxEssayScore: 0,
      weightPg: 100,
      weightEssay: 0,
      teacherName: 'Guru Informatika',
      teacherNip: '-',
      scoringMode: 'item_count',
    };
  }

  // Standard 40 PG & 5 Esai for languages, religion, humanities
  return {
    subject,
    code,
    category,
    kkm: 75,
    totalPgQuestions: 40,
    totalEssayQuestions: 5,
    maxEssayScore: 5,
    weightPg: 70,
    weightEssay: 30,
    teacherName: `Guru ${subject}`,
    teacherNip: '-',
    scoringMode: 'item_count',
  };
}

/**
 * Calculate Exam Score from Question Counts (Benar & Salah)
 * - Input: Jumlah Benar PG, Jumlah Benar/Skor Esai
 * - Formula:
 *   Nilai PG (0-100) = (Benar PG / Total PG) * 100
 *   Nilai Esai (0-100) = (Skor Esai / Max Skor Esai) * 100
 *   Nilai Akhir (0-100) = (Nilai PG * Bobot PG + Nilai Esai * Bobot Esai) / (Bobot PG + Bobot Esai)
 *   -> Jika benar semua (Benar PG = Total PG & Benar Esai = Max Esai), MAKA NILAI AKHIR = 100!
 */
export function calculateExamScoreFromCounts(
  correctPg: number | null | undefined,
  correctEssay: number | null | undefined,
  config: SubjectGradingConfig
): {
  correctPg: number;
  wrongPg: number;
  correctEssay: number;
  scorePg: number;
  scoreEssay: number;
  scoreFinal: number;
  passed: boolean;
} {
  const totalPg = Math.max(0, config.totalPgQuestions ?? 40);
  const totalEssay = Math.max(0, config.totalEssayQuestions ?? 5);
  const maxEssay = config.maxEssayScore && config.maxEssayScore > 0 ? config.maxEssayScore : (totalEssay > 0 ? totalEssay : 1);
  const kkm = config.kkm || DEFAULT_KKM;

  // Clean correct PG input (cannot exceed total questions or fall below 0)
  const validCorrectPg = correctPg !== null && correctPg !== undefined 
    ? Math.min(totalPg, Math.max(0, Math.round(correctPg)))
    : 0;
  const wrongPg = Math.max(0, totalPg - validCorrectPg);

  // Clean correct Essay input
  const validCorrectEssay = correctEssay !== null && correctEssay !== undefined
    ? Math.min(maxEssay, Math.max(0, Math.round(correctEssay * 10) / 10))
    : 0;

  // Score PG (0 - 100)
  const scorePg = totalPg > 0 ? (validCorrectPg / totalPg) * 100 : 100;

  // Score Essay (0 - 100)
  const scoreEssay = totalEssay > 0 ? (validCorrectEssay / maxEssay) * 100 : 100;

  // Weights
  let weightPg = config.weightPg ?? 70;
  let weightEssay = config.weightEssay ?? 30;

  if (totalEssay === 0) {
    weightPg = 100;
    weightEssay = 0;
  } else if (totalPg === 0) {
    weightPg = 0;
    weightEssay = 100;
  }

  const totalWeight = weightPg + weightEssay;
  const ratioPg = totalWeight > 0 ? weightPg / totalWeight : 1;
  const ratioEssay = totalWeight > 0 ? weightEssay / totalWeight : 0;

  // If user got all correct, score is exactly 100
  let scoreFinal: number;
  if (totalPg > 0 && validCorrectPg === totalPg && (totalEssay === 0 || validCorrectEssay >= maxEssay)) {
    scoreFinal = 100;
  } else {
    const raw = (scorePg * ratioPg) + (scoreEssay * ratioEssay);
    scoreFinal = Math.min(100, Math.max(0, Math.round(raw * 10) / 10));
  }

  const passed = scoreFinal >= kkm;

  return {
    correctPg: validCorrectPg,
    wrongPg,
    correctEssay: validCorrectEssay,
    scorePg: Math.round(scorePg * 10) / 10,
    scoreEssay: Math.round(scoreEssay * 10) / 10,
    scoreFinal,
    passed,
  };
}

/**
 * Legacy/Alternative Final Score Calculator (Direct percentage or direct score)
 */
export function calculateFinalScore(
  pg: number | null | undefined,
  essay: number | null | undefined,
  weightPg: number = 70,
  weightEssay: number = 30,
  scoringMode: 'combined' | 'direct' = 'combined'
): number {
  if (scoringMode === 'direct') {
    return Math.min(100, Math.max(0, Math.round(pg ?? 0)));
  }

  const validPg = pg !== null && pg !== undefined ? Math.min(100, Math.max(0, pg)) : 0;
  const validEssay = essay !== null && essay !== undefined ? Math.min(100, Math.max(0, essay)) : 0;

  const totalWeight = weightPg + weightEssay;
  if (totalWeight <= 0) return validPg;

  const calculated = (validPg * weightPg + validEssay * weightEssay) / totalWeight;
  return Math.round(calculated * 10) / 10;
}

/**
 * Determine Predicate (A, B, C, D) and Label based on KKM
 */
export function getGradePredicate(
  score: number,
  kkm: number = DEFAULT_KKM
): {
  predicate: 'A' | 'B' | 'C' | 'D';
  label: string;
  badgeClass: string;
} {
  if (score >= 90) {
    return {
      predicate: 'A',
      label: 'Sangat Baik',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    };
  }
  if (score >= 80) {
    return {
      predicate: 'B',
      label: 'Baik',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    };
  }
  if (score >= kkm) {
    return {
      predicate: 'C',
      label: 'Cukup',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    };
  }
  return {
    predicate: 'D',
    label: 'Perlu Bimbingan',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
  };
}

/**
 * Deterministic pseudo-random number generator for consistent realistic demo scores
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate sample/initial grades with realistic Correct/Wrong PG and Essay counts
 */
export function generateSampleGrades(
  students: Student[],
  subjects: string[],
  kkm: number = DEFAULT_KKM
): ExamGradeItem[] {
  const result: ExamGradeItem[] = [];
  const primarySubjects = subjects.length > 0 
    ? subjects.slice(0, 5) 
    : ['Matematika', 'Bahasa Indonesia', 'IPA', 'Al-Qur\'an Hadis', 'Bahasa Inggris'];

  primarySubjects.forEach((subject, subIdx) => {
    const subjectConfig = getDefaultSubjectConfig(subject);
    const totalPg = subjectConfig.totalPgQuestions;
    const totalEssay = subjectConfig.totalEssayQuestions;

    students.forEach((student, stuIdx) => {
      const seed = (stuIdx + 1) * 31 + (subIdx + 1) * 97;
      const rand1 = seededRandom(seed);
      const rand2 = seededRandom(seed + 17);

      let correctPg: number;
      let correctEssay: number;

      if (rand1 > 0.18) {
        // Tuntas: High correct count (80% - 100% correct)
        const pgRatio = 0.78 + rand1 * 0.22;
        correctPg = Math.min(totalPg, Math.floor(totalPg * pgRatio));
        const essayRatio = 0.75 + rand2 * 0.25;
        correctEssay = totalEssay > 0 ? Math.min(totalEssay, Math.round(totalEssay * essayRatio * 10) / 10) : 0;
      } else {
        // Remedial: Lower correct count (55% - 73% correct)
        const pgRatio = 0.55 + rand1 * 0.18;
        correctPg = Math.min(totalPg, Math.floor(totalPg * pgRatio));
        const essayRatio = 0.50 + rand2 * 0.22;
        correctEssay = totalEssay > 0 ? Math.min(totalEssay, Math.round(totalEssay * essayRatio * 10) / 10) : 0;
      }

      const calculated = calculateExamScoreFromCounts(correctPg, correctEssay, subjectConfig);
      const remedial = !calculated.passed ? Math.min(100, Math.floor(kkm + rand2 * 8)) : null;

      result.push({
        id: `${student.id}_${subject}`,
        studentId: student.id,
        studentName: student.name,
        nisn: student.nisn || '',
        nis: student.nis || '',
        className: student.className,
        examNumber: student.examNumber || '',
        roomId: student.roomId || '',
        roomName: student.roomName || '',
        seatNumber: student.seatNumber,
        subject,
        correctPg: calculated.correctPg,
        wrongPg: calculated.wrongPg,
        correctEssay: calculated.correctEssay,
        scorePg: calculated.scorePg,
        scoreEssay: calculated.scoreEssay,
        scoreFinal: calculated.scoreFinal,
        remedialScore: remedial,
        passed: calculated.passed,
        notes: calculated.passed ? 'Tuntas memenuhi KKM' : 'Perlu bimbingan & remedial indikator',
        updatedAt: new Date().toISOString(),
      });
    });
  });

  return result;
}

/**
 * Export Grade Sheet to Native Microsoft Excel (.xlsx) file with Benar/Salah details
 */
export function exportGradesToExcel(
  students: Student[],
  grades: ExamGradeItem[],
  config: ExamConfig,
  subject: string,
  gradingConfig: SubjectGradingConfig,
  targetFilterLabel: string = 'Semua Siswa'
): void {
  const kkm = gradingConfig.kkm || DEFAULT_KKM;
  const totalPg = gradingConfig.totalPgQuestions ?? 40;
  const totalEssay = gradingConfig.totalEssayQuestions ?? 5;
  const weightPg = gradingConfig.weightPg ?? 70;
  const weightEssay = gradingConfig.weightEssay ?? 30;

  // Grade map
  const gradeMap = new Map<string, ExamGradeItem>();
  grades.filter((g) => g.subject === subject).forEach((g) => {
    gradeMap.set(g.studentId, g);
  });

  // Build Excel headers
  const headers = [
    'No',
    'No. Peserta Ujian',
    'NISN',
    'NIS',
    'Nama Lengkap Siswa',
    'Kelas',
    'Ruang',
    'No. Meja',
    `Benar PG (dari ${totalPg})`,
    `Salah PG`,
    `Nilai PG (${weightPg}%)`,
    `Benar/Skor Esai (dari ${totalEssay})`,
    `Nilai Esai (${weightEssay}%)`,
    'Nilai Akhir (100 jika benar semua)',
    'Nilai Remedial',
    'Predikat',
    'Status (KKM ' + kkm + ')',
    'Catatan / Evaluasi',
  ];

  const rows: any[][] = [];

  // Metadata headers in Excel
  rows.push([`${config.schoolName.toUpperCase()}`]);
  rows.push([`DAFTAR NILAI HASIL ${config.examTitle.toUpperCase()}`]);
  rows.push([`TAHUN AJARAN ${config.academicYear} - SEMESTER ${config.semester.toUpperCase()}`]);
  rows.push([]);
  rows.push(['Mata Pelajaran:', subject, '', 'KKM / KKTP:', kkm]);
  rows.push([
    'Format Butir Soal:',
    `${totalPg} Butir PG, ${totalEssay} Butir Esai`,
    '',
    'Bobot Penilaian:',
    `PG ${weightPg}% : Esai ${weightEssay}% (Benar semua = 100)`,
  ]);
  rows.push(['Rombel / Filter:', targetFilterLabel, '', 'Guru Pengampu / Korektor:', gradingConfig.teacherName || 'Panitia Ujian']);
  rows.push(['Tanggal Cetak:', new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })]);
  rows.push([]);
  rows.push(headers);

  let totalScore = 0;
  let highestScore = 0;
  let lowestScore = 100;
  let passedCount = 0;

  students.forEach((student, index) => {
    const grade = gradeMap.get(student.id);
    const correctPg = grade?.correctPg ?? '';
    const wrongPg = grade?.wrongPg ?? (typeof correctPg === 'number' ? Math.max(0, totalPg - correctPg) : '');
    const correctEssay = grade?.correctEssay ?? '';
    const scorePg = grade?.scorePg ?? '';
    const scoreEssay = grade?.scoreEssay ?? '';
    const scoreFinal = grade?.scoreFinal ?? (typeof scorePg === 'number' ? scorePg : 0);
    const remedial = grade?.remedialScore ?? '';
    const isPassed = typeof scoreFinal === 'number' ? scoreFinal >= kkm : false;
    const predicate = typeof scoreFinal === 'number' ? getGradePredicate(scoreFinal, kkm).predicate : '';

    if (typeof scoreFinal === 'number' && grade) {
      totalScore += scoreFinal;
      if (scoreFinal > highestScore) highestScore = scoreFinal;
      if (scoreFinal < lowestScore) lowestScore = scoreFinal;
      if (isPassed) passedCount++;
    }

    rows.push([
      index + 1,
      student.examNumber || '-',
      student.nisn || '-',
      student.nis || '-',
      student.name,
      student.className,
      student.roomName || '-',
      student.seatNumber || '-',
      correctPg,
      wrongPg,
      scorePg,
      correctEssay,
      scoreEssay,
      scoreFinal,
      remedial,
      predicate,
      isPassed ? 'TUNTAS' : 'REMEDIAL',
      grade?.notes || '',
    ]);
  });

  // Summary rows
  const evaluatedCount = students.filter((s) => gradeMap.has(s.id)).length;
  const avgScore = evaluatedCount > 0 ? (totalScore / evaluatedCount).toFixed(1) : '0';
  const passRate = evaluatedCount > 0 ? ((passedCount / evaluatedCount) * 100).toFixed(1) + '%' : '0%';

  rows.push([]);
  rows.push(['REKAPITULASI HASIL UJIAN']);
  rows.push(['Total Peserta', students.length]);
  rows.push(['Peserta Dinilai', evaluatedCount]);
  rows.push(['Peserta Tuntas', `${passedCount} siswa (${passRate})`]);
  rows.push(['Peserta Remedial', `${evaluatedCount - passedCount} siswa`]);
  rows.push(['Nilai Rata-Rata', avgScore]);
  rows.push(['Nilai Tertinggi', evaluatedCount > 0 ? highestScore : '-']);
  rows.push(['Nilai Terendah', evaluatedCount > 0 ? lowestScore : '-']);

  rows.push([]);
  rows.push([]);
  rows.push([
    '',
    `Mengetahui,`,
    '',
    '',
    '',
    '',
    '',
    `${config.issuePlace || 'Bogor'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
  ]);
  rows.push([
    '',
    `Kepala ${config.schoolName}`,
    '',
    '',
    '',
    '',
    '',
    `Guru Mata Pelajaran / Korektor,`,
  ]);
  rows.push([]);
  rows.push([]);
  rows.push([
    '',
    `${config.principalName || 'Kepala Sekolah'}`,
    '',
    '',
    '',
    '',
    '',
    `${gradingConfig.teacherName || 'Guru Pengampu'}`,
  ]);
  rows.push([
    '',
    `NIP. ${config.principalNip || '-'}`,
    '',
    '',
    '',
    '',
    '',
    `NIP. ${gradingConfig.teacherNip || '-'}`,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 18 }, // No. Peserta
    { wch: 14 }, // NISN
    { wch: 12 }, // NIS
    { wch: 28 }, // Nama
    { wch: 10 }, // Kelas
    { wch: 12 }, // Ruang
    { wch: 9 },  // Meja
    { wch: 16 }, // Benar PG
    { wch: 12 }, // Salah PG
    { wch: 14 }, // Nilai PG
    { wch: 18 }, // Benar Esai
    { wch: 14 }, // Nilai Esai
    { wch: 18 }, // Nilai Akhir
    { wch: 14 }, // Nilai Remedial
    { wch: 9 },  // Predikat
    { wch: 14 }, // Status
    { wch: 24 }, // Catatan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Nilai');

  const cleanSubject = subject.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanFilter = targetFilterLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Daftar_Nilai_${config.examType}_${cleanSubject}_${cleanFilter}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

/**
 * Export all subjects into a single comprehensive Excel workbook (Multi-sheet)
 */
export function exportAllSubjectsGradesToExcel(
  students: Student[],
  grades: ExamGradeItem[],
  config: ExamConfig,
  subjects: string[],
  gradingConfigs: Record<string, SubjectGradingConfig>
): void {
  const workbook = XLSX.utils.book_new();

  // 1. Master Leger Sheet (Rekap Semua Mapel)
  const masterHeaders = [
    'No',
    'No. Peserta',
    'NISN',
    'Nama Lengkap Siswa',
    'Kelas',
    ...subjects,
    'Jumlah Nilai',
    'Rata-rata',
    'Status Umum',
  ];

  const masterRows: any[][] = [
    [`${config.schoolName.toUpperCase()}`],
    [`LEGER REKAPITULASI HASIL ${config.examTitle.toUpperCase()}`],
    [`TAHUN AJARAN ${config.academicYear} - SEMESTER ${config.semester.toUpperCase()}`],
    [],
    masterHeaders,
  ];

  students.forEach((student, idx) => {
    let sum = 0;
    let count = 0;
    let hasFailed = false;

    const subjectScores = subjects.map((sub) => {
      const g = grades.find((item) => item.studentId === student.id && item.subject === sub);
      const score = typeof g?.scoreFinal === 'number' ? g.scoreFinal : null;
      if (score !== null) {
        sum += score;
        count++;
        const kkm = gradingConfigs[sub]?.kkm || DEFAULT_KKM;
        if (score < kkm) hasFailed = true;
        return score;
      }
      return '-';
    });

    const avg = count > 0 ? Math.round((sum / count) * 10) / 10 : '-';
    const status = count === 0 ? 'Belum Ada Nilai' : hasFailed ? 'Ada Remedial' : 'Tuntas Semua';

    masterRows.push([
      idx + 1,
      student.examNumber,
      student.nisn,
      student.name,
      student.className,
      ...subjectScores,
      count > 0 ? Math.round(sum * 10) / 10 : '-',
      avg,
      status,
    ]);
  });

  const masterWs = XLSX.utils.aoa_to_sheet(masterRows);
  XLSX.utils.book_append_sheet(workbook, masterWs, 'REKAP_LEGER');

  // 2. Individual Sheet for each subject
  subjects.forEach((sub) => {
    const subConfig = gradingConfigs[sub] || getDefaultSubjectConfig(sub);
    const kkm = subConfig.kkm || DEFAULT_KKM;
    const totalPg = subConfig.totalPgQuestions ?? 40;
    const totalEssay = subConfig.totalEssayQuestions ?? 5;
    const weightPg = subConfig.weightPg ?? 70;
    const weightEssay = subConfig.weightEssay ?? 30;

    const subGradeMap = new Map<string, ExamGradeItem>();
    grades.filter((g) => g.subject === sub).forEach((g) => {
      subGradeMap.set(g.studentId, g);
    });

    const headers = [
      'No',
      'No. Peserta',
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Ruang',
      `Benar PG (dari ${totalPg})`,
      `Salah PG`,
      `Nilai PG (${weightPg}%)`,
      `Benar/Skor Esai`,
      `Nilai Esai (${weightEssay}%)`,
      'Nilai Akhir (100 jika benar semua)',
      'Nilai Remedial',
      'Predikat',
      'Status (KKM ' + kkm + ')',
      'Catatan',
    ];

    const subRows: any[][] = [
      [`${config.schoolName.toUpperCase()}`],
      [`DAFTAR NILAI ${sub.toUpperCase()}`],
      [`KKM: ${kkm} | Pengampu: ${subConfig.teacherName || '-'}`],
      [],
      headers,
    ];

    students.forEach((student, idx) => {
      const g = subGradeMap.get(student.id);
      const finalScore = typeof g?.scoreFinal === 'number' ? g.scoreFinal : '';
      const pred = typeof g?.scoreFinal === 'number' ? getGradePredicate(g.scoreFinal, kkm).predicate : '';
      const status = typeof g?.scoreFinal === 'number' ? (g.scoreFinal >= kkm ? 'TUNTAS' : 'REMEDIAL') : '';

      subRows.push([
        idx + 1,
        student.examNumber,
        student.nisn,
        student.name,
        student.className,
        student.roomName || '-',
        g?.correctPg ?? '',
        g?.wrongPg ?? '',
        g?.scorePg ?? '',
        g?.correctEssay ?? '',
        g?.scoreEssay ?? '',
        finalScore,
        g?.remedialScore ?? '',
        pred,
        status,
        g?.notes || '',
      ]);
    });

    const subWs = XLSX.utils.aoa_to_sheet(subRows);
    const safeSheetName = sub.substring(0, 28).replace(/[\\/?*:[\]]/g, '_');
    XLSX.utils.book_append_sheet(workbook, subWs, safeSheetName);
  });

  const fileName = `Semua_Nilai_Mapel_${config.examType}_${config.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Export Blank or Pre-Filled Excel Template with Benar/Salah Columns
 */
export function exportGradesTemplateToExcel(
  students: Student[],
  config: ExamConfig,
  subject: string,
  gradingConfig: SubjectGradingConfig,
  targetFilterLabel: string = 'Semua Siswa'
): void {
  const kkm = gradingConfig.kkm || DEFAULT_KKM;
  const totalPg = gradingConfig.totalPgQuestions ?? 40;
  const totalEssay = gradingConfig.totalEssayQuestions ?? 5;
  const weightPg = gradingConfig.weightPg ?? 70;
  const weightEssay = gradingConfig.weightEssay ?? 30;

  const headers = [
    'No',
    'No. Peserta Ujian',
    'NISN',
    'NIS',
    'Nama Lengkap Siswa',
    'Kelas',
    'Ruang',
    `Jumlah Benar PG (Max ${totalPg})`,
    `Jumlah Benar / Skor Esai (Max ${totalEssay})`,
    'Nilai Remedial (Opsional)',
    'Catatan / Evaluasi',
  ];

  const rows: any[][] = [];
  rows.push([`TEMPLATE PENGISIAN NILAI BENAR-SALAH - ${config.schoolName.toUpperCase()}`]);
  rows.push([
    `Mata Pelajaran: ${subject} | Jml Soal: ${totalPg} PG, ${totalEssay} Esai | Bobot: PG ${weightPg}%, Esai ${weightEssay}% | KKM: ${kkm}`,
  ]);
  rows.push([
    `Petunjuk: Isi 'Jumlah Benar PG' (0 s/d ${totalPg}) dan 'Skor Esai' (0 s/d ${totalEssay}). Jika benar semua otomatis 100.`,
  ]);
  rows.push([]);
  rows.push(headers);

  students.forEach((student, index) => {
    rows.push([
      index + 1,
      student.examNumber || '',
      student.nisn || '',
      student.nis || '',
      student.name,
      student.className,
      student.roomName || '',
      '', // Benar PG
      '', // Skor Esai
      '', // Remedial
      '', // Catatan
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 28 },
    { wch: 10 },
    { wch: 12 },
    { wch: 22 },
    { wch: 24 },
    { wch: 18 },
    { wch: 24 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Input Nilai');

  const cleanSubject = subject.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Template_Nilai_BenarSalah_${config.examType}_${cleanSubject}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

export interface ParsedStudentRowItem {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  examNumber: string;
  nisn: string;
  nis: string;
  correctPg: number;
  wrongPg: number;
  correctEssay: number;
  scorePg: number;
  scoreEssay: number;
  scoreFinal: number;
  remedialScore: number | null;
  passed: boolean;
  notes: string;
  sourceFile: string;
  sourceRowNumber: number;
  matchType: 'db_exact' | 'db_fuzzy' | 'excel_new';
  grade: ExamGradeItem;
}

export interface SkippedRowDiagnostic {
  rowNumber: number;
  reason: string;
  rawExcerpt: string;
  sourceFile?: string;
}

export interface ColumnMappingDetected {
  nameCol?: string;
  examNoCol?: string;
  nisnCol?: string;
  nisCol?: string;
  classCol?: string;
  correctPgCol?: string;
  wrongPgCol?: string;
  essayCol?: string;
  finalScoreCol?: string;
  remedialCol?: string;
  notesCol?: string;
}

export interface ClassParsedGroup {
  className: string;
  sourceFiles: string[];
  grades: ExamGradeItem[];
  parsedRows: ParsedStudentRowItem[];
  studentCount: number;
  totalStudentsInDb: number;
  avgScore: number;
  minScore: number;
  maxScore: number;
  passedCount: number;
  remedialCount: number;
}

export interface MultiFileParseResult {
  fileResults: {
    fileName: string;
    fileSize: number;
    importedCount: number;
    classes: string[];
    errors: string[];
    columnMapping?: ColumnMappingDetected;
    skippedRows?: SkippedRowDiagnostic[];
  }[];
  classes: ClassParsedGroup[];
  allGrades: ExamGradeItem[];
  allParsedRows: ParsedStudentRowItem[];
  totalStudentsParsed: number;
  totalFiles: number;
  errors: string[];
  skippedRows: SkippedRowDiagnostic[];
  columnMapping?: ColumnMappingDetected;
}

/**
 * Normalizes string for fuzzy/exact matching
 */
function normalizeText(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanAlphanumeric(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parse rows of a single worksheet into student exam grades.
 * Resilient against:
 * - 1-row and 2-row merged headers
 * - Indonesian column name variations
 * - Students with slight name/code differences or students newly declared in Excel
 * - Direct final score columns or question counts
 */
export function parseSheetRows(
  jsonRows: any[],
  students: Student[],
  subject: string,
  gradingConfig: SubjectGradingConfig,
  fileName: string = 'File Excel'
): {
  importedCount: number;
  updatedGrades: ExamGradeItem[];
  parsedRows: ParsedStudentRowItem[];
  skippedRows: SkippedRowDiagnostic[];
  columnMapping: ColumnMappingDetected;
  errors: string[];
} {
  if (!jsonRows || jsonRows.length === 0) {
    return {
      importedCount: 0,
      updatedGrades: [],
      parsedRows: [],
      skippedRows: [{ rowNumber: 1, reason: 'Lembar kerja (sheet) kosong tanpa baris', rawExcerpt: '' }],
      columnMapping: {},
      errors: ['Lembar kerja Excel kosong.'],
    };
  }

  // Pre-index existing database students for fast & flexible lookup
  const studentByExamNo = new Map<string, Student>();
  const studentByName = new Map<string, Student>();
  const studentByNisn = new Map<string, Student>();
  const studentByNis = new Map<string, Student>();
  const studentsByClass = new Map<string, Student[]>();

  students.forEach((s) => {
    const exKey = cleanAlphanumeric(s.examNumber);
    if (exKey.length >= 2) studentByExamNo.set(exKey, s);

    const nisnKey = cleanAlphanumeric(s.nisn);
    if (nisnKey.length >= 4) studentByNisn.set(nisnKey, s);

    const nisKey = cleanAlphanumeric(s.nis);
    if (nisKey.length >= 2) studentByNis.set(nisKey, s);

    const nameKey = normalizeText(s.name);
    if (nameKey.length >= 2) studentByName.set(nameKey, s);

    const cls = s.className || 'Tanpa Kelas';
    if (!studentsByClass.has(cls)) studentsByClass.set(cls, []);
    studentsByClass.get(cls)!.push(s);
  });

  // Find header row(s) - check single row or merged 2 rows (i and i+1)
  let headerRowIndex = -1;
  let headerRowsSpan = 1;
  let colIndexNisn = -1;
  let colIndexExamNo = -1;
  let colIndexNis = -1;
  let colIndexName = -1;
  let colIndexClass = -1;
  let colIndexRoom = -1;
  let colIndexCorrectPg = -1;
  let colIndexWrongPg = -1;
  let colIndexCorrectEssay = -1;
  let colIndexFinal = -1;
  let colIndexRemedial = -1;
  let colIndexNotes = -1;

  const maxScanRows = Math.min(35, jsonRows.length);

  for (let i = 0; i < maxScanRows; i++) {
    const row = jsonRows[i];
    if (!Array.isArray(row)) continue;

    const nextRow = i + 1 < jsonRows.length && Array.isArray(jsonRows[i + 1]) ? jsonRows[i + 1] : null;

    let tempNisn = -1;
    let tempExamNo = -1;
    let tempNis = -1;
    let tempName = -1;
    let tempClass = -1;
    let tempRoom = -1;
    let tempCorrectPg = -1;
    let tempWrongPg = -1;
    let tempCorrectEssay = -1;
    let tempFinal = -1;
    let tempRemedial = -1;
    let tempNotes = -1;

    const maxCols = Math.max(row.length, nextRow ? nextRow.length : 0);

    for (let j = 0; j < maxCols; j++) {
      const cell1 = String(row[j] || '').trim();
      const cell2 = nextRow ? String(nextRow[j] || '').trim() : '';
      const combined = `${cell1} ${cell2}`.toLowerCase().replace(/\s+/g, ' ').trim();
      const lower1 = cell1.toLowerCase();
      const lower2 = cell2.toLowerCase();

      const testAny = (...candidates: string[]) => {
        return candidates.some(
          (c) => combined.includes(c) || lower1.includes(c) || lower2.includes(c)
        );
      };

      // 1. NISN
      if (tempNisn === -1 && testAny('nisn')) {
        tempNisn = j;
      }

      // 2. No Peserta / Ujian
      if (
        tempExamNo === -1 &&
        (testAny('peserta', 'no ujian', 'nomor ujian', 'no. ujian', 'kode peserta', 'no tes', 'id peserta') ||
          (combined.includes('no') && combined.includes('peserta')))
      ) {
        tempExamNo = j;
      }

      // 3. NIS / No Induk
      if (
        tempNis === -1 &&
        (combined === 'nis' ||
          lower1 === 'nis' ||
          lower2 === 'nis' ||
          testAny('no induk', 'nomor induk', 'nipd') ||
          (testAny('nis') && !testAny('nisn')))
      ) {
        tempNis = j;
      }

      // 4. Nama Siswa / Murid
      if (
        tempName === -1 &&
        (testAny('nama siswa', 'nama lengkap', 'nama peserta', 'nama murid', 'nama') ||
          combined === 'siswa' ||
          lower1 === 'siswa')
      ) {
        tempName = j;
      }

      // 5. Kelas / Rombel
      if (
        tempClass === -1 &&
        testAny('kelas', 'rombel', 'rombongan belajar', 'tingkat', 'kls')
      ) {
        tempClass = j;
      }

      // 6. Ruang
      if (tempRoom === -1 && testAny('ruang', 'ruangan')) {
        tempRoom = j;
      }

      // 7. Benar PG
      if (
        tempCorrectPg === -1 &&
        (testAny(
          'benar pg',
          'jml benar pg',
          'jumlah benar pg',
          'benar (pg)',
          'pg benar',
          'jawaban benar pg',
          'b pg',
          'benar (dari'
        ) ||
          ((testAny('benar') || testAny('jml benar') || testAny('jumlah benar')) &&
            (testAny('pg') || testAny('pilihan ganda'))) ||
          (testAny('pg') && !testAny('bobot') && !testAny('esai') && !testAny('essay') && !testAny('salah')))
      ) {
        tempCorrectPg = j;
      }

      // 8. Salah PG
      if (
        tempWrongPg === -1 &&
        (testAny('salah pg', 'jml salah pg', 'jumlah salah pg', 'salah (pg)', 'pg salah', 's pg') ||
          (testAny('salah') && testAny('pg')))
      ) {
        tempWrongPg = j;
      }

      // 9. Benar / Skor Esai
      if (
        tempCorrectEssay === -1 &&
        (testAny(
          'benar/skor esai',
          'benar / skor esai',
          'skor esai',
          'nilai esai',
          'benar esai',
          'esai',
          'essay',
          'uraian',
          'soal esai',
          'skor uraian'
        ) ||
          (testAny('skor') && testAny('esai')))
      ) {
        tempCorrectEssay = j;
      }

      // 10. Nilai Akhir / Skor Final / Nilai Ujian
      if (
        tempFinal === -1 &&
        (testAny(
          'nilai akhir',
          'skor akhir',
          'total nilai',
          'nilai ujian',
          'nilai sts',
          'nilai sas',
          'nilai siswa',
          'nilai murni',
          'skala 100',
          '100 jika benar',
          'total skor',
          'skor final',
          'nilai perolehan'
        ) ||
          (combined === 'nilai' || lower1 === 'nilai' || lower2 === 'nilai') ||
          (combined === 'skor' || lower1 === 'skor' || lower2 === 'skor') ||
          (combined === 'total' || lower1 === 'total' || lower2 === 'total') ||
          (testAny('nilai') && !testAny('pg') && !testAny('esai') && !testAny('remedi')))
      ) {
        tempFinal = j;
      }

      // 11. Remedial
      if (
        tempRemedial === -1 &&
        testAny('remedial', 'remedi', 'nilai remedial', 'perbaikan', 'nilai perbaikan')
      ) {
        tempRemedial = j;
      }

      // 12. Catatan / Evaluasi
      if (
        tempNotes === -1 &&
        testAny('catatan', 'evaluasi', 'keterangan', 'deskripsi', 'catatan guru')
      ) {
        tempNotes = j;
      }
    }

    const hasIdentifier = tempName !== -1 || tempExamNo !== -1 || tempNisn !== -1 || tempNis !== -1;
    const hasScoreCol =
      tempCorrectPg !== -1 ||
      tempCorrectEssay !== -1 ||
      tempFinal !== -1 ||
      tempWrongPg !== -1;

    if (hasIdentifier && hasScoreCol) {
      headerRowIndex = i;
      // If detection relied on cells in nextRow, the header spans 2 rows
      headerRowsSpan = nextRow && (tempCorrectPg !== -1 || tempCorrectEssay !== -1) ? 2 : 1;
      colIndexNisn = tempNisn;
      colIndexExamNo = tempExamNo;
      colIndexNis = tempNis;
      colIndexName = tempName;
      colIndexClass = tempClass;
      colIndexRoom = tempRoom;
      colIndexCorrectPg = tempCorrectPg;
      colIndexWrongPg = tempWrongPg;
      colIndexCorrectEssay = tempCorrectEssay;
      colIndexFinal = tempFinal;
      colIndexRemedial = tempRemedial;
      colIndexNotes = tempNotes;
      break;
    }
  }

  // Fallback: If no strict header found, search for row with Nama or No Peserta
  if (headerRowIndex === -1) {
    for (let i = 0; i < maxScanRows; i++) {
      const row = jsonRows[i];
      if (!Array.isArray(row)) continue;
      for (let j = 0; j < row.length; j++) {
        const str = String(row[j] || '').toLowerCase().trim();
        if (str.includes('nama') || str.includes('siswa') || str.includes('peserta')) {
          headerRowIndex = i;
          colIndexName = j;
          // Assign remaining probable columns
          for (let k = 0; k < row.length; k++) {
            const cStr = String(row[k] || '').toLowerCase().trim();
            if (cStr.includes('nisn')) colIndexNisn = k;
            else if (cStr.includes('kelas') || cStr.includes('rombel')) colIndexClass = k;
            else if (cStr.includes('peserta') || cStr.includes('ujian')) colIndexExamNo = k;
            else if (cStr.includes('benar') || cStr.includes('pg')) colIndexCorrectPg = k;
            else if (cStr.includes('esai') || cStr.includes('essay')) colIndexCorrectEssay = k;
            else if (cStr.includes('nilai') || cStr.includes('skor')) colIndexFinal = k;
            else if (cStr.includes('remedi')) colIndexRemedial = k;
            else if (cStr.includes('catatan')) colIndexNotes = k;
          }
          break;
        }
      }
      if (headerRowIndex !== -1) break;
    }
  }

  if (headerRowIndex === -1) {
    return {
      importedCount: 0,
      updatedGrades: [],
      parsedRows: [],
      skippedRows: [
        {
          rowNumber: 1,
          reason: 'Baris judul tabel nilai (kolom Nama / No Peserta / Nilai) tidak terdeteksi.',
          rawExcerpt: JSON.stringify(jsonRows[0] || []).substring(0, 100),
        },
      ],
      columnMapping: {},
      errors: [
        'Kolom tabel nilai tidak terdeteksi. Pastikan file Excel memuat kolom Nama Siswa, Kelas, serta Benar PG atau Nilai Akhir.',
      ],
    };
  }

  const columnMapping: ColumnMappingDetected = {
    nameCol: colIndexName !== -1 ? `Kolom ${String.fromCharCode(65 + colIndexName)}` : undefined,
    examNoCol: colIndexExamNo !== -1 ? `Kolom ${String.fromCharCode(65 + colIndexExamNo)}` : undefined,
    nisnCol: colIndexNisn !== -1 ? `Kolom ${String.fromCharCode(65 + colIndexNisn)}` : undefined,
    nisCol: colIndexNis !== -1 ? `Kolom ${String.fromCharCode(65 + colIndexNis)}` : undefined,
    classCol: colIndexClass !== -1 ? `Kolom ${String.fromCharCode(65 + colIndexClass)}` : undefined,
    correctPgCol: colIndexCorrectPg !== -1 ? `Kolom ${String.fromCharCode(65 + colIndexCorrectPg)}` : undefined,
    wrongPgCol: colIndexWrongPg !== -1 ? `Kolom ${String.fromCharCode(65 + colIndexWrongPg)}` : undefined,
    essayCol: colIndexCorrectEssay !== -1 ? `Kolom ${String.fromCharCode(65 + colIndexCorrectEssay)}` : undefined,
    finalScoreCol: colIndexFinal !== -1 ? `Kolom ${String.fromCharCode(65 + colIndexFinal)}` : undefined,
    remedialCol: colIndexRemedial !== -1 ? `Kolom ${String.fromCharCode(65 + colIndexRemedial)}` : undefined,
    notesCol: colIndexNotes !== -1 ? `Kolom ${String.fromCharCode(65 + colIndexNotes)}` : undefined,
  };

  const totalPg = gradingConfig.totalPgQuestions ?? 40;
  const totalEssay = gradingConfig.totalEssayQuestions ?? 5;
  const kkm = gradingConfig.kkm || DEFAULT_KKM;

  const parseNum = (val: any): number => {
    if (val === undefined || val === null || val === '') return NaN;
    if (typeof val === 'number') return isNaN(val) ? NaN : val;
    const str = String(val).replace(/%/g, '').replace(/,/g, '.').trim();
    const parsed = parseFloat(str);
    return isNaN(parsed) ? NaN : parsed;
  };

  const updatedGrades: ExamGradeItem[] = [];
  const parsedRows: ParsedStudentRowItem[] = [];
  const skippedRows: SkippedRowDiagnostic[] = [];
  const startRow = headerRowIndex + headerRowsSpan;

  for (let i = startRow; i < jsonRows.length; i++) {
    const row = jsonRows[i];
    const rowNum = i + 1; // 1-indexed for human readability

    if (!row || !Array.isArray(row) || row.length === 0) {
      skippedRows.push({
        rowNumber: rowNum,
        reason: 'Baris kosong tanpa data',
        rawExcerpt: '',
        sourceFile: fileName,
      });
      continue;
    }

    const firstCell = String(row[0] || '').toLowerCase().trim();
    const secondCell = String(row[1] || '').toLowerCase().trim();
    const allRowStr = row.map((c) => String(c || '').toLowerCase()).join(' ');

    // Detect footer/summary rows
    if (
      allRowStr.includes('statistik') ||
      allRowStr.includes('rata-rata') ||
      allRowStr.includes('mengetahui') ||
      allRowStr.includes('jumlah siswa') ||
      allRowStr.includes('kepala madrasah') ||
      allRowStr.includes('kepala sekolah') ||
      allRowStr.includes('guru mata pelajaran') ||
      allRowStr.includes('nip.') ||
      firstCell.includes('rata-rata') ||
      secondCell.includes('rata-rata') ||
      firstCell === 'jumlah' ||
      firstCell === 'total'
    ) {
      skippedRows.push({
        rowNumber: rowNum,
        reason: 'Baris footer / statistik / pengesahan tanda tangan (bukan siswa)',
        rawExcerpt: String(row.filter(Boolean).slice(0, 4).join(' | ')).substring(0, 80),
        sourceFile: fileName,
      });
      continue;
    }

    const rawExamNo = colIndexExamNo !== -1 ? String(row[colIndexExamNo] || '').trim() : '';
    const rawName = colIndexName !== -1 ? String(row[colIndexName] || '').trim() : '';
    const rawNisn = colIndexNisn !== -1 ? String(row[colIndexNisn] || '').trim() : '';
    const rawNis = colIndexNis !== -1 ? String(row[colIndexNis] || '').trim() : '';
    const rawClass = colIndexClass !== -1 ? String(row[colIndexClass] || '').trim() : '';
    const rawRoom = colIndexRoom !== -1 ? String(row[colIndexRoom] || '').trim() : '';

    // If completely no text or name, skip
    if (!rawName && !rawExamNo && !rawNisn && !rawNis) {
      skippedRows.push({
        rowNumber: rowNum,
        reason: 'Baris kosong tanpa identitas siswa (Nama/No. Peserta/NISN kosong)',
        rawExcerpt: String(row.filter(Boolean).slice(0, 3).join(' | ')).substring(0, 60),
        sourceFile: fileName,
      });
      continue;
    }

    // Extract numerical score fields
    const valCorrectPg = colIndexCorrectPg !== -1 ? parseNum(row[colIndexCorrectPg]) : NaN;
    const valWrongPg = colIndexWrongPg !== -1 ? parseNum(row[colIndexWrongPg]) : NaN;
    const valCorrectEssay = colIndexCorrectEssay !== -1 ? parseNum(row[colIndexCorrectEssay]) : NaN;
    const valFinal = colIndexFinal !== -1 ? parseNum(row[colIndexFinal]) : NaN;
    const valRemedial = colIndexRemedial !== -1 ? parseNum(row[colIndexRemedial]) : NaN;
    const rawNotes = colIndexNotes !== -1 ? String(row[colIndexNotes] || '').trim() : '';

    // If all score fields are blank / NaN
    if (
      isNaN(valCorrectPg) &&
      isNaN(valWrongPg) &&
      isNaN(valCorrectEssay) &&
      isNaN(valFinal) &&
      isNaN(valRemedial)
    ) {
      skippedRows.push({
        rowNumber: rowNum,
        reason: `Nilai belum diisi untuk siswa "${rawName || rawExamNo || 'Baris ' + rowNum}"`,
        rawExcerpt: String(row.filter(Boolean).slice(0, 4).join(' | ')).substring(0, 80),
        sourceFile: fileName,
      });
      continue;
    }

    // Match student smartly from database
    let matchedStudent: Student | undefined;
    let matchType: 'db_exact' | 'db_fuzzy' | 'excel_new' = 'excel_new';

    const exKey = cleanAlphanumeric(rawExamNo);
    const nisnKey = cleanAlphanumeric(rawNisn);
    const nisKey = cleanAlphanumeric(rawNis);
    const nameNorm = normalizeText(rawName);

    // 1. By Exam Number
    if (exKey.length >= 2 && studentByExamNo.has(exKey)) {
      matchedStudent = studentByExamNo.get(exKey);
      matchType = 'db_exact';
    }
    // 2. By NISN
    else if (nisnKey.length >= 4 && studentByNisn.has(nisnKey)) {
      matchedStudent = studentByNisn.get(nisnKey);
      matchType = 'db_exact';
    }
    // 3. By NIS
    else if (nisKey.length >= 2 && studentByNis.has(nisKey)) {
      matchedStudent = studentByNis.get(nisKey);
      matchType = 'db_exact';
    }
    // 4. By Exact Normalized Name
    else if (nameNorm.length >= 2 && studentByName.has(nameNorm)) {
      matchedStudent = studentByName.get(nameNorm);
      matchType = 'db_exact';
    }
    // 5. By Class & Fuzzy Name
    else if (rawClass && studentsByClass.has(rawClass)) {
      const candidates = studentsByClass.get(rawClass)!;
      const foundFuzzy = candidates.find((c) => {
        const cNorm = normalizeText(c.name);
        return (
          cNorm === nameNorm ||
          cNorm.startsWith(nameNorm) ||
          nameNorm.startsWith(cNorm) ||
          (cNorm.length > 5 && nameNorm.length > 5 && (cNorm.includes(nameNorm) || nameNorm.includes(cNorm)))
        );
      });
      if (foundFuzzy) {
        matchedStudent = foundFuzzy;
        matchType = 'db_fuzzy';
      }
    }
    // 6. Global Fuzzy Name match
    else if (nameNorm.length >= 4) {
      const foundGlobal = students.find((c) => {
        const cNorm = normalizeText(c.name);
        return (
          cNorm.startsWith(nameNorm) ||
          nameNorm.startsWith(cNorm) ||
          (cNorm.length > 6 && nameNorm.length > 6 && (cNorm.includes(nameNorm) || nameNorm.includes(cNorm)))
        );
      });
      if (foundGlobal) {
        matchedStudent = foundGlobal;
        matchType = 'db_fuzzy';
      }
    }

    // If NOT found in database, DO NOT DROP! Create a provisional student from the Excel row data!
    let finalStudentId = '';
    let finalStudentName = '';
    let finalClassName = '';
    let finalExamNumber = '';
    let finalNisn = '';
    let finalNis = '';
    let finalRoomName = '';

    if (matchedStudent) {
      finalStudentId = matchedStudent.id;
      finalStudentName = matchedStudent.name;
      finalClassName = rawClass || matchedStudent.className || 'Tanpa Kelas';
      finalExamNumber = matchedStudent.examNumber || rawExamNo;
      finalNisn = matchedStudent.nisn || rawNisn;
      finalNis = matchedStudent.nis || rawNis;
      finalRoomName = matchedStudent.roomName || rawRoom;
    } else {
      matchType = 'excel_new';
      finalStudentName = rawName || (rawExamNo ? `Peserta ${rawExamNo}` : `Siswa Baris ${rowNum}`);
      finalClassName = rawClass || 'Kelas Siswa';
      finalExamNumber = rawExamNo;
      finalNisn = rawNisn;
      finalNis = rawNis;
      finalRoomName = rawRoom;
      const uniqueSuffix = cleanAlphanumeric(finalStudentName) || cleanAlphanumeric(finalExamNumber) || String(rowNum);
      finalStudentId = `s_excel_${cleanAlphanumeric(finalClassName)}_${uniqueSuffix}`;
    }

    // Compute grades
    let correctPg: number;
    if (!isNaN(valCorrectPg)) {
      correctPg = Math.min(totalPg, Math.max(0, Math.round(valCorrectPg)));
    } else if (!isNaN(valWrongPg)) {
      correctPg = Math.max(0, totalPg - Math.min(totalPg, Math.round(valWrongPg)));
    } else if (!isNaN(valFinal)) {
      correctPg = Math.round((Math.min(100, Math.max(0, valFinal)) / 100) * totalPg);
    } else {
      correctPg = 0;
    }

    let wrongPg = Math.max(0, totalPg - correctPg);
    let correctEssay = !isNaN(valCorrectEssay)
      ? Math.min(totalEssay, Math.max(0, Math.round(valCorrectEssay * 10) / 10))
      : 0;

    const calculated = calculateExamScoreFromCounts(correctPg, correctEssay, gradingConfig);

    let finalScore: number;
    if (!isNaN(valFinal)) {
      finalScore = Math.min(100, Math.max(0, Math.round(valFinal * 10) / 10));
    } else {
      finalScore = calculated.scoreFinal;
    }

    const remedialScore =
      !isNaN(valRemedial) ? Math.min(100, Math.max(0, Math.round(valRemedial * 10) / 10)) : null;
    const effectiveScore = remedialScore !== null ? Math.max(finalScore, remedialScore) : finalScore;
    const isPassed = effectiveScore >= kkm;

    const gradeItem: ExamGradeItem = {
      id: `${finalStudentId}_${subject}`,
      studentId: finalStudentId,
      studentName: finalStudentName,
      nisn: finalNisn,
      nis: finalNis,
      className: finalClassName,
      examNumber: finalExamNumber,
      roomId: '',
      roomName: finalRoomName,
      seatNumber: undefined,
      subject,
      correctPg: calculated.correctPg,
      wrongPg: calculated.wrongPg,
      correctEssay: calculated.correctEssay,
      scorePg: calculated.scorePg,
      scoreEssay: calculated.scoreEssay,
      scoreFinal: finalScore,
      remedialScore,
      passed: isPassed,
      notes: rawNotes || (isPassed ? 'Tuntas' : 'Remedial'),
      updatedAt: new Date().toISOString(),
    };

    const parsedRowItem: ParsedStudentRowItem = {
      id: `${finalStudentId}_${subject}`,
      studentId: finalStudentId,
      studentName: finalStudentName,
      className: finalClassName,
      examNumber: finalExamNumber,
      nisn: finalNisn,
      nis: finalNis,
      correctPg: calculated.correctPg,
      wrongPg: calculated.wrongPg,
      correctEssay: calculated.correctEssay,
      scorePg: calculated.scorePg,
      scoreEssay: calculated.scoreEssay,
      scoreFinal: finalScore,
      remedialScore,
      passed: isPassed,
      notes: rawNotes || (isPassed ? 'Tuntas' : 'Remedial'),
      sourceFile: fileName,
      sourceRowNumber: rowNum,
      matchType,
      grade: gradeItem,
    };

    updatedGrades.push(gradeItem);
    parsedRows.push(parsedRowItem);
  }

  return {
    importedCount: updatedGrades.length,
    updatedGrades,
    parsedRows,
    skippedRows,
    columnMapping,
    errors: [],
  };
}

/**
 * Parse uploaded Excel or CSV file to import student scores based on Benar/Salah counts or direct scores.
 * Automatically inspects all sheets if workbook contains multiple sheets (e.g. per class).
 */
export async function parseGradesFile(
  file: File,
  students: Student[],
  subject: string,
  gradingConfig: SubjectGradingConfig
): Promise<{
  importedCount: number;
  updatedGrades: ExamGradeItem[];
  parsedRows: ParsedStudentRowItem[];
  skippedRows: SkippedRowDiagnostic[];
  columnMapping: ColumnMappingDetected;
  errors: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          return resolve({
            importedCount: 0,
            updatedGrades: [],
            parsedRows: [],
            skippedRows: [{ rowNumber: 1, reason: 'Workbook Excel tidak memiliki sheet', rawExcerpt: '' }],
            columnMapping: {},
            errors: ['File Excel kosong atau tidak terbaca.'],
          });
        }

        const gradesMap = new Map<string, ExamGradeItem>();
        const parsedRowsList: ParsedStudentRowItem[] = [];
        const allSkipped: SkippedRowDiagnostic[] = [];
        const allErrors: string[] = [];
        let firstDetectedMapping: ColumnMappingDetected = {};

        // Parse each sheet in the workbook
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          if (!jsonRows || jsonRows.length === 0) continue;

          const res = parseSheetRows(jsonRows, students, subject, gradingConfig, `${file.name} [${sheetName}]`);

          if (Object.keys(res.columnMapping).length > 0 && Object.keys(firstDetectedMapping).length === 0) {
            firstDetectedMapping = res.columnMapping;
          }

          res.updatedGrades.forEach((g) => {
            gradesMap.set(g.studentId, g);
          });
          parsedRowsList.push(...res.parsedRows);
          allSkipped.push(...res.skippedRows);

          if (res.errors.length > 0 && res.importedCount === 0 && workbook.SheetNames.length === 1) {
            allErrors.push(...res.errors);
          }
        }

        const updatedGrades = Array.from(gradesMap.values());

        if (updatedGrades.length === 0 && allErrors.length === 0) {
          allErrors.push(
            `Tidak ditemukan baris nilai siswa yang terisi pada file "${file.name}". Pastikan kolom Nama Siswa dan Nilai (Benar PG / Esai / Nilai Akhir) sudah terisi.`
          );
        }

        resolve({
          importedCount: updatedGrades.length,
          updatedGrades,
          parsedRows: parsedRowsList,
          skippedRows: allSkipped,
          columnMapping: firstDetectedMapping,
          errors: allErrors,
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file Excel'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse multiple uploaded Excel or CSV files and group results by class.
 * Allows teachers and admins to inspect and review student grades before saving.
 */
export async function parseMultipleGradesFiles(
  files: File[],
  students: Student[],
  subject: string,
  gradingConfig: SubjectGradingConfig
): Promise<MultiFileParseResult> {
  const fileResults: MultiFileParseResult['fileResults'] = [];
  const allGradesMap = new Map<string, { grade: ExamGradeItem; sourceFile: string }>();
  const allParsedRows: ParsedStudentRowItem[] = [];
  const allSkippedRows: SkippedRowDiagnostic[] = [];
  const generalErrors: string[] = [];
  let primaryMapping: ColumnMappingDetected = {};

  for (const file of files) {
    try {
      const res = await parseGradesFile(file, students, subject, gradingConfig);
      const classesInThisFile = new Set<string>();

      if (Object.keys(res.columnMapping).length > 0 && Object.keys(primaryMapping).length === 0) {
        primaryMapping = res.columnMapping;
      }

      res.updatedGrades.forEach((g) => {
        const cls = g.className || 'Tanpa Kelas';
        classesInThisFile.add(cls);
        allGradesMap.set(g.studentId, { grade: g, sourceFile: file.name });
      });

      allParsedRows.push(...res.parsedRows);
      allSkippedRows.push(...res.skippedRows);

      fileResults.push({
        fileName: file.name,
        fileSize: file.size,
        importedCount: res.importedCount,
        classes: Array.from(classesInThisFile).sort(),
        errors: res.errors,
        columnMapping: res.columnMapping,
        skippedRows: res.skippedRows,
      });
    } catch (err: any) {
      fileResults.push({
        fileName: file.name,
        fileSize: file.size,
        importedCount: 0,
        classes: [],
        errors: [err.message || 'Gagal membaca file'],
      });
      generalErrors.push(`File "${file.name}": ${err.message || 'Gagal dibaca'}`);
    }
  }

  // Group all grades by className
  const classMap = new Map<
    string,
    { grades: ExamGradeItem[]; parsedRows: ParsedStudentRowItem[]; sourceFiles: Set<string> }
  >();

  allParsedRows.forEach((row) => {
    const cls = row.className || 'Tanpa Kelas';
    if (!classMap.has(cls)) {
      classMap.set(cls, { grades: [], parsedRows: [], sourceFiles: new Set() });
    }
    const entry = classMap.get(cls)!;
    entry.grades.push(row.grade);
    entry.parsedRows.push(row);
    entry.sourceFiles.add(row.sourceFile);
  });

  const kkm = gradingConfig.kkm || DEFAULT_KKM;
  const classes: ClassParsedGroup[] = [];

  classMap.forEach(({ grades, parsedRows, sourceFiles }, className) => {
    // Sort student grades alphabetically by studentName
    grades.sort((a, b) => a.studentName.localeCompare(b.studentName));
    parsedRows.sort((a, b) => a.studentName.localeCompare(b.studentName));

    const scores = grades.map((g) => g.scoreFinal);
    const sum = scores.reduce((acc, v) => acc + v, 0);
    const avg = scores.length > 0 ? Math.round((sum / scores.length) * 10) / 10 : 0;
    const min = scores.length > 0 ? Math.min(...scores) : 0;
    const max = scores.length > 0 ? Math.max(...scores) : 0;
    const passed = grades.filter((g) => (g.remedialScore ?? g.scoreFinal) >= kkm).length;
    const remedial = grades.length - passed;
    const totalInDb = students.filter((s) => (s.className || 'Tanpa Kelas') === className).length;

    classes.push({
      className,
      sourceFiles: Array.from(sourceFiles),
      grades,
      parsedRows,
      studentCount: grades.length,
      totalStudentsInDb: totalInDb,
      avgScore: avg,
      minScore: min,
      maxScore: max,
      passedCount: passed,
      remedialCount: remedial,
    });
  });

  // Sort classes naturally (e.g. 7A, 7B, 8A, etc.)
  classes.sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));

  const allGrades = Array.from(allGradesMap.values()).map((v) => v.grade);

  return {
    fileResults,
    classes,
    allGrades,
    allParsedRows,
    totalStudentsParsed: allGrades.length,
    totalFiles: files.length,
    errors: generalErrors,
    skippedRows: allSkippedRows,
    columnMapping: primaryMapping,
  };
}

/**
 * Smart conflict resolution for cross-device grades sync.
 * Guarantees that actual entered student grades from any device (Device 1)
 * are NEVER overwritten by blank or stale default records from another device (Device 2).
 */
export function mergeGradesIntelligently(
  localGrades: ExamGradeItem[],
  remoteGrades: ExamGradeItem[]
): ExamGradeItem[] {
  if (!remoteGrades || remoteGrades.length === 0) return localGrades || [];
  if (!localGrades || localGrades.length === 0) return remoteGrades || [];

  const getScorePresence = (g: ExamGradeItem): boolean => {
    return (
      (typeof g.scoreFinal === 'number' && !isNaN(g.scoreFinal)) ||
      (typeof g.correctPg === 'number' && !isNaN(g.correctPg)) ||
      (typeof g.correctEssay === 'number' && !isNaN(g.correctEssay)) ||
      (typeof g.remedialScore === 'number' && !isNaN(g.remedialScore))
    );
  };

  const getCleanKey = (g: ExamGradeItem): string => {
    if (g.studentId && g.subject) {
      return `${g.studentId}__${g.subject.trim().toLowerCase()}`;
    }
    const idPart = (g.examNumber || g.nisn || g.studentName || 'anon')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const subPart = (g.subject || 'unknown').trim().toLowerCase();
    return `${idPart}__${subPart}`;
  };

  const map = new Map<string, ExamGradeItem>();

  // 1. Populate map with local grades
  localGrades.forEach((g) => {
    map.set(getCleanKey(g), g);
  });

  // 2. Intelligently merge remote grades
  remoteGrades.forEach((remoteItem) => {
    const key = getCleanKey(remoteItem);
    if (!map.has(key)) {
      map.set(key, remoteItem);
    } else {
      const localItem = map.get(key)!;
      const localHasScore = getScorePresence(localItem);
      const remoteHasScore = getScorePresence(remoteItem);

      if (!localHasScore && remoteHasScore) {
        // Remote has actual score data while local is empty -> remote wins
        map.set(key, remoteItem);
      } else if (localHasScore && !remoteHasScore) {
        // Local has actual score data while remote is empty -> local wins
        map.set(key, localItem);
      } else {
        // Both have scores or neither has scores -> compare updatedAt timestamps
        const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
        const remoteTime = remoteItem.updatedAt ? new Date(remoteItem.updatedAt).getTime() : 0;

        if (remoteTime >= localTime) {
          map.set(key, remoteItem);
        } else {
          map.set(key, localItem);
        }
      }
    }
  });

  return Array.from(map.values());
}

/**
 * Converts numbers into Indonesian words in Title Case (e.g. 1209 -> "Seribu Dua Ratus Sembilan", 80.60 -> "Delapan Puluh Koma Enam Nol")
 * Specifically crafted for official Indonesian School Report Cards (Raport STS / PTS).
 */
export function terbilang(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '-';

  const satuan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  function convertInteger(val: number): string {
    val = Math.floor(Math.abs(val));
    if (val === 0) return 'Nol';
    if (val < 12) return satuan[val];
    if (val < 20) return convertInteger(val - 10) + ' Belas';
    if (val < 100)
      return (
        satuan[Math.floor(val / 10)] +
        ' Puluh' +
        (val % 10 !== 0 ? ' ' + satuan[val % 10] : '')
      );
    if (val < 200) return 'Seratus' + (val % 100 !== 0 ? ' ' + convertInteger(val % 100) : '');
    if (val < 1000)
      return (
        satuan[Math.floor(val / 100)] +
        ' Ratus' +
        (val % 100 !== 0 ? ' ' + convertInteger(val % 100) : '')
      );
    if (val < 2000) return 'Seribu' + (val % 1000 !== 0 ? ' ' + convertInteger(val % 1000) : '');
    if (val < 1000000)
      return (
        convertInteger(Math.floor(val / 1000)) +
        ' Ribu' +
        (val % 1000 !== 0 ? ' ' + convertInteger(val % 1000) : '')
      );
    if (val < 1000000000)
      return (
        convertInteger(Math.floor(val / 1000000)) +
        ' Juta' +
        (val % 1000000 !== 0 ? ' ' + convertInteger(val % 1000000) : '')
      );
    return String(val);
  }

  const parts = Number(n).toFixed(2).split('.');
  const intPart = parseInt(parts[0], 10);
  const decimalStr = parts[1];

  let result = convertInteger(intPart);

  if (decimalStr && decimalStr !== '00') {
    const digitWords: Record<string, string> = {
      '0': 'Nol',
      '1': 'Satu',
      '2': 'Dua',
      '3': 'Tiga',
      '4': 'Empat',
      '5': 'Lima',
      '6': 'Enam',
      '7': 'Tujuh',
      '8': 'Delapan',
      '9': 'Sembilan',
    };
    const decWords = decimalStr
      .split('')
      .map((d) => digitWords[d] || d)
      .join(' ');
    result += ' Koma ' + decWords;
  }

  return result.trim();
}
