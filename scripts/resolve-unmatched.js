import fs from 'fs';
import path from 'path';

const content = fs.readFileSync(path.resolve('src/data/initialData.ts'), 'utf-8');
const match = content.match(/export const initialStudents: Student\[\] = (\[[\s\S]*?\]);/);
const students = JSON.parse(match[1]);

console.log('--- FAREL ACROSS SCHOOL ---');
students.filter(s => s.name.toLowerCase().includes('farel') || s.name.toLowerCase().includes('farrel'))
  .forEach(s => console.log(`[${s.id}] ${s.name} (${s.className})`));

console.log('\n--- ABAM ACROSS SCHOOL ---');
students.filter(s => s.name.toLowerCase().includes('abam'))
  .forEach(s => console.log(`[${s.id}] ${s.name} (${s.className})`));

console.log('\n--- 7B BOYS ---');
students.filter(s => (s.className || '').includes('VII B') && s.gender === 'L')
  .forEach(s => console.log(`[${s.id}] ${s.name} (${s.className})`));

console.log('\n--- FAHRORROZI / FACHRI / ROZI IN GRADE 9 ---');
students.filter(s => (s.className || '').includes('IX') && (s.name.toLowerCase().includes('rozi') || s.name.toLowerCase().includes('fahr')))
  .forEach(s => console.log(`[${s.id}] ${s.name} (${s.className})`));

console.log('\n--- DAPI / DAF / DAV ACROSS GRADE 8 ---');
students.filter(s => (s.className || '').includes('VIII') && (s.name.toLowerCase().includes('dap') || s.name.toLowerCase().includes('daf') || s.name.toLowerCase().includes('dav')))
  .forEach(s => console.log(`[${s.id}] ${s.name} (${s.className})`));

console.log('\n--- ABIZAR IN 7D ---');
students.filter(s => (s.className || '').includes('VII D') && s.name.toLowerCase().includes('abizar'))
  .forEach(s => console.log(`[${s.id}] ${s.name} (${s.className})`));

console.log('\n--- KIRAINA IN 8B ---');
students.filter(s => (s.className || '').includes('VIII B') && (s.name.toLowerCase().includes('kira') || s.name.toLowerCase().includes('kirei')))
  .forEach(s => console.log(`[${s.id}] ${s.name} (${s.className})`));

console.log('\n--- ALL WIDYA IN GRADE 9 ---');
students.filter(s => (s.className || '').includes('IX') && s.name.toLowerCase().includes('widy'))
  .forEach(s => console.log(`[${s.id}] ${s.name} (${s.className})`));

console.log('\n--- ALL SIREN IN GRADE 8 ---');
students.filter(s => (s.className || '').includes('VIII') && s.name.toLowerCase().includes('siren'))
  .forEach(s => console.log(`[${s.id}] ${s.name} (${s.className})`));
