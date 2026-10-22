import fs from 'fs';
import path from 'path';

const content = fs.readFileSync(path.resolve('src/data/initialData.ts'), 'utf-8');
const match = content.match(/export const initialStudents: Student\[\] = (\[[\s\S]*?\]);/);
const students = JSON.parse(match[1]);

const taekwondoVerified = [
  { no: 1, coachInput: 'Asyifa syehlena : ( 8b )', id: 'std-344', name: 'ASYIFAH SYEHLENA FITRI', class: 'VIII B' },
  { no: 2, coachInput: 'ahmalia Khairunnisa : ( 8b )', id: 'std-342', name: 'AHMALIA KHOERUNNISA', class: 'VIII B' },
  { no: 3, coachInput: 'arfa Muhammad Athaya : ( 7a )', id: 'std-177', name: 'Arfa Muhammad Atthaya', class: 'VII A' },
  { no: 4, coachInput: 'Ahmad Nizam m : ( 7a )', id: 'std-174', name: 'Ahmad Nizam Muharam', class: 'VII A' },
  { no: 5, coachInput: 'Ahmad Fatoni : ( 8b )', id: 'std-341', name: 'AHMAD FATONI AL-AMIN', class: 'VIII B' },
  { no: 6, coachInput: 'atifah virlia : ( 8b )', id: 'std-345', name: 'ATHIFAH VIRLIA', class: 'VIII B' },
  { no: 7, coachInput: 'Bilqis Zahira R : ( 9e )', id: 'std-122', name: 'BILQIST ZAHIRA RAMADHANI', class: 'IX E' },
  { no: 8, coachInput: 'Devin Al Fauzan : ( 7a )', id: 'std-189', name: 'M. Devin Alfauzan', class: 'VII A' },
  { no: 9, coachInput: 'Danish Safwan : ( 7c )', id: 'std-237', name: 'Danish Safwan', class: 'VII C' },
  { no: 10, coachInput: 'Fadel Mohammad d : ( 8c )', id: 'std-382', name: 'FADEL MOHAMMAD DEVIRZHA', class: 'VIII C' },
  { no: 11, coachInput: 'Gisela putri : ( 8b )', id: 'std-354', name: 'GISELA PUTRI', class: 'VIII B' },
  { no: 12, coachInput: 'Hanifah Kartika sari : ( 9b )', id: 'std-38', name: 'HANIFA KARTIKA SARI', class: 'IX B' },
  { no: 13, coachInput: 'Inayah mualida : ( 8d )', id: 'std-410', name: 'INAYAH MAULIDYA', class: 'VIII D' },
  { no: 14, coachInput: 'kireyna Lulu Mutmainah : ( 8b )', id: 'std-357', name: 'KIREINA LULU MUTMAINAH', class: 'VIII B' },
  { no: 15, coachInput: 'keisha Adelia : ( 7a )', id: 'std-186', name: 'Keisya Adelia', class: 'VII A' },
  { no: 16, coachInput: 'Khoirunnisa : ( 8b )', id: 'std-355', name: 'KHOIRUNISSA', class: 'VIII B' },
  { no: 17, coachInput: 'Rasty anastasyana : ( 9a )', id: 'std-19', name: 'RASTY ANASTASYANA', class: 'IX A' },
  { no: 18, coachInput: 'Radya Nadin : ( 8c )', id: 'std-397', name: 'RADYA NADIN', class: 'VIII C' },
  { no: 19, coachInput: 'Dzulnfan Arfan Zaki : ( 7a )', id: 'std-182', name: 'Dzulva Arvanzaky', class: 'VII A' },
  { no: 20, coachInput: 'Sabrina Aqilla Ra : ( 8e )', id: 'std-457', name: 'SABRINA AQILA RAHADATUL AISY', class: 'VIII E' },
  { no: 21, coachInput: 'Siti Syakira b : ( 8b )', id: 'std-368', name: 'SITI SYAKIRA BAHRI', class: 'VIII B' },
  { no: 22, coachInput: 'Sabila Aulia : ( 8b )', id: 'std-367', name: 'SABILA AULIA', class: 'VIII B' },
  { no: 23, coachInput: 'tamashi anding : ( 7d )', id: 'std-280', name: 'Tamashii Anding', class: 'VII D' },
  { no: 24, coachInput: 'pandu Julian : ( 7a )', id: 'std-194', name: 'PANDU JULIAN', class: 'VII A' },
  { no: 25, coachInput: 'Zahra Assyifa : ( 9e )', id: 'std-143', name: 'ZAHRA ASYIFA', class: 'IX E' },
  { no: 26, coachInput: 'Siti nur Rahma : ( 7a )', id: 'std-198', name: 'Siti Nur Rahmah', class: 'VII A' },
  { no: 27, coachInput: 'Aldi Kosasih : ( 7a )', id: 'std-175', name: 'Aldi Kosasih', class: 'VII A' },
  { no: 28, coachInput: 'rani qonitah : ( 8c )', id: 'std-78', name: 'RANI QANITAH', class: 'IX C' },
  { no: 29, coachInput: 'Nurul Aini : ( 7a )', id: 'std-193', name: 'Nurul Aini', class: 'VII A' },
  { no: 30, coachInput: 'aurelia Agustina R: ( 9d )', id: 'std-89', name: 'AURELIA AGUSTINA RAMADHANI', class: 'IX D' },
  { no: 31, coachInput: 'Habibah Tus syadiyah ( 8e )', id: 'std-441', name: 'HABIBATUS SYADIYAH', class: 'VIII E' },
  { no: 32, coachInput: 'Abrar Azizi lutfi (7B)', id: 'std-202', name: 'Abrar Azizi Lutfi', class: 'VII B' }
];

console.log('Verifying 32 Taekwondo students:');
for (const t of taekwondoVerified) {
  const found = students.find(s => s.id === t.id);
  if (!found) {
    console.error(`ID ${t.id} NOT FOUND!`);
  } else {
    console.log(`[${found.id}] ${found.name} (${found.className}) <== ${t.coachInput}`);
  }
}
