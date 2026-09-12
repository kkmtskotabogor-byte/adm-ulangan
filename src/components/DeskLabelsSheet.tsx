import React from 'react';
import { ExamConfig, ExamRoom, Student } from '../types';
import { BarcodeSVG, QRCodeSVG } from '../utils/barcode';
import { 
  MapPin, 
  Scissors, 
  CheckCircle2, 
  DoorOpen, 
  Footprints,
  Info
} from 'lucide-react';

export type DeskGridSize = 'grid_8' | 'grid_4' | 'grid_10' | 'grid_12';
export type DeskWalkingOrder = 'aisle_walk' | 'snake_walk' | 'seat_asc' | 'desk_num' | 'name_asc';
export type DeskRoomMode = 'double_40' | 'single_20';

export interface DeskPlacementInfo {
  deskNumber: number;
  r: number; // 0 (front row near board) to 4 (back row)
  c: number; // 0 (left aisle) to 3 (right aisle)
  colLabel: string;
  rowLabel: string;
  positionTitle: string;
  locationDesc: string;
  side: 'KIRI' | 'KANAN' | 'TUNGGAL';
  sideBadge: string;
}

/**
 * Calculates physical desk placement (row 0..4, column 0..3, desk 1..20, side)
 * from student's seatNumber.
 */
export function getDeskPlacement(seatNumber: number = 1, roomMode: DeskRoomMode = 'double_40'): DeskPlacementInfo {
  const safeSeat = Math.max(1, seatNumber || 1);

  let deskNumber = 1;
  let side: 'KIRI' | 'KANAN' | 'TUNGGAL' = 'KIRI';
  let r = 0;
  let c = 0;

  if (roomMode === 'double_40') {
    // 20 desks arranged in 4 columns x 5 rows
    // Standard PAT arrangement (photo_order):
    // Desks 1-20. Left seat = deskNumber (1-20), Right seat = deskNumber + 20 (21-40)
    if (safeSeat <= 20) {
      deskNumber = safeSeat;
      side = 'KIRI';
    } else {
      deskNumber = safeSeat - 20;
      side = 'KANAN';
    }

    // Column 3 (far right) has desks 1-5; Column 0 (far left) has desks 16-20
    const colFromRight = Math.floor((deskNumber - 1) / 5);
    const rowFromBottom = ((deskNumber - 1) % 5) + 1;
    c = Math.max(0, Math.min(3, 3 - colFromRight));
    r = Math.max(0, Math.min(4, 5 - rowFromBottom));
  } else {
    // single_20: 1 desk per student, 4 columns x 5 rows
    deskNumber = safeSeat;
    side = 'TUNGGAL';
    r = Math.floor((deskNumber - 1) / 4) % 5;
    c = (deskNumber - 1) % 4;
  }

  const colLabel = `Lajur ${c + 1}`;
  const rowLabel = `Baris ${r + 1}`;
  const positionTitle = `${colLabel} • ${rowLabel}`;

  let locationDesc = 'Tengah Ruangan';
  if (r === 0 && c === 0) locationDesc = 'Pojok Depan Kiri';
  else if (r === 0 && c === 3) locationDesc = 'Pojok Depan Kanan';
  else if (r === 0) locationDesc = 'Baris 1 (Paling Depan)';
  else if (r === 4 && c === 0) locationDesc = 'Pojok Belakang Kiri';
  else if (r === 4 && c === 3) locationDesc = 'Pojok Belakang Kanan';
  else if (r === 4) locationDesc = 'Baris 5 (Paling Belakang)';
  else if (c === 0) locationDesc = 'Lajur Kiri (Dekat Dinding/Jendela)';
  else if (c === 3) locationDesc = 'Lajur Kanan (Dekat Pintu)';

  let sideBadge = 'MEJA MANDIRI';
  if (side === 'KIRI') sideBadge = 'SISI KIRI MEJA';
  if (side === 'KANAN') sideBadge = 'SISI KANAN MEJA';

  return {
    deskNumber,
    r,
    c,
    colLabel,
    rowLabel,
    positionTitle,
    locationDesc,
    side,
    sideBadge,
  };
}

