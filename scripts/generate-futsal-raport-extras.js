import fs from 'fs';
import path from 'path';

const content = fs.readFileSync(path.resolve('src/data/initialData.ts'), 'utf-8');
const match = content.match(/export const initialStudents: Student\[\] = (\[[\s\S]*?\]);/);
const students = JSON.parse(match[1]);

// List of target student definitions by coach with intended full name match
const targetDefinitions = [
  { coachName: 'Raditya (9F)', exactName: 'RADITIA ALVARO', classExpected: 'IX F' },
  { coachName: 'Irsyad (9F)✅', exactName: 'IRSYAD ZAINUL MUTTAQIN', classExpected: 'IX F' },
  { coachName: 'Haidar (7D)', exactName: 'Haidar Mutadjib', classExpected: 'VII D' },
  { coachName: 'Wildan (7B)', exactName: 'Muhammad Wildan Abdurrahman', classExpected: 'VII B' },
  { coachName: 'Dika (7C)', exactName: 'Aldian Mahar Dika', classExpected: 'VII C' },
  { coachName: 'Asep (7B)', exactName: 'Asep Saepudin', classExpected: 'VII B' },
  { coachName: 'Riski maulana (8E)', exactName: 'RIZKI MAULANA ADITYA', classExpected: 'VIII E' },
  { coachName: 'Farhan akbar (8E)✅', exactName: 'FARHAN AKBAR RAMADHAN', classExpected: 'VIII E' },
  { coachName: 'Fahmi (9F)✅', exactName: 'FAHMI FABIAN YUSUF', classExpected: 'IX F' },
  { coachName: 'Celvino (8E)✅', exactName: 'CELVINO AZKA FABIAN', classExpected: 'VIII E' },
  { coachName: 'Haikal el sarawi (8E)', exactName: 'MUHAMMAD HAIKAL ELSHARAWY', classExpected: 'VIII E' },
  { coachName: 'M.aldi nur (7A)', exactName: 'M. Aldi Nur Rizki', classExpected: 'VII A' },
  { coachName: 'M.satria alfaraz (8B)✅', exactName: "MUHAMMAD SATRIA AL'FARAZ", classExpected: 'VIII B' },
  { coachName: 'M.rafa (9F)✅', exactName: 'MUHAMAD RAFA', classExpected: 'IX F' },
  { coachName: 'Albi (7C)', exactName: 'Albi Yansyah', classExpected: 'VII C' },
  { coachName: 'Fajar maulana (9F)✅', exactName: 'FAJAR M.', classExpected: 'IX F' },
  { coachName: 'Fatarul (9C)', exactName: 'AKBAR FATTAHRUL AWWAL', classExpected: 'IX C' },
  { coachName: 'M.adni (7D)', exactName: 'Muhammad Adni', classExpected: 'VII D' },
  { coachName: 'Farhat putra (9C)', exactName: 'FARHAT PUTRA KUSUMAH', classExpected: 'IX C' },
  { coachName: 'Dafa nafiz (8B)', exactName: 'DAFA NAFIS MUAZAM', classExpected: 'VIII B' },
  { coachName: 'Abam (7B)', exactName: 'Abrar Azizi Lutfi', classExpected: 'VII B' },
  { coachName: 'Irfan (8A)', exactName: 'MUHAMMAD IRFAN SAPUTRA', classExpected: 'VIII A' },
  { coachName: 'Abizar (7D) - 1', exactName: 'Abizar Kurniawan', classExpected: 'VII D' },
  { coachName: 'Abizar (7D) - 2', exactName: 'Muhammad Abizar Maulana', classExpected: 'VII D' },
  { coachName: 'Alo (9F)✅', exactName: 'IKRAR ALO', classExpected: 'IX F' },
  { coachName: 'Sultan (7E)✅', exactName: 'Sultan Arkhan Abdillah', classExpected: 'VII E' },
  { coachName: 'Khadafi (9E)✅', exactName: 'MUHAMMAD KHADAFY ALFINO', classExpected: 'IX E' },
  { coachName: 'Riza tri saputra (8D)✅', exactName: 'RIZA TRI SAPUTRA', classExpected: 'VIII D' },
  { coachName: 'Hisyam dwi rabani (8D)✅', exactName: 'HISYAM DWI RABBANI', classExpected: 'VIII D' },
  { coachName: 'Arya nugraha (7A)', exactName: 'Arya Nugraha', classExpected: 'VII A' },
  { coachName: 'M.fahrorozi (9A -> 9E)', exactName: 'MUHAMMAD FACHRURROZI ISHAQ', classExpected: 'IX E' },
  { coachName: 'M.haikal basir (8E)✅', exactName: 'MUHAMAD HAIKAL AL BAHSYIR', classExpected: 'VIII E' },
  { coachName: 'Zamzam (8D)✅', exactName: 'YUSUF ZAMZAMI', classExpected: 'VIII D' },
  { coachName: 'Muhaimin (7E)', exactName: 'Muhaymin', classExpected: 'VII E' },
  { coachName: 'Rifqi (9A)', exactName: 'RIFKI RAMADHAN', classExpected: 'IX A' },
  { coachName: 'Abdul mugni (8D)', exactName: 'ABDUL MUGNI', classExpected: 'VIII D' },
  { coachName: 'Nabily (8D)✅', exactName: 'MUHAMMAD NABILLY SYAHDAN', classExpected: 'VIII D' },
  { coachName: 'Kiar huda (7B)', exactName: 'Kiaryuda', classExpected: 'VII B' },
  { coachName: 'M.alif (8C)✅', exactName: 'MUHAMMAD ALIF AL HAKIM', classExpected: 'VIII C' },
  { coachName: 'M.azam (9B)✅', exactName: 'MUHAMAD AZAM AL RIFKI', classExpected: 'IX B' },
  { coachName: 'M.raihan saputra (9F)', exactName: 'MUHAMAD REYHAN SYAPUTRA', classExpected: 'IX F' },
  { coachName: 'M.ilham (9A)✅', exactName: 'M. ILHAM', classExpected: 'IX A' },
  { coachName: 'Dimas (7A)', exactName: 'Dimas Alfiand Ramadhan', classExpected: 'VII A' },
  { coachName: 'Afiansyah (7A)', exactName: 'Muhammad Alfiansyah', classExpected: 'VII A' },
  { coachName: 'Dapi (8C)', exactName: 'FADEL MOHAMMAD DEVIRZHA', classExpected: 'VIII C' },
  { coachName: 'Farel', exactName: 'FAREL RADITYA', classExpected: 'IX B' },
  // PEREMPUAN
  { coachName: 'Kiraina(8B) - 1', exactName: 'KIREINA LULU MUTMAINAH', classExpected: 'VIII B' },
  { coachName: 'Kiraina(8B) - 2', exactName: 'KIRANI SASKIA RAMADHANIA', classExpected: 'VIII B' },
  { coachName: 'Gisel (8B)', exactName: 'GISELA PUTRI', classExpected: 'VIII B' },
  { coachName: 'Siren ( 8 )', exactName: 'SIREN FEBRIANI', classExpected: 'VIII D' },
  { coachName: 'Widya ( 9 )', exactName: 'WIDYANI DWI AGUSTINA', classExpected: 'IX B' },
];

