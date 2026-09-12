import { ExamScheduleItem } from '../types';
import * as XLSX from 'xlsx';

export const USER_UPLOADED_SCHEDULE_TEMPLATE_RAW = `No;Hari/ Tanggal;Mata Pelajaran;Waktu
1;Senin/28 September 2026;Bahasa Indonesia;07.30-08.30
2;Senin/28 September 2026;IPS;08.30-09.30
3;Senin/28 September 2026;Istirahat;09.30-10.00
4;Senin/28 September 2026;TIK;10.00-11.00
5;Selasa/29 September 2026;Matematika;07.30-08.30
6;Selasa/29 September 2026;Alquran Hadist;08.30-09.30
7;Selasa/29 September 2026;Istirahat;09.30-10.00
8;Selasa/29 September 2026;Prakarya;10.00-11.00
9;Rabu/30 September 2026;Bahasa Inggris;07.30-08.30
10;Rabu/30 September 2026;Fiqih;08.30-09.30
11;Rabu/30 September 2026;Istirahat;09.30-10.00
12;Rabu/30 September 2026;Seni Budaya;10.00-11.00
13;Kamis/31 September 2026;IPA;07.30-08.30
14;Kamis/31 September 2026;Bahasa Sunda;08.30-09.30
15;Kamis/31 September 2026;Istirahat;09.30-10.00
16;Kamis/31 September 2026;SKI;10.00-11.00
17;Jumat/01 Oktober 2026;Pendidikan Pancasila;07.30-08.30
18;Jumat/01 Oktober 2026;Istirahat;08.30-09.00
19;Jumat/01 Oktober 2026;Bahasa Arab;09.00-10.00
20;Sabtu/02 Oktober 2026;Akidah Akhlak;07.30-08.30
21;Sabtu/02 Oktober 2026;BTQ;08.30-09.30
22;Sabtu/02 Oktober 2026;Istirahat;09.30-10.00
23;Sabtu/02 Oktober 2026;Penjasorkes;10.00-11.00`;

export interface ParsedScheduleResult {
  schedules: ExamScheduleItem[];
  examCount: number;
  breakCount: number;
  daysCount: number;
  errors: string[];
}

/**
 * Clean & split "Hari/ Tanggal" string (e.g., "Senin/28 September 2026" or "Senin, 28 September 2026")
 */
