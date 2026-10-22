import fs from 'fs';
import path from 'path';

const content = fs.readFileSync(path.resolve('src/data/initialData.ts'), 'utf-8');
const match = content.match(/export const initialStudents: Student\[\] = (\[[\s\S]*?\]);/);
const students = JSON.parse(match[1]);

function find(q, cls) {
  let c = students;
  if (cls) {
    const clsNorm = cls.toUpperCase().replace(/\s+/g, '').replace(/^7/, 'VII').replace(/^8/, 'VIII').replace(/^9/, 'IX');
    c = students.filter(s => (s.className || '').toUpperCase().replace(/\s+/g, '').startsWith(clsNorm));
  }
  return c;
}

// Check each query explicitly:
const tests = [
  { raw: 'Raditya (9F)', cls: '9F', hint: 'Raditya' },
  { raw: 'Irsyad (9F)✅', cls: '9F', hint: 'Irsyad' },
  { raw: 'Haidar (7D)', cls: '7D', hint: 'Haidar' },
  { raw: 'Wildan (7B)', cls: '7B', hint: 'Wildan' },
  { raw: 'Dika (7C)', cls: '7C', hint: 'Dika' },
  { raw: 'Asep (7B)', cls: '7B', hint: 'Asep' },
  { raw: 'Riski maulana (8E)', cls: '8E', hint: 'Riski maulana' },
  { raw: 'Farhan akbar (8E)✅', cls: '8E', hint: 'Farhan' },
  { raw: 'Fahmi (9F)✅', cls: '9F', hint: 'Fahmi' },
  { raw: 'Celvino (8E)✅', cls: '8E', hint: 'Celvino' },
  { raw: 'Haikal el sarawi (8E)', cls: '8E', hint: 'Haikal' },
  { raw: 'M.aldi nur (7A)', cls: '7A', hint: 'Aldi' },
  { raw: 'M.satria alfaraz (8B)✅', cls: '8B', hint: 'satria' },
  { raw: 'M.rafa (9F)✅', cls: '9F', hint: 'rafa' },
  { raw: 'Albi (7C)', cls: '7C', hint: 'Albi' },
  { raw: 'Fajar maulana (9F)✅', cls: '9F', hint: 'Fajar' },
  { raw: 'Fatarul (9C)', cls: '9C', hint: 'Fatar' },
  { raw: 'M.adni (7D)', cls: '7D', hint: 'Adni' },
  { raw: 'Farhat putra (9C)', cls: '9C', hint: 'Farhat' },
  { raw: 'Dafa nafiz (8B)', cls: '8B', hint: 'Dafa' },
  { raw: 'Abam (7B)', cls: '7B', hint: 'Abam' },
  { raw: 'Irfan (8A)', cls: '8A', hint: 'Irfan' },
  { raw: 'Abizar (7D)', cls: '7D', hint: 'Abizar' },
  { raw: 'Alo (9F)✅', cls: '9F', hint: 'Alo' },
  { raw: 'Sultan (7E)✅', cls: '7E', hint: 'Sultan' },
  { raw: 'Khadafi (9E)✅', cls: '9E', hint: 'Khadaf' },
  { raw: 'Riza tri saputra (8D)✅', cls: '8D', hint: 'Riza' },
  { raw: 'Hisyam dwi rabani (8D)✅', cls: '8D', hint: 'Hisyam' },
  { raw: 'Arya nugraha (7A)', cls: '7A', hint: 'Arya' },
  { raw: 'M.fahrorozi (9A)', cls: '9A', hint: 'fahr' },
  { raw: 'M.haikal basir (8E)✅', cls: '8E', hint: 'Bahsyir' },
  { raw: 'Zamzam (8D)✅', cls: '8D', hint: 'Zamzam' },
  { raw: 'Muhaimin (7E)', cls: '7E', hint: 'Muhaymin' },
  { raw: 'Rifqi (9A)', cls: '9A', hint: 'Rifki' },
  { raw: 'Abdul mugni (8D)', cls: '8D', hint: 'Mugni' },
  { raw: 'Nabily (8D)✅', cls: '8D', hint: 'Nabil' },
  { raw: 'Kiar huda (7B)', cls: '7B', hint: 'Kiar' },
  { raw: 'M.alif (8C)✅', cls: '8C', hint: 'Alif' },
  { raw: 'M.azam (9B)✅', cls: '9B', hint: 'Azam' },
  { raw: 'M.raihan saputra (9F)', cls: '9F', hint: 'Raihan' },
  { raw: 'M.ilham (9A)✅', cls: '9A', hint: 'Ilham' },
  { raw: 'Dimas (7A)', cls: '7A', hint: 'Dimas' },
  { raw: 'Afiansyah (7A)', cls: '7A', hint: 'Alfiansyah' },
  { raw: 'Dapi (8C)', cls: '8C', hint: 'Fadel' },
  { raw: 'Farel', cls: '', hint: 'Farel' },
  { raw: 'Kiraina(8B)', cls: '8B', hint: 'Kireina' },
  { raw: 'Gisel (8B)', cls: '8B', hint: 'Gisela' },
  { raw: 'Siren ( 8 )', cls: '8', hint: 'Siren' },
  { raw: 'Widya ( 9 )', cls: '9', hint: 'Widya' }
];

console.log('=== DETAILED CLASS ROSTERS & MATCHES ===');
for (const t of tests) {
  const pool = find(t.hint, t.cls);
  console.log(`\nTARGET: ${t.raw} [Kelas: ${t.cls}]`);
  const matched = pool.filter(s => s.name.toLowerCase().includes(t.hint.toLowerCase()));
  if (matched.length > 0) {
    matched.forEach(m => console.log(`  -> MATCH: [${m.id}] ${m.name} (${m.className})`));
  } else {
    console.log(`  -> NO MATCH for hint "${t.hint}" in ${t.cls}. Students in class:`);
    console.log(pool.map(s => s.name).join(' | '));
  }
}