console.log('Resolving IDs for all 51 student entries...');
const verifiedEntries = [];

for (const t of targetDefinitions) {
  const found = students.find(s => 
    s.name.toUpperCase().trim() === t.exactName.toUpperCase().trim()
  );
  if (!found) {
    console.error(`FATAL: Could not find exact name "${t.exactName}"!`);
  } else {
    verifiedEntries.push({
      coachQuery: t.coachName,
      studentId: found.id,
      fullName: found.name,
      className: found.className,
      nis: found.nis,
      nisn: found.nisn,
      gender: found.gender
    });
  }
}

console.log(`Successfully verified ${verifiedEntries.length} / ${targetDefinitions.length} students!`);

// Save verified entries to a json file for use
fs.writeFileSync(path.resolve('data/futsal_students.json'), JSON.stringify(verifiedEntries, null, 2));

// Generate the StudentRaportExtraData mapping
const raportExtrasMap = {};
for (const entry of verifiedEntries) {
  raportExtrasMap[entry.studentId] = {
    ekskul: [
      { name: 'Pramuka', nilai: 'Baik' },
      { name: 'Futsal', nilai: 'Baik' },
      { name: 'Marawis / Hadrah', nilai: '-' },
    ]
  };
}

fs.writeFileSync(path.resolve('data/raport_extras.json'), JSON.stringify(raportExtrasMap, null, 2));
console.log('Saved data/raport_extras.json with Futsal: Baik for all verified students!');
