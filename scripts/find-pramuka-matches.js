import fs from 'fs';
import path from 'path';

const content = fs.readFileSync(path.resolve('src/data/initialData.ts'), 'utf-8');
const match = content.match(/export const initialStudents: Student\[\] = (\[[\s\S]*?\]);/);
const students = JSON.parse(match[1]);

const pramukaInput = [
  { no: 1, raw: 'fahdanar raya al-fath 7a', name: 'fahdanar', cls: '7a', grade: 'Baik' },
  { no: 2, raw: 'muhammad bayu syahidan 7c', name: 'bayu syahidan', cls: '7c', grade: 'Baik' },
  { no: 3, raw: 'suniyya rana putri 7c', name: 'suniyya', cls: '7c', grade: 'Baik' },
  { no: 4, raw: 'Siti sarah 7c', name: 'siti sarah', cls: '7c', grade: 'Baik' },
  { no: 5, raw: 'rafa syaputra 7c', name: 'rafa', cls: '7c', grade: 'Baik' },
  { no: 6, raw: 'nova riani 7e', name: 'nova riani', cls: '7e', grade: 'Sangat Baik' },
  { no: 7, raw: 'Devin al fauzan 7a', name: 'devin', cls: '7a', grade: 'Baik' },
  { no: 8, raw: 'dhisti naura anjani 8b', name: 'dhisti', cls: '8b', grade: 'Sangat Baik' },
  { no: 9, raw: 'syahda amelia putri 8b', name: 'syahda', cls: '8b', grade: 'Sangat Baik' },
  { no: 10, raw: 'gisela putri 8b', name: 'gisela', cls: '8b', grade: 'Sangat Baik' },
  { no: 11, raw: 'sabila aulia 8b', name: 'sabila aulia', cls: '8b', grade: 'Sangat Baik' },
  { no: 12, raw: 'city el fatimah kela natasya 8c', name: 'fatimah kela', cls: '8c', grade: 'Sangat Baik' },
  { no: 13, raw: 'radya nadin 8c', name: 'radya nadin', cls: '8c', grade: 'Sangat Baik' },
  { no: 14, raw: 'hanabi al khairi 8c', name: 'hanabi', cls: '8c', grade: 'Baik' },
  { no: 15, raw: 'aditya ramadhan 8b', name: 'aditya ramadhan', cls: '8b', grade: 'Sangat Baik' },
  { no: 16, raw: 'tasya afrilia 8a', name: 'tasya', cls: '8a', grade: 'Sangat Baik' }
];

console.log('--- MATCHING PRAMUKA STUDENTS ---');

for (const p of pramukaInput) {
  const normCls = p.cls.toUpperCase().replace(/^7/, 'VII ').replace(/^8/, 'VIII ').replace(/^9/, 'IX ').replace(/\s+/g, ' ').trim();
  const classCandidates = students.filter(s => (s.className || '').toUpperCase().includes(normCls));
  
  const tokens = p.name.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  let matches = classCandidates.filter(s => {
    const sName = s.name.toLowerCase();
    return tokens.some(tok => sName.includes(tok));
  });

  if (matches.length === 1) {
    console.log(`${p.no}. ${p.raw} [${p.grade}] ==> [${matches[0].id}] ${matches[0].name} (${matches[0].className})`);
  } else if (matches.length > 1) {
    console.log(`${p.no}. ${p.raw} [${p.grade}] ==> MULTI:`, matches.map(m => `[${m.id}] ${m.name} (${m.className})`));
  } else {
    console.log(`❌ ${p.no}. ${p.raw} ==> NOT FOUND in ${normCls}`);
    const allMatches = students.filter(s => {
      const sName = s.name.toLowerCase();
      return tokens.some(tok => sName.includes(tok));
    });
    console.log(`   In school:`, allMatches.map(m => `[${m.id}] ${m.name} (${m.className})`));
  }
}
