import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  Save,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  Upload,
  User,
  Users,
  Clock,
  Heart,
  Award,
  BookOpen,
  FileSpreadsheet,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Plus,
  Trash2,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, StudentRaportExtraData } from '../types';

export interface RaportExtrasInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  selectedClass: string;
  initialStudentId?: string;
  extraDataMap: Record<string, StudentRaportExtraData>;
  onSaveExtraData: (updatedMap: Record<string, StudentRaportExtraData>) => void;
}

const PRESET_EKSKUL_NAMES = [
  'Pramuka',
  'Paskibra',
  'PMR',
  'Marawis',
  'Hadrah',
  'Futsal',
  'Bulutangkis',
  'Kaligrafi',
  'Tahfidz Al-Qur\'an',
  'English Club',
  'KIR (Karya Ilmiah)',
  'Seni Musik / Rebana',
  'Pencak Silat',
  'Volly',
];

const PRESET_CATATAN = [
  'Rajinlah Terus Belajar di Rumah',
  'Tingkatkan dan pertahankan prestasimu',
  'Pergunakanlah waktu belajar sebaik mungkin',
  'Disiplin dan sopan santun dalam belajar serta bergaul',
  'Tingkatkan motivasi, kehadiran, dan semangat belajar',
  'Kurangi bermain game/gawai dan lebih fokus belajar',
  'Perbanyak mengulang materi pelajaran dan hafalan di rumah',
  'Potensi akademik sangat baik, terus kembangkan bakatmu',
  'Perbaiki kehadiran dan keaktifan saat jam pelajaran',
  'Selalu patuh pada orang tua dan guru dalam keseharian',
];

const DEFAULT_KEPRIBADIAN = {
  kelakuan: 'Baik',
  kerajinan: 'Baik',
  kerapihan: 'Baik',
  kebersihan: 'Baik',
};

