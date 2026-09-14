import React, { useState } from 'react';
import { ExamConfig, ExamRoom, ExamScheduleItem, Student } from '../types';
import { BarcodeSVG, QRCodeSVG } from '../utils/barcode';
import { 
  FileText, 
  Printer, 
  CheckSquare, 
  Tag, 
  FileCheck2, 
  DoorOpen,
  Calendar,
  ExternalLink,
  PackageCheck,
  Layers,
  Clock,
  ShieldCheck,
  UserCheck,
  MapPin,
  Scissors,
  Footprints,
  Sliders,
  LayoutGrid,
  Info,
  DoorClosed
} from 'lucide-react';
import { 
  DeskLabelsViewContainer, 
  DeskGridSize, 
  DeskWalkingOrder, 
  DeskRoomMode 
} from './DeskLabelsSheet';
import { RoomDoorLabelSheet } from './RoomDoorLabelSheet';

interface ExamDocumentsViewProps {
  config: ExamConfig;
  students: Student[];
  rooms: ExamRoom[];
  schedules: ExamScheduleItem[];
}

type DocType = 'attendance' | 'proctor_attendance' | 'desk_labels' | 'room_label' | 'door_roster' | 'minutes' | 'question_cover';

export const ExamDocumentsView: React.FC<ExamDocumentsViewProps> = ({
  config,
  students,
  rooms,
  schedules,
}) => {
  const [selectedDoc, setSelectedDoc] = useState<DocType>('attendance');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '');
  const [selectedSubject, setSelectedSubject] = useState<string>(schedules[0]?.subject || 'Matematika');
  const [spareCopies, setSpareCopies] = useState<number>(2);
  const [coverLayout, setCoverLayout] = useState<'full' | 'half'>('full');
  const [includeStampAndSignature, setIncludeStampAndSignature] = useState<boolean>(true);

  // Desk Labels Customization & Arrangement Settings
  const [deskLayoutGrid, setDeskLayoutGrid] = useState<DeskGridSize>('grid_8');
  const [deskWalkingOrder, setDeskWalkingOrder] = useState<DeskWalkingOrder>('aisle_walk');
  const [deskRoomMode, setDeskRoomMode] = useState<DeskRoomMode>('double_40');
  const [deskShowMiniMap, setDeskShowMiniMap] = useState<boolean>(true);
  const [deskShowLocationBadge, setDeskShowLocationBadge] = useState<boolean>(true);
  const [deskShowCheatSheet, setDeskShowCheatSheet] = useState<boolean>(true);
  const [deskShowCutGuide, setDeskShowCutGuide] = useState<boolean>(true);
  const [deskShowBarcode, setDeskShowBarcode] = useState<boolean>(true);

  const currentRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];

  // Students in selected room sorted by seatNumber
  const roomStudents = students
    .filter((s) => s.roomId === currentRoom?.id)
    .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

  const printNewTabUrl = typeof window !== 'undefined' ? (() => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('tab', 'documents');
      u.searchParams.set('autoPrint', 'true');
      return u.toString();
    } catch {
      return window.location.href;
    }
  })() : '#';

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Direct print error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation and Switcher Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Dokumen &amp; Kelengkapan Administrasi Ujian</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Cetak Daftar Hadir (Presensi), Stiker Meja Peserta, Berita Acara, Tempelan Pintu Ruang, dan Label Sampul Soal per Ruang per Mapel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen (A4)</span>
            </button>

            <a
              href={printNewTabUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
              title="Buka di tab baru jika browser Anda memblokir dialog cetak di dalam pratinjau"
            >
              <ExternalLink className="w-4 h-4 text-emerald-100" />
              <span>Buka di Tab Baru (Cetak PDF)</span>
            </a>
          </div>
        </div>

        {/* Document Type Selector Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
          {[
            { id: 'attendance', label: 'Daftar Hadir Siswa', icon: <CheckSquare className="w-4 h-4" /> },
            { id: 'proctor_attendance', label: 'Absen Pengawas', icon: <UserCheck className="w-4 h-4" /> },
            { id: 'desk_labels', label: 'Label / Stiker Meja', icon: <Tag className="w-4 h-4" /> },
            { id: 'room_label', label: 'Label Nomor Ruang', icon: <DoorClosed className="w-4 h-4" /> },
            { id: 'door_roster', label: 'Daftar Peserta Ruang', icon: <DoorOpen className="w-4 h-4" /> },
            { id: 'minutes', label: 'Berita Acara Ujian', icon: <FileCheck2 className="w-4 h-4" /> },
            { id: 'question_cover', label: 'Label Sampul Soal', icon: <PackageCheck className="w-4 h-4" /> },
          ].map((item) => {
            const isSelected = selectedDoc === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedDoc(item.id as DocType)}
                className={`p-3 rounded-lg border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white font-semibold shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <div className={isSelected ? 'text-white' : 'text-slate-400'}>
                  {item.icon}
                </div>
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Room & Subject Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Ruang Ujian:
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
            >
              {(selectedDoc === 'question_cover' || selectedDoc === 'desk_labels' || selectedDoc === 'room_label') && (
                <option value="ALL_ROOMS">📁 Semua Ruang (Cetak Sekaligus — {rooms.length} Ruang)</option>
              )}
              {rooms.map((r) => {
                const count = students.filter((s) => s.roomId === r.id).length;
                return (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.roomCode}) — {count} Siswa
                  </option>
                );
              })}
            </select>
          </div>

          {/* Desk Labels Filter Controls */}
          {selectedDoc === 'desk_labels' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Format Ukuran Stiker:</span>
                </label>
                <select
                  value={deskLayoutGrid}
                  onChange={(e) => setDeskLayoutGrid(e.target.value as DeskGridSize)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                >
                  <option value="grid_8">8 Stiker / Lembar A4 (Standar Meja 2×4)</option>
                  <option value="grid_4">4 Kartu / Lembar A4 (Format Besar / Meja Lipat)</option>
                  <option value="grid_10">10 Stiker / Lembar A4 (Label HVS 2×5)</option>
                  <option value="grid_12">12 Stiker / Lembar A4 (Format Kompak 3×4)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Footprints className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Urutan Penempelan (Rute):</span>
                </label>
                <select
                  value={deskWalkingOrder}
                  onChange={(e) => setDeskWalkingOrder(e.target.value as DeskWalkingOrder)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                >
                  <option value="aisle_walk">🚶 Rute Lorong (Lajur 1 ⬇, Lajur 2 ⬇...)</option>
                  <option value="snake_walk">🐍 Rute Ular (Lajur 1 ⬇, Lajur 2 ⬆...)</option>
                  <option value="seat_asc">🔢 Urut Nomor Kursi (1, 2, 3...)</option>
                  <option value="desk_num">🪑 Urut Nomor Meja (01, 02...)</option>
                  <option value="name_asc">🔤 Urut Nama Siswa (A - Z)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Susunan Meja Ruangan:</span>
                </label>
                <select
                  value={deskRoomMode}
                  onChange={(e) => setDeskRoomMode(e.target.value as DeskRoomMode)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                >
                  <option value="double_40">Format 1 Meja 2 Siswa (20 Meja / 40 Kursi)</option>
                  <option value="single_20">Format 1 Meja 1 Siswa (20 Meja Mandiri)</option>
                </select>
              </div>
            </>
          )}

          {(selectedDoc === 'attendance' || selectedDoc === 'minutes' || selectedDoc === 'question_cover') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mata Pelajaran:
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
              >
                {selectedDoc === 'question_cover' && (
                  <option value="ALL_SUBJECTS">📚 Semua Mata Pelajaran ({schedules.length} Mapel)</option>
                )}
                {schedules.map((s) => (
                  <option key={s.id} value={s.subject}>
                    {s.subject} ({s.dayName}, {s.date})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedDoc === 'question_cover' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cadangan Soal &amp; LJK:
                </label>
                <select
                  value={spareCopies}
                  onChange={(e) => setSpareCopies(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                >
                  <option value={0}>0 Eksemplar</option>
                  <option value={1}>1 Eksemplar Cadangan</option>
                  <option value={2}>2 Eksemplar (Rekomendasi)</option>
                  <option value={3}>3 Eksemplar Cadangan</option>
                  <option value={5}>5 Eksemplar Cadangan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Format Ukuran Label:
                </label>
                <select
                  value={coverLayout}
                  onChange={(e) => setCoverLayout(e.target.value as 'full' | 'half')}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                >
                  <option value="full">1 Label / Lembar (Amplop Folio)</option>
                  <option value="half">2 Label / Lembar (Format Hemat A5)</option>
                </select>
              </div>

              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeStampAndSignature}
                    onChange={(e) => setIncludeStampAndSignature(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Sertakan TTD &amp; Stempel</span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Desk Labels Feature Toggles Bar */}
        {selectedDoc === 'desk_labels' && (
          <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deskShowMiniMap}
                  onChange={(e) => setDeskShowMiniMap(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span>Mini Denah Letak Meja</span>
              </label>

              <label className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deskShowLocationBadge}
                  onChange={(e) => setDeskShowLocationBadge(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span>Teks Posisi (Lajur • Baris)</span>
              </label>

              <label className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deskShowCheatSheet}
                  onChange={(e) => setDeskShowCheatSheet(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span>Lembar Panduan Peta Petugas</span>
              </label>

              <label className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deskShowCutGuide}
                  onChange={(e) => setDeskShowCutGuide(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span>Garis Potong (✂)</span>
              </label>

              <label className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deskShowBarcode}
                  onChange={(e) => setDeskShowBarcode(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span>Barcode &amp; QR</span>
              </label>
            </div>

            <div className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded flex items-center gap-1.5 font-medium">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Stiker siap dipotong &amp; langsung ditempelkan sesuai rute lorong atau urutan meja</span>
            </div>
          </div>
        )}
      </div>

      {/* Document View Canvas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 md:p-8 print:p-0 print:border-none print:shadow-none">
        {selectedDoc === 'attendance' && (
          <AttendanceSheet
            config={config}
            room={currentRoom}
            students={roomStudents}
            subject={selectedSubject}
          />
        )}

        {selectedDoc === 'proctor_attendance' && (
          <DocProctorAttendanceSheet
            config={config}
            rooms={rooms}
            schedules={schedules}
            selectedSubject={selectedSubject}
            selectedRoomId={selectedRoomId}
            includeStampAndSignature={includeStampAndSignature}
          />
        )}

        {selectedDoc === 'desk_labels' && (
          <DeskLabelsViewContainer
            config={config}
            rooms={rooms}
            students={students}
            selectedRoomId={selectedRoomId}
            gridSize={deskLayoutGrid}
            walkingOrder={deskWalkingOrder}
            roomMode={deskRoomMode}
            showMiniMap={deskShowMiniMap}
            showLocationBadge={deskShowLocationBadge}
            showCheatSheet={deskShowCheatSheet}
            showCutGuide={deskShowCutGuide}
            showBarcode={deskShowBarcode}
          />
        )}

        {selectedDoc === 'minutes' && (
          <ExamMinutesSheet
            config={config}
            room={currentRoom}
            students={roomStudents}
            subject={selectedSubject}
          />
        )}

        {selectedDoc === 'room_label' && (
          <RoomDoorLabelSheet
            config={config}
            rooms={rooms}
            students={students}
            selectedRoomId={selectedRoomId}
          />
        )}

        {selectedDoc === 'door_roster' && (
          <DoorRosterSheet
            config={config}
            room={currentRoom}
            students={roomStudents}
          />
        )}

        {selectedDoc === 'question_cover' && (
          <QuestionCoverSheet
            config={config}
            rooms={rooms}
            students={students}
            schedules={schedules}
            selectedRoomId={selectedRoomId}
            selectedSubject={selectedSubject}
            spareCopies={spareCopies}
            layout={coverLayout}
            includeStampAndSignature={includeStampAndSignature}
          />
        )}
      </div>
    </div>
  );
};

/* --- SHARED OFFICIAL KOP SURAT --- */
const OfficialDocumentHeader: React.FC<{ config: ExamConfig; compact?: boolean }> = ({ config, compact = false }) => {
  const isMadrasah = ['MTs', 'MA', 'MI'].includes(config.schoolLevel);
  return (
    <div className={`border-b-2 border-slate-900 ${compact ? 'pb-1' : 'pb-2'}`}>
      <div className="flex items-center gap-3">
        {config.logoUrl && (
          <div className={`${compact ? 'w-10 h-10' : 'w-14 h-14'} shrink-0 flex items-center justify-center`}>
            <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
        <div className="flex-1 text-center font-serif text-slate-900">
          {isMadrasah ? (
            <>
              <div className={`${compact ? 'text-[8px]' : 'text-[10px]'} uppercase font-bold text-slate-700 tracking-wider leading-tight`}>
                KEMENTERIAN AGAMA REPUBLIK INDONESIA
              </div>
              <div className={`${compact ? 'text-[8px]' : 'text-[10px]'} uppercase font-bold text-slate-700 tracking-wider leading-tight`}>
                KANTOR KEMENTERIAN AGAMA {config.district.toUpperCase()}
              </div>
            </>
          ) : (
            <>
              <div className={`${compact ? 'text-[8px]' : 'text-[10px]'} uppercase font-bold text-slate-700 tracking-wider leading-tight`}>
                PEMERINTAH DAERAH PROVINSI {config.province.toUpperCase()}
              </div>
              <div className={`${compact ? 'text-[8px]' : 'text-[10px]'} uppercase font-bold text-slate-700 tracking-wider leading-tight`}>
                DINAS PENDIDIKAN DAN KEBUDAYAAN
              </div>
            </>
          )}
          <div className={`${compact ? 'text-sm' : 'text-base'} font-black uppercase text-slate-950 mt-0.5 leading-tight`}>
            {config.schoolName}
          </div>
          <div className={`${compact ? 'text-[8px]' : 'text-[9px]'} font-sans text-slate-600 mt-0.5 leading-tight`}>
            {config.address} • Telp: {config.phone} • Email: {config.email}
          </div>
        </div>
      </div>
      <div className="border-b border-slate-900 mt-1"></div>
      <div className="border-b-2 border-slate-900 mt-0.5"></div>
    </div>
  );
};

/* --- 1. DAFTAR HADIR (PRESENSI RUANG UJIAN) --- */
const AttendanceSheet: React.FC<{
  config: ExamConfig;
  room?: ExamRoom;
  students: Student[];
  subject: string;
}> = ({ config, room, students, subject }) => {
  return (
    <div className="font-serif text-slate-900 text-xs space-y-4">
      {/* Official Header with Logo */}
      <OfficialDocumentHeader config={config} />

      {/* Document Title */}
      <div className="text-center font-sans">
        <h3 className="text-sm font-black uppercase tracking-wider">
          DAFTAR HADIR PESERTA {config.examTitle}
        </h3>
        <p className="text-xs font-semibold text-slate-700">
          TAHUN PELAJARAN {config.academicYear} • SEMESTER {config.semester.toUpperCase()}
        </p>
      </div>

      {/* Metadata Bar */}
      <div className="font-sans text-[11px] grid grid-cols-2 gap-x-8 gap-y-1 bg-slate-50 p-3 rounded border border-slate-200">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 font-semibold text-slate-700">Mata Pelajaran</span>
            <span className="w-3">:</span>
            <span className="font-bold text-slate-950">{subject}</span>
          </div>
          <div className="flex">
            <span className="w-28 font-semibold text-slate-700">Ruang Ujian</span>
            <span className="w-3">:</span>
            <span className="font-bold text-indigo-900">{room?.name} ({room?.roomCode})</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 font-semibold text-slate-700">Jumlah Peserta</span>
            <span className="w-3">:</span>
            <span className="font-bold text-slate-950">{students.length} Orang</span>
          </div>
          <div className="flex">
            <span className="w-28 font-semibold text-slate-700">Pengawas Ruang</span>
            <span className="w-3">:</span>
            <span className="text-slate-800">{room?.proctor1 || '................................'}</span>
          </div>
        </div>
      </div>

      {/* Table with Zig-Zag Signature columns */}
      <div className="overflow-x-auto">
        <table className="w-full font-sans text-[10.5px] border-collapse border border-slate-900">
          <thead>
            <tr className="bg-slate-100 text-slate-900 text-center font-bold">
              <th className="border border-slate-900 py-1.5 px-2 w-10">No</th>
              <th className="border border-slate-900 py-1.5 px-3 w-32">No. Peserta</th>
              <th className="border border-slate-900 py-1.5 px-3 w-28">NISN</th>
              <th className="border border-slate-900 py-1.5 px-3 text-left">Nama Peserta</th>
              <th className="border border-slate-900 py-1.5 px-2 w-20">Kelas</th>
              <th className="border border-slate-900 py-1.5 px-2 w-16">Meja</th>
              <th className="border border-slate-900 py-1.5 px-3 w-40 text-center" colSpan={2}>
                Tanda Tangan Peserta
              </th>
              <th className="border border-slate-900 py-1.5 px-2 w-16">Ket.</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => {
              const isOdd = (idx + 1) % 2 === 1;
              return (
                <tr key={student.id} className="border-b border-slate-300">
                  <td className="border border-slate-900 py-2 px-2 text-center font-medium">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-900 py-2 px-3 font-mono font-bold text-slate-900 text-center">
                    {student.examNumber}
                  </td>
                  <td className="border border-slate-900 py-2 px-3 font-mono text-center text-slate-700">
                    {student.nisn}
                  </td>
                  <td className="border border-slate-900 py-2 px-3 font-semibold uppercase text-slate-950">
                    {student.name}
                  </td>
                  <td className="border border-slate-900 py-2 px-2 text-center">
                    {student.className}
                  </td>
                  <td className="border border-slate-900 py-2 px-2 text-center font-mono font-bold">
                    {student.seatNumber ? String(student.seatNumber).padStart(2, '0') : '-'}
                  </td>
                  {/* Zig-Zag Signature cells */}
                  <td className="border border-slate-900 py-2 px-2 w-20 text-[10px]">
                    {isOdd ? <span className="font-mono text-slate-400">{idx + 1}.......</span> : ''}
                  </td>
                  <td className="border border-slate-900 py-2 px-2 w-20 text-[10px]">
                    {!isOdd ? <span className="font-mono text-slate-400">{idx + 1}.......</span> : ''}
                  </td>
                  <td className="border border-slate-900 py-2 px-2 text-center text-slate-400">
                    
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Proctors Signature Footer */}
      <div className="pt-6 font-sans text-xs flex justify-between text-center px-4">
        <div>
          <div className="text-slate-600">Mengetahui,</div>
          <div className="font-semibold text-slate-800">Ketua Panitia Ujian</div>
          <div className="h-16"></div>
          <div className="font-bold underline text-slate-950">
            {config.committeeHeadName || '(..................................................)'}
          </div>
          <div className="text-[10px] text-slate-500">NIP. .........................................</div>
        </div>

        <div>
          <div className="text-slate-600">Pengawas Ruang Ujian,</div>
          <div className="h-16"></div>
          <div className="font-bold underline text-slate-950">
            {room?.proctor1 || '(..................................................)'}
          </div>
          <div className="text-[10px] text-slate-500">NIP. .........................................</div>
        </div>
      </div>
    </div>
  );
};

/* --- 3. BERITA ACARA UJIAN (OFFICIAL MINUTES) --- */
const ExamMinutesSheet: React.FC<{
  config: ExamConfig;
  room?: ExamRoom;
  students: Student[];
  subject: string;
}> = ({ config, room, students, subject }) => {
  return (
    <div className="font-serif text-slate-900 text-xs space-y-4 max-w-4xl mx-auto">
      {/* Official Header with Logo */}
      <OfficialDocumentHeader config={config} />

      <div className="text-center font-sans">
        <h3 className="text-sm font-black uppercase tracking-wider">
          BERITA ACARA PELAKSANAAN UJIAN
        </h3>
        <p className="text-xs font-semibold text-slate-700 uppercase">
          {config.examTitle} TAHUN PELAJARAN {config.academicYear}
        </p>
      </div>

      {/* Formal Indonesian Minutes Statement */}
      <div className="font-serif leading-relaxed text-[11px] space-y-3 pt-2">
        <p>
          Pada hari ini ......................... tanggal ........... bulan ........................ tahun ............., di {config.schoolName} telah diselenggarakan <strong>{config.examTitle}</strong> Tahun Pelajaran {config.academicYear} untuk mata pelajaran:
        </p>

        <div className="bg-slate-50 p-3 rounded border border-slate-200 font-sans grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="font-semibold text-slate-600">Mata Pelajaran:</span>{' '}
            <strong className="text-slate-900">{subject}</strong>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Ruang Ujian:</span>{' '}
            <strong className="text-indigo-900">{room?.name} ({room?.roomCode})</strong>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Waktu / Sesi:</span>{' '}
            <strong className="text-slate-900">07.30 - 09.30 WIB (Sesi 1)</strong>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Tingkat / Kelas:</span>{' '}
            <strong className="text-slate-900">{config.schoolLevel}</strong>
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <div className="font-bold text-slate-900">1. Data Kehadiran Peserta:</div>
          <table className="w-full font-sans text-xs border border-slate-400">
            <tbody>
              <tr>
                <td className="p-2 border border-slate-300 w-60">Jumlah Peserta Terdaftar</td>
                <td className="p-2 border border-slate-300 font-bold">{students.length} orang</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-300">Jumlah Peserta Hadir</td>
                <td className="p-2 border border-slate-300 font-bold">........... orang</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-300">Jumlah Peserta Tidak Hadir</td>
                <td className="p-2 border border-slate-300 font-bold">........... orang</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-300">Nomor Peserta yang Tidak Hadir</td>
                <td className="p-2 border border-slate-300 text-slate-400 italic font-mono">
                  (Tuliskan nomor peserta jika ada yang berhalangan)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-1.5 pt-2">
          <div className="font-bold text-slate-900">2. Catatan Khusus Kejadian Selama Ujian:</div>
          <div className="border border-slate-400 p-4 rounded min-h-[90px] font-sans text-slate-400 italic text-[11px]">
            Pelaksanaan ujian berjalan dengan tertib, aman, dan lancar tanpa kendala teknis.
          </div>
        </div>

        <p className="pt-2">
          Demikian Berita Acara ini dibuat dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya.
        </p>
      </div>

      {/* Proctors Signature Footer */}
      <div className="pt-6 font-sans text-xs flex justify-between text-center px-4">
        <div>
          <div className="text-slate-600">Mengetahui,</div>
          <div className="font-semibold text-slate-800">Ketua Panitia Ujian,</div>
          <div className="h-16"></div>
          <div className="font-bold underline text-slate-950">
            {config.committeeHeadName || '(..................................................)'}
          </div>
          <div className="text-[10px] text-slate-500">NIP. .........................................</div>
        </div>

        <div>
          <div className="text-slate-600">Pengawas Ruang Ujian,</div>
          <div className="font-semibold text-slate-800">Yang Membuat Berita Acara</div>
          <div className="h-16"></div>
          <div className="font-bold underline text-slate-950">
            {room?.proctor1 || '(..................................................)'}
          </div>
          <div className="text-[10px] text-slate-500">NIP. .........................................</div>
        </div>
      </div>
    </div>
  );
};

/* --- 4. DAFTAR NOMINASI RUANG (TEMPELAN PINTU) --- */
const DoorRosterSheet: React.FC<{
  config: ExamConfig;
  room?: ExamRoom;
  students: Student[];
}> = ({ config, room, students }) => {
  return (
    <div className="font-sans text-slate-900 text-xs space-y-4">
      {/* Header with Logo */}
      <div className="border-b-2 border-slate-900 pb-3">
        <div className="flex items-center gap-3">
          {config.logoUrl && (
            <div className="w-12 h-12 shrink-0 flex items-center justify-center">
              <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
          <div className="flex-1 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-600">
              {config.schoolName}
            </div>
            <h3 className="text-base sm:text-lg font-black uppercase text-slate-950 mt-0.5">
              DAFTAR PESERTA UJIAN DI {room?.name} ({room?.roomCode})
            </h3>
            <p className="text-xs font-semibold text-slate-700">
              {config.examTitle} • TP {config.academicYear}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center bg-slate-100 p-3 rounded font-medium text-xs">
        <span>Lokasi: <strong>{room?.location}</strong></span>
        <span>Total Peserta: <strong>{students.length} Siswa</strong></span>
        <span>Kapasitas: <strong>{room?.capacity} Kursi</strong></span>
      </div>

      {/* Table */}
      <table className="w-full text-[11px] border border-slate-900 text-left">
        <thead className="bg-slate-900 text-white font-bold">
          <tr>
            <th className="p-2 w-12 text-center">No</th>
            <th className="p-2 w-16 text-center">Meja</th>
            <th className="p-2 w-32">No. Peserta</th>
            <th className="p-2">Nama Lengkap Siswa</th>
            <th className="p-2 w-24 text-center">Kelas</th>
            <th className="p-2 w-12 text-center">L/P</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-300">
          {students.map((student, idx) => (
            <tr key={student.id} className="hover:bg-slate-50">
              <td className="p-2 text-center font-medium border-r border-slate-300">{idx + 1}</td>
              <td className="p-2 text-center font-mono font-bold bg-indigo-50 text-indigo-900 border-r border-slate-300">
                {student.seatNumber ? String(student.seatNumber).padStart(2, '0') : '-'}
              </td>
              <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-300">
                {student.examNumber}
              </td>
              <td className="p-2 font-semibold uppercase text-slate-950 border-r border-slate-300">
                {student.name}
              </td>
              <td className="p-2 text-center font-bold border-r border-slate-300">
                {student.className}
              </td>
              <td className="p-2 text-center font-bold">
                {student.gender}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* --- 5. LABEL SAMPUL SOAL UJIAN (PER RUANG PER MAPEL) --- */
interface QuestionCoverSheetProps {
  config: ExamConfig;
  rooms: ExamRoom[];
  students: Student[];
  schedules: ExamScheduleItem[];
  selectedRoomId: string;
  selectedSubject: string;
  spareCopies: number;
  layout: 'full' | 'half';
  includeStampAndSignature: boolean;
}

const QuestionCoverSheet: React.FC<QuestionCoverSheetProps> = ({
  config,
  rooms,
  students,
  schedules,
  selectedRoomId,
  selectedSubject,
  spareCopies,
  layout,
  includeStampAndSignature,
}) => {
  // Determine targeted rooms
  const targetRooms = selectedRoomId === 'ALL_ROOMS' 
    ? rooms 
    : rooms.filter((r) => r.id === selectedRoomId);
  const effectiveRooms = targetRooms.length > 0 ? targetRooms : [rooms[0] || {
    id: 'room-default',
    name: 'Ruang 01',
    roomCode: 'R-01',
    location: 'Gedung Utama',
    capacity: 32,
    proctor1: '',
    proctor2: ''
  }];

  // Determine targeted schedules/subjects
  let targetSchedules: ExamScheduleItem[] = [];
  if (selectedSubject === 'ALL_SUBJECTS') {
    targetSchedules = schedules.length > 0 ? schedules : [
      {
        id: 'fallback-all',
        subject: 'Semua Mata Pelajaran',
        dayName: 'Senin',
        date: config.issueDate,
        sessionTime: '07.30 - 09.30 WIB',
        targetLevel: 'Semua Kelas',
      }
    ];
  } else {
    const found = schedules.find((s) => s.subject === selectedSubject);
    if (found) {
      targetSchedules = [found];
    } else {
      targetSchedules = [
        {
          id: 'custom-subj',
          subject: selectedSubject || 'Mata Pelajaran',
          dayName: 'Senin',
          date: config.issueDate,
          sessionTime: '07.30 - 09.30 WIB',
          targetLevel: 'Semua Kelas',
        }
      ];
    }
  }

  // Generate combinations
  const items: Array<{
    room: ExamRoom;
    schedule: ExamScheduleItem;
    roomStudents: Student[];
  }> = [];

  effectiveRooms.forEach((room) => {
    const rStudents = students
      .filter((s) => s.roomId === room.id)
      .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

    targetSchedules.forEach((schedule) => {
      items.push({
        room,
        schedule,
        roomStudents: rStudents,
      });
    });
  });

  return (
    <div className="space-y-6">
      {/* Information Header in non-print */}
      <div className="no-print bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <div className="font-bold text-indigo-950 flex items-center gap-1.5">
            <PackageCheck className="w-4 h-4 text-indigo-600" />
            <span>Siap Cetak: {items.length} Label Sampul Soal</span>
          </div>
          <p className="text-slate-600 mt-0.5">
            {effectiveRooms.length} Ruang Ujian × {targetSchedules.length} Mata Pelajaran | Cadangan: {spareCopies} eksemplar | Format: {layout === 'full' ? '1 Label per Halaman (Amplop Folio)' : '2 Label per Halaman (Format Hemat A5)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500">
            Ditempelkan pada Amplop / Tas Berkas Soal Ruang Ujian
          </span>
        </div>
      </div>

      {/* Grid or Stack of Labels */}
      {layout === 'full' ? (
        <div className="space-y-8 print:space-y-0">
          {items.map((item, idx) => (
            <SingleQuestionCoverLabel
              key={`${item.room.id}-${item.schedule.id || idx}`}
              config={config}
              room={item.room}
              schedule={item.schedule}
              roomStudents={item.roomStudents}
              spareCopies={spareCopies}
              layout={layout}
              includeStampAndSignature={includeStampAndSignature}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
          {items.map((item, idx) => (
            <SingleQuestionCoverLabel
              key={`${item.room.id}-${item.schedule.id || idx}`}
              config={config}
              room={item.room}
              schedule={item.schedule}
              roomStudents={item.roomStudents}
              spareCopies={spareCopies}
              layout={layout}
              includeStampAndSignature={includeStampAndSignature}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SingleQuestionCoverLabel: React.FC<{
  config: ExamConfig;
  room: ExamRoom;
  schedule: ExamScheduleItem;
  roomStudents: Student[];
  spareCopies: number;
  layout: 'full' | 'half';
  includeStampAndSignature: boolean;
}> = ({
  config,
  room,
  schedule,
  roomStudents,
  spareCopies,
  layout,
  includeStampAndSignature,
}) => {
  const isFull = layout === 'full';
  const totalStudents = roomStudents.length;
  const startExamNumber = roomStudents[0]?.examNumber || '-';
  const endExamNumber = roomStudents[roomStudents.length - 1]?.examNumber || '-';
  const examRange = totalStudents > 0 ? `${startExamNumber} s.d. ${endExamNumber}` : '-';
  const classes = Array.from(new Set(roomStudents.map((s) => s.className).filter(Boolean))).join(', ') || schedule.targetLevel || config.schoolLevel;
  const totalExamCopies = totalStudents + spareCopies;
  const totalAnswerSheets = totalStudents + spareCopies;

  return (
    <div
      className={`page-break-inside-avoid bg-white border-2 border-slate-900 rounded-lg text-slate-900 font-sans shadow-xs print:shadow-none relative overflow-hidden flex flex-col justify-between ${
        isFull 
          ? 'p-6 md:p-8 page-break-after-always print:min-h-[268mm] min-h-[700px]' 
          : 'p-3.5 sm:p-4 page-break-inside-avoid min-h-[490px]'
      }`}
    >
      {/* Top Black Accent Strip */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-900"></div>

      <div className="space-y-2.5">
        {/* Official Header */}
        <OfficialDocumentHeader config={config} compact={!isFull} />

        {/* Title Badge */}
        <div className="text-center font-sans">
          <div className="inline-block bg-slate-900 text-white font-black uppercase tracking-wider px-3.5 py-1 rounded-sm text-xs sm:text-sm">
            LABEL SAMPUL NASKAH SOAL &amp; LEMBAR JAWABAN
          </div>
          <div className="text-[11px] font-bold text-slate-800 uppercase mt-1">
            {config.examTitle} • TAHUN PELAJARAN {config.academicYear}
          </div>
          <div className="text-[10px] font-semibold text-slate-600 uppercase">
            SEMESTER {config.semester.toUpperCase()}
          </div>
        </div>

        {/* Room & Subject High Contrast Details Grid */}
        <div className="border-2 border-slate-900 rounded-md overflow-hidden bg-slate-50">
          <div className="grid grid-cols-2 divide-x-2 divide-slate-900 border-b-2 border-slate-900">
            {/* Subject Box */}
            <div className={`p-2.5 sm:p-3 ${isFull ? 'space-y-1' : 'space-y-0.5'}`}>
              <div className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Mata Pelajaran:</div>
              <div className={`font-black uppercase tracking-wide text-indigo-950 ${isFull ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'}`}>
                {schedule.subject}
              </div>
              <div className="text-[10px] text-slate-700 font-semibold">
                Tingkat / Kelas: <span className="text-slate-900 font-bold">{classes}</span>
              </div>
            </div>

            {/* Room Box */}
            <div className={`p-2.5 sm:p-3 bg-indigo-50/50 ${isFull ? 'space-y-1' : 'space-y-0.5'}`}>
              <div className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Ruang Ujian:</div>
              <div className={`font-black uppercase text-slate-950 flex items-center justify-between ${isFull ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'}`}>
                <span>{room.name}</span>
                <span className="bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded-sm font-bold">
                  {room.roomCode}
                </span>
              </div>
              <div className="text-[10px] text-slate-700 font-semibold">
                Lokasi: <span className="text-slate-900">{room.location || 'Gedung Utama'}</span>
              </div>
            </div>
          </div>

          {/* Schedule Time & Date Strip */}
          <div className="grid grid-cols-2 divide-x-2 divide-slate-900 text-xs font-semibold bg-white p-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-600 text-[10px]">Hari / Tanggal:</span>
              <span className="font-bold text-slate-900 text-[11px]">{schedule.dayName}, {schedule.date}</span>
            </div>
            <div className="flex items-center gap-1.5 pl-2">
              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-600 text-[10px]">Waktu / Pukul:</span>
              <span className="font-mono font-bold text-slate-900 text-[11px]">{schedule.sessionTime} WIB</span>
            </div>
          </div>
        </div>

        {/* Envelope Content Allocation Table */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
            <span>Rincian Kelengkapan Berkas dalam Sampul:</span>
            <span className="text-slate-500 font-normal">Kondisi: Tersegel Rapi</span>
          </div>
          <table className="w-full border-collapse border border-slate-900 text-[10.5px]">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900 text-center">
                <th className="border border-slate-900 py-1 px-1.5 w-8">No</th>
                <th className="border border-slate-900 py-1 px-2 text-left">Nama Dokumen / Berkas</th>
                <th className="border border-slate-900 py-1 px-2 text-left">Spesifikasi Alokasi</th>
                <th className="border border-slate-900 py-1 px-2 w-28 text-center">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-900 py-1 px-1.5 text-center font-bold">1</td>
                <td className="border border-slate-900 py-1 px-2 font-bold text-slate-950">Naskah Soal Ujian</td>
                <td className="border border-slate-900 py-1 px-2 text-slate-700">
                  Utama: {totalStudents} eks. + Cadangan: {spareCopies} eks.
                </td>
                <td className="border border-slate-900 py-1 px-2 text-center font-bold text-slate-950 bg-slate-50">
                  {totalExamCopies} Eksemplar
                </td>
              </tr>
              <tr>
                <td className="border border-slate-900 py-1 px-1.5 text-center font-bold">2</td>
                <td className="border border-slate-900 py-1 px-2 font-bold text-slate-950">Lembar Jawaban (LJK / LJ)</td>
                <td className="border border-slate-900 py-1 px-2 text-slate-700">
                  Utama: {totalStudents} lbr. + Cadangan: {spareCopies} lbr.
                </td>
                <td className="border border-slate-900 py-1 px-2 text-center font-bold text-slate-950 bg-slate-50">
                  {totalAnswerSheets} Lembar
                </td>
              </tr>
              <tr>
                <td className="border border-slate-900 py-1 px-1.5 text-center font-bold">3</td>
                <td className="border border-slate-900 py-1 px-2 font-semibold text-slate-900">Daftar Hadir Peserta Ujian</td>
                <td className="border border-slate-900 py-1 px-2 text-slate-700">Format Resmi Presensi Ruang {room.roomCode}</td>
                <td className="border border-slate-900 py-1 px-2 text-center font-medium">1 Rangkap (Set)</td>
              </tr>
              <tr>
                <td className="border border-slate-900 py-1 px-1.5 text-center font-bold">4</td>
                <td className="border border-slate-900 py-1 px-2 font-semibold text-slate-900">Berita Acara Pelaksanaan</td>
                <td className="border border-slate-900 py-1 px-2 text-slate-700">Laporan &amp; Notula Kejadian Ruang</td>
                <td className="border border-slate-900 py-1 px-2 text-center font-medium">1 Rangkap (Set)</td>
              </tr>
              <tr>
                <td className="border border-slate-900 py-1 px-1.5 text-center font-bold">5</td>
                <td className="border border-slate-900 py-1 px-2 text-slate-800">Tata Tertib Peserta &amp; Pengawas</td>
                <td className="border border-slate-900 py-1 px-2 text-slate-700">Pedoman Pelaksanaan Ruang</td>
                <td className="border border-slate-900 py-1 px-2 text-center font-medium">1 Berkas</td>
              </tr>
              {isFull && (
                <tr>
                  <td className="border border-slate-900 py-1 px-1.5 text-center font-bold">6</td>
                  <td className="border border-slate-900 py-1 px-2 text-slate-800">Pakta Integritas / Catatan Khusus</td>
                  <td className="border border-slate-900 py-1 px-2 text-slate-700">Formulir Insiden Luar Biasa</td>
                  <td className="border border-slate-900 py-1 px-2 text-center font-medium">1 Lembar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Student Range & Attendance Summary Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border border-slate-900 rounded p-2 bg-slate-50 text-[10.5px]">
          <div>
            <div className="text-[8.5px] uppercase font-bold text-slate-500">Rentang Nomor Peserta</div>
            <div className="font-mono font-bold text-slate-900 truncate">{examRange}</div>
          </div>
          <div>
            <div className="text-[8.5px] uppercase font-bold text-slate-500">Jumlah Terdaftar</div>
            <div className="font-bold text-slate-900">{totalStudents} Siswa</div>
          </div>
          <div>
            <div className="text-[8.5px] uppercase font-bold text-slate-500">Jumlah Hadir</div>
            <div className="font-mono text-slate-700 font-bold">....... Siswa</div>
          </div>
          <div>
            <div className="text-[8.5px] uppercase font-bold text-slate-500">Tidak Hadir</div>
            <div className="font-mono text-slate-700 font-bold">....... Siswa</div>
          </div>
        </div>

        {/* Seal Inspection & Opening Witness Verification */}
        <div className="border border-slate-400 bg-white p-2 rounded text-[10px] space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200 pb-1">
            <span className="font-bold text-slate-900">Verifikasi Segel Sampul di Ruang Ujian:</span>
            <div className="flex items-center gap-3 font-semibold">
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 border border-slate-800 inline-flex items-center justify-center font-mono text-[9px] font-bold">✓</span>
                <span>Kondisi Baik &amp; Tersegel</span>
              </span>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <span className="w-3 h-3 border border-slate-800 inline-block"></span>
                <span>Segel Rusak</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
            <div>
              <span className="text-slate-600">Dibuka di depan peserta pada:</span>{' '}
              <strong className="font-mono text-slate-950">Pukul ....... : ....... WIB</strong>
            </div>
            <div>
              <span className="text-slate-600">Saksi 2 Orang Siswa:</span>{' '}
              <span className="text-slate-500 italic">1. ..................... (Meja ...)  2. ..................... (Meja ...)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signature & Handover Confirmation (2 columns) */}
      <div className={`pt-3 border-t border-slate-300 font-sans text-xs grid grid-cols-2 text-center gap-4 px-4 ${isFull ? 'mt-4' : 'mt-2'}`}>
        {/* Committee Handover */}
        <div className="relative flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-semibold text-slate-600">Panitia Pengedar Soal,</div>
            <div className="text-[9px] text-slate-400">{config.issuePlace}, {schedule.date}</div>
          </div>

          <div 
            className="relative flex items-center justify-center my-0.5"
            style={{ height: isFull ? '42px' : '30px' }}
          >
            {includeStampAndSignature && config.stampEnabled && config.stampUrl && (
              <div 
                className="absolute z-10 pointer-events-none select-none print:opacity-100"
                style={{
                  left: isFull ? '15%' : '10%',
                  bottom: '-3px',
                  width: isFull ? '44px' : '32px',
                  height: isFull ? '44px' : '32px',
                  opacity: 0.88,
                  transform: 'rotate(-7deg)'
                }}
              >
                <img src={config.stampUrl} alt="Stempel" className="w-full h-full object-contain" />
              </div>
            )}

            {includeStampAndSignature && config.signatureEnabled !== false && config.signatureUrl ? (
              <div className="relative z-0 flex items-center justify-center h-full">
                <img src={config.signatureUrl} alt="TTD" className="h-full w-auto object-contain max-w-[90px]" />
              </div>
            ) : (
              <span className="font-serif italic text-slate-300 text-[9px] select-none">(ttd &amp; cap)</span>
            )}
          </div>

          <div>
            <div className="font-bold underline text-slate-950 text-[10.5px] truncate relative z-10">
              {config.committeeHeadName || 'Ketua Panitia Ujian'}
            </div>
            <div className="text-[8.5px] text-slate-500 font-mono">NIP. {config.committeeHeadNip || '-'}</div>
          </div>
        </div>

        {/* Proctor Receiver */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-semibold text-slate-600">Pengawas Ruang Ujian,</div>
            <div className="text-[9px] text-slate-400">Penerima Naskah</div>
          </div>
          <div className="flex items-center justify-center my-0.5" style={{ height: isFull ? '42px' : '30px' }}>
            <span className="font-serif italic text-slate-300 text-[9px] select-none">(tanda tangan)</span>
          </div>
          <div>
            <div className="font-bold underline text-slate-950 text-[10.5px] truncate">
              {room.proctor1 || '(....................................)'}
            </div>
            <div className="text-[8.5px] text-slate-500 font-mono">NIP. ........................................</div>
          </div>
        </div>
      </div>

      {/* Barcode & Security Verification Footer */}
      <div className="pt-2.5 mt-2 border-t border-dashed border-slate-300 flex items-center justify-between gap-2 font-mono text-[9px] text-slate-500">
        <div className="flex items-center gap-2">
          <BarcodeSVG 
            value={`${room.roomCode}-${schedule.subject.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase()}`} 
            width={isFull ? 130 : 100} 
            height={isFull ? 22 : 18} 
            showText={false} 
          />
          <div>
            <span className="font-bold text-slate-900 block font-sans text-[10px]">{room.roomCode} • {schedule.subject}</span>
            <span className="text-[8px]">KODE-SAMPUL: {room.roomCode}-{schedule.id || 'SOAL'}</span>
          </div>
        </div>
        <div className="text-right flex items-center gap-2">
          <div className="text-[8px] max-w-[220px] text-slate-500 hidden sm:block font-sans leading-tight">
            Setelah ujian selesai, seluruh lembar jawaban &amp; sisa naskah disusun urut dan dimasukkan kembali ke sampul ini.
          </div>
          <QRCodeSVG 
            value={`SAMPUL|${config.schoolName}|${room.roomCode}|${schedule.subject}|${schedule.date}`} 
            size={isFull ? 34 : 26} 
          />
        </div>
      </div>
    </div>
  );
};

/* --- 6. DAFTAR HADIR PENGAWAS RUANG UJIAN --- */
const DocProctorAttendanceSheet: React.FC<{
  config: ExamConfig;
  rooms: ExamRoom[];
  schedules: ExamScheduleItem[];
  selectedSubject: string;
  selectedRoomId: string;
  includeStampAndSignature: boolean;
}> = ({ config, rooms, schedules, selectedSubject, selectedRoomId, includeStampAndSignature }) => {
  const fallbackSchedule: ExamScheduleItem = {
    id: 'fallback-sch',
    dayName: 'Senin',
    date: '17 Maret 2025',
    sessionTime: '07.30 - 09.30',
    subject: selectedSubject || 'Mata Pelajaran',
    targetLevel: 'Semua Tingkat',
  };
  const currentSchedule: ExamScheduleItem = schedules.find((s) => s.subject === selectedSubject) || schedules[0] || fallbackSchedule;

  const displayedRooms = selectedRoomId
    ? rooms.filter((r) => r.id === selectedRoomId)
    : rooms;

  return (
    <div className="font-serif text-slate-900 text-xs space-y-4">
      {/* Official Header */}
      <OfficialDocumentHeader config={config} />

      {/* Document Title */}
      <div className="text-center font-sans">
        <h3 className="text-base font-black uppercase tracking-wider text-slate-950">
          DAFTAR HADIR PENGAWAS RUANG UJIAN
        </h3>
        <p className="text-xs font-semibold text-slate-700">
          {config.examTitle.toUpperCase()} • TAHUN PELAJARAN {config.academicYear}
        </p>
      </div>

      {/* Info Metadata Box */}
      <div className="border border-slate-900 bg-slate-50/50 p-2.5 rounded font-sans text-xs grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <span className="text-slate-500 text-[10px] block uppercase font-medium">Hari / Tanggal</span>
          <span className="font-bold text-slate-900">{currentSchedule.dayName}, {currentSchedule.date}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block uppercase font-medium">Mata Pelajaran</span>
          <span className="font-bold text-slate-900">{currentSchedule.subject}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block uppercase font-medium">Waktu Ujian</span>
          <span className="font-bold text-slate-900">{currentSchedule.sessionTime} WIB</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block uppercase font-medium">Cakupan Ruang</span>
          <span className="font-bold text-slate-900">
            {selectedRoomId ? displayedRooms[0]?.name || 'Ruang Terpilih' : `Semua Ruang (${rooms.length} Ruang)`}
          </span>
        </div>
      </div>

      {/* Attendance Table */}
      <table className="w-full border-collapse border border-slate-900 text-[11px] font-sans">
        <thead>
          <tr className="bg-slate-100 text-slate-900 font-bold">
            <th className="border border-slate-900 px-2 py-2 w-10 text-center">No</th>
            <th className="border border-slate-900 px-2 py-2 w-24 text-center">Ruang</th>
            <th className="border border-slate-900 px-3 py-2 text-left">Nama Guru Pengawas &amp; NIP</th>
            <th className="border border-slate-900 px-3 py-2 text-center w-36">Tanda Tangan</th>
            <th className="border border-slate-900 px-2 py-2 w-28 text-center">Waktu Hadir</th>
            <th className="border border-slate-900 px-2 py-2 w-28 text-center">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {displayedRooms.map((room, idx) => (
            <tr key={room.id} className="hover:bg-slate-50/50">
              <td className="border border-slate-900 px-2 py-2.5 text-center font-semibold">{idx + 1}</td>
              <td className="border border-slate-900 px-2 py-2.5 text-center font-bold text-slate-950 bg-slate-50/70">
                {room.roomCode}
              </td>
              <td className="border border-slate-900 px-3 py-2.5">
                <div className="font-semibold text-slate-900 leading-tight">
                  {room.proctor1 || '-'}
                </div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                  NIP. ........................................
                </div>
              </td>
              <td className="border border-slate-900 px-3 py-2.5 text-left align-bottom h-10">
                <span className="text-[9px] text-slate-400 font-mono block mb-2">{idx + 1}. ..........</span>
              </td>
              <td className="border border-slate-900 px-2 py-2 text-center text-slate-400 font-mono text-[10px]">
                ....... : .......
              </td>
              <td className="border border-slate-900 px-2 py-2 text-center text-slate-400 font-mono text-[10px]">
                Hadir
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Signatures */}
      <div className="pt-4 flex justify-between items-start font-sans text-xs">
        <div className="space-y-1">
          <div>Mengetahui,</div>
          <div className="font-semibold">Ketua Panitia Ujian,</div>
          <div className="h-16"></div>
          <div className="font-bold underline text-slate-900">
            {config.committeeHeadName || '........................................'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            NIP. {config.committeeHeadNip || '........................................'}
          </div>
        </div>

        <div className="space-y-1 text-right relative">
          <div>{config.district}, {currentSchedule.date}</div>
          <div className="font-semibold">Kepala {config.schoolName},</div>
          
          <div className="h-16 relative flex items-center justify-end">
            {includeStampAndSignature && config.stampUrl && (
              <img 
                src={config.stampUrl} 
                alt="Stempel" 
                className="absolute right-12 w-20 h-20 object-contain opacity-80 pointer-events-none mix-blend-multiply" 
              />
            )}
            {includeStampAndSignature && config.signatureUrl && (
              <img 
                src={config.signatureUrl} 
                alt="Tanda Tangan" 
                className="absolute right-4 w-28 h-14 object-contain pointer-events-none mix-blend-multiply" 
              />
            )}
          </div>

          <div className="font-bold underline text-slate-900">
            {config.principalName}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            NIP. {config.principalNip}
          </div>
        </div>
      </div>

      {/* Print Note */}
      <div className="border-t border-dashed border-slate-300 pt-2 flex items-center justify-between text-[9px] text-slate-500 font-sans">
        <span>SIM Ujian MTs — Dokumen Presensi Resmi Pengawas Ruang Ujian</span>
        <span className="font-mono">Dicetak: {new Date().toLocaleDateString('id-ID')}</span>
      </div>
    </div>
  );
};
