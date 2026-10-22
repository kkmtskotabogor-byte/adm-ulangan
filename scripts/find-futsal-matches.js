import fs from 'fs';
import path from 'path';

// Read src/data/initialData.ts
const content = fs.readFileSync(path.resolve('src/data/initialData.ts'), 'utf-8');

// Extract initialStudents array
const match = content.match(/export const initialStudents: Student\[\] = (\[[\s\S]*?\]);/);
if (!match) {
  console.error('Could not find initialStudents');
  process.exit(1);
}

const students = JSON.parse(match[1]);
console.log(`Loaded ${students.length} students from initialData.ts`);

function normalizeClass(c) {
  if (!c) return '';
  let str = c.toUpperCase().replace(/\s+/g, '');
  // Replace 7, 8, 9 with VII, VIII, IX
  str = str.replace(/^7/, 'VII');
  str = str.replace(/^8/, 'VIII');
  str = str.replace(/^9/, 'IX');
  return str;
}

// List of target search queries
const queries = [
  { raw: 'Raditya (9F)', name: 'Raditya', cls: '9F' },
  { raw: 'Irsyad (9F)✅', name: 'Irsyad', cls: '9F' },
  { raw: 'Haidar (7D)', name: 'Haidar', cls: '7D' },
  { raw: 'Wildan (7B)', name: 'Wildan', cls: '7B' },
  { raw: 'Dika (7C)', name: 'Dika', cls: '7C' },
  { raw: 'Asep (7B)', name: 'Asep', cls: '7B' },
  { raw: 'Riski maulana (8E)', name: 'Riski maulana', cls: '8E' },
  { raw: 'Farhan akbar (8E)✅', name: 'Farhan akbar', cls: '8E' },
  { raw: 'Fahmi (9F)✅', name: 'Fahmi', cls: '9F' },
  { raw: 'Celvino (8E)✅', name: 'Celvino', cls: '8E' },
  { raw: 'Haikal el sarawi (8E)', name: 'Haikal el sarawi', cls: '8E' },
  { raw: 'M.aldi nur (7A)', name: 'M.aldi nur', cls: '7A' },
  { raw: 'M.satria alfaraz (8B)✅', name: 'M.satria alfaraz', cls: '8B' },
  { raw: 'M.rafa (9F)✅', name: 'M.rafa', cls: '9F' },
  { raw: 'Albi (7C)', name: 'Albi', cls: '7C' },
  { raw: 'Fajar maulana (9F)✅', name: 'Fajar maulana', cls: '9F' },
  { raw: 'Fatarul (9C)', name: 'Fatarul', cls: '9C' },
  { raw: 'M.adni (7D)', name: 'M.adni', cls: '7D' },
  { raw: 'Farhat putra (9C)', name: 'Farhat putra', cls: '9C' },
  { raw: 'Dafa nafiz (8B)', name: 'Dafa nafiz', cls: '8B' },
  { raw: 'Abam (7B)', name: 'Abam', cls: '7B' },
  { raw: 'Irfan (8A)', name: 'Irfan', cls: '8A' },
  { raw: 'Abizar (7D)', name: 'Abizar', cls: '7D' },
  { raw: 'Alo (9F)✅', name: 'Alo', cls: '9F' },
  { raw: 'Sultan (7E)✅', name: 'Sultan', cls: '7E' },
  { raw: 'Khadafi (9E)✅', name: 'Khadafi', cls: '9E' },
  { raw: 'Riza tri saputra (8D)✅', name: 'Riza tri saputra', cls: '8D' },
  { raw: 'Hisyam dwi rabani (8D)✅', name: 'Hisyam dwi rabani', cls: '8D' },
  { raw: 'Arya nugraha (7A)', name: 'Arya nugraha', cls: '7A' },
  { raw: 'M.fahrorozi (9A)', name: 'M.fahrorozi', cls: '9A' },
  { raw: 'M.haikal basir (8E)✅', name: 'M.haikal basir', cls: '8E' },
  { raw: 'Zamzam (8D)✅', name: 'Zamzam', cls: '8D' },
  { raw: 'Muhaimin (7E)', name: 'Muhaimin', cls: '7E' },
  { raw: 'Rifqi (9A)', name: 'Rifqi', cls: '9A' },
  { raw: 'Abdul mugni (8D)', name: 'Abdul mugni', cls: '8D' },
  { raw: 'Nabily (8D)✅', name: 'Nabily', cls: '8D' },
  { raw: 'Kiar huda (7B)', name: 'Kiar huda', cls: '7B' },
  { raw: 'M.alif (8C)✅', name: 'M.alif', cls: '8C' },
  { raw: 'M.azam (9B)✅', name: 'M.azam', cls: '9B' },
  { raw: 'M.raihan saputra (9F)', name: 'M.raihan saputra', cls: '9F' },
  { raw: 'M.ilham (9A)✅', name: 'M.ilham', cls: '9A' },
  { raw: 'Dimas (7A)', name: 'Dimas', cls: '7A' },
  { raw: 'Afiansyah (7A)', name: 'Afiansyah', cls: '7A' },
  { raw: 'Dapi (8C)', name: 'Dapi', cls: '8C' },
  { raw: 'Farel', name: 'Farel', cls: '' },
  // PEREMPUAN
  { raw: 'Kiraina(8B)', name: 'Kiraina', cls: '8B' },
  { raw: 'Gisel (8B)', name: 'Gisel', cls: '8B' },
  { raw: 'Siren ( 8 )', name: 'Siren', cls: '8' },
  { raw: 'Widya ( 9 )', name: 'Widya', cls: '9' }
];