export const RaportExtrasInputModal: React.FC<RaportExtrasInputModalProps> = ({
  isOpen,
  onClose,
  students,
  selectedClass,
  initialStudentId,
  extraDataMap,
  onSaveExtraData,
}) => {
  // Active Modal Mode Tab: 'single' | 'table' | 'excel'
  const [modalTab, setModalTab] = useState<'single' | 'table' | 'excel'>('single');

  // Filter students for the current class
  const classStudents = useMemo(() => {
    if (!selectedClass || selectedClass === 'all') return students;
    return students.filter((s) => s.className === selectedClass);
  }, [students, selectedClass]);

  // Selected Student for Single Mode
  const [activeStudentId, setActiveStudentId] = useState<string>(() => {
    if (initialStudentId && classStudents.some((s) => s.id === initialStudentId)) {
      return initialStudentId;
    }
    return classStudents[0]?.id || '';
  });

  useEffect(() => {
    if (initialStudentId && classStudents.some((s) => s.id === initialStudentId)) {
      setActiveStudentId(initialStudentId);
    } else if (classStudents.length > 0 && !classStudents.some((s) => s.id === activeStudentId)) {
      setActiveStudentId(classStudents[0].id);
    }
  }, [initialStudentId, classStudents]);

  // Working copy of data map to avoid unintended live mutations until user clicks save
  const [localMap, setLocalMap] = useState<Record<string, StudentRaportExtraData>>(() => ({
    ...extraDataMap,
  }));

  useEffect(() => {
    setLocalMap({ ...extraDataMap });
  }, [extraDataMap, isOpen]);

  // Success Feedback Toast
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  if (!isOpen) return null;

  // Active student object
  const currentStudent = classStudents.find((s) => s.id === activeStudentId) || classStudents[0];
  const currentIndex = classStudents.findIndex((s) => s.id === activeStudentId);

  // Current student extra data
  const currentExtra: StudentRaportExtraData = currentStudent
    ? localMap[currentStudent.id] || {
        keperibadian: { ...DEFAULT_KEPRIBADIAN },
        absensi: { sakit: '-', izin: '-', alpa: '-' },
        ekskul: [
          { name: 'Pramuka', nilai: 'Baik' },
          { name: 'Marawis', nilai: '-' },
          { name: 'Hadrah', nilai: '-' },
          { name: '', nilai: '-' },
          { name: '', nilai: '-' },
        ],
        catatanWaliKelas: [
          'Rajinlah Terus Belajar di Rumah',
          'Tingkatkan dan pertahankan prestasi',
          'Pergunakanlah waktu belajar sebaik mungkin',
          'Disiplin dan sopan santun dalam belajar',
          'Tingkatkan motivasi dan semangat belajar',
        ],
      }
    : {};

  // Update a field for the current single student
  const updateCurrentStudentExtra = (updater: (prev: StudentRaportExtraData) => StudentRaportExtraData) => {
    if (!currentStudent) return;
    setLocalMap((prev) => {
      const existing = prev[currentStudent.id] || {
        keperibadian: { ...DEFAULT_KEPRIBADIAN },
        absensi: { sakit: '-', izin: '-', alpa: '-' },
        ekskul: [
          { name: 'Pramuka', nilai: 'Baik' },
          { name: 'Marawis', nilai: '-' },
          { name: 'Hadrah', nilai: '-' },
          { name: '', nilai: '-' },
          { name: '', nilai: '-' },
        ],
        catatanWaliKelas: [
          'Rajinlah Terus Belajar di Rumah',
          'Tingkatkan dan pertahankan prestasi',
          'Pergunakanlah waktu belajar sebaik mungkin',
          'Disiplin dan sopan santun dalam belajar',
          'Tingkatkan motivasi dan semangat belajar',
        ],
      };
      return {
        ...prev,
        [currentStudent.id]: updater(existing),
      };
    });
  };

  // Save single student and optionally navigate to next
  const handleSaveCurrent = (goToNext: boolean = false) => {
    onSaveExtraData(localMap);
    showFeedback(`Data raport ${currentStudent?.name || 'siswa'} berhasil disimpan!`);
    if (goToNext && currentIndex < classStudents.length - 1) {
      setActiveStudentId(classStudents[currentIndex + 1].id);
    }
  };

  // Save all changes in table mode
  const handleSaveAll = () => {
    onSaveExtraData(localMap);
    showFeedback(`Seluruh data raport kelas ${selectedClass} berhasil disimpan!`);
  };

  // Preset mass fillers for the entire class
  const handleSetAllKepribadianBaik = () => {
    const next = { ...localMap };
    classStudents.forEach((st) => {
      const ex = next[st.id] || {};
      next[st.id] = {
        ...ex,
        keperibadian: {
          kelakuan: 'Baik',
          kerajinan: 'Baik',
          kerapihan: 'Baik',
          kebersihan: 'Baik',
        },
      };
    });
    setLocalMap(next);
    showFeedback(`Semua kepribadian siswa diset "Baik"`);
  };

  const handleSetAllAbsensiNol = () => {
    const next = { ...localMap };
    classStudents.forEach((st) => {
      const ex = next[st.id] || {};
      const currentAbs = ex.absensi || {};
      next[st.id] = {
        ...ex,
        absensi: {
          sakit: currentAbs.sakit !== undefined && currentAbs.sakit !== '-' && currentAbs.sakit !== '' ? currentAbs.sakit : 0,
          izin: currentAbs.izin !== undefined && currentAbs.izin !== '-' && currentAbs.izin !== '' ? currentAbs.izin : 0,
          alpa: currentAbs.alpa !== undefined && currentAbs.alpa !== '-' && currentAbs.alpa !== '' ? currentAbs.alpa : 0,
        },
      };
    });
    setLocalMap(next);
    showFeedback(`Absensi kosong diset menjadi 0 Hari`);
  };

  const handleSetAllCatatanDefault = () => {
    const next = { ...localMap };
    classStudents.forEach((st) => {
      const ex = next[st.id] || {};
      next[st.id] = {
        ...ex,
        catatanWaliKelas: [
          'Rajinlah Terus Belajar di Rumah',
          'Tingkatkan dan pertahankan prestasi',
          'Pergunakanlah waktu belajar sebaik mungkin',
          'Disiplin dan sopan santun dalam belajar',
          'Tingkatkan motivasi dan semangat belajar',
        ],
      };
    });
    setLocalMap(next);
    showFeedback(`Catatan wali kelas standar diterapkan untuk semua siswa`);
  };

  // Export to Excel template
  const handleExportExcelTemplate = () => {
    const dataRows = classStudents.map((st, idx) => {
      const ex = localMap[st.id] || {};
      const kep = ex.keperibadian || DEFAULT_KEPRIBADIAN;
      const abs = ex.absensi || {};
      const eks = ex.ekskul || [];
      const cat = ex.catatanWaliKelas || [];

      return {
        'No': idx + 1,
        'ID Siswa': st.id,
        'No Peserta': st.examNumber || '',
        'NISN': st.nisn || '',
        'NIS': st.nis || '',
        'Nama Siswa': st.name,
        'Kelas': st.className,
        'Sakit (Hari)': abs.sakit ?? '-',
        'Izin (Hari)': abs.izin ?? '-',
        'Alpa (Hari)': abs.alpa ?? '-',
        'Kelakuan': kep.kelakuan || 'Baik',
        'Kerajinan': kep.kerajinan || 'Baik',
        'Kerapihan': kep.kerapihan || 'Baik',
        'Kebersihan': kep.kebersihan || 'Baik',
        'Ekskul 1': eks[0]?.name || 'Pramuka',
        'Nilai Ekskul 1': eks[0]?.nilai || 'Baik',
        'Ekskul 2': eks[1]?.name || 'Marawis',
        'Nilai Ekskul 2': eks[1]?.nilai || '-',
        'Catatan Wali Kelas 1': cat[0] || 'Rajinlah Terus Belajar di Rumah',
        'Catatan Wali Kelas 2': cat[1] || 'Tingkatkan dan pertahankan prestasi',
        'Catatan Wali Kelas 3': cat[2] || 'Pergunakanlah waktu belajar sebaik mungkin',
        'Catatan Wali Kelas 4': cat[3] || 'Disiplin dan sopan santun dalam belajar',
        'Catatan Wali Kelas 5': cat[4] || 'Tingkatkan motivasi dan semangat belajar',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    worksheet['!cols'] = [
      { wch: 5 },  // No
      { wch: 14 }, // ID Siswa
      { wch: 14 }, // No Peserta
      { wch: 12 }, // NISN
      { wch: 10 }, // NIS
      { wch: 25 }, // Nama Siswa
      { wch: 8 },  // Kelas
      { wch: 12 }, // Sakit
      { wch: 12 }, // Izin
      { wch: 12 }, // Alpa
      { wch: 12 }, // Kelakuan
      { wch: 12 }, // Kerajinan
      { wch: 12 }, // Kerapihan
      { wch: 12 }, // Kebersihan
      { wch: 15 }, // Ekskul 1
      { wch: 12 }, // Nilai 1
      { wch: 15 }, // Ekskul 2
      { wch: 12 }, // Nilai 2
      { wch: 35 }, // Cat 1
      { wch: 35 }, // Cat 2
      { wch: 35 }, // Cat 3
      { wch: 35 }, // Cat 4
      { wch: 35 }, // Cat 5
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Raport_${selectedClass || 'Kelas'}`);
    const fileName = `Format_Data_Raport_${(selectedClass || 'Semua_Kelas').replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showFeedback(`Template Excel berhasil diunduh: ${fileName}`);
  };

  // Import from Excel file
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!jsonRows || jsonRows.length === 0) {
          alert('File Excel kosong atau format tidak sesuai.');
          return;
        }

        const nextMap = { ...localMap };
        let updatedCount = 0;

        jsonRows.forEach((row) => {
          // Match student by ID Siswa, NISN, No Peserta, or Nama Siswa
          const rawId = String(row['ID Siswa'] || '').trim();
          const rawNisn = String(row['NISN'] || '').trim();
          const rawExamNo = String(row['No Peserta'] || '').trim();
          const rawName = String(row['Nama Siswa'] || '').trim().toLowerCase();

          const target = classStudents.find((s) => {
            if (rawId && s.id === rawId) return true;
            if (rawNisn && s.nisn && s.nisn === rawNisn) return true;
            if (rawExamNo && s.examNumber && s.examNumber === rawExamNo) return true;
            if (rawName && s.name.trim().toLowerCase() === rawName) return true;
            return false;
          });

          if (target) {
            const sakit = row['Sakit (Hari)'] ?? row['Sakit'] ?? '-';
            const izin = row['Izin (Hari)'] ?? row['Izin'] ?? '-';
            const alpa = row['Alpa (Hari)'] ?? row['Alpa'] ?? '-';

            const kelakuan = String(row['Kelakuan'] || 'Baik').trim();
            const kerajinan = String(row['Kerajinan'] || 'Baik').trim();
            const kerapihan = String(row['Kerapihan'] || 'Baik').trim();
            const kebersihan = String(row['Kebersihan'] || 'Baik').trim();

            const ekskul1Name = String(row['Ekskul 1'] || 'Pramuka').trim();
            const ekskul1Nilai = String(row['Nilai Ekskul 1'] || 'Baik').trim();
            const ekskul2Name = String(row['Ekskul 2'] || '').trim();
            const ekskul2Nilai = String(row['Nilai Ekskul 2'] || '-').trim();

            const cat1 = String(row['Catatan Wali Kelas 1'] || row['Catatan 1'] || '').trim();
            const cat2 = String(row['Catatan Wali Kelas 2'] || row['Catatan 2'] || '').trim();
            const cat3 = String(row['Catatan Wali Kelas 3'] || row['Catatan 3'] || '').trim();
            const cat4 = String(row['Catatan Wali Kelas 4'] || row['Catatan 4'] || '').trim();
            const cat5 = String(row['Catatan Wali Kelas 5'] || row['Catatan 5'] || '').trim();

            const catList = [cat1, cat2, cat3, cat4, cat5].filter((c) => c !== '');
            const finalCatatan = catList.length > 0 ? catList : [
              'Rajinlah Terus Belajar di Rumah',
              'Tingkatkan dan pertahankan prestasi',
              'Pergunakanlah waktu belajar sebaik mungkin',
              'Disiplin dan sopan santun dalam belajar',
              'Tingkatkan motivasi dan semangat belajar',
            ];

            nextMap[target.id] = {
              absensi: { sakit, izin, alpa },
              keperibadian: { kelakuan, kerajinan, kerapihan, kebersihan },
              ekskul: [
                { name: ekskul1Name, nilai: ekskul1Nilai },
                { name: ekskul2Name, nilai: ekskul2Nilai },
                { name: '', nilai: '-' },
                { name: '', nilai: '-' },
                { name: '', nilai: '-' },
              ],
              catatanWaliKelas: finalCatatan,
            };
            updatedCount++;
          }
        });

        setLocalMap(nextMap);
        onSaveExtraData(nextMap);
        showFeedback(`Berhasil mengimpor data raport untuk ${updatedCount} siswa!`);
        e.target.value = '';
      } catch (err) {
        console.error('Error importing Excel:', err);
        alert('Gagal memproses file Excel. Pastikan file valid.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">Input Data Pelengkap Raport</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Kelas {selectedClass}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ketidakhadiran (Absensi), Kepribadian (Sikap), Ekstrakurikuler, dan Catatan Wali Kelas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 pt-2 flex items-center justify-between gap-2 shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setModalTab('single')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition-all cursor-pointer ${
                modalTab === 'single'
                  ? 'bg-white text-indigo-700 shadow-2xs border-t-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Input Per Siswa</span>
            </button>
            <button
              type="button"
              onClick={() => setModalTab('table')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition-all cursor-pointer ${
                modalTab === 'table'
                  ? 'bg-white text-indigo-700 shadow-2xs border-t-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Rekap Sekelas (Tabel Massal)</span>
            </button>
            <button
              type="button"
              onClick={() => setModalTab('excel')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition-all cursor-pointer ${
                modalTab === 'excel'
                  ? 'bg-white text-indigo-700 shadow-2xs border-t-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor / Impor Excel</span>
            </button>
          </div>

          {/* Feedback pill */}
          {feedbackMsg && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{feedbackMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Body Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {/* =========================================================================
              TAB 1: INPUT PER SISWA (DETAIL & CEPAT)
              ========================================================================= */}
          {modalTab === 'single' && (
            <div className="space-y-5">
              {/* Student Switcher Bar */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Pilih Siswa:</span>
                  <select
                    value={activeStudentId}
                    onChange={(e) => setActiveStudentId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-indigo-500 cursor-pointer max-w-[280px] sm:max-w-[340px]"
                  >
                    {classStudents.map((st, i) => (
                      <option key={st.id} value={st.id}>
                        {i + 1}. {st.name} {st.nisn ? `(${st.nisn})` : ''} - {st.className}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentIndex > 0) setActiveStudentId(classStudents[currentIndex - 1].id);
                    }}
                    disabled={currentIndex <= 0}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-600"
                    title="Siswa Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-600 px-2">
                    {currentIndex + 1} / {classStudents.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentIndex < classStudents.length - 1) setActiveStudentId(classStudents[currentIndex + 1].id);
                    }}
                    disabled={currentIndex >= classStudents.length - 1}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-600"
                    title="Siswa Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {currentStudent ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. KETIDAKHADIRAN (ABSENSI) */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                          1. Ketidakhadiran (Hari)
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          updateCurrentStudentExtra((prev) => ({
                            ...prev,
                            absensi: { sakit: 0, izin: 0, alpa: 0 },
                          }));
                        }}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                      >
                        Nolkan (0)
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Sakit (S)
                        </label>
                        <input
                          type="text"
                          value={currentExtra.absensi?.sakit ?? '-'}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateCurrentStudentExtra((prev) => ({
                              ...prev,
                              absensi: { ...prev.absensi, sakit: val },
                            }));
                          }}
                          placeholder="0 / -"
                          className="w-full text-center py-1.5 px-2 font-bold border border-slate-300 rounded-lg text-slate-800 focus:outline-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Izin (I)
                        </label>
                        <input
                          type="text"
                          value={currentExtra.absensi?.izin ?? '-'}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateCurrentStudentExtra((prev) => ({
                              ...prev,
                              absensi: { ...prev.absensi, izin: val },
                            }));
                          }}
                          placeholder="0 / -"
                          className="w-full text-center py-1.5 px-2 font-bold border border-slate-300 rounded-lg text-slate-800 focus:outline-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Alpa (A)
                        </label>
                        <input
                          type="text"
                          value={currentExtra.absensi?.alpa ?? '-'}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateCurrentStudentExtra((prev) => ({
                              ...prev,
                              absensi: { ...prev.absensi, alpa: val },
                            }));
                          }}
                          placeholder="0 / -"
                          className="w-full text-center py-1.5 px-2 font-bold border border-slate-300 rounded-lg text-slate-800 focus:outline-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Total Ketidakhadiran:</span>
                      <span className="font-bold text-slate-800">
                        {(() => {
                          const s = Number(currentExtra.absensi?.sakit) || 0;
                          const i = Number(currentExtra.absensi?.izin) || 0;
                          const a = Number(currentExtra.absensi?.alpa) || 0;
                          return `${s + i + a} Hari`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* 2. KEPRIBADIAN (SIKAP) */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-rose-500" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                          2. Kepribadian / Sikap
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            updateCurrentStudentExtra((prev) => ({
                              ...prev,
                              keperibadian: { ...DEFAULT_KEPRIBADIAN },
                            }));
                          }}
                          className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                        >
                          Semua Baik
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      {(['kelakuan', 'kerajinan', 'kerapihan', 'kebersihan'] as const).map((trait) => {
                        const currentVal = currentExtra.keperibadian?.[trait] || 'Baik';
                        const labels: Record<string, string> = {
                          kelakuan: 'Kelakuan',
                          kerajinan: 'Kerajinan',
                          kerapihan: 'Kerapihan',
                          kebersihan: 'Kebersihan',
                        };

                        return (
                          <div key={trait}>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              {labels[trait]}
                            </label>
                            <select
                              value={currentVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateCurrentStudentExtra((prev) => ({
                              ...prev,
                              keperibadian: {
                                ...(prev.keperibadian || DEFAULT_KEPRIBADIAN),
                                [trait]: val,
                              },
                                }));
                              }}
                              className="w-full py-1.5 px-2 border border-slate-300 rounded-lg text-slate-800 font-bold bg-white focus:outline-indigo-500 cursor-pointer"
                            >
                              <option value="Sangat Baik">Sangat Baik (A)</option>
                              <option value="Baik">Baik (B)</option>
                              <option value="Cukup">Cukup (C)</option>
                              <option value="Kurang">Kurang (D)</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. EKSTRAKURIKULER */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                          3. Kegiatan Ekstrakurikuler (Maksimal 5 Kegiatan)
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-400">Pilih nama ekskul dan nilai</span>
                    </div>

                    <div className="space-y-2">
                      {[0, 1, 2, 3, 4].map((idx) => {
                        const ekskulItem = currentExtra.ekskul?.[idx] || { name: '', nilai: '-' };

                        return (
                          <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                            <span className="w-5 text-center font-bold text-slate-400 text-xs">
                              {idx + 1}.
                            </span>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={ekskulItem.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateCurrentStudentExtra((prev) => {
                                    const nextEkskul = [...(prev.ekskul || [])];
                                    while (nextEkskul.length <= idx) nextEkskul.push({ name: '', nilai: '-' });
                                    nextEkskul[idx] = { ...nextEkskul[idx], name: val };
                                    return { ...prev, ekskul: nextEkskul };
                                  });
                                }}
                                placeholder={`Nama Ekstrakurikuler ke-${idx + 1} (cth: Pramuka, Marawis, Hadrah)`}
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:outline-indigo-500"
                              />
                            </div>

                            <div className="w-32">
                              <select
                                value={ekskulItem.nilai}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateCurrentStudentExtra((prev) => {
                                    const nextEkskul = [...(prev.ekskul || [])];
                                    while (nextEkskul.length <= idx) nextEkskul.push({ name: '', nilai: '-' });
                                    nextEkskul[idx] = { ...nextEkskul[idx], nilai: val };
                                    return { ...prev, ekskul: nextEkskul };
                                  });
                                }}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:outline-indigo-500 cursor-pointer"
                              >
                                <option value="-">- (Kosong)</option>
                                <option value="Sangat Baik">Sangat Baik</option>
                                <option value="Baik">Baik</option>
                                <option value="Cukup">Cukup</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                updateCurrentStudentExtra((prev) => {
                                  const nextEkskul = [...(prev.ekskul || [])];
                                  if (nextEkskul[idx]) nextEkskul[idx] = { name: '', nilai: '-' };
                                  return { ...prev, ekskul: nextEkskul };
                                });
                              }}
                              className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick Preset Buttons for Ekskul */}
                    <div className="pt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="font-semibold text-slate-500">Pilihan Cepat:</span>
                      {PRESET_EKSKUL_NAMES.slice(0, 8).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            updateCurrentStudentExtra((prev) => {
                              const nextEkskul = [...(prev.ekskul || [])];
                              // Find first empty row or row 0
                              const emptyIdx = nextEkskul.findIndex((ek) => !ek.name);
                              const targetIdx = emptyIdx !== -1 ? emptyIdx : 0;
                              while (nextEkskul.length <= targetIdx) nextEkskul.push({ name: '', nilai: '-' });
                              nextEkskul[targetIdx] = { name: preset, nilai: 'Baik' };
                              return { ...prev, ekskul: nextEkskul };
                            });
                          }}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. CATATAN WALI KELAS */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                          4. Catatan Wali Kelas (Untuk Perhatian Orang Tua / Wali Siswa)
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-400">Maksimal 5 butir catatan</span>
                    </div>

                    <div className="space-y-2">
                      {[0, 1, 2, 3, 4].map((idx) => {
                        const noteText = currentExtra.catatanWaliKelas?.[idx] || '';

                        return (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="w-5 pt-2 text-center font-bold text-slate-400 text-xs">
                              {idx + 1}.
                            </span>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={noteText}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateCurrentStudentExtra((prev) => {
                                    const nextCat = [...(prev.catatanWaliKelas || [])];
                                    while (nextCat.length <= idx) nextCat.push('');
                                    nextCat[idx] = val;
                                    return { ...prev, catatanWaliKelas: nextCat };
                                  });
                                }}
                                placeholder={`Catatan butir ke-${idx + 1}...`}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-indigo-500 font-medium"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                updateCurrentStudentExtra((prev) => {
                                  const nextCat = [...(prev.catatanWaliKelas || [])];
                                  if (nextCat[idx]) nextCat[idx] = '';
                                  return { ...prev, catatanWaliKelas: nextCat };
                                });
                              }}
                              className="p-1.5 pt-2 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick Preset Buttons for Catatan */}
                    <div className="pt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="font-semibold text-slate-500">Rekomendasi Catatan:</span>
                      {PRESET_CATATAN.slice(0, 6).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            updateCurrentStudentExtra((prev) => {
                              const nextCat = [...(prev.catatanWaliKelas || [])];
                              const emptyIdx = nextCat.findIndex((c) => !c.trim());
                              const targetIdx = emptyIdx !== -1 ? emptyIdx : 0;
                              while (nextCat.length <= targetIdx) nextCat.push('');
                              nextCat[targetIdx] = preset;
                              return { ...prev, catatanWaliKelas: nextCat };
                            });
                          }}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">Tidak ada siswa yang dipilih.</div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 2: REKAP SEKELAS (TABEL MASSAL)
              ========================================================================= */}
          {modalTab === 'table' && (
            <div className="space-y-4">
              {/* Batch Action Toolbar */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-slate-700 mr-1">Aksi Cepat Sekelas:</span>
                  <button
                    type="button"
                    onClick={handleSetAllKepribadianBaik}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-md font-semibold cursor-pointer"
                  >
                    Set Semua Kepribadian "Baik"
                  </button>
                  <button
                    type="button"
                    onClick={handleSetAllAbsensiNol}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-md font-semibold cursor-pointer"
                  >
                    Set Absensi Kosong ke 0
                  </button>
                  <button
                    type="button"
                    onClick={handleSetAllCatatanDefault}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-md font-semibold cursor-pointer"
                  >
                    Terapkan Catatan Standar
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Semua Data Kelas</span>
                </button>
              </div>

              {/* Table of all students in class */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto max-h-[55vh]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3 min-w-[160px]">Nama Siswa</th>
                        <th className="py-2.5 px-2 w-14 text-center">Sakit</th>
                        <th className="py-2.5 px-2 w-14 text-center">Izin</th>
                        <th className="py-2.5 px-2 w-14 text-center">Alpa</th>
                        <th className="py-2.5 px-2 w-28 text-center">Kelakuan</th>
                        <th className="py-2.5 px-2 w-28 text-center">Kerajinan</th>
                        <th className="py-2.5 px-2 w-28 text-center">Kerapihan</th>
                        <th className="py-2.5 px-2 w-28 text-center">Kebersihan</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Catatan Utama Wali Kelas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classStudents.map((st, idx) => {
                        const ex = localMap[st.id] || {};
                        const abs = ex.absensi || {};
                        const kep = ex.keperibadian || DEFAULT_KEPRIBADIAN;
                        const cat = ex.catatanWaliKelas || [];

                        return (
                          <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2 px-3 text-center font-mono text-slate-400 font-bold">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3">
                              <p className="font-bold text-slate-900 leading-tight">{st.name}</p>
                              <p className="text-[10px] text-slate-400">{st.nisn || st.examNumber || '-'}</p>
                            </td>
                            {/* Sakit */}
                            <td className="py-1 px-1">
                              <input
                                type="text"
                                value={abs.sakit ?? '-'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLocalMap((prev) => ({
                                    ...prev,
                                    [st.id]: {
                                      ...(prev[st.id] || {}),
                                      absensi: { ...(prev[st.id]?.absensi || {}), sakit: val },
                                    },
                                  }));
                                }}
                                className="w-full text-center py-1 border border-slate-300 rounded font-bold text-slate-800 text-xs"
                              />
                            </td>
                            {/* Izin */}
                            <td className="py-1 px-1">
                              <input
                                type="text"
                                value={abs.izin ?? '-'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLocalMap((prev) => ({
                                    ...prev,
                                    [st.id]: {
                                      ...(prev[st.id] || {}),
                                      absensi: { ...(prev[st.id]?.absensi || {}), izin: val },
                                    },
                                  }));
                                }}
                                className="w-full text-center py-1 border border-slate-300 rounded font-bold text-slate-800 text-xs"
                              />
                            </td>
                            {/* Alpa */}
                            <td className="py-1 px-1">
                              <input
                                type="text"
                                value={abs.alpa ?? '-'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLocalMap((prev) => ({
                                    ...prev,
                                    [st.id]: {
                                      ...(prev[st.id] || {}),
                                      absensi: { ...(prev[st.id]?.absensi || {}), alpa: val },
                                    },
                                  }));
                                }}
                                className="w-full text-center py-1 border border-slate-300 rounded font-bold text-slate-800 text-xs"
                              />
                            </td>
                            {/* Kelakuan */}
                            <td className="py-1 px-1">
                              <select
                                value={kep.kelakuan || 'Baik'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLocalMap((prev) => ({
                                    ...prev,
                                    [st.id]: {
                                      ...(prev[st.id] || {}),
                                      keperibadian: { ...(prev[st.id]?.keperibadian || DEFAULT_KEPRIBADIAN), kelakuan: val },
                                    },
                                  }));
                                }}
                                className="w-full py-1 px-1 text-[11px] font-semibold border border-slate-300 rounded bg-white text-slate-800"
                              >
                                <option value="Sangat Baik">Sgt Baik</option>
                                <option value="Baik">Baik</option>
                                <option value="Cukup">Cukup</option>
                                <option value="Kurang">Kurang</option>
                              </select>
                            </td>
                            {/* Kerajinan */}
                            <td className="py-1 px-1">
                              <select
                                value={kep.kerajinan || 'Baik'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLocalMap((prev) => ({
                                    ...prev,
                                    [st.id]: {
                                      ...(prev[st.id] || {}),
                                      keperibadian: { ...(prev[st.id]?.keperibadian || DEFAULT_KEPRIBADIAN), kerajinan: val },
                                    },
                                  }));
                                }}
                                className="w-full py-1 px-1 text-[11px] font-semibold border border-slate-300 rounded bg-white text-slate-800"
                              >
                                <option value="Sangat Baik">Sgt Baik</option>
                                <option value="Baik">Baik</option>
                                <option value="Cukup">Cukup</option>
                                <option value="Kurang">Kurang</option>
                              </select>
                            </td>
                            {/* Kerapihan */}
                            <td className="py-1 px-1">
                              <select
                                value={kep.kerapihan || 'Baik'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLocalMap((prev) => ({
                                    ...prev,
                                    [st.id]: {
                                      ...(prev[st.id] || {}),
                                      keperibadian: { ...(prev[st.id]?.keperibadian || DEFAULT_KEPRIBADIAN), kerapihan: val },
                                    },
                                  }));
                                }}
                                className="w-full py-1 px-1 text-[11px] font-semibold border border-slate-300 rounded bg-white text-slate-800"
                              >
                                <option value="Sangat Baik">Sgt Baik</option>
                                <option value="Baik">Baik</option>
                                <option value="Cukup">Cukup</option>
                                <option value="Kurang">Kurang</option>
                              </select>
                            </td>
                            {/* Kebersihan */}
                            <td className="py-1 px-1">
                              <select
                                value={kep.kebersihan || 'Baik'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLocalMap((prev) => ({
                                    ...prev,
                                    [st.id]: {
                                      ...(prev[st.id] || {}),
                                      keperibadian: { ...(prev[st.id]?.keperibadian || DEFAULT_KEPRIBADIAN), kebersihan: val },
                                    },
                                  }));
                                }}
                                className="w-full py-1 px-1 text-[11px] font-semibold border border-slate-300 rounded bg-white text-slate-800"
                              >
                                <option value="Sangat Baik">Sgt Baik</option>
                                <option value="Baik">Baik</option>
                                <option value="Cukup">Cukup</option>
                                <option value="Kurang">Kurang</option>
                              </select>
                            </td>
                            {/* Catatan Utama */}
                            <td className="py-1 px-2">
                              <input
                                type="text"
                                value={cat[0] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLocalMap((prev) => {
                                    const nextCat = [...(prev[st.id]?.catatanWaliKelas || [])];
                                    nextCat[0] = val;
                                    return {
                                      ...prev,
                                      [st.id]: {
                                        ...(prev[st.id] || {}),
                                        catatanWaliKelas: nextCat,
                                      },
                                    };
                                  });
                                }}
                                placeholder="Tingkatkan dan pertahankan prestasimu..."
                                className="w-full py-1 px-2 border border-slate-300 rounded text-xs text-slate-800"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 3: EKSPOR & IMPOR EXCEL
              ========================================================================= */}
          {modalTab === 'excel' && (
            <div className="space-y-6 max-w-2xl mx-auto py-2">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      1. Unduh Format Template Excel ({selectedClass})
                    </h4>
                    <p className="text-xs text-slate-500">
                      File Excel telah memuat daftar siswa kelas {selectedClass} beserta kolom absensi, sikap, ekskul, dan catatan.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportExcelTemplate}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File Excel Kelas {selectedClass}</span>
                </button>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      2. Unggah / Impor File Excel yang Sudah Diisi
                    </h4>
                    <p className="text-xs text-slate-500">
                      Sistem akan membaca otomatis nilai absensi, kepribadian, ekskul, dan catatan untuk tiap siswa.
                    </p>
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleImportExcel}
                    className="hidden"
                    id="excel-raport-file-input"
                  />
                  <label
                    htmlFor="excel-raport-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                  >
                    <FileSpreadsheet className="w-10 h-10 text-emerald-600 mb-1" />
                    <span className="text-xs font-bold text-indigo-700 hover:underline">
                      Pilih file Excel (.xlsx / .xls) untuk diunggah
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Atau seret dan lepas file Anda ke kotak ini
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-white px-5 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            {modalTab === 'single' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSaveCurrent(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-slate-500" />
                  <span>Simpan Siswa Ini</span>
                </button>

                {currentIndex < classStudents.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleSaveCurrent(true)}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Simpan &amp; Lanjut Berikutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={handleSaveAll}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Semua Perubahan</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
