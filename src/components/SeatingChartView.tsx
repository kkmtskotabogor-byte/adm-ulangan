import React, { useState } from 'react';
import { ExamConfig, ExamRoom, Student } from '../types';
import { extractTingkat } from '../utils/distribution';
import { 
  Grid3X3, 
  Printer, 
  ArrowLeftRight, 
  Shuffle, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Edit3,
  RotateCcw,
  Sliders,
  ExternalLink,
  Tag
} from 'lucide-react';

interface SeatingChartViewProps {
  config: ExamConfig;
  rooms: ExamRoom[];
  students: Student[];
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onSwapSeats: (studentId1: string, studentId2: string) => void;
  onDistributeCrossLevel?: (pattern?: 'photo_order' | 'sequential_desk') => void;
  onNavigateTab?: (tab: any) => void;
}

export const SeatingChartView: React.FC<SeatingChartViewProps> = ({
  config,
  rooms,
  students,
  selectedRoomId,
  onSelectRoom,
  onSwapSeats,
  onDistributeCrossLevel,
  onNavigateTab,
}) => {
  const currentRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];
  const [selectedSeatForSwap, setSelectedSeatForSwap] = useState<Student | null>(null);

  // Layout mode: 'double_40' (1 meja 2 peserta) or 'single_20' (1 meja 1 peserta)
  const [layoutMode, setLayoutMode] = useState<'double_40' | 'single_20'>('double_40');

  // Numbering pattern for 40-student layout:
  // 'photo_order': Column 4 to 1, bottom to top (Seats 1-20 left, 21-40 right) - exactly like user's photo
  // 'sequential_desk': Desk 1 (Seats 1 & 2), Desk 2 (Seats 3 & 4), etc.
  const [numberingPattern, setNumberingPattern] = useState<'photo_order' | 'sequential_desk'>('photo_order');

  // Custom header fields (defaults to config values)
  const [showEditHeader, setShowEditHeader] = useState(false);
  const [headerTitle, setHeaderTitle] = useState(config.examTitle || 'PAT ONLINE 2020');
  const [headerDate, setHeaderDate] = useState(config.issueDate || '15 Juni 2020');
  const [headerSchool, setHeaderSchool] = useState(config.schoolName || "MTs Manba'ul Islam");
  const [headerYear, setHeaderYear] = useState(config.academicYear || '2019/2020');

  if (!currentRoom) {
    return (
      <div className="text-center py-12 text-slate-500">
        Belum ada ruang ujian yang dikonfigurasi. Silakan buat ruang terlebih dahulu di menu "Ruang &amp; Distribusi".
      </div>
    );
  }

  // Get students assigned to this room, sorted by seatNumber
  const roomStudents = students
    .filter((s) => s.roomId === currentRoom.id && s.seatNumber)
    .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

  const capacity = currentRoom.capacity || (layoutMode === 'double_40' ? 40 : 20);

  // Map seatNumber -> Student
  const seatMap = new Map<number, Student>();
  roomStudents.forEach((s) => {
    if (s.seatNumber) seatMap.set(s.seatNumber, s);
  });

  // Assign color palette dynamically per class name
  const allClasses: string[] = Array.from(new Set<string>(students.map((s) => s.className))).sort();
  const palette = [
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
    { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' },
    { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300' },
  ];

  const getClassColor = (clsName: string) => {
    const idx = allClasses.indexOf(clsName);
    return palette[idx >= 0 ? idx % palette.length : 0];
  };

  const handleSeatClick = (student?: Student) => {
    if (!student) return;
    if (!selectedSeatForSwap) {
      setSelectedSeatForSwap(student);
    } else if (selectedSeatForSwap.id === student.id) {
      setSelectedSeatForSwap(null);
    } else {
      // Execute swap
      onSwapSeats(selectedSeatForSwap.id, student.id);
      setSelectedSeatForSwap(null);
    }
  };

  const printNewTabUrl = typeof window !== 'undefined' ? (() => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('tab', 'seating');
      u.searchParams.set('autoPrint', 'true');
      return u.toString();
    } catch {
      return window.location.href;
    }
  })() : '#';

  const handlePrintSeating = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Direct print seating error:', err);
    }
  };

  // Extract room number formatted (e.g. "01")
  const roomDigits = currentRoom.name.replace(/\D/g, '') || currentRoom.roomCode.replace(/\D/g, '') || '01';
  const formattedRoomNumber = roomDigits.padStart(2, '0');

  // Verify same-level rule for all 20 desks in double_40 mode
  // 20 desks: row 0..4 (5 rows), col 0..3 (4 cols)
  let totalDesksEvaluated = 0;
  let desksWithDifferentLevel = 0;
  let desksWithSameLevel = 0;

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 4; c++) {
      let leftNum = 0;
      let rightNum = 0;
      if (numberingPattern === 'photo_order') {
        const rowFromBottom = 5 - r;
        const colFromRight = 3 - c;
        const baseDesk = (colFromRight * 5) + rowFromBottom;
        leftNum = baseDesk;
        rightNum = baseDesk + 20;
      } else {
        const deskNum = (r * 4) + c + 1;
        leftNum = (deskNum * 2) - 1;
        rightNum = deskNum * 2;
      }

      const left = seatMap.get(leftNum);
      const right = seatMap.get(rightNum);

      if (left && right) {
        totalDesksEvaluated++;
        const leftT = extractTingkat(left.className);
        const rightT = extractTingkat(right.className);
        if (leftT === rightT) {
          desksWithSameLevel++;
        } else {
          desksWithDifferentLevel++;
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 no-print">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-indigo-600" />
            <span>Denah Tempat Duduk / Tata Letak Meja Ujian</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Visualisasi susunan meja peserta di {currentRoom.name} ({roomStudents.length} / {capacity} siswa terisi).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Swap Notice */}
          {selectedSeatForSwap && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-xs font-semibold animate-pulse">
              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
              <span>Pilih siswa ke-2 untuk tukar kursi</span>
              <button
                onClick={() => setSelectedSeatForSwap(null)}
                className="ml-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Cross Level Distribution trigger */}
          {onDistributeCrossLevel && (
            <button
              onClick={() => onDistributeCrossLevel(numberingPattern)}
              title="Jalankan plotting silang antar-tingkat (1 meja 2 siswa beda tingkat, 0 meja se-tingkat)"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer shadow-2xs"
            >
              <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
              <span>Plotting Silang Antar-Tingkat</span>
            </button>
          )}

          {/* Edit Header button */}
          <button
            onClick={() => setShowEditHeader(!showEditHeader)}
            title="Sesuaikan teks kop judul pada denah (PAT ONLINE, Tahun Pelajaran, dll)"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Ubah Kop Denah</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrintSeating}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Denah Meja (A4)</span>
          </button>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('documents')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Buka Lembar Stiker / Label Meja di Dokumen Ujian"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              <span>Cetak Stiker Meja</span>
            </button>
          )}

          <a
            href={printNewTabUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Buka di tab baru untuk mencetak langsung tanpa batasan iframe"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-100" />
            <span>Buka di Tab Baru (Cetak PDF)</span>
          </a>
        </div>
      </div>

      {/* Format Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl no-print">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            Pilihan Format Denah:
          </span>
          <div className="inline-flex p-0.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <button
              onClick={() => setLayoutMode('double_40')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                layoutMode === 'double_40'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Format 1 Meja 2 Siswa (40 Peserta - Sesuai Foto PAT)
            </button>
            <button
              onClick={() => setLayoutMode('single_20')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                layoutMode === 'single_20'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Format Meja Tunggal (20 Peserta)
            </button>
          </div>
        </div>

        {/* Pattern switch for 40 students */}
        {layoutMode === 'double_40' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Pola Nomor:</span>
            <select
              value={numberingPattern}
              onChange={(e) => setNumberingPattern(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="photo_order">Urutan Foto: Bawah-ke-Atas (1-20 Kiri, 21-40 Kanan)</option>
              <option value="sequential_desk">Urutan Meja: Meja 1 (1 &amp; 2), Meja 2 (3 &amp; 4)...</option>
            </select>
          </div>
        )}
      </div>

      {/* Customizable Header Drawer / Modal */}
      {showEditHeader && (
        <div className="p-4 bg-white border border-indigo-200 rounded-xl shadow-xs space-y-4 no-print animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
              Kustomisasi Teks Kop Denah (Dicetak di Atas Denah)
            </h4>
            <button
              onClick={() => setShowEditHeader(false)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Tutup ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Judul Ujian (Baris 2)</label>
              <input
                type="text"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                placeholder="Contoh: PAT ONLINE 2020"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tanggal Ujian (Baris 3)</label>
              <input
                type="text"
                value={headerDate}
                onChange={(e) => setHeaderDate(e.target.value)}
                placeholder="Contoh: 15 Juni 2020"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Madrasah / Sekolah (Baris 4)</label>
              <input
                type="text"
                value={headerSchool}
                onChange={(e) => setHeaderSchool(e.target.value)}
                placeholder="Contoh: MTs Manba'ul Islam"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tahun Pelajaran (Baris 5)</label>
              <input
                type="text"
                value={headerYear}
                onChange={(e) => setHeaderYear(e.target.value)}
                placeholder="Contoh: 2019/2020"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => {
                setHeaderTitle(config.examTitle);
                setHeaderDate(config.issueDate);
                setHeaderSchool(config.schoolName);
                setHeaderYear(config.academicYear);
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset ke Konfigurasi Awal
            </button>
          </div>
        </div>
      )}

      {/* Room Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-print scrollbar-none">
        <span className="text-xs font-semibold text-slate-500 whitespace-nowrap mr-1">Pilih Ruang:</span>
        {rooms.map((r) => {
          const isSelected = r.id === currentRoom.id;
          const count = students.filter((s) => s.roomId === r.id).length;
          return (
            <button
              key={r.id}
              onClick={() => {
                onSelectRoom(r.id);
                setSelectedSeatForSwap(null);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{r.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'
              }`}>
                {count}/{layoutMode === 'double_40' ? (r.capacity >= 40 ? r.capacity : 40) : r.capacity}
              </span>
            </button>
          );
        })}
      </div>

      {/* Validation Banner for Level Distribution in 40-Student Mode */}
      {layoutMode === 'double_40' && (
        <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs no-print shadow-2xs">
          <div className="flex items-center gap-2">
            {desksWithSameLevel === 0 && totalDesksEvaluated > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : desksWithSameLevel > 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
            <div>
              <span className="font-bold text-slate-900">
                Aturan 1 Meja 2 Siswa (Tidak Boleh Se-Tingkat):
              </span>{' '}
              {totalDesksEvaluated === 0 ? (
                <span className="text-slate-500">
                  Ruang ini belum diisi peserta atau kapasitas belum diset ke 40 siswa. Klik "Plotting Silang Antar-Tingkat" untuk otomatis mengisi 40 siswa bersilang tingkat.
                </span>
              ) : desksWithSameLevel === 0 ? (
                <span className="text-emerald-700 font-medium">
                  ✓ Sempurna! {totalDesksEvaluated} meja terisi 2 peserta dari tingkat berbeda (Kursi Kiri &amp; Kursi Kanan beda tingkat).
                </span>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1 sm:mt-0">
                  <span className="text-amber-700 font-medium">
                    Perhatian: Terdapat {desksWithSameLevel} meja yang terisi siswa se-tingkat.
                  </span>
                  {onDistributeCrossLevel && (
                    <button
                      onClick={() => onDistributeCrossLevel(numberingPattern)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[11px] shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>Perbaiki Otomatis (0 Meja Se-Tingkat)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 shrink-0 font-mono">
            {roomStudents.length} / 40 Siswa Terplot
          </div>
        </div>
      )}

      {/* =========================================================================
          PRINTABLE CANVAS - MODE 1: 40 SISWA (1 MEJA 2 SISWA - SESUAI GAMBAR CONTOH)
          ========================================================================= */}
      {layoutMode === 'double_40' && (
        <div className="bg-white rounded-xl border border-slate-300 shadow-xs p-3 sm:p-6 print:p-0 space-y-4 max-w-[820px] mx-auto denah-print-container">
          {/* Double border wrapper matching the user's photo exactly */}
          <div className="border-4 border-double border-black p-3 sm:p-5 bg-white text-black">
            {/* Header Block matching the user's photo */}
            <div className="text-center font-serif text-black pb-3">
              <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider text-black leading-tight">
                DENAH TEMPAT DUDUK PESERTA
              </h1>
              <div className="text-sm sm:text-base font-bold uppercase text-black leading-tight mt-0.5">
                {headerTitle}
              </div>
              <div className="text-xs sm:text-sm font-medium text-black leading-tight mt-0.5">
                {headerDate}
              </div>
              <div className="text-xs sm:text-sm font-bold text-black leading-tight mt-0.5">
                {headerSchool}
              </div>
              <div className="text-xs sm:text-sm text-black leading-tight mt-0.5">
                Tahun Pelajaran {headerYear}
              </div>
              <div className="text-base sm:text-lg font-black text-black leading-tight mt-1 font-sans">
                Ruang : {formattedRoomNumber}
              </div>
            </div>

            {/* 4 Columns x 5 Rows Grid (20 Desks Total) */}
            <div className="grid grid-cols-4 gap-x-2.5 sm:gap-x-4 gap-y-2 sm:gap-y-2.5 mt-2">
              {Array.from({ length: 5 }).map((_, r) => {
                return (
                  <React.Fragment key={`row-${r}`}>
                    {Array.from({ length: 4 }).map((_, c) => {
                      // Calculate seat numbers for Left & Right of this desk
                      let leftSeatNum = 0;
                      let rightSeatNum = 0;

                      if (numberingPattern === 'photo_order') {
                        // Formula matching user photo:
                        // Col 4 is rightmost (c=3), Row 5 is bottom (r=4)
                        const rowFromBottom = 5 - r;
                        const colFromRight = 3 - c;
                        const baseDesk = (colFromRight * 5) + rowFromBottom;
                        leftSeatNum = baseDesk;
                        rightSeatNum = baseDesk + 20;
                      } else {
                        // Sequential desk order
                        const deskIndex = (r * 4) + c + 1;
                        leftSeatNum = (deskIndex * 2) - 1;
                        rightSeatNum = deskIndex * 2;
                      }

                      const leftStudent = seatMap.get(leftSeatNum);
                      const rightStudent = seatMap.get(rightSeatNum);

                      const isSelectedLeft = selectedSeatForSwap?.id === leftStudent?.id;
                      const isSelectedRight = selectedSeatForSwap?.id === rightStudent?.id;

                      const leftTingkat = leftStudent ? extractTingkat(leftStudent.className) : '';
                      const rightTingkat = rightStudent ? extractTingkat(rightStudent.className) : '';
                      const isDeskLevelConflict = leftStudent && rightStudent && leftTingkat === rightTingkat;

                      return (
                        <div
                          key={`desk-${r}-${c}`}
                          className={`border border-black bg-white flex flex-col justify-between min-h-[92px] sm:min-h-[106px] relative ${
                            isDeskLevelConflict ? 'ring-1 ring-amber-500' : ''
                          }`}
                        >
                          {/* 2-Column Desk: Kursi Kiri & Kursi Kanan */}
                          <div className="grid grid-cols-2 divide-x divide-black h-full flex-1">
                            {/* Left Seat */}
                            <div
                              onClick={() => handleSeatClick(leftStudent)}
                              title={leftStudent ? `${leftStudent.name} (${leftStudent.className}) - Klik untuk tukar` : 'Kursi Kosong'}
                              className={`p-1 flex flex-col justify-between transition-colors ${
                                isSelectedLeft
                                  ? 'bg-amber-100 ring-2 ring-amber-500 z-10'
                                  : leftStudent
                                  ? 'hover:bg-slate-100 cursor-pointer'
                                  : 'bg-white'
                              }`}
                            >
                              {/* Top: Student Name */}
                              <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <div className="text-[9px] sm:text-[10px] md:text-[10.5px] font-medium text-black text-center leading-tight line-clamp-2 sm:line-clamp-3 font-sans break-words w-full">
                                  {leftStudent ? (
                                    leftStudent.name
                                  ) : (
                                    <span className="text-slate-300 italic text-[8.5px]">(Kosong)</span>
                                  )}
                                </div>
                                {leftStudent && (
                                  <div className="text-[7.5px] text-slate-500 font-bold leading-none mt-0.5 print:hidden">
                                    {leftStudent.className}
                                  </div>
                                )}
                              </div>

                              {/* Divider: Double dashed line matching user image === */}
                              <div className="w-full my-0.5 pointer-events-none">
                                <div className="border-b border-dashed border-black"></div>
                                <div className="border-b border-dashed border-black mt-0.5"></div>
                              </div>

                              {/* Bottom: Exam Number */}
                              <div className="text-[8.5px] sm:text-[9.5px] font-mono font-medium text-center text-black leading-none truncate pt-0.5">
                                {leftStudent ? (
                                  leftStudent.examNumber || leftStudent.nisn || leftStudent.nis
                                ) : (
                                  <span className="text-slate-300 font-mono text-[8.5px]">{leftSeatNum}</span>
                                )}
                              </div>
                            </div>

                            {/* Right Seat */}
                            <div
                              onClick={() => handleSeatClick(rightStudent)}
                              title={rightStudent ? `${rightStudent.name} (${rightStudent.className}) - Klik untuk tukar` : 'Kursi Kosong'}
                              className={`p-1 flex flex-col justify-between transition-colors ${
                                isSelectedRight
                                  ? 'bg-amber-100 ring-2 ring-amber-500 z-10'
                                  : rightStudent
                                  ? 'hover:bg-slate-100 cursor-pointer'
                                  : 'bg-white'
                              }`}
                            >
                              {/* Top: Student Name */}
                              <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <div className="text-[9px] sm:text-[10px] md:text-[10.5px] font-medium text-black text-center leading-tight line-clamp-2 sm:line-clamp-3 font-sans break-words w-full">
                                  {rightStudent ? (
                                    rightStudent.name
                                  ) : (
                                    <span className="text-slate-300 italic text-[8.5px]">(Kosong)</span>
                                  )}
                                </div>
                                {rightStudent && (
                                  <div className="text-[7.5px] text-slate-500 font-bold leading-none mt-0.5 print:hidden">
                                    {rightStudent.className}
                                  </div>
                                )}
                              </div>

                              {/* Divider: Double dashed line matching user image === */}
                              <div className="w-full my-0.5 pointer-events-none">
                                <div className="border-b border-dashed border-black"></div>
                                <div className="border-b border-dashed border-black mt-0.5"></div>
                              </div>

                              {/* Bottom: Exam Number */}
                              <div className="text-[8.5px] sm:text-[9.5px] font-mono font-medium text-center text-black leading-none truncate pt-0.5">
                                {rightStudent ? (
                                  rightStudent.examNumber || rightStudent.nisn || rightStudent.nis
                                ) : (
                                  <span className="text-slate-300 font-mono text-[8.5px]">{rightSeatNum}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Bottom of the Room Stage: Proctor Box on Left, Door on Right */}
            <div className="mt-4 pt-2 flex items-center justify-between text-black font-sans">
              {/* PENGAWAS box on bottom left */}
              <div className="border-2 border-black px-4 py-1 font-bold text-xs sm:text-sm uppercase tracking-widest text-center">
                PENGAWAS
              </div>

              {/* Pintu indicator on bottom right */}
              <div className="text-xs sm:text-sm font-semibold tracking-wide text-black font-serif">
                Pintu ........................
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRINTABLE CANVAS - MODE 2: 20 SISWA (MEJA TUNGGAL)
          ========================================================================= */}
      {layoutMode === 'single_20' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6">
          {/* Printable Header */}
          <div className="text-center font-serif border-b-2 border-slate-900 pb-4">
            <div className="text-xs uppercase font-bold tracking-wider text-slate-700">
              {config.schoolName}
            </div>
            <div className="text-sm md:text-base font-black uppercase text-slate-950 mt-0.5">
              DENAH TEMPAT DUDUK PESERTA {config.examTitle}
            </div>
            <div className="text-xs font-sans font-semibold text-slate-600 mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span>Ruang: <strong>{currentRoom.name} ({currentRoom.roomCode})</strong></span>
              <span>•</span>
              <span>Lokasi: <strong>{currentRoom.location}</strong></span>
              <span>•</span>
              <span>Kapasitas: <strong>{roomStudents.length} / {currentRoom.capacity || 20} Siswa</strong></span>
            </div>
          </div>

          {/* Front of Room Stage (Papan Tulis & Meja Pengawas) */}
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex items-center justify-between gap-4">
              {/* Pintu Masuk */}
              <div className="border border-dashed border-slate-400 bg-slate-50 px-3 py-1.5 rounded text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                🚪 PINTU MASUK
              </div>

              {/* Papan Tulis */}
              <div className="flex-1 bg-slate-800 text-white text-center py-2 px-4 rounded-md text-xs font-bold tracking-wider uppercase shadow-xs">
                PAPAN TULIS &amp; ARAH DEPAN KELAS
              </div>

              {/* Meja Pengawas */}
              <div className="bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-md text-center">
                <div className="text-[10px] font-bold text-indigo-900 uppercase">MEJA PENGAWAS</div>
                <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                  {currentRoom.proctor1 || 'Pengawas Ruang'}
                </div>
              </div>
            </div>

            {/* Seating Grid (4 Columns standard for classroom layout) */}
            <div className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                {Array.from({ length: currentRoom.capacity || 20 }, (_, i) => i + 1).map((seatNum) => {
                  const student = seatMap.get(seatNum);
                  const isSelectedForSwap = selectedSeatForSwap?.id === student?.id;
                  const classColor = student ? getClassColor(student.className) : null;

                  return (
                    <div
                      key={seatNum}
                      onClick={() => handleSeatClick(student)}
                      className={`relative p-3 rounded-lg border-2 transition-all flex flex-col justify-between min-h-[105px] cursor-pointer ${
                        isSelectedForSwap
                          ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400/40 shadow-sm'
                          : student
                          ? `${classColor?.bg} ${classColor?.border} hover:border-indigo-400 shadow-2xs`
                          : 'border-dashed border-slate-200 bg-slate-50/50 text-slate-400'
                      }`}
                    >
                      {/* Top Seat Number badge */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-800 shadow-2xs">
                          MEJA {String(seatNum).padStart(2, '0')}
                        </span>
                        {student && (
                          <span className="text-[10px] font-bold font-mono text-slate-500">
                            {student.gender === 'L' ? '👦 L' : '👧 P'}
                          </span>
                        )}
                      </div>

                      {/* Student Info or Empty Desk */}
                      {student ? (
                        <div className="space-y-1">
                          <div className="text-xs font-black text-slate-900 leading-snug line-clamp-2">
                            {student.name}
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-medium pt-0.5">
                            <span className={`px-1.5 py-0.2 rounded font-bold ${classColor?.text} bg-white/80 border border-slate-200`}>
                              {student.className}
                            </span>
                            <span className="font-mono text-slate-500 text-[9px]">
                              {student.examNumber.split('-').slice(2).join('-')}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="my-auto text-center text-[11px] text-slate-400 italic">
                          (Kursi Kosong)
                        </div>
                      )}

                      {/* Active swap indicator */}
                      {isSelectedForSwap && (
                        <div className="absolute inset-0 bg-amber-500/10 rounded-lg flex items-center justify-center pointer-events-none">
                          <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                            Dipilih
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legend and Proctors Signatures */}
          <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            {/* Class Legend */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Keterangan Selang-Seling Kelas:
              </div>
              <div className="flex flex-wrap gap-2">
                {allClasses.map((cls) => {
                  const color = getClassColor(cls);
                  return (
                    <div key={cls} className="flex items-center gap-1.5">
                      <span className={`w-3 h-3 rounded-xs border ${color?.border || 'border-slate-300'} ${color?.bg || 'bg-slate-100'}`} />
                      <span className="font-medium text-slate-700">{cls}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Proctor Signature */}
            <div className="text-center text-[11px] min-w-[160px]">
              <div className="text-slate-500">Pengawas Ruang Ujian</div>
              <div className="h-10"></div>
              <div className="font-bold underline text-slate-900">{currentRoom.proctor1 || '(...........................)'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
