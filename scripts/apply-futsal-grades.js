import fs from 'fs';
import path from 'path';

const content = fs.readFileSync(path.resolve('src/data/initialData.ts'), 'utf-8');
const match = content.match(/export const initialStudents: Student\[\] = (\[[\s\S]*?\]);/);
const students = JSON.parse(match[1]);

// Map of matched student IDs to their futsal entry
const futsalMappings = [
  { raw: 'Raditya (9F)', id: 'std-166', name: 'RADITIA ALVARO', class: 'IX F' },
  { raw: 'Irsyad (9F)✅', id: 'std-154', name: 'IRSYAD ZAINUL MUTTAQIN', class: 'IX F' },
  { raw: 'Haidar (7D)', id: 'std-261', name: 'Haidar Mutadjib', class: 'VII D' },
  { raw: 'Wildan (7B)', id: 'std-220', name: 'Muhammad Wildan Abdurrahman', class: 'VII B' },
  { raw: 'Dika (7C)', id: 'std-232', name: 'Aldian Mahar Dika', class: 'VII C' },
  { raw: 'Asep (7B)', id: 'std-208', name: 'Asep Saepudin', class: 'VII B' },
  { raw: 'Riski maulana (8E)', id: 'std-455', name: 'RIZKI MAULANA ADITYA', class: 'VIII E' },
  { raw: 'Farhan akbar (8E)✅', id: 'std-440', name: 'FARHAN AKBAR RAMADHAN', class: 'VIII E' },
  { raw: 'Fahmi (9F)✅', id: 'std-150', name: 'FAHMI FABIAN YUSUF', class: 'IX F' },
  { raw: 'Celvino (8E)✅', id: 'std-436', name: 'CELVINO AZKA FABIAN', class: 'VIII E' },
  { raw: 'Haikal el sarawi (8E)', id: 'std-452', name: 'MUHAMMAD HAIKAL ELSHARAWY', class: 'VIII E' },
  { raw: 'M.aldi nur (7A)', id: 'std-188', name: 'M. Aldi Nur Rizki', class: 'VII A' },
  { raw: 'M.satria alfaraz (8B)✅', id: 'std-363', name: "MUHAMMAD SATRIA AL'FARAZ", class: 'VIII B' },
  { raw: 'M.rafa (9F)✅', id: 'std-158', name: 'MUHAMAD RAFA', class: 'IX F' },
  { raw: 'Albi (7C)', id: 'std-231', name: 'Albi Yansyah', class: 'VII C' },
  { raw: 'Fajar maulana (9F)✅', id: 'std-151', name: 'FAJAR M.', class: 'IX F' },
  { raw: 'Fatarul (9C)', id: 'std-56', name: 'AKBAR FATTAHRUL AWWAL', class: 'IX C' },
  { raw: 'M.adni (7D)', id: 'std-266', name: 'Muhammad Adni', class: 'VII D' },
  { raw: 'Farhat putra (9C)', id: 'std-66', name: 'FARHAT PUTRA KUSUMAH', class: 'IX C' },
  { raw: 'Dafa nafiz (8B)', id: 'std-346', name: 'DAFA NAFIS MUAZAM', class: 'VIII B' },
  { raw: 'Abam (7B)', id: 'std-202', name: 'Abrar Azizi Lutfi', class: 'VII B' },
  { raw: 'Irfan (8A)', id: 'std-321', name: 'MUHAMMAD IRFAN SAPUTRA', class: 'VIII A' },
  { raw: 'Abizar (7D) - 1', id: 'std-257', name: 'Abizar Kurniawan', class: 'VII D' },
  { raw: 'Abizar (7D) - 2', id: 'std-265', name: 'Muhammad Abizar Maulana', class: 'VII D' },
  { raw: 'Alo (9F)✅', id: 'std-153', name: 'IKRAR ALO', class: 'IX F' },
  { raw: 'Sultan (7E)✅', id: 'std-304', name: 'Sultan Arkhan Abdillah', class: 'VII E' },
  { raw: 'Khadafi (9E)✅', id: 'std-132', name: 'MUHAMMAD KHADAFY ALFINO', class: 'IX E' },
  { raw: 'Riza tri saputra (8D)✅', id: 'std-423', name: 'RIZA TRI SAPUTRA', class: 'VIII D' },
  { raw: 'Hisyam dwi rabani (8D)✅', id: 'std-409', name: 'HISYAM DWI RABBANI', class: 'VIII D' },
  { raw: 'Arya nugraha (7A)', id: 'std-178', name: 'Arya Nugraha', class: 'VII A' },
  { raw: 'M.fahrorozi (9A -> 9E)', id: 'std-130', name: 'MUHAMMAD FACHRURROZI ISHAQ', class: 'IX E' },
  { raw: 'M.haikal basir (8E)✅', id: 'std-447', name: 'MUHAMAD HAIKAL AL BAHSYIR', class: 'VIII E' },
  { raw: 'Zamzam (8D)✅', id: 'std-430', name: 'YUSUF ZAMZAMI', class: 'VIII D' },
  { raw: 'Muhaimin (7E)', id: 'std-298', name: 'Muhaymin', class: 'VII E' },
  { raw: 'Rifqi (9A)', id: 'std-21', name: 'RIFKI RAMADHAN', class: 'IX A' },
  { raw: 'Abdul mugni (8D)', id: 'std-402', name: 'ABDUL MUGNI', class: 'VIII D' },
  { raw: 'Nabily (8D)✅', id: 'std-416', name: 'MUHAMMAD NABILLY SYAHDAN', class: 'VIII D' },
  { raw: 'Kiar huda (7B)', id: 'std-216', name: 'Kiaryuda', class: 'VII B' },
  { raw: 'M.alif (8C)✅', id: 'std-392', name: 'MUHAMMAD ALIF AL HAKIM', class: 'VIII C' },
  { raw: 'M.azam (9B)✅', id: 'std-44', name: 'MUHAMAD AZAM AL RIFKI', class: 'IX B' },
  { raw: 'M.raihan saputra (9F)', id: 'std-159', name: 'MUHAMAD REYHAN SYAPUTRA', class: 'IX F' },
  { raw: 'M.ilham (9A)✅', id: 'std-10', name: 'M. ILHAM', class: 'IX A' },
  { raw: 'Dimas (7A)', id: 'std-180', name: 'Dimas Alfiand Ramadhan', class: 'VII A' },
  { raw: 'Afiansyah (7A)', id: 'std-190', name: 'Muhammad Alfiansyah', class: 'VII A' },
  { raw: 'Dapi (8C)', id: 'std-382', name: 'FADEL MOHAMMAD DEVIRZHA', class: 'VIII C' },
  { raw: 'Farel', id: 'std-36', name: 'FAREL RADITYA', class: 'IX B' },
  // PEREMPUAN
  { raw: 'Kiraina(8B) - 1', id: 'std-357', name: 'KIREINA LULU MUTMAINAH', class: 'VIII B' },
  { raw: 'Kiraina(8B) - 2', id: 'std-356', name: 'KIRANI SASKIA RAMADHANIA', class: 'VIII B' },
  { raw: 'Gisel (8B)', id: 'std-354', name: 'GISELA PUTRI', class: 'VIII B' },
  { raw: 'Siren ( 8 )', id: 'std-427', name: 'SIREN FEBRIANI', class: 'VIII D' },
  { raw: 'Widya ( 9 )', id: 'std-54', name: 'WIDYANI DWI AGUSTINA', class: 'IX B' },
];

console.log(`Checking ${futsalMappings.length} mappings against initialStudents...`);
for (const m of futsalMappings) {
  const found = students.find(s => s.id === m.id);
  if (!found) {
    console.error(`ID ${m.id} not found!`);
  } else {
    console.log(`OK: [${m.id}] ${found.name} (${found.className}) <== "${m.raw}"`);
  }
}
