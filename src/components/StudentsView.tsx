import React, { useState } from 'react';
import { Student } from '../types';
import { 
  Users, 
  Search, 
  UserPlus, 
  FileSpreadsheet, 
  Download, 
  Sparkles, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  AlertCircle
} from 'lucide-react';

interface StudentsViewProps {
  students: Student[];
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onBulkImport: (newStudents: Omit<Student, 'id'>[]) => void;
  onRegenerateNumbers: () => void;
  onClearAll: () => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onBulkImport,
  onRegenerateNumbers,
  onClearAll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Single Add form
  const [newStudent, setNewStudent] = useState({
    examNumber: '',
    nisn: '',
    nis: '',
    name: '',
    className: 'VII A',
    gender: 'L' as 'L' | 'P',
    session: 1,
  });

  // Import Paste Area
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<Omit<Student, 'id'>[]>([]);

  // Unique classes
  const classes = Array.from(new Set(students.map((s) => s.className))).sort();

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.examNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nisn.includes(searchTerm) ||
      s.nis.includes(searchTerm);

    const matchClass = selectedClass === 'ALL' || s.className === selectedClass;
    const matchStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'ASSIGNED' && s.roomId) ||
      (selectedStatus === 'UNASSIGNED' && !s.roomId);

    return matchSearch && matchClass && matchStatus;
  });

  const maleCount = students.filter((s) => s.gender === 'L').length;
  const femaleCount = students.filter((s) => s.gender === 'P').length;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.className) return;

    onAddStudent({
      examNumber: newStudent.examNumber || `25-04-${String(students.length + 1).padStart(3, '0')}`,
      nisn: newStudent.nisn || `00${Math.floor(10000000 + Math.random() * 90000000)}`,
      nis: newStudent.nis || `25${Math.floor(100000 + Math.random() * 900000)}`,
      name: newStudent.name.toUpperCase(),
      className: newStudent.className,
      gender: newStudent.gender,
      session: newStudent.session,
    });

    setNewStudent({
      examNumber: '',
      nisn: '',
      nis: '',
      name: '',
      className: 'X PPLG 1',
      gender: 'L',
      session: 1,
    });
    setShowAddModal(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    onUpdateStudent({
      ...editingStudent,
      name: editingStudent.name.toUpperCase(),
    });
    setEditingStudent(null);
  };

  // Parse TSV / CSV text pasted from Excel
  const parsePastedData = (text: string) => {
    setImportText(text);
    const lines = text.trim().split(/\r?\n/);
    const parsed: Omit<Student, 'id'>[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.toLowerCase().startsWith('daftar siswa')) return;

      // Split by tab or semicolon or comma
      const parts = trimmed.includes('\t')
        ? trimmed.split('\t')
        : trimmed.includes(';')
        ? trimmed.split(';')
        : trimmed.split(',');

      if (parts.length >= 3) {
        const firstCol = parts[0].trim().toLowerCase();
        // Skip header lines
        if (firstCol === 'no' || firstCol === 'nisn' || firstCol === 'nama' || firstCol.includes('no.')) {
          return;
        }

        let nisn = '';
        let nis = '';
        let name = '';
        let className: string = (classes[0] as string) || 'VII A';
        let gender: 'L' | 'P' = 'L';
        let examNumber = '';

        // Check if user format: No, Kelas, No Absen, Kode Unik, Nama Siswa, NISN, Jenis Kelamin, No HP Ortu
        if (parts.length >= 5 && isNaN(Number(parts[1]?.trim())) && parts[3]?.trim().includes('-')) {
          // Format: No (0), Kelas (1), Absen (2), Kode Unik (3), Nama Siswa (4), NISN (5), JK (6), No HP (7)
          className = parts[1]?.trim() || className;
          const kodeUnik = parts[3]?.trim() || '';
          name = parts[4]?.trim() || '';
          nisn = parts[5]?.trim() === '-' ? '' : parts[5]?.trim() || '';
          const jk = (parts[6]?.trim() || 'L').toUpperCase();
          gender = jk.startsWith('P') ? 'P' : 'L';
          examNumber = kodeUnik;
          nis = kodeUnik;
        } else {
          // Standard format: NISN, NIS, Nama, Kelas, JK
          nisn = parts[0]?.trim() || '';
          nis = parts[1]?.trim() || '';
          name = parts[2]?.trim() || '';
          className = parts[3]?.trim() || className;
          let genderRaw = (parts[4]?.trim() || 'L').toUpperCase();
          gender = genderRaw.startsWith('P') ? 'P' : 'L';

          // In case format was: Nama, Kelas, JK
          if (isNaN(Number(nisn)) && !name) {
            name = nisn;
            nisn = `00${Math.floor(10000000 + Math.random() * 90000000)}`;
            className = nis || className;
          }
        }

        if (name) {
          parsed.push({
            examNumber: examNumber || `26-07-${String(students.length + index + 1).padStart(3, '0')}`,
            nisn: nisn || '-',
            nis: nis || `26${Math.floor(100000 + Math.random() * 900000)}`,
            name: name.toUpperCase(),
            className: className.toUpperCase(),
            gender: gender,
            session: 1,
          });
        }
      }
    });

    setImportPreview(parsed);
  };

  const handleConfirmImport = () => {
    if (importPreview.length > 0) {
      onBulkImport(importPreview);
      setShowImportModal(false);
      setImportText('');
      setImportPreview([]);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Nomor Peserta', 'NISN', 'NIS', 'Nama Lengkap', 'Kelas', 'Jenis Kelamin', 'Ruang', 'Nomor Meja'];
    const rows = students.map((s) => [
      s.examNumber,
      s.nisn,
      s.nis,
      `"${s.name}"`,
      s.className,
      s.gender,
      s.roomName || 'Belum Terbagi',
      s.seatNumber || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daftar_Peserta_Ujian_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Heading & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Data Peserta Ujian (Siswa)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Total {students.length} peserta ({maleCount} Laki-laki, {femaleCount} Perempuan) dari {classes.length} rombel/kelas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRegenerateNumbers}
            title="Generate nomor ujian otomatis berurutan sesuai rombel"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Generate No. Ujian</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import Excel / CSV</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama siswa, nomor peserta, NISN, atau NIS..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Rombel */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Rombel:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
          >
            <option value="ALL">Semua Rombel ({students.length})</option>
            {classes.map((cls) => {
              const count = students.filter((s) => s.className === cls).length;
              return (
                <option key={cls} value={cls}>
                  {cls} ({count} siswa)
                </option>
              );
            })}
          </select>
        </div>

        {/* Filter Status Ruang */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
          >
            <option value="ALL">Semua Status</option>
            <option value="ASSIGNED">Sudah Dapat Ruang</option>
            <option value="UNASSIGNED">Belum Terbagi</option>
          </select>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">No. Peserta</th>
                <th className="py-3 px-4">NISN / NIS</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Kelas / Rombel</th>
                <th className="py-3 px-4 text-center">L/P</th>
                <th className="py-3 px-4">Penempatan Ruang</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ada data siswa yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-center text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">
                      {student.examNumber}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 font-mono">
                      <div>{student.nisn}</div>
                      <div className="text-[10px] text-slate-400">NIS: {student.nis}</div>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {student.name}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {student.className}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold">
                      <span className={student.gender === 'L' ? 'text-blue-600' : 'text-pink-600'}>
                        {student.gender}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {student.roomName ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200">
                          <span className="font-bold">{student.roomName}</span>
                          <span>•</span>
                          <span>Meja {String(student.seatNumber).padStart(2, '0')}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Belum Terbagi
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingStudent(student)}
                          title="Edit Siswa"
                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteStudent(student.id)}
                          title="Hapus Siswa"
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah Siswa */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Tambah Peserta Ujian Baru</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 pt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="Contoh: MUHAMMAD FAIZAL"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kelas / Rombel
                  </label>
                  <input
                    type="text"
                    value={newStudent.className}
                    onChange={(e) => setNewStudent({ ...newStudent, className: e.target.value })}
                    placeholder="X PPLG 1"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={newStudent.gender}
                    onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    NISN (10 Digit)
                  </label>
                  <input
                    type="text"
                    value={newStudent.nisn}
                    onChange={(e) => setNewStudent({ ...newStudent, nisn: e.target.value })}
                    placeholder="0081234567"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    NIS Sekolah
                  </label>
                  <input
                    type="text"
                    value={newStudent.nis}
                    onChange={(e) => setNewStudent({ ...newStudent, nis: e.target.value })}
                    placeholder="25261099"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nomor Peserta (Opsional / Otomatis)
                </label>
                <input
                  type="text"
                  value={newStudent.examNumber}
                  onChange={(e) => setNewStudent({ ...newStudent, examNumber: e.target.value })}
                  placeholder="Kosongkan untuk otomatis"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Siswa */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <span>Edit Data Siswa</span>
              </h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 pt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kelas / Rombel
                  </label>
                  <input
                    type="text"
                    value={editingStudent.className}
                    onChange={(e) => setEditingStudent({ ...editingStudent, className: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={editingStudent.gender}
                    onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    No. Peserta Ujian
                  </label>
                  <input
                    type="text"
                    value={editingStudent.examNumber}
                    onChange={(e) => setEditingStudent({ ...editingStudent, examNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    NISN
                  </label>
                  <input
                    type="text"
                    value={editingStudent.nisn}
                    onChange={(e) => setEditingStudent({ ...editingStudent, nisn: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Import Excel / Spreadsheet */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Import Data Peserta dari Excel / Spreadsheet</span>
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-3 flex-1 overflow-y-auto">
              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-indigo-600 flex-none mt-0.5" />
                <div>
                  <span className="font-bold">Cara Mudah:</span> Buka file Excel atau Google Sheets data siswa Anda, pilih baris &amp; kolom (urutan: <strong>NISN, NIS, Nama Lengkap, Kelas, L/P</strong>), lalu tekan <strong>Ctrl+C</strong> dan <strong>Paste (Ctrl+V)</strong> di kotak bawah.
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tempel (Paste) Baris Data dari Excel / Spreadsheet:
                </label>
                <textarea
                  rows={6}
                  value={importText}
                  onChange={(e) => parsePastedData(e.target.value)}
                  placeholder={`Contoh baris yang di-paste:
0082345001	25261001	AHMAD YUSUF	X PPLG 1	L
0082345002	25261002	SITI AISYAH	X PPLG 1	P
0082345003	25261003	BAGAS PRAKOSO	X PPLG 2	L`}
                  className="w-full p-3 text-xs font-mono border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Preview table */}
              {importPreview.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 border-b border-slate-200 flex justify-between">
                    <span>Pratinjau Hasil Parsing ({importPreview.length} Siswa Terdeteksi)</span>
                    <span className="text-emerald-700 font-semibold">Siap Ditambahkan</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                        <tr>
                          <th className="p-1.5">Nama</th>
                          <th className="p-1.5">Kelas</th>
                          <th className="p-1.5">NISN</th>
                          <th className="p-1.5">JK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreview.slice(0, 10).map((p, i) => (
                          <tr key={i}>
                            <td className="p-1.5 font-medium text-slate-900">{p.name}</td>
                            <td className="p-1.5">{p.className}</td>
                            <td className="p-1.5 font-mono text-slate-600">{p.nisn}</td>
                            <td className="p-1.5">{p.gender}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.length > 10 && (
                      <div className="p-2 text-center text-[10px] text-slate-500 bg-slate-50">
                        ...dan {importPreview.length - 10} siswa lainnya.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={importPreview.length === 0}
                onClick={handleConfirmImport}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-md shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Tambahkan {importPreview.length} Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
