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
  FileText,
  Search,
  Table,
  Info,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, StudentRaportExtraData } from '../types';
import { initialRaportExtras } from '../data/initialData';
import { isPramukaStudent } from '../utils/ekskulUtils';

export interface RaportExtrasInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  selectedClass: string;
  initialStudentId?: string;
  extraDataMap: Record<string, StudentRaportExtraData>;
  onSaveExtraData: (updatedMap: Record<string, StudentRaportExtraData>) => void;
  initialSection?: 'all' | 'ekskul' | 'catatan' | 'absensi' | 'kepribadian';
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
  initialSection = 'all',
}) => {
  // Active Modal Mode Tab: 'single' | 'table' | 'excel'
  const [modalTab, setModalTab] = useState<'single' | 'table' | 'excel'>('single');

  // Sub-section filter: 'all' | 'ekskul' | 'catatan' | 'absensi' | 'kepribadian'
  const [activeSection, setActiveSection] = useState<'all' | 'ekskul' | 'catatan' | 'absensi' | 'kepribadian'>(initialSection);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection, isOpen]);

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
    ...initialRaportExtras,
    ...extraDataMap,
  }));

  useEffect(() => {
    setLocalMap({ ...initialRaportExtras, ...extraDataMap });
  }, [extraDataMap, isOpen]);

  // Excel Import Review State
  const [excelPreviewRows, setExcelPreviewRows] = useState<Array<{
    rowNum: number;
    studentId: string;
    studentName: string;
    className: string;
    nisn: string;
    examNumber: string;
    isMatched: boolean;
    extraData: StudentRaportExtraData;
  }> | null>(null);
  const [excelUnmatchedRows, setExcelUnmatchedRows] = useState<Array<{ rowNum: number; raw: string; reason: string }>>([]);
  const [selectedExcelStudentIds, setSelectedExcelStudentIds] = useState<Record<string, boolean>>({});
  const [excelSearchQuery, setExcelSearchQuery] = useState<string>('');

  const filteredExcelRows = useMemo(() => {
    if (!excelPreviewRows) return [];
    if (!excelSearchQuery.trim()) return excelPreviewRows;
    const q = excelSearchQuery.toLowerCase().trim();
    return excelPreviewRows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.examNumber.toLowerCase().includes(q) ||
        r.nisn.toLowerCase().includes(q) ||
        r.className.toLowerCase().includes(q)
    );
  }, [excelPreviewRows, excelSearchQuery]);

  const selectedExcelCount = useMemo(() => {
    if (!excelPreviewRows) return 0;
    return excelPreviewRows.filter((r) => r.isMatched && selectedExcelStudentIds[r.studentId]).length;
  }, [excelPreviewRows, selectedExcelStudentIds]);

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
  const currentNormName = currentStudent?.name?.toUpperCase().trim() || '';
  const currentMasterExtra = currentStudent
    ? initialRaportExtras[currentStudent.id] ||
      (currentNormName ? initialRaportExtras[currentNormName] : undefined)
    : undefined;

  const currentExtra: StudentRaportExtraData = currentStudent
    ? localMap[currentStudent.id] ||
      (currentNormName ? localMap[currentNormName] : undefined) ||
      currentMasterExtra || {
        keperibadian: { ...DEFAULT_KEPRIBADIAN },
        absensi: { sakit: '-', izin: '-', alpa: '-' },
        ekskul: isPramukaStudent(currentStudent?.id, currentStudent?.name).allowed
          ? [
              { name: 'Pramuka', nilai: isPramukaStudent(currentStudent?.id, currentStudent?.name).grade || 'Baik' },
              { name: '', nilai: '-' },
              { name: '', nilai: '-' },
              { name: '', nilai: '-' },
              { name: '', nilai: '-' },
            ]
          : [
              { name: '', nilai: '-' },
              { name: '', nilai: '-' },
              { name: '', nilai: '-' },
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
      const existing =
        prev[currentStudent.id] ||
        (currentNormName ? prev[currentNormName] : undefined) ||
        currentExtra;
      const updated = updater(existing);
      return {
        ...prev,
        [currentStudent.id]: updated,
        ...(currentNormName ? { [currentNormName]: updated } : {}),
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

  const handleApplyCurrentEkskulToClass = () => {
    if (!currentStudent || !currentExtra.ekskul) return;
    const next = { ...localMap };
    classStudents.forEach((st) => {
      const ex = next[st.id] || {};
      next[st.id] = {
        ...ex,
        ekskul: JSON.parse(JSON.stringify(currentExtra.ekskul)),
      };
    });
    setLocalMap(next);
    showFeedback(`Ekstrakurikuler berhasil disalin ke seluruh siswa kelas ${selectedClass}`);
  };

  const handleApplyCurrentCatatanToClass = () => {
    if (!currentStudent || !currentExtra.catatanWaliKelas) return;
    const next = { ...localMap };
    classStudents.forEach((st) => {
      const ex = next[st.id] || {};
      next[st.id] = {
        ...ex,
        catatanWaliKelas: [...(currentExtra.catatanWaliKelas || [])],
      };
    });
    setLocalMap(next);
    showFeedback(`Catatan wali kelas berhasil disalin ke seluruh siswa kelas ${selectedClass}`);
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

  // Import from Excel file with interactive review before saving
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          alert('File Excel kosong atau format tidak sesuai.');
          return;
        }

        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!rawJson || rawJson.length === 0) {
          alert('File Excel kosong atau format tidak sesuai.');
          return;
        }

        // Detect column positions
        let headerIdx = -1;
        let colId = -1, colNo = -1, colNisn = -1, colName = -1, colClass = -1;
        let colSakit = -1, colIzin = -1, colAlpa = -1;
        let colKelakuan = -1, colKerajinan = -1, colKerapihan = -1, colKebersihan = -1;
        let colEks1 = -1, colNilaiEks1 = -1, colEks2 = -1, colNilaiEks2 = -1;
        const colCat: number[] = [];

        for (let i = 0; i < Math.min(15, rawJson.length); i++) {
          const row = rawJson[i];
          if (!Array.isArray(row)) continue;
          for (let j = 0; j < row.length; j++) {
            const val = String(row[j] || '').toLowerCase().trim();
            if (colName === -1 && (val.includes('nama siswa') || val.includes('nama lengkap') || val === 'nama' || val.includes('murid'))) colName = j;
            if (colNo === -1 && (val.includes('peserta') || val.includes('no ujian') || val.includes('no. ujian') || val.includes('nomor peserta'))) colNo = j;
            if (colNisn === -1 && val.includes('nisn')) colNisn = j;
            if (colId === -1 && (val.includes('id siswa') || val === 'id')) colId = j;
            if (colClass === -1 && (val.includes('kelas') || val.includes('rombel'))) colClass = j;
            if (colSakit === -1 && val.includes('sakit')) colSakit = j;
            if (colIzin === -1 && val.includes('izin')) colIzin = j;
            if (colAlpa === -1 && (val.includes('alpa') || val.includes('tanpa ket') || val.includes('tanpa keterangan') || val === 'a' || val === 'tk')) colAlpa = j;
            if (colKelakuan === -1 && (val.includes('kelakuan') || val.includes('sikap'))) colKelakuan = j;
            if (colKerajinan === -1 && val.includes('kerajinan')) colKerajinan = j;
            if (colKerapihan === -1 && val.includes('kerapihan')) colKerapihan = j;
            if (colKebersihan === -1 && val.includes('kebersihan')) colKebersihan = j;
            if (colEks1 === -1 && (val.includes('ekskul 1') || val === 'ekskul')) colEks1 = j;
            if (colNilaiEks1 === -1 && (val.includes('nilai ekskul 1') || val.includes('nilai ekskul'))) colNilaiEks1 = j;
            if (colEks2 === -1 && val.includes('ekskul 2')) colEks2 = j;
            if (colNilaiEks2 === -1 && val.includes('nilai ekskul 2')) colNilaiEks2 = j;
            if (val.includes('catatan') && !colCat.includes(j)) colCat.push(j);
          }
          if (colName !== -1 || colNo !== -1) {
            headerIdx = i;
            break;
          }
        }

        if (headerIdx === -1) {
          alert('Judul kolom tidak terdeteksi. Pastikan file Excel memuat kolom "Nama Siswa", "Kelas", dan data absensi/sikap.');
          return;
        }

        const previewList: Array<{
          rowNum: number;
          studentId: string;
          studentName: string;
          className: string;
          nisn: string;
          examNumber: string;
          isMatched: boolean;
          extraData: StudentRaportExtraData;
        }> = [];

        const unmatchedList: Array<{ rowNum: number; raw: string; reason: string }> = [];
        const initialSelected: Record<string, boolean> = {};

        // Parse student data rows
        for (let r = headerIdx + 1; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!row || !Array.isArray(row) || row.length === 0) continue;

          const rowNum = r + 1;
          const rawId = colId !== -1 ? String(row[colId] || '').trim() : '';
          const rawExamNo = colNo !== -1 ? String(row[colNo] || '').trim() : '';
          const rawNisn = colNisn !== -1 ? String(row[colNisn] || '').trim() : '';
          const rawName = colName !== -1 ? String(row[colName] || '').trim() : '';
          const rawClassName = colClass !== -1 ? String(row[colClass] || '').trim() : selectedClass;

          // Check if row is purely summary/footer/empty
          const rowText = row.map((c) => String(c || '').toLowerCase()).join(' ');
          if (
            rowText.includes('mengetahui') ||
            rowText.includes('kepala madrasah') ||
            rowText.includes('wali kelas') ||
            rowText.includes('nip.') ||
            (!rawName && !rawExamNo && !rawNisn && !rawId)
          ) {
            continue;
          }

          // Match student: prioritize classStudents, then fallback to all students
          const cleanName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanExam = rawExamNo.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanNisn = rawNisn.toLowerCase().replace(/[^a-z0-9]/g, '');

          let target = classStudents.find((s) => {
            if (rawId && s.id === rawId) return true;
            if (cleanNisn && cleanNisn.length >= 4 && s.nisn?.replace(/[^a-z0-9]/g, '') === cleanNisn) return true;
            if (cleanExam && cleanExam.length >= 2 && s.examNumber?.replace(/[^a-z0-9]/g, '') === cleanExam) return true;
            if (cleanName && s.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanName) return true;
            return false;
          });

          // Second pass fallback to all students across school
          if (!target) {
            target = students.find((s) => {
              if (rawId && s.id === rawId) return true;
              if (cleanNisn && cleanNisn.length >= 4 && s.nisn?.replace(/[^a-z0-9]/g, '') === cleanNisn) return true;
              if (cleanExam && cleanExam.length >= 2 && s.examNumber?.replace(/[^a-z0-9]/g, '') === cleanExam) return true;
              if (cleanName && s.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanName) return true;
              return false;
            });
          }

          const sakit = colSakit !== -1 ? String(row[colSakit] ?? '-') : '-';
          const izin = colIzin !== -1 ? String(row[colIzin] ?? '-') : '-';
          const alpa = colAlpa !== -1 ? String(row[colAlpa] ?? '-') : '-';

          const kelakuan = colKelakuan !== -1 ? String(row[colKelakuan] || 'Baik').trim() : 'Baik';
          const kerajinan = colKerajinan !== -1 ? String(row[colKerajinan] || 'Baik').trim() : 'Baik';
          const kerapihan = colKerapihan !== -1 ? String(row[colKerapihan] || 'Baik').trim() : 'Baik';
          const kebersihan = colKebersihan !== -1 ? String(row[colKebersihan] || 'Baik').trim() : 'Baik';

          const eks1Name = colEks1 !== -1 ? String(row[colEks1] || 'Pramuka').trim() : 'Pramuka';
          const eks1Val = colNilaiEks1 !== -1 ? String(row[colNilaiEks1] || 'Baik').trim() : 'Baik';
          const eks2Name = colEks2 !== -1 ? String(row[colEks2] || '').trim() : '';
          const eks2Val = colNilaiEks2 !== -1 ? String(row[colNilaiEks2] || '-').trim() : '-';

          const catList: string[] = [];
          if (colCat.length > 0) {
            colCat.forEach((cIdx) => {
              const val = String(row[cIdx] || '').trim();
              if (val) catList.push(val);
            });
          }

          const finalCatatan = catList.length > 0 ? catList : [
            'Rajinlah Terus Belajar di Rumah',
            'Tingkatkan dan pertahankan prestasi',
            'Pergunakanlah waktu belajar sebaik mungkin',
            'Disiplin dan sopan santun dalam belajar',
            'Tingkatkan motivasi dan semangat belajar',
          ];

          const studentExtraData: StudentRaportExtraData = {
            absensi: { sakit, izin, alpa },
            keperibadian: { kelakuan, kerajinan, kerapihan, kebersihan },
            ekskul: [
              { name: eks1Name, nilai: eks1Val },
              { name: eks2Name, nilai: eks2Val },
              { name: '', nilai: '-' },
              { name: '', nilai: '-' },
              { name: '', nilai: '-' },
            ],
            catatanWaliKelas: finalCatatan,
          };

          if (target) {
            previewList.push({
              rowNum,
              studentId: target.id,
              studentName: target.name,
              className: target.className || rawClassName,
              nisn: target.nisn || rawNisn,
              examNumber: target.examNumber || rawExamNo,
              isMatched: true,
              extraData: studentExtraData,
            });
            initialSelected[target.id] = true;
          } else {
            unmatchedList.push({
              rowNum,
              raw: rawName || rawExamNo || `Baris ${rowNum}`,
              reason: 'Nama siswa atau No. Peserta tidak ditemukan di database sekolah.',
            });
          }
        }

        if (previewList.length === 0 && unmatchedList.length === 0) {
          alert('Tidak ada baris siswa yang ditemukan pada file Excel.');
          return;
        }

        setExcelPreviewRows(previewList);
        setExcelUnmatchedRows(unmatchedList);
        setSelectedExcelStudentIds(initialSelected);
        setExcelSearchQuery('');
        e.target.value = '';
      } catch (err: any) {
        console.error('Error importing Excel:', err);
        alert(`Gagal memproses file Excel: ${err.message || String(err)}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmSaveExcel = () => {
    if (!excelPreviewRows) return;
    const nextMap = { ...localMap };
    let savedCount = 0;

    excelPreviewRows.forEach((r) => {
      if (r.isMatched && selectedExcelStudentIds[r.studentId]) {
        nextMap[r.studentId] = r.extraData;
        savedCount++;
      }
    });

    if (savedCount === 0) {
      alert('Pilih minimal 1 siswa yang akan disimpan ke raport.');
      return;
    }

    setLocalMap(nextMap);
    onSaveExtraData(nextMap);
    showFeedback(`Berhasil menyimpan data raport untuk ${savedCount} siswa!`);
    setExcelPreviewRows(null);
    setExcelUnmatchedRows([]);
  };

  const handleCancelExcelPreview = () => {
    setExcelPreviewRows(null);
    setExcelUnmatchedRows([]);
    setExcelSearchQuery('');
  };

  const handleToggleSelectAllExcel = (select: boolean) => {
    if (!excelPreviewRows) return;
    const updated: Record<string, boolean> = {};
    excelPreviewRows.forEach((r) => {
      if (r.isMatched) updated[r.studentId] = select;
    });
    setSelectedExcelStudentIds(updated);
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedExcelStudentIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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

        {/* Section Sub-Filter Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-bold mr-1 text-[11px]">Fokus Bagian:</span>
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'all'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Semua Bagian Raport
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('ekskul')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'ekskul'
                  ? 'bg-amber-400 text-amber-950 shadow-xs ring-2 ring-amber-300 font-extrabold'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Ekstrakurikuler</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('catatan')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'catatan'
                  ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300 font-extrabold'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Catatan Wali Kelas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('absensi')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'absensi'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Ketidakhadiran (Absensi)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('kepribadian')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'kepribadian'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Kepribadian (Sikap)</span>
            </button>
          </div>
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
                <div className={`grid gap-4 ${activeSection === 'all' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {/* Banner when in focused section */}
                  {activeSection !== 'all' && (
                    <div className="col-span-full p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-950">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>
                          Fokus Mode: <strong>{activeSection === 'ekskul' ? 'Ekstrakurikuler' : activeSection === 'catatan' ? 'Catatan Wali Kelas' : activeSection === 'absensi' ? 'Ketidakhadiran' : 'Kepribadian'}</strong> untuk <strong>{currentStudent.name}</strong> (Kelas {selectedClass}).
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSection('all')}
                        className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
                      >
                        Tampilkan Semua Bagian
                      </button>
                    </div>
                  )}

                  {/* 1. KETIDAKHADIRAN (ABSENSI) */}
                  {(activeSection === 'all' || activeSection === 'absensi') && (
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
                  )}

                  {/* 2. KEPRIBADIAN (SIKAP) */}
                  {(activeSection === 'all' || activeSection === 'kepribadian') && (
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
                  )}

                  {/* 3. EKSTRAKURIKULER */}
                  {(activeSection === 'all' || activeSection === 'ekskul') && (
                    <div className={`bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 ${activeSection === 'all' ? 'md:col-span-2' : 'col-span-full ring-2 ring-amber-300/60'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-500" />
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                            3. Kegiatan Ekstrakurikuler (Maksimal 5 Kegiatan)
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleApplyCurrentEkskulToClass}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10.5px] cursor-pointer shadow-2xs transition-colors"
                            title={`Salin daftar ekskul ini ke seluruh siswa kelas ${selectedClass}`}
                          >
                            <Users className="w-3.5 h-3.5 text-amber-600" />
                            <span>Terapkan ke Seluruh Siswa ({classStudents.length} Siswa)</span>
                          </button>
                          <span className="text-[10px] text-slate-400 hidden sm:inline">Pilih nama &amp; nilai</span>
                        </div>
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
                                  <option value="Sangat Baik">Sangat Baik (A)</option>
                                  <option value="Baik">Baik (B)</option>
                                  <option value="Cukup">Cukup (C)</option>
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
                        <span className="font-semibold text-slate-500">Pilihan Cepat Ekskul:</span>
                        {PRESET_EKSKUL_NAMES.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              updateCurrentStudentExtra((prev) => {
                                const nextEkskul = [...(prev.ekskul || [])];
                                const emptyIdx = nextEkskul.findIndex((ek) => !ek.name);
                                const targetIdx = emptyIdx !== -1 ? emptyIdx : 0;
                                while (nextEkskul.length <= targetIdx) nextEkskul.push({ name: '', nilai: '-' });
                                nextEkskul[targetIdx] = { name: preset, nilai: 'Baik' };
                                return { ...prev, ekskul: nextEkskul };
                              });
                            }}
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. CATATAN WALI KELAS */}
                  {(activeSection === 'all' || activeSection === 'catatan') && (
                    <div className={`bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 ${activeSection === 'all' ? 'md:col-span-2' : 'col-span-full ring-2 ring-indigo-300/60'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                            4. Catatan Wali Kelas (Untuk Perhatian Orang Tua / Wali Siswa)
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleApplyCurrentCatatanToClass}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold text-[10.5px] cursor-pointer shadow-2xs transition-colors"
                            title={`Salin catatan ini ke seluruh siswa kelas ${selectedClass}`}
                          >
                            <Users className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Terapkan ke Seluruh Siswa ({classStudents.length} Siswa)</span>
                          </button>
                          <span className="text-[10px] text-slate-400 hidden sm:inline">Maksimal 5 butir catatan</span>
                        </div>
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
                        <span className="font-semibold text-slate-500">Rekomendasi Catatan Standar:</span>
                        {PRESET_CATATAN.map((preset) => (
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
                  )}
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
          {/* =========================================================================
              TAB 3: EKSPOR & IMPOR EXCEL
              ========================================================================= */}
          {modalTab === 'excel' && (
            excelPreviewRows ? (
              <div className="space-y-4">
                {/* Header bar with metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Total Terbaca
                    </span>
                    <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                      {excelPreviewRows.length} Siswa
                    </span>
                  </div>
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                      Cocok di Database
                    </span>
                    <span className="text-base font-extrabold text-indigo-900 mt-0.5 block">
                      {excelPreviewRows.filter((r) => r.isMatched).length} Siswa
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                      Siap Disimpan
                    </span>
                    <span className="text-base font-extrabold text-emerald-900 mt-0.5 block">
                      {selectedExcelCount} Siswa
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                      Baris Dilewati
                    </span>
                    <span className="text-base font-extrabold text-amber-900 mt-0.5 block">
                      {excelUnmatchedRows.length} Baris
                    </span>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAllExcel(true)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-700 font-semibold border border-slate-200 rounded-lg cursor-pointer"
                    >
                      Pilih Semua ({excelPreviewRows.filter((r) => r.isMatched).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAllExcel(false)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 rounded-lg cursor-pointer"
                    >
                      Batal Pilih
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari siswa atau no peserta..."
                      value={excelSearchQuery}
                      onChange={(e) => setExcelSearchQuery(e.target.value)}
                      className="text-xs pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-full sm:w-60"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-[46vh] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5 w-10 text-center">Pilih</th>
                        <th className="py-2 px-2 text-center w-8">No</th>
                        <th className="py-2 px-2.5">No. Peserta / NISN</th>
                        <th className="py-2 px-2.5">Nama Lengkap Siswa</th>
                        <th className="py-2 px-2 text-center">Kelas</th>
                        <th className="py-2 px-2.5 text-center">Absensi (S / I / A)</th>
                        <th className="py-2 px-2.5 text-center">Sikap &amp; Karakter</th>
                        <th className="py-2 px-2.5">Ekstrakurikuler</th>
                        <th className="py-2 px-2.5">Catatan Wali Kelas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExcelRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                            Tidak ada data siswa yang cocok dengan pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredExcelRows.map((r, idx) => {
                          const isChecked = !!selectedExcelStudentIds[r.studentId];
                          return (
                            <tr
                              key={r.studentId || idx}
                              className={`hover:bg-slate-50 transition-colors ${!isChecked ? 'opacity-40 bg-slate-50/50' : ''}`}
                            >
                              <td className="py-2 px-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!r.isMatched}
                                  onChange={() => handleToggleSelectStudent(r.studentId)}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600">
                                <div>{r.examNumber || '-'}</div>
                                {r.nisn && <div className="text-[10px] text-slate-400">NISN: {r.nisn}</div>}
                              </td>
                              <td className="py-2 px-2.5 font-semibold text-slate-900">
                                <div>{r.studentName}</div>
                                {!r.isMatched && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                                    Tidak Cocok di DB
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {r.className}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 text-center font-mono">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">
                                  S:{r.extraData.absensi?.sakit ?? '-'} | I:{r.extraData.absensi?.izin ?? '-'} | A:{r.extraData.absensi?.alpa ?? '-'}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 text-center text-[10px]">
                                <div className="flex flex-wrap items-center justify-center gap-1">
                                  <span className="px-1 py-0.2 rounded bg-emerald-50 text-emerald-800 font-semibold" title="Kelakuan">
                                    K:{r.extraData.keperibadian?.kelakuan}
                                  </span>
                                  <span className="px-1 py-0.2 rounded bg-blue-50 text-blue-800 font-semibold" title="Kerajinan">
                                    R:{r.extraData.keperibadian?.kerajinan}
                                  </span>
                                  <span className="px-1 py-0.2 rounded bg-purple-50 text-purple-800 font-semibold" title="Kerapihan">
                                    P:{r.extraData.keperibadian?.kerapihan}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-2.5 text-slate-600 text-[11px]">
                                {r.extraData.ekskul?.filter((e) => e.name).map((e) => `${e.name} (${e.nilai})`).join(', ') || '-'}
                              </td>
                              <td className="py-2 px-2.5 text-slate-600 text-[11px] truncate max-w-xs" title={r.extraData.catatanWaliKelas?.join('; ')}>
                                {r.extraData.catatanWaliKelas?.[0] || '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Diagnostics if unmatched rows exist */}
                {excelUnmatchedRows.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-amber-950">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>{excelUnmatchedRows.length} Baris Tidak Ditemukan Siswanya:</span>
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[11px]">
                      {excelUnmatchedRows.map((un, uIdx) => (
                        <div key={uIdx} className="text-amber-800">
                          Baris #{un.rowNum}: "{un.raw}" — {un.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
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
                        Sistem akan membaca otomatis nilai absensi, kepribadian, ekskul, dan catatan untuk tiap siswa, dan menampilkan preview lengkap sebelum disimpan.
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
            )
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
            ) : modalTab === 'excel' ? (
              excelPreviewRows && (
                <>
                  <button
                    type="button"
                    onClick={handleCancelExcelPreview}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
                  >
                    ← Ganti File
                  </button>
                  <button
                    type="button"
                    disabled={selectedExcelCount === 0}
                    onClick={handleConfirmSaveExcel}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan ke Raport ({selectedExcelCount} Siswa)</span>
                  </button>
                </>
              )
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