/**
 * Mini Classroom Desk Matrix (Visual Thumbnail on each label)
 */
export const MiniRoomMap: React.FC<{
  placement: DeskPlacementInfo;
  roomMode: DeskRoomMode;
}> = ({ placement, roomMode }) => {
  return (
    <div className="flex flex-col items-center bg-slate-50 border border-slate-300 rounded p-1.5 w-[76px] shrink-0 select-none">
      {/* Front Blackboard representation */}
      <div className="w-full bg-slate-900 text-[7px] text-white font-bold py-0.5 text-center rounded-[2px] mb-1 tracking-tighter shadow-2xs">
        PAPAN TULIS
      </div>

      {/* 5 rows x 4 columns desks grid */}
      <div className="grid grid-cols-4 gap-0.5 w-full">
        {Array.from({ length: 5 }).map((_, rIdx) =>
          Array.from({ length: 4 }).map((_, cIdx) => {
            const isTarget = rIdx === placement.r && cIdx === placement.c;
            if (!isTarget) {
              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className="h-2 rounded-[1px] bg-slate-200 border border-slate-300"
                />
              );
            }

            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className="h-2 rounded-[1px] border border-indigo-950 flex overflow-hidden ring-1 ring-indigo-500 bg-indigo-100"
              >
                {roomMode === 'double_40' ? (
                  <>
                    <div
                      className={`w-1/2 h-full ${
                        placement.side === 'KIRI' ? 'bg-indigo-700' : 'bg-slate-200'
                      }`}
                    />
                    <div
                      className={`w-1/2 h-full ${
                        placement.side === 'KANAN' ? 'bg-indigo-700' : 'bg-slate-200'
                      }`}
                    />
                  </>
                ) : (
                  <div className="w-full h-full bg-indigo-700" />
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="text-[7.5px] font-black text-slate-800 mt-1 font-mono tracking-tight">
        L{placement.c + 1} • B{placement.r + 1}
      </div>
    </div>
  );
};

/**
 * Printable Room Placement Guide (Cheat-Sheet for invigilators / sticker committee)
 */
export const RoomPlacementGuideSheet: React.FC<{
  config: ExamConfig;
  room?: ExamRoom;
  students: Student[];
  roomMode: DeskRoomMode;
  walkingOrder: DeskWalkingOrder;
}> = ({ config, room, students, roomMode, walkingOrder }) => {
  // Map seatNumber -> Student
  const seatMap = new Map<number, Student>();
  students.forEach((s) => {
    if (s.seatNumber) seatMap.set(s.seatNumber, s);
  });

  const getWalkingHelp = () => {
    switch (walkingOrder) {
      case 'aisle_walk':
        return 'Stiker telah diurutkan sesuai RUTE LORONG/LAJUR: Mulai dari Lajur 1 (paling kiri) dari depan ke belakang, lalu pindah ke Lajur 2 (depan ke belakang), Lajur 3, dan Lajur 4. Petugas cukup jalan lurus di setiap lorong.';
      case 'snake_walk':
        return 'Stiker telah diurutkan sesuai RUTE ULAR (SNAKE): Lajur 1 depan ke belakang, lalu geser ke Lajur 2 belakang ke depan, lalu Lajur 3 depan ke belakang. Sangat hemat langkah keliling ruangan.';
      case 'desk_num':
        return 'Stiker telah diurutkan per NOMOR MEJA: Meja 01 (Kiri & Kanan), Meja 02 (Kiri & Kanan), sampai Meja 20.';
      case 'name_asc':
        return 'Stiker telah diurutkan berdasarkan Abjad Nama Siswa (A - Z).';
      case 'seat_asc':
      default:
        return 'Stiker telah diurutkan berdasarkan NOMOR KURSI (1 s/d 40) secara berurutan.';
    }
  };

  return (
    <div className="p-6 bg-white border border-slate-300 rounded-xl shadow-xs print:shadow-none print:border-none print:p-0 print:m-0 print:page-break-after-always break-after-page space-y-4">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-3 text-center font-sans">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
          {config.schoolName}
        </div>
        <h2 className="text-base font-black uppercase text-slate-900 mt-0.5">
          PANDUAN LOKASI PENEMPELAN STIKER MEJA RUANG UJIAN
        </h2>
        <div className="text-xs font-semibold text-indigo-900 mt-1 flex items-center justify-center gap-3">
          <span>{room?.name} ({room?.roomCode})</span>
          <span>•</span>
          <span>Kapasitas: {students.length} Siswa Terisi</span>
          <span>•</span>
          <span>Tahun Pelajaran: {config.academicYear}</span>
        </div>
      </div>

      {/* Guide Note Box */}
      <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="block font-bold">Petunjuk Penempelan untuk Petugas:</strong>
          {getWalkingHelp()} Gunakan lembar ini sebagai peta rujukan saat menempelkan stiker meja di kelas.
        </div>
      </div>

      {/* Classroom Desk Grid Visual Layout */}
      <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 space-y-2 font-sans">
        {/* Blackboard & Proctor desk representation */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
          <div className="flex-1 bg-slate-900 text-white font-bold text-xs py-1.5 px-4 text-center rounded tracking-wider shadow-xs">
            ⬛ PAPAN TULIS DEPAN KELAS
          </div>
          <div className="bg-slate-800 text-white font-semibold text-[11px] py-1.5 px-3 rounded text-center whitespace-nowrap">
            MEJA PENGAWAS
          </div>
          <div className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1.5 rounded flex items-center gap-1">
            <DoorOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>PINTU DEPAN</span>
          </div>
        </div>

        {/* 5 Rows of Desks */}
        <div className="space-y-2 pt-1">
          {Array.from({ length: 5 }).map((_, rIdx) => {
            return (
              <div key={rIdx} className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, cIdx) => {
                  let leftNum = 0;
                  let rightNum = 0;
                  let deskNum = 0;

                  if (roomMode === 'double_40') {
                    const rowFromBottom = 5 - rIdx;
                    const colFromRight = 3 - cIdx;
                    const baseDesk = colFromRight * 5 + rowFromBottom;
                    deskNum = baseDesk;
                    leftNum = baseDesk;
                    rightNum = baseDesk + 20;
                  } else {
                    deskNum = rIdx * 4 + cIdx + 1;
                    leftNum = deskNum;
                  }

                  const leftStudent = seatMap.get(leftNum);
                  const rightStudent = seatMap.get(rightNum);

                  return (
                    <div
                      key={cIdx}
                      className="border border-slate-300 bg-white rounded p-1.5 shadow-2xs text-[10px] space-y-1"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-0.5">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1 rounded">
                          MEJA {String(deskNum).padStart(2, '0')}
                        </span>
                        <span className="text-[8px] font-bold text-slate-500">
                          L{cIdx + 1}-B{rIdx + 1}
                        </span>
                      </div>

                      {roomMode === 'double_40' ? (
                        <div className="grid grid-cols-2 gap-1 text-[9px]">
                          <div className={`p-1 rounded ${leftStudent ? 'bg-indigo-50/70 border border-indigo-100' : 'bg-slate-50'}`}>
                            <div className="text-[7.5px] font-bold text-indigo-700">KIRI (#{leftNum})</div>
                            <div className="font-bold text-slate-900 truncate" title={leftStudent?.name || '-'}>
                              {leftStudent ? leftStudent.name.split(' ')[0] : '-'}
                            </div>
                            <div className="text-[7.5px] text-slate-500 truncate">{leftStudent?.className || '-'}</div>
                          </div>

                          <div className={`p-1 rounded ${rightStudent ? 'bg-purple-50/70 border border-purple-100' : 'bg-slate-50'}`}>
                            <div className="text-[7.5px] font-bold text-purple-700">KANAN (#{rightNum})</div>
                            <div className="font-bold text-slate-900 truncate" title={rightStudent?.name || '-'}>
                              {rightStudent ? rightStudent.name.split(' ')[0] : '-'}
                            </div>
                            <div className="text-[7.5px] text-slate-500 truncate">{rightStudent?.className || '-'}</div>
                          </div>
                        </div>
                      ) : (
                        <div className={`p-1 rounded ${leftStudent ? 'bg-indigo-50/70' : 'bg-slate-50'}`}>
                          <div className="font-bold text-slate-900 truncate">{leftStudent?.name || 'Kosong'}</div>
                          <div className="text-[8px] text-slate-500">{leftStudent?.className || '-'}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Classroom Back Indicator */}
        <div className="pt-2 flex justify-between items-center text-[10px] text-slate-500 font-bold border-t border-slate-200">
          <span>Bagian Belakang Kiri (Jendela)</span>
          <span>DINDING BELAKANG KELAS</span>
          <span>PINTU BELAKANG</span>
        </div>
      </div>

      {/* Signature sign-off for Sticker Pasting Committee */}
      <div className="grid grid-cols-2 gap-6 pt-2 font-sans text-xs">
        <div className="border border-slate-200 rounded p-2.5 bg-slate-50 text-[11px] space-y-1">
          <div className="font-bold text-slate-800">Verifikasi Tim Penempel:</div>
          <div className="text-slate-600">Petugas 1: ....................................................</div>
          <div className="text-slate-600">Petugas 2: ....................................................</div>
          <div className="text-slate-600">Tanggal/Waktu Penempelan: ....................................</div>
        </div>

        <div className="border border-slate-200 rounded p-2.5 bg-slate-50 text-[11px] flex items-center justify-center text-center">
          <div>
            <div className="font-bold text-slate-800">Status Penempelan Meja:</div>
            <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white border border-slate-300 font-bold text-slate-700 text-[10px]">
              [ &nbsp; ] SEMUA STIKER LENGKAP &amp; SESUAI DENAH
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface DeskLabelsViewContainerProps {
  config: ExamConfig;
  rooms: ExamRoom[];
  students: Student[];
  selectedRoomId: string;
  gridSize: DeskGridSize;
  walkingOrder: DeskWalkingOrder;
  roomMode: DeskRoomMode;
  showMiniMap: boolean;
  showLocationBadge: boolean;
  showCheatSheet: boolean;
  showCutGuide: boolean;
  showBarcode: boolean;
}

export const DeskLabelsViewContainer: React.FC<DeskLabelsViewContainerProps> = ({
  config,
  rooms,
  students,
  selectedRoomId,
  gridSize,
  walkingOrder,
  roomMode,
  showMiniMap,
  showLocationBadge,
  showCheatSheet,
  showCutGuide,
  showBarcode,
}) => {
  // If ALL_ROOMS is chosen, render all rooms sequentially with page breaks
  const targetRooms = selectedRoomId === 'ALL_ROOMS'
    ? rooms
    : rooms.filter((r) => r.id === selectedRoomId);

  if (targetRooms.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Tidak ada ruang ujian yang dipilih atau ruang belum dikonfigurasi.
      </div>
    );
  }

  return (
    <div className="space-y-10 print:space-y-0">
      {targetRooms.map((room, roomIndex) => {
        const roomStudents = students
          .filter((s) => s.roomId === room.id)
          .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

        // Prepare sorted list with placement info
        const items = roomStudents.map((student) => ({
          student,
          placement: getDeskPlacement(student.seatNumber || 1, roomMode),
        }));

        // Apply selected walking order
        items.sort((a, b) => {
          if (walkingOrder === 'aisle_walk') {
            // Sort by column (aisle 0..3), then row (0..4), then side
            if (a.placement.c !== b.placement.c) return a.placement.c - b.placement.c;
            if (a.placement.r !== b.placement.r) return a.placement.r - b.placement.r;
            return (a.placement.side === 'KIRI' ? 0 : 1) - (b.placement.side === 'KIRI' ? 0 : 1);
          }
          if (walkingOrder === 'snake_walk') {
            // Serpentine: Col 0 (row 0->4), Col 1 (row 4->0), Col 2 (row 0->4), Col 3 (row 4->0)
            if (a.placement.c !== b.placement.c) return a.placement.c - b.placement.c;
            const isColEven = a.placement.c % 2 === 0;
            const rA = isColEven ? a.placement.r : 4 - a.placement.r;
            const rB = isColEven ? b.placement.r : 4 - b.placement.r;
            if (rA !== rB) return rA - rB;
            return (a.placement.side === 'KIRI' ? 0 : 1) - (b.placement.side === 'KIRI' ? 0 : 1);
          }
          if (walkingOrder === 'desk_num') {
            if (a.placement.deskNumber !== b.placement.deskNumber) {
              return a.placement.deskNumber - b.placement.deskNumber;
            }
            return (a.placement.side === 'KIRI' ? 0 : 1) - (b.placement.side === 'KIRI' ? 0 : 1);
          }
          if (walkingOrder === 'name_asc') {
            return a.student.name.localeCompare(b.student.name);
          }
          // Default: seat_asc
          return (a.student.seatNumber || 0) - (b.student.seatNumber || 0);
        });

        // Grid CSS classes based on selected gridSize
        let gridClasses = 'grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2 print:gap-2.5';
        if (gridSize === 'grid_4') {
          gridClasses = 'grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4';
        } else if (gridSize === 'grid_10') {
          gridClasses = 'grid grid-cols-1 md:grid-cols-2 gap-2.5 print:grid-cols-2 print:gap-1.5';
        } else if (gridSize === 'grid_12') {
          gridClasses = 'grid grid-cols-1 md:grid-cols-3 gap-2 print:grid-cols-3 print:gap-1.5';
        }

        return (
          <div
            key={room.id}
            className={`${roomIndex > 0 ? 'print:page-break-before-always break-before-page' : ''}`}
          >
            {/* 1. Optional Printable Placement Cheat-Sheet */}
            {showCheatSheet && (
              <RoomPlacementGuideSheet
                config={config}
                room={room}
                students={roomStudents}
                roomMode={roomMode}
                walkingOrder={walkingOrder}
              />
            )}

            {/* Room Banner in Screen View */}
            <div className="border-b border-slate-200 pb-2.5 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 no-print">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>Stiker / Label Meja — {room.name} ({room.roomCode})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {items.length} stiker disiapkan. Setiap stiker dilengkapi nomor meja, nomor lajur &amp; baris fisik, serta mini denah lokasi penempelan.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {roomStudents.length} Siswa
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {roomMode === 'double_40' ? 'Format 1 Meja 2 Siswa' : 'Format Meja Mandiri'}
                </span>
              </div>
            </div>

            {/* 2. Grid of Desk Labels */}
            <div className={gridClasses}>
              {items.map(({ student, placement }) => {
                const isDouble = roomMode === 'double_40';

                return (
                  <div
                    key={student.id}
                    className={`page-break-inside-avoid break-inside-avoid bg-white text-slate-900 relative rounded-lg overflow-hidden flex flex-col justify-between ${
                      showCutGuide
                        ? 'border border-dashed border-slate-400 print:border-slate-800'
                        : 'border-2 border-slate-900'
                    } ${
                      gridSize === 'grid_4'
                        ? 'p-5 min-h-[220px]'
                        : gridSize === 'grid_10'
                        ? 'p-2.5 min-h-[140px]'
                        : gridSize === 'grid_12'
                        ? 'p-2 min-h-[135px]'
                        : 'p-3.5 min-h-[165px]'
                    }`}
                  >
                    {/* Scissor Cut Indicator if enabled */}
                    {showCutGuide && (
                      <div className="absolute top-1 right-1 text-slate-400 print:text-slate-600 select-none pointer-events-none no-print">
                        <Scissors className="w-3 h-3 rotate-90" />
                      </div>
                    )}

                    {/* Top Solid Black Accent Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-950"></div>

                    {/* Top Section: School, Room, Desk Number Badges */}
                    <div className="pt-0.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-1.5">
                        <div className="min-w-0">
                          <div className="text-[9px] font-black uppercase tracking-wider text-slate-600 truncate">
                            {config.schoolName}
                          </div>
                          <div className="text-[10px] font-bold uppercase text-slate-950 leading-tight">
                            {config.examType} • {config.academicYear}
                          </div>
                        </div>

                        {/* Huge Contrast Desk Badge & Side Badge */}
                        <div className="text-right shrink-0 space-y-0.5">
                          <div className="inline-flex items-center gap-1.5 bg-slate-950 text-white px-2.5 py-0.5 rounded font-mono font-black text-xs sm:text-sm tracking-wider shadow-2xs">
                            <span>MEJA</span>
                            <span className="text-amber-300">
                              {String(placement.deskNumber).padStart(2, '0')}
                            </span>
                          </div>

                          {isDouble && (
                            <div>
                              <span
                                className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider inline-block ${
                                  placement.side === 'KIRI'
                                    ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                                    : 'bg-purple-100 text-purple-900 border border-purple-300'
                                }`}
                              >
                                {placement.sideBadge}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Location Badge (Aisle & Row & Description) */}
                      {showLocationBadge && (
                        <div className="flex items-center justify-between bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[9.5px]">
                          <div className="flex items-center gap-1 text-slate-800 font-bold">
                            <MapPin className="w-3 h-3 text-indigo-700 shrink-0" />
                            <span>{placement.positionTitle}</span>
                            <span className="text-slate-400 font-normal">|</span>
                            <span className="text-slate-600 font-medium">{placement.locationDesc}</span>
                          </div>
                          <div className="font-mono text-[9px] font-bold text-slate-700">
                            {room.name}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Middle Section: Student Identity & Mini Map */}
                    <div className="flex items-center justify-between gap-3 py-1.5 my-auto">
                      {/* Left: Student Identity */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div>
                          <span className="text-[7.5px] uppercase font-bold text-slate-400 block tracking-wider leading-none">
                            Nomor Peserta Ujian
                          </span>
                          <span className="font-mono text-sm font-black text-indigo-950 tracking-wide block">
                            {student.examNumber}
                          </span>
                        </div>

                        <div>
                          <span className="text-[7.5px] uppercase font-bold text-slate-400 block tracking-wider leading-none">
                            Nama Peserta
                          </span>
                          <span className="font-black text-xs text-slate-900 uppercase truncate block leading-tight">
                            {student.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] text-slate-700 pt-0.5">
                          <span>
                            Kelas: <strong className="text-slate-950">{student.className}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Sesi: <strong className="text-indigo-900">Sesi 1</strong>
                          </span>
                        </div>
                      </div>

                      {/* Right: Mini Room Placement Map */}
                      {showMiniMap && (
                        <MiniRoomMap placement={placement} roomMode={roomMode} />
                      )}
                    </div>

                    {/* Bottom Section: Barcode, QR Code & Verifications */}
                    {showBarcode && (
                      <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between gap-2">
                        <div className="overflow-hidden">
                          <BarcodeSVG
                            value={student.examNumber}
                            width={gridSize === 'grid_4' ? 140 : 110}
                            height={gridSize === 'grid_4' ? 22 : 16}
                            showText={false}
                          />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right hidden sm:block">
                            <span className="text-[7px] font-bold text-slate-400 uppercase block tracking-wider">
                              Verifikasi
                            </span>
                            <span className="text-[8.5px] font-mono font-bold text-slate-700">
                              Kursi #{student.seatNumber || '-'}
                            </span>
                          </div>
                          <QRCodeSVG value={student.examNumber} size={gridSize === 'grid_4' ? 34 : 26} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