export function parseDayAndDate(combined: string): { dayName: string; date: string } {
  const trimmed = (combined || '').trim();
  if (!trimmed) return { dayName: 'Senin', date: '' };

  // Common delimiters: '/', ',', '-', '|'
  let parts: string[] = [];
  if (trimmed.includes('/')) {
    parts = trimmed.split('/');
  } else if (trimmed.includes(',')) {
    parts = trimmed.split(',');
  } else if (trimmed.includes('|')) {
    parts = trimmed.split('|');
  } else {
    // Check space if starts with day name (Senin, Selasa, etc.)
    const match = trimmed.match(/^(Senin|Selasa|Rabu|Kamis|Jum'?at|Sabtu|Minggu)\s+(.*)$/i);
    if (match) {
      return {
        dayName: capitalizeFirst(match[1].trim()),
        date: match[2].trim(),
      };
    }
    parts = [trimmed];
  }

  const rawDay = (parts[0] || '').trim();
  const rawDate = (parts.slice(1).join('/') || '').trim();

  return {
    dayName: capitalizeFirst(rawDay) || 'Senin',
    date: rawDate,
  };
}

function capitalizeFirst(str: string): string {
  if (!str) return '';
  const clean = str.toLowerCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Check if a subject name corresponds to a break time (Istirahat)
 */
export function isBreakSubject(subject: string): boolean {
  const s = (subject || '').trim().toLowerCase();
  return s.includes('istirahat') || s === 'break' || s.includes('ishoma') || s.includes('sholat');
}

/**
 * Parse CSV/text lines with semicolon, comma, or tab delimiter
 */
export function parseScheduleText(rawText: string, defaultTargetLevel = 'Semua Kelas'): ParsedScheduleResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const errors: string[] = [];
  if (lines.length === 0) {
    return { schedules: [], examCount: 0, breakCount: 0, daysCount: 0, errors: ['Teks jadwal kosong'] };
  }

  // Detect delimiter from the first non-empty line
  const sampleLine = lines[0];
  let delimiter = ';';
  const semiCount = (sampleLine.match(/;/g) || []).length;
  const commaCount = (sampleLine.match(/,/g) || []).length;
  const tabCount = (sampleLine.match(/\t/g) || []).length;

  if (tabCount > semiCount && tabCount > commaCount) {
    delimiter = '\t';
  } else if (commaCount > semiCount && commaCount > tabCount) {
    delimiter = ',';
  }

  // Check if first line is header
  let startIndex = 0;
  const firstCols = splitLine(lines[0], delimiter).map((c) => c.toLowerCase());
  const hasHeader = firstCols.some((c) => c.includes('hari') || c.includes('mata') || c.includes('mapel') || c.includes('waktu') || c.includes('no'));

  let colMap = {
    no: -1,
    dayDate: -1,
    day: -1,
    date: -1,
    subject: -1,
    time: -1,
    target: -1,
  };

  if (hasHeader) {
    startIndex = 1;
    firstCols.forEach((col, idx) => {
      if (col.includes('no') || col === '#') colMap.no = idx;
      else if (col.includes('hari') && col.includes('tanggal')) colMap.dayDate = idx;
      else if (col.includes('hari')) colMap.day = idx;
      else if (col.includes('tanggal') || col.includes('tgl')) colMap.date = idx;
      else if (col.includes('mata') || col.includes('mapel') || col.includes('pelajaran') || col.includes('subjek')) colMap.subject = idx;
      else if (col.includes('waktu') || col.includes('jam') || col.includes('sesi') || col.includes('pukul')) colMap.time = idx;
      else if (col.includes('kelas') || col.includes('tingkat') || col.includes('sasaran')) colMap.target = idx;
    });
  }

  // Fallbacks if columns were not explicitly named in header
  if (colMap.dayDate === -1 && colMap.day === -1) colMap.dayDate = 1;
  if (colMap.subject === -1) colMap.subject = 2;
  if (colMap.time === -1) colMap.time = 3;

  const schedules: ExamScheduleItem[] = [];
  const daysSet = new Set<string>();
  let lastDay = 'Senin';
  let lastDate = '';

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = splitLine(rawLine, delimiter);
    if (cols.length < 2) continue;

    let dayName = '';
    let date = '';
    let subject = '';
    let sessionTime = '';
    let targetLevel = defaultTargetLevel;

    if (colMap.dayDate !== -1 && cols[colMap.dayDate] !== undefined) {
      const parsed = parseDayAndDate(cols[colMap.dayDate]);
      dayName = parsed.dayName;
      date = parsed.date;
    } else {
      if (colMap.day !== -1 && cols[colMap.day] !== undefined) {
        dayName = capitalizeFirst(cols[colMap.day].trim());
      }
      if (colMap.date !== -1 && cols[colMap.date] !== undefined) {
        date = cols[colMap.date].trim();
      }
    }

    if (colMap.subject !== -1 && cols[colMap.subject] !== undefined) {
      subject = cols[colMap.subject].trim();
    }
    if (colMap.time !== -1 && cols[colMap.time] !== undefined) {
      sessionTime = cols[colMap.time].trim();
    }
    if (colMap.target !== -1 && cols[colMap.target] !== undefined && cols[colMap.target].trim()) {
      targetLevel = cols[colMap.target].trim();
    }

    // Inherit previous day/date if row has empty day/date (common in merged Excel cells)
    if (!dayName && lastDay) dayName = lastDay;
    if (!date && lastDate) date = lastDate;

    if (dayName) lastDay = dayName;
    if (date) lastDate = date;

    if (!subject) {
      // If subject is blank, skip
      continue;
    }

    const isBreak = isBreakSubject(subject);
    const dayKey = `${dayName}|${date}`;
    daysSet.add(dayKey);

    schedules.push({
      id: `sch-${Date.now()}-${schedules.length + 1}`,
      dayName: dayName || 'Senin',
      date: date || '',
      sessionTime: sessionTime || '07.30-08.30',
      subject,
      targetLevel: isBreak ? 'Semua' : targetLevel,
      isBreak,
    });
  }

  const examCount = schedules.filter((s) => !s.isBreak).length;
  const breakCount = schedules.filter((s) => s.isBreak).length;

  return {
    schedules,
    examCount,
    breakCount,
    daysCount: daysSet.size,
    errors,
  };
}

/**
 * Split line while respecting quotes
 */
function splitLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse an uploaded Excel or CSV file buffer
 */
export async function parseScheduleFile(file: File, defaultTargetLevel = 'Semua Kelas'): Promise<ParsedScheduleResult> {
  const fileName = file.name.toLowerCase();
  
  // If plain CSV or TXT
  if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileName.endsWith('.tsv')) {
    const text = await file.text();
    return parseScheduleText(text, defaultTargetLevel);
  }

  // If Excel .xlsx / .xls
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert worksheet to CSV string with ';' delimiter for consistency
  const csvText = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
  return parseScheduleText(csvText, defaultTargetLevel);
}

/**
 * Generate CSV template string for download
 */
export function generateScheduleCsvTemplate(): string {
  return USER_UPLOADED_SCHEDULE_TEMPLATE_RAW;
}

/**
 * Export active schedules to CSV
 */
export function exportSchedulesToCsv(schedules: ExamScheduleItem[]): string {
  const header = 'No;Hari/ Tanggal;Mata Pelajaran;Waktu;Sasaran';
  const rows = schedules.map((item, idx) => {
    const dayDate = `${item.dayName}/${item.date}`;
    return `${idx + 1};${dayDate};${item.subject};${item.sessionTime};${item.targetLevel || 'Semua Kelas'}`;
  });
  return [header, ...rows].join('\n');
}

/**
 * Trigger download of CSV text
 */
export function downloadCsvFile(csvContent: string, fileName = 'jadwal_ulangan.csv') {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
