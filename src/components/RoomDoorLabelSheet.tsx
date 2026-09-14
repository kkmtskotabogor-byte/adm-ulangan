import React, { useState, useMemo } from 'react';
import { ExamConfig, ExamRoom, Student } from '../types';
import { 
  DoorOpen, 
  Printer, 
  Sliders, 
  Layers, 
  Building2, 
  Palette, 
  Check, 
  Sparkles,
  Info,
  Maximize2,
  Grid
} from 'lucide-react';
import { PRESET_LOGO_KEMENAG, PRESET_LOGO_TUTWURI } from '../utils/logoUtils';

export type RoomLabelLayout = 'single_landscape' | 'single_portrait' | 'two_per_page';
export type RoomLabelLogoType = 'kemenag' | 'school' | 'tutwuri' | 'none';
export type RoomLabelBoxColor = 'blue' | 'black' | 'emerald' | 'indigo';

interface RoomDoorLabelSheetProps {
  config: ExamConfig;
  rooms: ExamRoom[];
  students: Student[];
  selectedRoomId: string;
}

export const RoomDoorLabelSheet: React.FC<RoomDoorLabelSheetProps> = ({
  config,
  rooms,
  students,
  selectedRoomId,
}) => {
  // Customization controls
  const [layout, setLayout] = useState<RoomLabelLayout>('single_landscape');
  const [logoType, setLogoType] = useState<RoomLabelLogoType>(() => {
    return ['MTs', 'MA', 'MI'].includes(config.schoolLevel) ? 'kemenag' : 'school';
  });
  const [boxColor, setBoxColor] = useState<RoomLabelBoxColor>('blue');
  const [customExamTitle, setCustomExamTitle] = useState<string>(config.examTitle || 'UJIAN MADRASAH');
  const [showLocation, setShowLocation] = useState<boolean>(true);
  const [showCapacity, setShowCapacity] = useState<boolean>(true);
  const [showAcademicYear, setShowAcademicYear] = useState<boolean>(false);
  const [showCutGuide, setShowCutGuide] = useState<boolean>(true);

  // Target rooms calculation
  const targetRooms = useMemo(() => {
    if (!selectedRoomId || selectedRoomId === 'ALL_ROOMS') {
      return rooms.length > 0 ? rooms : [
        {
          id: 'room-01',
          name: 'Ruang 01',
          roomCode: '01',
          location: 'Gedung Utama - Lantai 1',
          capacity: 20,
          proctor1: '',
          proctor2: ''
        }
      ];
    }
    const found = rooms.find((r) => r.id === selectedRoomId);
    return found ? [found] : rooms;
  }, [rooms, selectedRoomId]);

  // Determine effective logo URL
  const getLogoSrc = (): string | null => {
    if (logoType === 'none') return null;
    if (logoType === 'kemenag') return PRESET_LOGO_KEMENAG;
    if (logoType === 'tutwuri') return PRESET_LOGO_TUTWURI;
    if (logoType === 'school') return config.logoUrl || PRESET_LOGO_KEMENAG;
    return config.logoUrl || null;
  };

  const logoSrc = getLogoSrc();

  // Helper to extract clean room number (e.g. "Ruang 01" -> "01", "R-02" -> "02")
  const getRoomDisplayNumber = (room: ExamRoom): string => {
    const raw = room.roomCode || room.name || '01';
    const match = raw.match(/\d+/);
    if (match) {
      return match[0].padStart(2, '0');
    }
    return raw.toUpperCase();
  };

  // Helper to calculate student number range for a room
  const getRoomExamRange = (room: ExamRoom): { rangeText: string; count: number; classes: string[] } => {
    const roomStudents = students
      .filter((s) => s.roomId === room.id)
      .sort((a, b) => {
        // First sort by seatNumber, then by examNumber
        if (a.seatNumber && b.seatNumber) return a.seatNumber - b.seatNumber;
        return a.examNumber.localeCompare(b.examNumber, undefined, { numeric: true });
      });

    const count = roomStudents.length;
    const classes = Array.from(new Set(roomStudents.map((s) => s.className))).filter(Boolean);

    if (count === 0) {
      // Fallback placeholder based on room number and capacity
      const rNum = getRoomDisplayNumber(room);
      return {
        rangeText: `07-08-${rNum}-0001 s.d 07-08-${rNum}-00${String(room.capacity || 20).padStart(2, '0')}`,
        count: room.capacity || 20,
        classes: ['-']
      };
    }

    const firstStudent = roomStudents[0];
    const lastStudent = roomStudents[roomStudents.length - 1];

    const firstNo = firstStudent.examNumber || `001`;
    const lastNo = lastStudent.examNumber || `0${count}`;

    return {
      rangeText: `${firstNo} s.d ${lastNo}`,
      count,
      classes
    };
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Configuration & Customization Toolbar (Hidden on Print) */}
      <div className="no-print bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-indigo-600" />
              <span>Pengaturan Cetak Label Nomor Ruang (Plang Pintu)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Label nomor ruang resmi untuk ditempel pada daun pintu ruang ujian, memuat nama madrasah/sekolah, nomor ruang besar, dan rentang nomor peserta.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {targetRooms.length} Ruang Siap Dicetak
            </span>
          </div>
        </div>

        {/* Toolbar Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Format Tata Letak (Layout) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Format Lembar Cetak:</span>
            </label>
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value as RoomLabelLayout)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="single_landscape">1 Label per Lembar A4 (Landscape — Ukuran Besar)</option>
              <option value="single_portrait">1 Label per Lembar A4 (Portrait)</option>
              <option value="two_per_page">2 Label per Lembar A4 (Hemat Kertas — A5 Landscape)</option>
            </select>
          </div>

          {/* Logo Pilihan */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Pilihan Logo di Atas:</span>
            </label>
            <select
              value={logoType}
              onChange={(e) => setLogoType(e.target.value as RoomLabelLogoType)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="kemenag">Logo Kemenag RI (Ikhlas Beramal)</option>
              <option value="school">Logo Sekolah / Madrasah Utama</option>
              <option value="tutwuri">Logo Tut Wuri Handayani (Kemdikbud)</option>
              <option value="none">Tanpa Logo (Teks Saja)</option>
            </select>
          </div>

          {/* Warna Bingkai Kotak Nomor */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-600" />
              <span>Warna Kotak Nomor Peserta:</span>
            </label>
            <select
              value={boxColor}
              onChange={(e) => setBoxColor(e.target.value as RoomLabelBoxColor)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="blue">Biru Elektrik (Sesuai Contoh Gambar)</option>
              <option value="black">Hitam Pekat (Monokrom / Klasik)</option>
              <option value="emerald">Hijau Kemenag (Resmi)</option>
              <option value="indigo">Indigo / Biru Tua</option>
            </select>
          </div>

          {/* Judul Kegiatan / Ujian */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>Teks Nama Ujian:</span>
            </label>
            <input
              type="text"
              value={customExamTitle}
              onChange={(e) => setCustomExamTitle(e.target.value)}
              placeholder="Contoh: UJIAN MADRASAH"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Toggles & Options */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-xs">
          <span className="font-semibold text-slate-600">Info Tambahan di Bawah:</span>
          
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900 select-none">
            <input
              type="checkbox"
              checked={showLocation}
              onChange={(e) => setShowLocation(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Lokasi Ruang / Gedung</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900 select-none">
            <input
              type="checkbox"
              checked={showCapacity}
              onChange={(e) => setShowCapacity(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Jumlah Siswa / Kapasitas</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900 select-none">
            <input
              type="checkbox"
              checked={showAcademicYear}
              onChange={(e) => setShowAcademicYear(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Tahun Pelajaran ({config.academicYear})</span>
          </label>

          {layout === 'two_per_page' && (
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={showCutGuide}
                onChange={(e) => setShowCutGuide(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Garis Potong Tengah (Gunting)</span>
            </label>
          )}
        </div>
      </div>

      {/* Render Labels Container */}
      <div className="space-y-8 print:space-y-0">
        {layout === 'two_per_page' ? (
          // Group 2 rooms per page for A4
          renderGroupedRooms(targetRooms, 2).map((group, pageIdx) => (
            <div 
              key={`page-${pageIdx}`}
              className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0 page-break-after-always"
            >
              <div className="flex flex-col gap-6 print:gap-4 h-full justify-between">
                {group.map((room, rIdx) => (
                  <React.Fragment key={room.id}>
                    <SingleRoomLabelCard
                      config={config}
                      room={room}
                      examTitle={customExamTitle}
                      logoSrc={logoSrc}
                      boxColor={boxColor}
                      roomDisplayNumber={getRoomDisplayNumber(room)}
                      rangeInfo={getRoomExamRange(room)}
                      showLocation={showLocation}
                      showCapacity={showCapacity}
                      showAcademicYear={showAcademicYear}
                      layout="half"
                    />
                    {rIdx === 0 && group.length > 1 && showCutGuide && (
                      <div className="border-t-2 border-dashed border-slate-400 my-1 relative print:my-2 flex items-center justify-center">
                        <span className="bg-white px-2 text-[10px] text-slate-500 font-mono flex items-center gap-1 -top-2 relative">
                          ✂ Potong di sini (Batas Setengah Kertas A4)
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))
        ) : (
          // 1 Label per Page (Landscape or Portrait)
          targetRooms.map((room) => (
            <div 
              key={room.id}
              className={`bg-white p-4 sm:p-8 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0 page-break-after-always flex items-center justify-center ${
                layout === 'single_landscape' ? 'min-h-[580px] print:min-h-screen' : 'min-h-[720px] print:min-h-screen'
              }`}
            >
              <SingleRoomLabelCard
                config={config}
                room={room}
                examTitle={customExamTitle}
                logoSrc={logoSrc}
                boxColor={boxColor}
                roomDisplayNumber={getRoomDisplayNumber(room)}
                rangeInfo={getRoomExamRange(room)}
                showLocation={showLocation}
                showCapacity={showCapacity}
                showAcademicYear={showAcademicYear}
                layout={layout === 'single_landscape' ? 'full_landscape' : 'full_portrait'}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Helper to chunk array
function renderGroupedRooms<T>(arr: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    groups.push(arr.slice(i, i + size));
  }
  return groups;
}

/* --- SINGLE ROOM LABEL CARD COMPONENT --- */
interface SingleRoomLabelCardProps {
  config: ExamConfig;
  room: ExamRoom;
  examTitle: string;
  logoSrc: string | null;
  boxColor: RoomLabelBoxColor;
  roomDisplayNumber: string;
  rangeInfo: { rangeText: string; count: number; classes: string[] };
  showLocation: boolean;
  showCapacity: boolean;
  showAcademicYear: boolean;
  layout: 'full_landscape' | 'full_portrait' | 'half';
}

const SingleRoomLabelCard: React.FC<SingleRoomLabelCardProps> = ({
  config,
  room,
  examTitle,
  logoSrc,
  boxColor,
  roomDisplayNumber,
  rangeInfo,
  showLocation,
  showCapacity,
  showAcademicYear,
  layout,
}) => {
  const isFull = layout === 'full_landscape' || layout === 'full_portrait';
  const isLandscape = layout === 'full_landscape';

  // Determine box border color based on prop
  const boxBorderClass = {
    blue: 'border-[#3b82f6] text-slate-900',
    black: 'border-black text-black',
    emerald: 'border-emerald-600 text-slate-900',
    indigo: 'border-indigo-600 text-slate-900',
  }[boxColor];

  return (
    <div 
      className={`w-full mx-auto bg-white transition-all select-none box-border flex flex-col justify-between items-center text-center ${
        // Outer rounded border matching the uploaded image!
        isFull
          ? isLandscape
            ? 'border-[3px] sm:border-[4px] border-black rounded-[32px] sm:rounded-[44px] p-6 sm:p-10 min-h-[520px] max-w-[960px]'
            : 'border-[3px] sm:border-[4px] border-black rounded-[32px] sm:rounded-[44px] p-8 sm:p-12 min-h-[660px] max-w-[760px]'
          : 'border-2 sm:border-[3px] border-black rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 min-h-[300px] max-w-[850px]'
      }`}
    >
      {/* Header Section: Logo + School Name + Exam Title */}
      <div className="w-full flex flex-col items-center">
        {/* Logo at Top Center */}
        {logoSrc && (
          <div className={`flex items-center justify-center ${
            isFull ? 'w-20 h-20 sm:w-24 sm:h-24 mb-2 sm:mb-3' : 'w-12 h-12 sm:w-14 sm:h-14 mb-1'
          }`}>
            <img 
              src={logoSrc} 
              alt="Logo Instansi" 
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Nama Madrasah / Sekolah */}
        <h2 
          className={`font-black uppercase tracking-wide text-slate-950 font-sans leading-tight ${
            isFull 
              ? isLandscape ? 'text-lg sm:text-2xl md:text-3xl' : 'text-base sm:text-xl md:text-2xl'
              : 'text-sm sm:text-base md:text-lg'
          }`}
        >
          {config.schoolName}
        </h2>

        {/* Nama Ujian / Kegiatan (e.g. UJIAN MADRASAH) */}
        <h1 
          className={`font-black uppercase text-slate-950 font-sans tracking-wider leading-tight ${
            isFull 
              ? isLandscape ? 'text-xl sm:text-3xl md:text-4xl mt-2 sm:mt-3' : 'text-lg sm:text-2xl md:text-3xl mt-2'
              : 'text-base sm:text-xl mt-1.5'
          }`}
        >
          {examTitle}
        </h1>

        {showAcademicYear && (
          <p className="text-xs sm:text-sm font-bold text-slate-600 font-sans uppercase mt-0.5">
            TAHUN PELAJARAN {config.academicYear}
          </p>
        )}
      </div>

      {/* Main Center Piece: GIANT "RUANG : 01" */}
      <div className={`w-full flex items-center justify-center my-auto ${
        isFull ? 'py-4 sm:py-8' : 'py-2 sm:py-4'
      }`}>
        <div 
          className={`font-black uppercase tracking-normal text-slate-950 font-sans leading-none flex items-center justify-center gap-3 sm:gap-6 ${
            isFull 
              ? isLandscape 
                ? 'text-5xl sm:text-7xl md:text-8xl lg:text-9xl' 
                : 'text-4xl sm:text-6xl md:text-7xl'
              : 'text-4xl sm:text-5xl md:text-6xl'
          }`}
          style={{ letterSpacing: '-0.02em' }}
        >
          <span>RUANG :</span>
          <span className="font-sans">{roomDisplayNumber}</span>
        </div>
      </div>

      {/* Bottom Section: Framed Blue Box with NOMOR Range */}
      <div className="w-full flex flex-col items-center gap-2 sm:gap-3">
        {/* Blue Bordered Box for Exam Number Range (Matches image exactly) */}
        <div 
          className={`inline-block border-[2.5px] sm:border-[3.5px] bg-white text-center shadow-2xs ${boxBorderClass} ${
            isFull 
              ? 'rounded-lg sm:rounded-xl px-6 sm:px-12 py-2 sm:py-3.5' 
              : 'rounded-md sm:rounded-lg px-4 sm:px-8 py-1.5 sm:py-2.5'
          }`}
        >
          <div 
            className={`font-black font-mono tracking-tight leading-snug ${
              isFull 
                ? isLandscape ? 'text-base sm:text-2xl md:text-3xl' : 'text-sm sm:text-xl md:text-2xl'
                : 'text-xs sm:text-base md:text-lg'
            }`}
          >
            <span>NOMOR : </span>
            <span className="tracking-normal">{rangeInfo.rangeText}</span>
          </div>
        </div>

        {/* Optional Secondary Badges / Location Info */}
        {(showLocation || showCapacity) && (
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-slate-600 font-sans pt-1">
            {showLocation && room.location && (
              <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                📍 {room.location}
              </span>
            )}
            {showCapacity && (
              <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                👥 {rangeInfo.count} Peserta {rangeInfo.classes.length > 0 && rangeInfo.classes[0] !== '-' ? `(${rangeInfo.classes.join(', ')})` : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
