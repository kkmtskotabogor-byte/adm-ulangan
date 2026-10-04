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

/**
 * Parse uploaded Excel or CSV file to import student scores based on Benar/Salah counts or direct scores
 */
export async function parseGradesFile(
  file: File,
  students: Student[],
  subject: string,
  gradingConfig: SubjectGradingConfig
): Promise<{
  importedCount: number;
  updatedGrades: ExamGradeItem[];
  errors: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!jsonRows || jsonRows.length === 0) {
          return resolve({ importedCount: 0, updatedGrades: [], errors: ['File kosong atau format tidak sesuai.'] });
        }

        // Find header row
        let headerRowIndex = -1;
        let colIndexNisn = -1;
        let colIndexExamNo = -1;
        let colIndexName = -1;
        let colIndexCorrectPg = -1;
        let colIndexWrongPg = -1;
        let colIndexCorrectEssay = -1;
        let colIndexFinal = -1;
        let colIndexRemedial = -1;
        let colIndexNotes = -1;

        for (let i = 0; i < Math.min(15, jsonRows.length); i++) {
          const row = jsonRows[i];
          if (!Array.isArray(row)) continue;

          for (let j = 0; j < row.length; j++) {
            const cellVal = String(row[j] || '').toLowerCase().trim();
            if (cellVal.includes('nisn')) colIndexNisn = j;
            if (cellVal.includes('peserta') || cellVal.includes('no ujian')) colIndexExamNo = j;
            if (cellVal.includes('nama')) colIndexName = j;
            if (cellVal.includes('benar pg') || (cellVal.includes('benar') && cellVal.includes('pg'))) colIndexCorrectPg = j;
            if (cellVal.includes('salah pg') || (cellVal.includes('salah') && cellVal.includes('pg'))) colIndexWrongPg = j;
            if (cellVal.includes('esai') || cellVal.includes('essay') || cellVal.includes('uraian')) colIndexCorrectEssay = j;
            if (cellVal.includes('akhir') || cellVal === 'nilai' || cellVal.includes('nilai akhir')) colIndexFinal = j;
            if (cellVal.includes('remedial')) colIndexRemedial = j;
            if (cellVal.includes('catatan') || cellVal.includes('keterangan')) colIndexNotes = j;
          }

          // If found at least student identifier and any score/count column
          if (
            (colIndexNisn !== -1 || colIndexExamNo !== -1 || colIndexName !== -1) &&
            (colIndexCorrectPg !== -1 || colIndexCorrectEssay !== -1 || colIndexFinal !== -1)
          ) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          return resolve({
            importedCount: 0,
            updatedGrades: [],
            errors: [
              'Kolom tabel tidak terdeteksi secara otomatis. Pastikan file memiliki kolom Nama / NISN / No. Peserta serta Benar PG atau Nilai Akhir.',
            ],
          });
        }

        const studentByNisn = new Map<string, Student>();
        const studentByExamNo = new Map<string, Student>();
        const studentByName = new Map<string, Student>();

        students.forEach((s) => {
          if (s.nisn) studentByNisn.set(s.nisn.trim().toLowerCase(), s);
          if (s.examNumber) studentByExamNo.set(s.examNumber.trim().toLowerCase(), s);
          studentByName.set(s.name.trim().toLowerCase(), s);
        });

        const totalPg = gradingConfig.totalPgQuestions ?? 40;
        const totalEssay = gradingConfig.totalEssayQuestions ?? 5;
        const updatedGrades: ExamGradeItem[] = [];
        const errors: string[] = [];
        let matchedCount = 0;

        for (let i = headerRowIndex + 1; i < jsonRows.length; i++) {
          const row = jsonRows[i];
          if (!row || row.length === 0) continue;

          const nisnVal = colIndexNisn !== -1 ? String(row[colIndexNisn] || '').trim().toLowerCase() : '';
          const examNoVal = colIndexExamNo !== -1 ? String(row[colIndexExamNo] || '').trim().toLowerCase() : '';
          const nameVal = colIndexName !== -1 ? String(row[colIndexName] || '').trim().toLowerCase() : '';

          let matchedStudent: Student | undefined;
          if (nisnVal && studentByNisn.has(nisnVal)) {
            matchedStudent = studentByNisn.get(nisnVal);
          } else if (examNoVal && studentByExamNo.has(examNoVal)) {
            matchedStudent = studentByExamNo.get(examNoVal);
          } else if (nameVal && studentByName.has(nameVal)) {
            matchedStudent = studentByName.get(nameVal);
          }

          if (!matchedStudent) {
            continue;
          }

          // Extract counts
          const rawCorrectPg = colIndexCorrectPg !== -1 ? parseFloat(String(row[colIndexCorrectPg])) : NaN;
          const rawWrongPg = colIndexWrongPg !== -1 ? parseFloat(String(row[colIndexWrongPg])) : NaN;
          const rawCorrectEssay = colIndexCorrectEssay !== -1 ? parseFloat(String(row[colIndexCorrectEssay])) : NaN;
          const rawFinal = colIndexFinal !== -1 ? parseFloat(String(row[colIndexFinal])) : NaN;
          const rawRemedial = colIndexRemedial !== -1 ? parseFloat(String(row[colIndexRemedial])) : NaN;
          const rawNotes = colIndexNotes !== -1 ? String(row[colIndexNotes] || '').trim() : '';

          let correctPg: number;
          if (!isNaN(rawCorrectPg)) {
            correctPg = Math.min(totalPg, Math.max(0, rawCorrectPg));
          } else if (!isNaN(rawWrongPg)) {
            correctPg = Math.max(0, totalPg - Math.min(totalPg, rawWrongPg));
          } else {
            correctPg = 0;
          }

          const correctEssay = !isNaN(rawCorrectEssay) ? Math.min(totalEssay, Math.max(0, rawCorrectEssay)) : 0;

          // Calculate score
          const calculated = calculateExamScoreFromCounts(correctPg, correctEssay, gradingConfig);
          const finalScore = !isNaN(rawFinal) ? Math.min(100, Math.max(0, rawFinal)) : calculated.scoreFinal;
          const remedialScore = !isNaN(rawRemedial) ? Math.min(100, Math.max(0, rawRemedial)) : null;

          updatedGrades.push({
            id: `${matchedStudent.id}_${subject}`,
            studentId: matchedStudent.id,
            studentName: matchedStudent.name,
            nisn: matchedStudent.nisn || '',
            nis: matchedStudent.nis || '',
            className: matchedStudent.className,
            examNumber: matchedStudent.examNumber || '',
            roomId: matchedStudent.roomId || '',
            roomName: matchedStudent.roomName || '',
            seatNumber: matchedStudent.seatNumber,
            subject,
            correctPg: calculated.correctPg,
            wrongPg: calculated.wrongPg,
            correctEssay: calculated.correctEssay,
            scorePg: calculated.scorePg,
            scoreEssay: calculated.scoreEssay,
            scoreFinal: finalScore,
            remedialScore,
            passed: finalScore >= (gradingConfig.kkm || DEFAULT_KKM),
            notes: rawNotes || (finalScore >= (gradingConfig.kkm || DEFAULT_KKM) ? 'Tuntas' : 'Remedial'),
            updatedAt: new Date().toISOString(),
          });

          matchedCount++;
        }

        resolve({
          importedCount: matchedCount,
          updatedGrades,
          errors,
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsArrayBuffer(file);
  });
}
