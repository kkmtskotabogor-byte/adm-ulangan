import fs from 'fs';
import path from 'path';

const content = fs.readFileSync(path.resolve('src/data/initialData.ts'), 'utf-8');
const match = content.match(/export const initialStudents: Student\[\] = (\[[\s\S]*?\]);/);
const students = JSON.parse(match[1]);

// 1. Futsal List (51 students)
const futsalList = JSON.parse(fs.readFileSync('data/futsal_students.json', 'utf-8'));

// 2. Taekwondo List (32 students)
const taekwondoList = JSON.parse(fs.readFileSync('data/taekwondo_students.json', 'utf-8'));

// 3. Pramuka List (16 students ONLY)
const pramukaList = [
  { no: 1, coachInput: 'fahdanar raya al-fath 7a', id: 'std-183', name: 'Fahdanar', class: 'VII A', grade: 'Baik' },
  { no: 2, coachInput: 'muhammad bayu syahidan 7c', id: 'std-246', name: 'Muhammad Bayu Syahidan', class: 'VII C', grade: 'Baik' },
  { no: 3, coachInput: 'suniyya rana putri 7c', id: 'std-254', name: 'Suniyya Rana Putri', class: 'VII C', grade: 'Baik' },
  { no: 4, coachInput: 'Siti sarah 7c', id: 'std-253', name: 'Siti Sarah', class: 'VII C', grade: 'Baik' },
  { no: 5, coachInput: 'rafa syaputra 7c', id: 'std-249', name: 'Rafa Syahputra', class: 'VII C', grade: 'Baik' },
  { no: 6, coachInput: 'nova riani 7e', id: 'std-299', name: 'Nova Riani', class: 'VII E', grade: 'Sangat Baik' },
  { no: 7, coachInput: 'Devin al fauzan 7a', id: 'std-189', name: 'M. Devin Alfauzan', class: 'VII A', grade: 'Baik' },
  { no: 8, coachInput: 'dhisti naura anjani 8b', id: 'std-347', name: 'DHISTI NAURA ANJANI', class: 'VIII B', grade: 'Sangat Baik' },
  { no: 9, coachInput: 'syahda amelia putri 8b', id: 'std-370', name: 'SYAHDA AMELIA PUTRI', class: 'VIII B', grade: 'Sangat Baik' },
  { no: 10, coachInput: 'gisela putri 8b', id: 'std-354', name: 'GISELA PUTRI', class: 'VIII B', grade: 'Sangat Baik' },
  { no: 11, coachInput: 'sabila aulia 8b', id: 'std-367', name: 'SABILA AULIA', class: 'VIII B', grade: 'Sangat Baik' },
  { no: 12, coachInput: 'city el fatimah kela natasya 8c', id: 'std-380', name: 'CITYEL FATIMAH KHELA NATASYA', class: 'VIII C', grade: 'Sangat Baik' },
  { no: 13, coachInput: 'radya nadin 8c', id: 'std-397', name: 'RADYA NADIN', class: 'VIII C', grade: 'Sangat Baik' },
  { no: 14, coachInput: 'hanabi al khairi 8c', id: 'std-386', name: 'HANABI ALKHAIRI', class: 'VIII C', grade: 'Baik' },
  { no: 15, coachInput: 'aditya ramadhan 8b', id: 'std-360', name: 'MUHAMMAD ADITYA RAMADHAN', class: 'VIII B', grade: 'Sangat Baik' },
  { no: 16, coachInput: 'tasya afrilia 8a', id: 'std-335', name: 'TASYA AFRILIA', class: 'VIII A', grade: 'Sangat Baik' }
];

fs.writeFileSync('data/pramuka_students.json', JSON.stringify(pramukaList, null, 2));

// Rebuild masterExtras from scratch without default Pramuka
const masterExtras = {};

function addEkskulToMaster(key, ekskulName, nilai) {
  if (!masterExtras[key]) {
    masterExtras[key] = {
      ekskul: [{ name: ekskulName, nilai }]
    };
  } else {
    const list = masterExtras[key].ekskul || [];
    const existing = list.find(e => e.name && e.name.toLowerCase() === ekskulName.toLowerCase());
    if (existing) {
      existing.nilai = nilai;
    } else {
      list.push({ name: ekskulName, nilai });
      masterExtras[key].ekskul = list;
    }
  }
}

// 1. Populate Futsal
for (const f of futsalList) {
  const normName = f.fullName.toUpperCase().trim();
  addEkskulToMaster(f.studentId, 'Futsal', 'Baik');
  addEkskulToMaster(normName, 'Futsal', 'Baik');
}

// 2. Populate Taekwondo
for (const t of taekwondoList) {
  const normName = t.name.toUpperCase().trim();
  addEkskulToMaster(t.id, 'Taekwondo', 'Baik');
  addEkskulToMaster(normName, 'Taekwondo', 'Baik');
}

// 3. Populate Pramuka (ONLY for the 16 students!)
for (const p of pramukaList) {
  const normName = p.name.toUpperCase().trim();
  addEkskulToMaster(p.id, 'Pramuka', p.grade);
  addEkskulToMaster(normName, 'Pramuka', p.grade);
}

// Check sample students
console.log('Aurelia (should have Taekwondo only):', masterExtras['AURELIA AGUSTINA RAMADHANI']);
console.log('Raditia Alvaro (should have Futsal only):', masterExtras['RADITIA ALVARO']);
console.log('Gisela Putri (Futsal, Taekwondo, Pramuka):', masterExtras['GISELA PUTRI']);
console.log('Fahdanar (Pramuka Baik):', masterExtras['FAHDANAR']);

// Save to data/raport_extras.json
fs.writeFileSync('data/raport_extras.json', JSON.stringify(masterExtras, null, 2));

// Update src/data/initialData.ts
const initialDataPath = path.resolve('src/data/initialData.ts');
let initialDataContent = fs.readFileSync(initialDataPath, 'utf-8');
const cutIndex = initialDataContent.indexOf('export const initialRaportExtras:');
if (cutIndex !== -1) {
  const base = initialDataContent.substring(0, cutIndex).trimEnd() + '\n\n';
  const newContent = base + 'export const initialRaportExtras: Record<string, StudentRaportExtraData> = ' + JSON.stringify(masterExtras, null, 2) + ';\n';
  fs.writeFileSync(initialDataPath, newContent, 'utf-8');
  console.log('Updated src/data/initialData.ts with clean ekskul records.');
}
