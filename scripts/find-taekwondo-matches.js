import fs from 'fs';
import path from 'path';

const content = fs.readFileSync(path.resolve('src/data/initialData.ts'), 'utf-8');
const match = content.match(/export const initialStudents: Student\[\] = (\[[\s\S]*?\]);/);
const students = JSON.parse(match[1]);

const taekwondoInput = [
  { no: 1, raw: 'Asyifa syehlena : ( 8b )', name: 'Asyifa syehlena', cls: '8b' },
  { no: 2, raw: 'ahmalia Khairunnisa : ( 8b )', name: 'ahmalia Khairunnisa', cls: '8b' },
  { no: 3, raw: 'arfa Muhammad Athaya : ( 7a )', name: 'arfa Muhammad Athaya', cls: '7a' },
  { no: 4, raw: 'Ahmad Nizam m : ( 7a )', name: 'Ahmad Nizam m', cls: '7a' },
  { no: 5, raw: 'Ahmad Fatoni : ( 8b )', name: 'Ahmad Fatoni', cls: '8b' },
  { no: 6, raw: 'atifah virlia : ( 8b )', name: 'atifah virlia', cls: '8b' },
  { no: 7, raw: 'Bilqis Zahira R : ( 9e )', name: 'Bilqis Zahira R', cls: '9e' },
  { no: 8, raw: 'Devin Al Fauzan : ( 7a )', name: 'Devin Al Fauzan', cls: '7a' },
  { no: 9, raw: 'Danish Safwan : ( 7c )', name: 'Danish Safwan', cls: '7c' },
  { no: 10, raw: 'Fadel Mohammad d : ( 8c )', name: 'Fadel Mohammad d', cls: '8c' },
  { no: 11, raw: 'Gisela putri : ( 8b )', name: 'Gisela putri', cls: '8b' },
  { no: 12, raw: 'Hanifah Kartika sari : ( 9b )', name: 'Hanifah Kartika sari', cls: '9b' },
  { no: 13, raw: 'Inayah mualida : ( 8d )', name: 'Inayah mualida', cls: '8d' },
  { no: 14, raw: 'kireyna Lulu Mutmainah : ( 8b )', name: 'kireyna Lulu Mutmainah', cls: '8b' },
  { no: 15, raw: 'keisha Adelia : ( 7a )', name: 'keisha Adelia', cls: '7a' },
  { no: 16, raw: 'Khoirunnisa : ( 8b )', name: 'Khoirunnisa', cls: '8b' },
  { no: 17, raw: 'Rasty anastasyana : ( 9a )', name: 'Rasty anastasyana', cls: '9a' },
  { no: 18, raw: 'Radya Nadin : ( 8c )', name: 'Radya Nadin', cls: '8c' },
  { no: 19, raw: 'Dzulnfan Arfan Zaki : ( 7a )', name: 'Dzulnfan Arfan Zaki', cls: '7a' },
  { no: 20, raw: 'Sabrina Aqilla Ra : ( 8e )', name: 'Sabrina Aqilla Ra', cls: '8e' },
  { no: 21, raw: 'Siti Syakira b : ( 8b )', name: 'Siti Syakira b', cls: '8b' },
  { no: 22, raw: 'Sabila Aulia : ( 8b )', name: 'Sabila Aulia', cls: '8b' },
  { no: 23, raw: 'tamashi anding : ( 7d )', name: 'tamashi anding', cls: '7d' },
  { no: 24, raw: 'pandu Julian : ( 7a )', name: 'pandu Julian', cls: '7a' },
  { no: 25, raw: 'Zahra Assyifa : ( 9e )', name: 'Zahra Assyifa', cls: '9e' },
  { no: 26, raw: 'Siti nur Rahma : ( 7a )', name: 'Siti nur Rahma', cls: '7a' },
  { no: 27, raw: 'Aldi Kosasih : ( 7a )', name: 'Aldi Kosasih', cls: '7a' },
  { no: 28, raw: 'rani qonitah : ( 8c )', name: 'rani qonitah', cls: '8c' },
  { no: 29, raw: 'Nurul Aini : ( 7a )', name: 'Nurul Aini', cls: '7a' },
  { no: 30, raw: 'aurelia Agustina R: ( 9d )', name: 'aurelia Agustina R', cls: '9d' },
  { no: 31, raw: 'Habibah Tus syadiyah ( 8e )', name: 'Habibah Tus syadiyah', cls: '8e' },
  { no: 32, raw: 'Abrar Azizi lutfi (7B)', name: 'Abrar Azizi lutfi', cls: '7b' }
];

console.log('--- MATCHING TAEKWONDO STUDENTS ---');

for (const t of taekwondoInput) {
  const normCls = t.cls.toUpperCase().replace(/^7/, 'VII ').replace(/^8/, 'VIII ').replace(/^9/, 'IX ').replace(/\s+/g, ' ').trim();
  
  // Search within class
  const classCandidates = students.filter(s => (s.className || '').toUpperCase().includes(normCls));
  
  // Clean tokens from query
  const cleanTokens = t.name.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(tok => tok.length > 1 && tok !== 'muhammad' && tok !== 'al');
  
  // Score candidates
  let matches = classCandidates.filter(s => {
    const sName = s.name.toLowerCase();
    return cleanTokens.some(tok => sName.includes(tok));
  });

  if (matches.length === 1) {
    console.log(`${t.no}. ${t.raw} ==> [${matches[0].id}] ${matches[0].name} (${matches[0].className})`);
  } else if (matches.length > 1) {
    // Find best match with most tokens
    let best = matches[0];
    let maxTokens = 0;
    for (const m of matches) {
      const mName = m.name.toLowerCase();
      const count = cleanTokens.filter(tok => mName.includes(tok)).length;
      if (count > maxTokens) {
        maxTokens = count;
        best = m;
      }
    }
    console.log(`${t.no}. ${t.raw} ==> [${best.id}] ${best.name} (${best.className}) (from ${matches.length} candidates)`);
  } else {
    // If not found in class, check entire school
    const allMatches = students.filter(s => {
      const sName = s.name.toLowerCase();
      return cleanTokens.length >= 2 && cleanTokens.every(tok => sName.includes(tok));
    });
    if (allMatches.length > 0) {
      console.log(`⚠️ ${t.no}. ${t.raw} ==> NOT IN ${normCls}, FOUND IN SCHOOL: [${allMatches[0].id}] ${allMatches[0].name} (${allMatches[0].className})`);
    } else {
      console.log(`❌ ${t.no}. ${t.raw} ==> NOT FOUND. List in class ${normCls}:`);
      console.log(classCandidates.map(c => c.name).join(' | '));
    }
  }
}
