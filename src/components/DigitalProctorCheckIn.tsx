import React, { useState, useEffect } from 'react';
import { ExamConfig, ExamRoom, ExamScheduleItem, Proctor, ProctorAttendanceRecord } from '../types';
import { SignaturePad } from './SignaturePad';
import { 
  UserCheck, 
  PenTool, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  DoorOpen, 
  Trash2, 
  Printer, 
  Search, 
  Check, 
  RotateCcw, 
  Users, 
  Edit3,
  Building2,
  Sparkles,
  Info,
  ExternalLink
} from 'lucide-react';

interface DigitalProctorCheckInProps {
  config: ExamConfig;
  proctors: Proctor[];
  rooms: ExamRoom[];
  schedules: ExamScheduleItem[];
  attendanceRecords: ProctorAttendanceRecord[];
  onSaveAttendance: (record: ProctorAttendanceRecord) => void;
  onDeleteAttendance: (recordId: string) => void;
  onResetSessionAttendance: (scheduleId: string) => void;
  onViewPrintSheet: () => void;
}

export const DigitalProctorCheckIn: React.FC<DigitalProctorCheckInProps> = ({
  config,
  proctors,
  rooms,
  schedules,
  attendanceRecords,
  onSaveAttendance,
  onDeleteAttendance,
  onResetSessionAttendance,
  onViewPrintSheet,
}) => {
  // Filter exam schedules (exclude breaks)
  const examSchedules = schedules.filter((s) => !s.isBreak && !s.subject.toLowerCase().includes('istirahat'));
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(() => {
    return examSchedules[0]?.id || schedules[0]?.id || '';
  });

  // Keep in sync if schedules change
  useEffect(() => {
    if (!schedules.some((s) => s.id === selectedScheduleId)) {
      const firstValid = examSchedules[0]?.id || schedules[0]?.id || '';
      setSelectedScheduleId(firstValid);
    }
  }, [schedules, selectedScheduleId]);

  const currentSchedule = schedules.find((s) => s.id === selectedScheduleId) || examSchedules[0] || schedules[0] || {
    id: 'sch-1',
    dayName: 'Senin',
    date: '17 Maret 2025',
    sessionTime: '07.30 - 09.30',
    subject: 'Matematika',
    targetLevel: 'Semua Kelas',
  };

  // Selected proctor for active check-in form
  const [selectedProctorId, setSelectedProctorId] = useState<string>(proctors[0]?.id || '');
  const [status, setStatus] = useState<'Hadir' | 'Izin' | 'Sakit' | 'Digantikan'>('Hadir');
  const [signatureData, setSignatureData] = useState<string>('');
  const [checkInTime, setCheckInTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [substituteName, setSubstituteName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [previewModalRecord, setPreviewModalRecord] = useState<ProctorAttendanceRecord | null>(null);

  // Live real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      setCurrentTimeStr(`${hours}.${mins}.${secs} WIB`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format current default check-in time (e.g., "07.15 WIB")
  const getCurrentCheckInTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${hours}.${mins} WIB`;
  };

  // Get active proctor data
  const selectedProctor = proctors.find((p) => p.id === selectedProctorId) || proctors[0];

  // Records for currently selected schedule
  const sessionRecords = attendanceRecords.filter(
    (r) => r.scheduleId === currentSchedule.id || r.subject === currentSchedule.subject
  );

  // Check if active selected proctor has already checked in
  const existingRecordForSelected = sessionRecords.find(
    (r) => r.proctorId === selectedProctor?.id
  );

  // When selected proctor changes, sync form
  useEffect(() => {
    if (selectedProctor) {
      const existing = sessionRecords.find((r) => r.proctorId === selectedProctor.id);
      if (existing) {
        setStatus(existing.status);
        setCheckInTime(existing.checkInTime);
        setSignatureData(existing.signatureUrl || '');
        setNotes(existing.notes || '');
      } else {
        setStatus('Hadir');
        setCheckInTime(getCurrentCheckInTime());
        setSignatureData('');
        setNotes('');
        setSubstituteName('');
      }
    }
  }, [selectedProctorId, selectedScheduleId]);

  // Statistics
  const totalAssignedProctors = proctors.filter((p) => p.assignedRoomId).length;
  const presentCount = sessionRecords.filter((r) => r.status === 'Hadir').length;
  const absentCount = sessionRecords.filter((r) => r.status === 'Izin' || r.status === 'Sakit').length;
  const replacedCount = sessionRecords.filter((r) => r.status === 'Digantikan').length;
  const pendingCount = Math.max(0, totalAssignedProctors - sessionRecords.length);
  const attendancePercentage = totalAssignedProctors > 0 
    ? Math.round((presentCount / totalAssignedProctors) * 100) 
    : 0;

  // Handle Save Attendance
  const handleSave = () => {
    if (!selectedProctor) return;

    if (!signatureData && status === 'Hadir') {
      alert('Harap goreskan tanda tangan (TTD) Anda pada kotak tanda tangan sebelum menyimpan presensi.');
      return;
    }

    const room = rooms.find((r) => r.id === selectedProctor.assignedRoomId);

    const record: ProctorAttendanceRecord = {
      id: existingRecordForSelected?.id || `att-${selectedScheduleId}-${selectedProctor.id}-${Date.now()}`,
      proctorId: selectedProctor.id,
      proctorName: status === 'Digantikan' && substituteName ? `${selectedProctor.name} (Diganti: ${substituteName})` : selectedProctor.name,
      proctorNip: selectedProctor.nip,
      scheduleId: currentSchedule.id,
      subject: currentSchedule.subject,
      examDate: currentSchedule.date,
      sessionTime: currentSchedule.sessionTime,
      roomId: selectedProctor.assignedRoomId,
      roomCode: selectedProctor.assignedRoomCode || room?.roomCode,
      position: selectedProctor.assignedPosition,
      status: status,
      checkInTime: checkInTime || getCurrentCheckInTime(),
      signatureUrl: signatureData,
      notes: notes,
      timestamp: Date.now(),
    };

    onSaveAttendance(record);

    // Show toast
    setSuccessToast(`Presensi ${selectedProctor.name} berhasil disimpan!`);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);
  };

  // Quick select proctor from room grid
  const handleQuickSelectProctor = (proctorId: string) => {
    setSelectedProctorId(proctorId);
    // Smooth scroll to signature pad on smaller screens
    const formElement = document.getElementById('signature-checkin-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Instructions */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-xl p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 text-[10px] font-bold uppercase tracking-wider border border-indigo-400/30">
                Fitur Presensi Mandiri
              </span>
              <span className="text-xs text-indigo-200 flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {currentTimeStr}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <PenTool className="w-5 h-5 text-indigo-300" />
              <span>Presensi Digital Pengawas Ruang (Input TTD)</span>
            </h2>
            <p className="text-xs text-indigo-100 max-w-2xl leading-relaxed">
              Bapak/Ibu Guru Pengawas dapat membubuhkan tanda tangan langsung di aplikasi ini menggunakan layar sentuh, stylus pen, atau mouse. Tanda tangan digital akan otomatis terintegrasi ke lembar daftar hadir resmi siap cetak.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={onViewPrintSheet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 backdrop-blur-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-indigo-200" />
              <span>Lihat Format Cetak Ber-TTD</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Success Toast */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-900 text-white px-4 py-3 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 border border-emerald-500 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Schedule Selector & Live Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Schedule Selector Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs lg:col-span-1 space-y-3">
          <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pilih Jadwal / Sesi Ujian:</span>
          </label>
          <select
            value={selectedScheduleId}
            onChange={(e) => setSelectedScheduleId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800"
          >
            {examSchedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.dayName}, {s.date} — {s.subject} ({s.sessionTime})
              </option>
            ))}
          </select>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Mata Pelajaran:</span>
              <span className="font-bold text-slate-900">{currentSchedule.subject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Waktu Ujian:</span>
              <span className="font-semibold text-slate-800">{currentSchedule.sessionTime} WIB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tingkat:</span>
              <span className="font-semibold text-slate-800">{currentSchedule.targetLevel}</span>
            </div>
          </div>
        </div>

        {/* Metric Cards (3 cols) */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Sudah Presensi */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sudah Presensi</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-emerald-600">{presentCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {attendancePercentage}% dari total pengawas
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${attendancePercentage}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Belum Presensi */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Belum Absen</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Pengawas belum TTD
              </div>
            </div>
          </div>

          {/* Izin / Sakit */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Izin / Sakit</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-blue-600">{absentCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Berhalangan hadir
              </div>
            </div>
          </div>

          {/* Digantikan */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pengganti</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-purple-600">{replacedCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Pengawas cadangan aktif
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Check-In Form & Signature Pad Area */}
      <div id="signature-checkin-form" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Proctor Selector & Form Controls (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Formulir Presensi Pengawas</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pilih nama guru pengawas, atur status, lalu goreskan tanda tangan digital di sebelah kanan.
            </p>
          </div>

          {/* Proctor Selector Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Pilih Nama Pengawas:
            </label>
            <select
              value={selectedProctorId}
              onChange={(e) => setSelectedProctorId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-900"
            >
              <optgroup label="Pengawas Ruang Ujian">
                {proctors
                  .filter((p) => p.assignedRoomId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.assignedRoomCode} — {p.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Pengawas Cadangan & Koordinator">
                {proctors
                  .filter((p) => !p.assignedRoomId || p.role !== 'Pengawas Ruang')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.role || 'Cadangan'}] {p.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Proctor Identity Card Badge */}
          {selectedProctor && (
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200 text-xs space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{selectedProctor.name}</div>
                  <div className="font-mono text-[11px] text-slate-500">NIP. {selectedProctor.nip || '-'}</div>
                  <div className="text-[11px] text-indigo-600 font-medium mt-0.5">
                    Guru: {selectedProctor.subject || 'Pengawas'}
                  </div>
                </div>
                <div className="text-right">
                  {selectedProctor.assignedRoomCode ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs">
                      <DoorOpen className="w-3.5 h-3.5" />
                      {selectedProctor.assignedRoomCode}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                      {selectedProctor.role || 'Cadangan'}
                    </span>
                  )}
                </div>
              </div>

              {existingRecordForSelected ? (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Sudah Presensi ({existingRecordForSelected.checkInTime})
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    Status: <span className="font-bold text-slate-700">{existingRecordForSelected.status}</span>
                  </span>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200 text-[11px] text-amber-700 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Belum melakukan presensi sesi ini</span>
                </div>
              )}
            </div>
          )}

          {/* Status Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Status Kehadiran:</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['Hadir', 'Izin', 'Sakit', 'Digantikan'] as const).map((st) => {
                const isSelected = status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? st === 'Hadir'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : st === 'Izin'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : st === 'Sakit'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* If Digantikan: input substitute name */}
          {status === 'Digantikan' && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Nama Guru Pengawas Pengganti:
              </label>
              <input
                type="text"
                value={substituteName}
                onChange={(e) => setSubstituteName(e.target.value)}
                placeholder="Misal: Drs. Subakir, M.Pd."
                className="w-full px-3 py-1.5 text-xs border border-purple-300 rounded-lg bg-purple-50/50 text-slate-900 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          {/* Check-in Time & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Jam Hadir:</label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  placeholder="07.15 WIB"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setCheckInTime(getCurrentCheckInTime())}
                  title="Gunakan Jam Sekarang"
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs shrink-0"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Catatan (Opsional):</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Tepat waktu"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Signature Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-indigo-600" />
                  <span>Pad Tanda Tangan Digital Pengawas (TTD)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tanda tangan di bawah ini sebagai bukti kehadiran fisik dan pengawasan ruang ujian.
                </p>
              </div>

              {selectedProctor && (
                <div className="hidden sm:block text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Atas Nama</span>
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[180px] block">
                    {selectedProctor.name}
                  </span>
                </div>
              )}
            </div>

            {/* Signature Canvas Component */}
            <SignaturePad
              key={`${selectedScheduleId}-${selectedProctorId}-${existingRecordForSelected?.timestamp || 'new'}`}
              initialSignature={signatureData}
              onSave={(dataUrl) => setSignatureData(dataUrl)}
              onClear={() => setSignatureData('')}
              label="Goreskan Tanda Tangan Asli Anda:"
              height={190}
            />
          </div>

          {/* Action Confirmation Button */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>
                {existingRecordForSelected 
                  ? 'Menyimpan akan memperbarui tanda tangan & waktu presensi pengawas ini.'
                  : 'Pastikan nama pengawas dan ruang telah sesuai sebelum konfirmasi.'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer hover:shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>Simpan &amp; Konfirmasi Presensi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Room-by-Room Quick Attendance Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Status Presensi Cepat per Ruang Ujian</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Klik nama atau tombol pada ruang untuk langsung mengisi tanda tangan pengawas terkait.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ruang / nama pengawas..."
                className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg w-52 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={() => onResetSessionAttendance(currentSchedule.id)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors"
              title="Reset presensi sesi ini"
            >
              <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
              Reset Sesi
            </button>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rooms
            .filter((room) => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return (
                room.roomCode.toLowerCase().includes(q) ||
                room.name.toLowerCase().includes(q) ||
                (room.proctor1 && room.proctor1.toLowerCase().includes(q))
              );
            })
            .map((room) => {
              const p1 = proctors.find((p) => p.assignedRoomId === room.id);
              const rec1 = p1 ? sessionRecords.find((r) => r.proctorId === p1.id) : null;

              return (
                <div 
                  key={room.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50/90 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-xs">
                        {room.roomCode}
                      </span>
                      <span className="font-bold text-xs text-slate-800">{room.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Kap: {room.capacity}
                    </span>
                  </div>

                  {/* Proctor Slot */}
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <div className="truncate">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Pengawas Ruang</span>
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {p1?.name || room.proctor1 || '(Belum diset)'}
                        </div>
                      </div>
                      {rec1 ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          <Check className="w-2.5 h-2.5" />
                          {rec1.checkInTime}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
                          Belum
                        </span>
                      )}
                    </div>

                    {rec1?.signatureUrl ? (
                      <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-100">
                        <div className="flex items-center gap-2">
                          <img 
                            src={rec1.signatureUrl} 
                            alt="TTD" 
                            className="h-7 w-auto max-w-[80px] object-contain border border-slate-100 rounded bg-slate-50 px-1" 
                          />
                          <span className="text-[9px] font-mono text-emerald-700 font-bold">TTD OK</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => p1 && handleQuickSelectProctor(p1.id)}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                        >
                          Ubah TTD
                        </button>
                      </div>
                    ) : (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => p1 && handleQuickSelectProctor(p1.id)}
                          className="w-full py-1 px-2 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <PenTool className="w-3 h-3" />
                          <span>Input TTD Pengawas</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Session Attendance Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Rekap Data Presensi &amp; Bukti Tanda Tangan Sesi Ini</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Daftar seluruh pengawas yang telah melakukan presensi pada mata pelajaran {currentSchedule.subject}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onViewPrintSheet}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Presensi Ber-TTD</span>
            </button>
          </div>
        </div>

        {sessionRecords.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
            <PenTool className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="font-semibold text-slate-700 text-xs">Belum ada pengawas yang presensi pada sesi ini</div>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              Gunakan formulir di atas untuk memilih pengawas dan membubuhkan tanda tangan langsung.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3">Nama Pengawas</th>
                  <th className="py-2.5 px-3">Ruang / Tugas</th>
                  <th className="py-2.5 px-3">Jam Masuk</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 w-32 text-center">Tanda Tangan (TTD)</th>
                  <th className="py-2.5 px-3">Catatan</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {sessionRecords.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900">{rec.proctorName}</div>
                      <div className="text-[10px] font-mono text-slate-500">NIP. {rec.proctorNip || '-'}</div>
                    </td>
                    <td className="py-2 px-3">
                      {rec.roomCode ? (
                        <span className="font-semibold text-slate-800">
                          {rec.roomCode}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Cadangan</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs font-semibold text-slate-700">
                      {rec.checkInTime}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.status === 'Hadir' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : rec.status === 'Izin' 
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : rec.status === 'Sakit'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {rec.signatureUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewModalRecord(rec)}
                          className="group relative inline-block cursor-pointer"
                          title="Klik untuk memperbesar tanda tangan"
                        >
                          <img 
                            src={rec.signatureUrl} 
                            alt="TTD" 
                            className="h-8 max-w-[100px] object-contain mx-auto border border-slate-200 rounded p-0.5 bg-white group-hover:border-indigo-400 transition-colors" 
                          />
                          <span className="text-[9px] text-indigo-600 block opacity-0 group-hover:opacity-100 transition-opacity">
                            Perbesar
                          </span>
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">Tanpa TTD</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-[11px]">
                      {rec.notes || '-'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickSelectProctor(rec.proctorId)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                          title="Edit / Tanda Tangan Ulang"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Hapus presensi untuk ${rec.proctorName}?`)) {
                              onDeleteAttendance(rec.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Hapus Presensi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Signature Preview Zoom Modal */}
      {previewModalRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Bukti Tanda Tangan Pengawas</h4>
                <p className="text-xs text-slate-500">{previewModalRecord.proctorName}</p>
              </div>
              <button
                onClick={() => setPreviewModalRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center justify-center min-h-[160px]">
              {previewModalRecord.signatureUrl ? (
                <img 
                  src={previewModalRecord.signatureUrl} 
                  alt="Tanda Tangan Pengawas" 
                  className="max-h-40 max-w-full object-contain filter drop-shadow-sm" 
                />
              ) : (
                <span className="text-slate-400 text-xs">Tidak ada goresan tanda tangan</span>
              )}
            </div>

            <div className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Ruang:</span>
                <span className="font-semibold text-slate-800">
                  {previewModalRecord.roomCode || 'Cadangan'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jam Presensi:</span>
                <span className="font-mono font-semibold text-emerald-700">{previewModalRecord.checkInTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mata Pelajaran:</span>
                <span className="font-semibold text-slate-800">{previewModalRecord.subject}</span>
              </div>
            </div>

            <button
              onClick={() => setPreviewModalRecord(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