console.log('\n================ MATCHING RESULTS ================');

const matchedList = [];

for (const q of queries) {
  const normQCls = normalizeClass(q.cls);
  
  // Filter students by class
  let candidates = students;
  if (normQCls) {
    candidates = students.filter(s => {
      const sCls = normalizeClass(s.className || '');
      return sCls.startsWith(normQCls) || sCls === normQCls;
    });
  }

  const cleanName = q.name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  const tokens = cleanName.split(/\s+/).filter(t => t.length > 1 && t !== 'm' && t !== 'muh' && t !== 'muhammad');

  // Try matching
  let matches = candidates.filter(s => {
    const sName = (s.name || '').toLowerCase();
    // exact token match
    return tokens.some(t => {
      const sTokens = sName.split(/\s+/);
      return sTokens.some(st => st === t || st.startsWith(t) || st.includes(t));
    });
  });

  // If no match in class, check entire school
  let matchedStudent = null;
  if (matches.length === 1) {
    matchedStudent = matches[0];
  } else if (matches.length > 1) {
    // Rank matches by how many tokens match or exact substring
    const exactSub = matches.filter(s => s.name.toLowerCase().includes(cleanName));
    if (exactSub.length === 1) {
      matchedStudent = exactSub[0];
    } else {
      matchedStudent = matches; // multiple
    }
  }

  console.log(`\n--------------------------------------------`);
  console.log(`Panggilan: "${q.raw}"`);
  if (Array.isArray(matchedStudent)) {
    console.log(`⚠️ KEMUNGKINAN MULTI-MATCH di kelas ${candidates[0]?.className}:`);
    matchedStudent.forEach(m => console.log(`   -> [${m.id}] ${m.name} (${m.className})`));
  } else if (matchedStudent) {
    console.log(`✅ COCOK: [${matchedStudent.id}] ${matchedStudent.name} (${matchedStudent.className})`);
    matchedList.push({
      query: q.raw,
      studentId: matchedStudent.id,
      studentName: matchedStudent.name,
      className: matchedStudent.className
    });
  } else {
    console.log(`❌ TIDAK DITEMUKAN di kelas ${q.cls}. Daftar siswa di kelas ini:`);
    if (candidates.length > 0) {
      console.log(`   Daftar:`, candidates.map(c => c.name).join(' | '));
    } else {
      console.log(`   (Tidak ada kelas ${q.cls} ditemukan)`);
    }
    // Search across all school
    const allMatches = students.filter(s => {
      const sName = s.name.toLowerCase();
      return tokens.some(t => sName.includes(t));
    });
    if (allMatches.length > 0) {
      console.log(`   Pencarian di seluruh sekolah:`, allMatches.map(m => `${m.name} (${m.className})`).join(' | '));
    }
  }
}
