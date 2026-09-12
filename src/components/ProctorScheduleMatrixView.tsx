import React, { useState, useMemo, useEffect } from 'react';
import { ExamConfig, ExamRoom, ExamScheduleItem, Proctor } from '../types';
import { 
  Printer, 
  FileSpreadsheet, 
  Shuffle, 
  RotateCcw, 
  Users, 
  AlertTriangle, 
  Check, 
  X, 
  Search, 
  Filter,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { subscribeToProctorMatrix, saveProctorMatrixToCloud } from '../lib/firebase';

export interface ProctorMatrixAllocation {
  proctorId?: string;
  proctorName: string;
  nip?: string;
}

export type ProctorScheduleMatrix = Record<string, ProctorMatrixAllocation>;

interface ProctorScheduleMatrixViewProps {
  config: ExamConfig;
  proctors: Proctor[];
  rooms: ExamRoom[];
  schedules: ExamScheduleItem[];
  onSyncWithAttendance?: (matrix: ProctorScheduleMatrix) => void;
  onOpenImportExcel?: () => void;
}

const STORAGE_KEY_MATRIX = 'sim_ujian_proctor_matrix_allocations_v2';

interface DayScheduleGroup {
  dayIndex: number;
  dayName: string;
  date: string;
  rows: Array<{
    type: 'session' | 'break';
    schedule?: ExamScheduleItem;
    time: string;
    subject?: string;
    jamKe?: number;
  }>;
}

export const ProctorScheduleMatrixView: React.FC<ProctorScheduleMatrixViewProps> = ({
  config,
  proctors,
  rooms,
  schedules,
  onOpenImportExcel,
}) => {
  // Room pagination / filter: 5 rooms per batch by default (just like in the user's Excel image)
  const [roomBatchIndex, setRoomBatchIndex] = useState<number>(0);
  const [roomsPerPage, setRoomsPerPage] = useState<number | 'all'>(5);
  const [nameDisplayMode, setNameDisplayMode] = useState<'full' | 'short' | 'first'>('short');
  const [showBreakRow, setShowBreakRow] = useState<boolean>(true);

  // Cell editing popup state
  const [activeCell, setActiveCell] = useState<{
    scheduleId: string;
    roomId: string;
    roomCode: string;
    subject: string;
    dayName: string;
    time: string;
  } | null>(null);

  const [proctorSearch, setProctorSearch] = useState('');

  // Matrix allocation state: key = `${scheduleId}__${roomId}`
  const [matrix, setMatrix] = useState<ProctorScheduleMatrix>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MATRIX);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    // Auto initialize if empty: assign from room.proctor1 or proctors pool
    const initial: ProctorScheduleMatrix = {};
    if (schedules.length > 0 && rooms.length > 0) {
      schedules.forEach((sch, schIdx) => {
        if (sch.isBreak || sch.subject.toLowerCase().includes('istirahat')) return;
        rooms.forEach((rm, rmIdx) => {
          // Rolling assignment: pick proctor fairly
          const proctorIndex = (schIdx + rmIdx) % Math.max(1, proctors.length);
          const p = proctors[proctorIndex];
          if (p) {
            initial[`${sch.id}__${rm.id}`] = {
              proctorId: p.id,
              proctorName: p.name,
              nip: p.nip || '-',
            };
          } else if (rm.proctor1) {
            initial[`${sch.id}__${rm.id}`] = {
              proctorName: rm.proctor1,
              nip: '-',
            };
          }
        });
      });
    }
    return initial;
  });

  // Subscribe to Cloud Firestore Real-time Matrix Allocations
  useEffect(() => {
    const unsubscribe = subscribeToProctorMatrix((cloudMatrix) => {
      if (cloudMatrix && Object.keys(cloudMatrix).length > 0) {
        setMatrix(cloudMatrix as ProctorScheduleMatrix);
      }
    });
    return () => unsubscribe();
  }, []);

  // Save to localStorage & Cloud Firestore on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MATRIX, JSON.stringify(matrix));
    } catch (e) {
      console.error('Failed to save proctor matrix allocations', e);
    }
    if (Object.keys(matrix).length > 0) {
      saveProctorMatrixToCloud(matrix).catch((err) => {
        console.warn('Failed to sync proctor matrix to cloud:', err);
      });
    }
  }, [matrix]);

  // Group schedules into days with standard break intervals matching user's image
  const dayGroups = useMemo<DayScheduleGroup[]>(() => {
    const map = new Map<string, ExamScheduleItem[]>();
    schedules.forEach((s) => {
      const key = `${s.dayName}|${s.date}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(s);
    });

    const groups: DayScheduleGroup[] = [];
    let dayCounter = 1;

    map.forEach((items, key) => {
      const [dayName, date] = key.split('|');
      const rows: DayScheduleGroup['rows'] = [];

      // Sort items by session time if available
      const sorted = [...items];

      // Check if day already has explicit break items (e.g. from user uploaded template)
      const hasExplicitBreaks = sorted.some(
        (s) => s.isBreak || s.subject.toLowerCase().includes('istirahat')
      );

      if (hasExplicitBreaks) {
        let jamCounter = 1;
        sorted.forEach((item) => {
          const isBreak = item.isBreak || item.subject.toLowerCase().includes('istirahat');
          if (isBreak) {
            if (showBreakRow) {
              rows.push({
                type: 'break',
                schedule: item,
                time: item.sessionTime,
                subject: item.subject,
              });
            }
          } else {
            rows.push({
              type: 'session',
              schedule: item,
              time: item.sessionTime,
              subject: item.subject,
              jamKe: jamCounter++,
            });
          }
        });
      } else if (sorted.length === 3) {
        // Standard 3-session day (like Senin-Kamis, Sabtu in STS):
        // Session 1: 07.30-08.30
        rows.push({
          type: 'session',
          schedule: sorted[0],
          time: sorted[0].sessionTime || '07.30-08.30',
          subject: sorted[0].subject,
          jamKe: 1,
        });
        // Session 2: 08.30-09.30
        rows.push({
          type: 'session',
          schedule: sorted[1],
          time: sorted[1].sessionTime || '08.30-09.30',
          subject: sorted[1].subject,
          jamKe: 2,
        });
        // Break: 09.30-10.00 Istirahat
        if (showBreakRow) {
          rows.push({
            type: 'break',
            time: '09.30-10.00',
            subject: 'Istirahat',
          });
        }
        // Session 3: 10.00-11.00
        rows.push({
          type: 'session',
          schedule: sorted[2],
          time: sorted[2].sessionTime || '10.00-11.00',
          subject: sorted[2].subject,
          jamKe: 3,
        });
      } else if (sorted.length === 2 && dayName.toLowerCase().includes('jumat')) {
        // Friday 2-session pattern
        rows.push({
          type: 'session',
          schedule: sorted[0],
          time: sorted[0].sessionTime || '07.30-08.30',
          subject: sorted[0].subject,
          jamKe: 1,
        });
        if (showBreakRow) {
          rows.push({
            type: 'break',
            time: '08.30-09.00',
            subject: 'Istirahat',
          });
        }
        rows.push({
          type: 'session',
          schedule: sorted[1],
          time: sorted[1].sessionTime || '09.00-10.00',
          subject: sorted[1].subject,
          jamKe: 2,
        });
      } else {
        // Generic fallback for any session count
        sorted.forEach((item, idx) => {
          rows.push({
            type: 'session',
            schedule: item,
            time: item.sessionTime,
            subject: item.subject,
            jamKe: idx + 1,
          });
          // Insert break after session 2 if more sessions exist
          if (showBreakRow && idx === 1 && sorted.length > 2) {
            rows.push({
              type: 'break',
              time: '09.30-10.00',
              subject: 'Istirahat',
            });
          }
        });
      }

      groups.push({
        dayIndex: dayCounter++,
        dayName,
        date,
        rows,
      });
    });

    return groups;
  }, [schedules, showBreakRow]);

  // Determine displayed rooms based on pagination / batch
  const totalRooms = rooms.length;
  const batchSize = roomsPerPage === 'all' ? totalRooms : roomsPerPage;
  const totalBatches = roomsPerPage === 'all' ? 1 : Math.ceil(totalRooms / batchSize);

  const displayedRooms = useMemo(() => {
    if (roomsPerPage === 'all') return rooms;
    const start = roomBatchIndex * batchSize;
    return rooms.slice(start, start + batchSize);
  }, [rooms, roomBatchIndex, batchSize, roomsPerPage]);

  // Clean formatted 2-digit room code like "01", "02", "03", "04", "05" matching user's image
  const formatRoomCode = (r: ExamRoom, idx: number) => {
    const raw = r.roomCode || r.name;
    const match = raw.match(/\d+/);
    if (match) {
      return match[0].padStart(2, '0');
    }
    return String(idx + 1).padStart(2, '0');
  };

  // Shorten teacher name for compact table display
  const formatProctorDisplayName = (fullName?: string) => {
    if (!fullName || fullName === '-') return '-';
    if (nameDisplayMode === 'full') return fullName;

    // Clean academic titles for short display
    const cleaned = fullName.replace(/(Drs\.|Dra\.|Ust\.|H\.|Hj\.|M\.Pd\.|S\.Pd\.|S\.Pd\.I\.|S\.Ag\.|S\.Kom\.|S\.Si\.|M\.Ag\.|M\.Pd\.I\.|,)/gi, '').trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);

    if (nameDisplayMode === 'first') {
      return parts[0] || fullName;
    }

    // Short mode: First name + initial of second name
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1].charAt(0)}.`;
    }
    return parts[0] || fullName;
  };

  // Conflict detector: find proctors assigned to >1 room at the same schedule session
  const conflicts = useMemo(() => {
    const conflictMap = new Map<string, string[]>(); // key: `${scheduleId}__${proctorName}`, value: roomCodes[]
    schedules.forEach((sch) => {
      rooms.forEach((rm) => {
        const key = `${sch.id}__${rm.id}`;
        const alloc = matrix[key];
        if (alloc && alloc.proctorName && alloc.proctorName !== '-') {
          const conflictKey = `${sch.id}__${alloc.proctorName.trim().toLowerCase()}`;
          const list = conflictMap.get(conflictKey) || [];
          list.push(rm.roomCode);
          conflictMap.set(conflictKey, list);
        }
      });
    });

    // Filter only those with multiple rooms
    const activeConflicts = new Set<string>();
    conflictMap.forEach((roomList, conflictKey) => {
      if (roomList.length > 1) {
        activeConflicts.add(conflictKey);
      }
    });

    return activeConflicts;
  }, [matrix, schedules, rooms]);

  const isCellConflicted = (scheduleId: string, proctorName?: string) => {
    if (!proctorName || proctorName === '-') return false;
    const conflictKey = `${scheduleId}__${proctorName.trim().toLowerCase()}`;
    return conflicts.has(conflictKey);
  };

  // Helper to get total duty count for each proctor across all schedules & rooms
  const proctorDutyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (Object.values(matrix) as ProctorMatrixAllocation[]).forEach((item) => {
      if (item && item.proctorName && item.proctorName !== '-') {
        const key = item.proctorName.trim();
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    return counts;
  }, [matrix]);

  // Actions
  const handleAssignProctor = (scheduleId: string, roomId: string, p: Proctor | null) => {
    const key = `${scheduleId}__${roomId}`;
    setMatrix((prev) => {
      const updated = { ...prev };
      if (!p) {
        delete updated[key];
      } else {
        updated[key] = {
          proctorId: p.id,
          proctorName: p.name,
          nip: p.nip || '-',
        };
      }
      return updated;
    });
    setActiveCell(null);
  };

  // 1. Auto-Plotting Pintar (Fair Round-Robin without time conflicts)
  const handleAutoPlotFair = () => {
    if (proctors.length === 0) {
      alert('Daftar pengawas belum tersedia. Silakan tambahkan pengawas terlebih dahulu.');
      return;
    }

    const updated: ProctorScheduleMatrix = {};
    let globalProctorOffset = 0;

    schedules.forEach((sch) => {
      // In a single session, each room gets a distinct proctor
      const usedProctorIndexes = new Set<number>();
      rooms.forEach((rm, rmIdx) => {
        let chosenIndex = (globalProctorOffset + rmIdx) % proctors.length;
        // Avoid duplicate in same session if enough proctors
        if (proctors.length >= rooms.length) {
          while (usedProctorIndexes.has(chosenIndex)) {
            chosenIndex = (chosenIndex + 1) % proctors.length;
          }
        }
        usedProctorIndexes.add(chosenIndex);

        const p = proctors[chosenIndex];
        if (p) {
          updated[`${sch.id}__${rm.id}`] = {
            proctorId: p.id,
            proctorName: p.name,
            nip: p.nip || '-',
          };
        }
      });
      // Shift offset for next session so proctors rotate across rooms
      globalProctorOffset = (globalProctorOffset + 1) % proctors.length;
    });

    setMatrix(updated);
  };

  // 2. Copy from permanent room proctors (Isi dari Master Ruangan)
  const handleCopyFromMasterRooms = () => {
    const updated: ProctorScheduleMatrix = {};
    schedules.forEach((sch) => {
      rooms.forEach((rm) => {
        if (rm.proctor1) {
          const matched = proctors.find((p) => p.name.trim().toLowerCase() === rm.proctor1.trim().toLowerCase());
          updated[`${sch.id}__${rm.id}`] = {
            proctorId: matched?.id,
            proctorName: rm.proctor1,
            nip: matched?.nip || '-',
          };
        }
      });
    });
    setMatrix(updated);
  };

  // 3. Clear all allocations
  const handleClearMatrix = () => {
    if (window.confirm('Kosongkan seluruh alokasi jadwal pengawas pada tabel?')) {
      setMatrix({});
    }
  };

  // 4. Export to CSV/Excel matching the exact columns of the image
  const handleExportCSV = () => {
    const headerRow1 = [
      'No',
      'Hari/ Tanggal',
      'Waktu',
      'Mata Pelajaran',
      ...displayedRooms.map((_, i) => (i === 0 ? 'Ruang' : '')),
    ];

    const headerRow2 = [
      '',
      '',
      '',
      '',
      ...displayedRooms.map((r, i) => `"${formatRoomCode(r, i)}"`),
    ];

    const rows: string[][] = [headerRow1, headerRow2];

    dayGroups.forEach((dg) => {
      dg.rows.forEach((row, rIdx) => {
        const noVal = rIdx === 0 ? String(dg.dayIndex) : '';
        const dayDateVal = rIdx === 0 ? `"${dg.dayName}, ${dg.date}"` : '';
        const timeVal = `"${row.time}"`;

        if (row.type === 'break') {
          rows.push([
            noVal,
            dayDateVal,
            timeVal,
            'Istirahat',
            ...displayedRooms.map(() => 'Istirahat'),
          ]);
        } else if (row.schedule) {
          const sch = row.schedule;
          const mapelVal = `"${sch.subject}"`;
          const roomVals = displayedRooms.map((rm) => {
            const alloc = matrix[`${sch.id}__${rm.id}`];
            return `"${alloc?.proctorName || ''}"`;
          });
          rows.push([noVal, dayDateVal, timeVal, mapelVal, ...roomVals]);
        }
      });
    });

    const csvContent = '\uFEFF' + rows.map((r) => r.join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Jadwal_Pengawas_${config.schoolName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats
  const totalSlots = schedules.length * displayedRooms.length;
  let filledSlots = 0;
  schedules.forEach((sch) => {
    displayedRooms.forEach((rm) => {
      if (matrix[`${sch.id}__${rm.id}`]?.proctorName) {
        filledSlots++;
      }
    });
  });
  const fillPercentage = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* CONTROL TOOLBAR (No Print) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-md">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Matriks Jadwal &amp; Alokasi Pengawas Ruang
                </h3>
                <p className="text-xs text-slate-500">
                  Format tabel matriks terpadu Hari/Tanggal, Sesi Waktu, Mata Pelajaran, dan Kolom Ruang (01 s.d. {String(displayedRooms.length).padStart(2, '0')}).
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {onOpenImportExcel && (
              <button
                type="button"
                onClick={onOpenImportExcel}
                title="Import daftar pengawas dari file Excel (.xlsx)"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-colors cursor-pointer border border-emerald-300"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Import Pengawas (.xlsx)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAutoPlotFair}
              title="Distribusikan semua pengawas secara merata dan otomatis tanpa jadwal ganda"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>⚡ Auto-Plotting Bebas Bentrok</span>
            </button>

            <button
              type="button"
              onClick={handleCopyFromMasterRooms}
              title="Isi jadwal dari nama pengawas tetap yang ada di master ruangan"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-200"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Isi dari Master Ruang</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              title="Unduh tabel jadwal dalam format CSV / Excel"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-200"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              title="Cetak jadwal resmi format PDF / Kertas"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak PDF</span>
            </button>

            <button
              type="button"
              onClick={handleClearMatrix}
              title="Kosongkan seluruh pengawas dari tabel"
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kosongkan</span>
            </button>
          </div>
        </div>

        {/* Room Navigation & Formatting Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          {/* Room Batch Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              Pilihan Ruang:
            </span>

            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRoomsPerPage(5);
                  setRoomBatchIndex(0);
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  roomsPerPage === 5 && roomBatchIndex === 0
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ruang 01–05 (Sesuai Gambar)
              </button>

              {totalRooms > 5 && (
                <button
                  type="button"
                  onClick={() => {
                    setRoomsPerPage(5);
                    setRoomBatchIndex(1);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                    roomsPerPage === 5 && roomBatchIndex === 1
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ruang 06–10
                </button>
              )}

              {totalRooms > 10 && (
                <button
                  type="button"
                  onClick={() => {
                    setRoomsPerPage(5);
                    setRoomBatchIndex(2);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                    roomsPerPage === 5 && roomBatchIndex === 2
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ruang 11–15
                </button>
              )}

              <button
                type="button"
                onClick={() => setRoomsPerPage('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  roomsPerPage === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Ruang ({totalRooms})
              </button>
            </div>

            {/* Pagination Controls if batch is active */}
            {roomsPerPage !== 'all' && totalBatches > 1 && (
              <div className="flex items-center gap-1 text-slate-500 text-[11px] ml-1">
                <button
                  type="button"
                  disabled={roomBatchIndex <= 0}
                  onClick={() => setRoomBatchIndex((p) => Math.max(0, p - 1))}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span>
                  Halaman {roomBatchIndex + 1} dari {totalBatches}
                </span>
                <button
                  type="button"
                  disabled={roomBatchIndex >= totalBatches - 1}
                  onClick={() => setRoomBatchIndex((p) => Math.min(totalBatches - 1, p + 1))}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Display & Styling Settings */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Nama:</span>
              <select
                value={nameDisplayMode}
                onChange={(e) => setNameDisplayMode(e.target.value as any)}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-medium cursor-pointer"
              >
                <option value="short">Nama Singkat (Ahmad F.)</option>
                <option value="full">Nama Lengkap + Gelar</option>
                <option value="first">Nama Depan Saja</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-600">
              <input
                type="checkbox"
                checked={showBreakRow}
                onChange={(e) => setShowBreakRow(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Tampilkan Baris Istirahat</span>
            </label>

            {/* Conflict Alert indicator */}
            {conflicts.size > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[11px] animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {conflicts.size} Jadwal Bentrok Terdeteksi!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                <Check className="w-3 h-3" />
                Jadwal Bebas Bentrok
              </span>
            )}
          </div>
        </div>

        {/* Informative Tip */}
        <div className="flex items-center justify-between text-[11px] bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              <strong>Petunjuk Cepat:</strong> Klik pada setiap kotak ruang pengawas untuk memilih/mengganti guru pengawas. Slot yang telah dialokasikan otomatis tersimpan.
            </span>
          </div>
          <span className="font-semibold text-slate-700 shrink-0">
            Terisi: {filledSlots} / {totalSlots} ({fillPercentage}%)
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* THE OFFICIAL MATRIX SCHEDULE TABLE (Printable & Screen View)            */}
      {/* ========================================================================= */}
      <div className="bg-white border-2 border-black rounded-lg p-4 sm:p-6 shadow-xs font-sans text-black print:border-black print:p-2 print:shadow-none">
        
        {/* Official Header Kop for Print / Document View */}
        <div className="text-center mb-3 pb-2 border-b-2 border-black">
          <div className="flex items-center justify-center gap-3">
            {config.logoUrl && (
              <img src={config.logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
            )}
            <div>
              <div className="text-[11px] uppercase font-bold tracking-wider text-black">
                {['MTs', 'MA', 'MI'].includes(config.schoolLevel)
                  ? 'KEMENTERIAN AGAMA REPUBLIK INDONESIA'
                  : 'DINAS PENDIDIKAN DAN KEBUDAYAAN'}
              </div>
              <div className="text-base sm:text-lg font-black uppercase text-black tracking-wide">
                {config.schoolName}
              </div>
              <div className="text-[10px] text-black">
                {config.address} • Telp: {config.phone} • Email: {config.email}
              </div>
            </div>
          </div>
          <div className="border-t border-black mt-2 pt-2">
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-black">
              JADWAL PENGAWAS RUANG {config.examTitle.toUpperCase()}
            </h2>
            <div className="text-xs font-bold text-black uppercase">
              TAHUN PELAJARAN {config.academicYear} • SEMESTER {config.semester.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Scrollable Container on Screen, Full Width on Print */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-black text-xs leading-tight">
            <thead>
              {/* Header Tier 1 */}
              <tr className="bg-slate-100 font-bold text-black border-b border-black text-center">
                <th
                  rowSpan={2}
                  className="border border-black px-2 py-2 w-[4%] font-bold align-middle"
                >
                  No
                </th>
                <th
                  rowSpan={2}
                  className="border border-black px-2 py-2 w-[16%] font-bold align-middle"
                >
                  Hari/ Tanggal
                </th>
                <th
                  rowSpan={2}
                  className="border border-black px-2 py-2 w-[14%] font-bold align-middle"
                >
                  Waktu
                </th>
                <th
                  rowSpan={2}
                  className="border border-black px-3 py-2 w-[22%] font-bold align-middle text-left"
                >
                  Mata Pelajaran
                </th>
                <th
                  colSpan={displayedRooms.length}
                  className="border border-black px-2 py-1 font-bold bg-slate-200 text-center"
                >
                  Ruang
                </th>
              </tr>

              {/* Header Tier 2: Room columns 01, 02, 03, 04, 05... */}
              <tr className="bg-slate-100 font-bold text-black border-b border-black text-center">
                {displayedRooms.map((room, rIdx) => {
                  const displayCode = formatRoomCode(room, rIdx);
                  return (
                    <th
                      key={room.id}
                      className="border border-black px-1.5 py-1 text-center font-mono font-bold relative bg-slate-50 min-w-[70px] sm:min-w-[85px]"
                    >
                      <div className="relative inline-block">
                        {/* Little green corner fold triangle like in user's Excel snapshot */}
                        <span className="absolute -top-1 -left-1.5 w-1.5 h-1.5 border-t-[3px] border-l-[3px] border-emerald-600 no-print" />
                        <span>{displayCode}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {dayGroups.map((dg) => {
                const totalDayRows = dg.rows.length;

                return dg.rows.map((rowItem, rowIndex) => {
                  const isFirstRowOfDay = rowIndex === 0;

                  return (
                    <tr
                      key={`${dg.dayName}-${dg.date}-${rowIndex}`}
                      className="border-b border-black hover:bg-slate-50/50"
                    >
                      {/* Column 1: No (Spanning whole day) */}
                      {isFirstRowOfDay && (
                        <td
                          rowSpan={totalDayRows}
                          className="border border-black text-center font-bold align-middle py-1 px-1 bg-white"
                        >
                          {dg.dayIndex}
                        </td>
                      )}

                      {/* Column 2: Hari/ Tanggal (Spanning whole day) */}
                      {isFirstRowOfDay && (
                        <td
                          rowSpan={totalDayRows}
                          className="border border-black text-center font-semibold align-middle py-1 px-2 bg-white leading-snug"
                        >
                          <div className="font-bold text-slate-900">{dg.dayName}</div>
                          <div className="text-[10px] text-slate-700">{dg.date}</div>
                        </td>
                      )}

                      {/* Column 3: Waktu */}
                      <td className="border border-black text-center font-mono py-1 px-1 align-middle text-[11px] whitespace-nowrap">
                        {rowItem.time}
                      </td>

                      {/* BREAK ROW (Istirahat) */}
                      {rowItem.type === 'break' ? (
                        <>
                          {/* Blank Mata Pelajaran column */}
                          <td className="border border-black text-center font-semibold py-1 px-2 italic text-slate-500 bg-slate-50">
                            {/* Empty or can show break */}
                          </td>

                          {/* Merged across all Ruang columns displaying "Istirahat" centered exactly like in user's image */}
                          <td
                            colSpan={displayedRooms.length}
                            className="border border-black text-center font-bold py-1 px-2 bg-slate-100 text-slate-800 tracking-wider uppercase text-[11px]"
                          >
                            Istirahat
                          </td>
                        </>
                      ) : (
                        /* SESSION ROW WITH PROCTOR ALLOCATION CELLS */
                        <>
                          {/* Column 4: Mata Pelajaran */}
                          <td className="border border-black text-left font-semibold py-1 px-2 align-middle text-slate-900">
                            {rowItem.subject}
                          </td>

                          {/* Columns 5+: Proctors per Room */}
                          {displayedRooms.map((room) => {
                            if (!rowItem.schedule) return null;
                            const cellKey = `${rowItem.schedule.id}__${room.id}`;
                            const alloc = matrix[cellKey];
                            const proctorName = alloc?.proctorName;
                            const hasConflict = isCellConflicted(rowItem.schedule.id, proctorName);

                            return (
                              <td
                                key={room.id}
                                onClick={() => {
                                  if (rowItem.schedule) {
                                    setActiveCell({
                                      scheduleId: rowItem.schedule.id,
                                      roomId: room.id,
                                      roomCode: formatRoomCode(room, 0),
                                      subject: rowItem.schedule.subject,
                                      dayName: dg.dayName,
                                      time: rowItem.time,
                                    });
                                    setProctorSearch('');
                                  }
                                }}
                                className={`border border-black text-center align-middle py-1 px-1 transition-colors cursor-pointer group relative ${
                                  hasConflict
                                    ? 'bg-rose-100 hover:bg-rose-200 text-rose-950 font-bold'
                                    : proctorName
                                    ? 'hover:bg-indigo-50/60 bg-white font-medium'
                                    : 'hover:bg-emerald-50/50 bg-slate-50/30'
                                }`}
                                title={
                                  hasConflict
                                    ? `⚠️ PERINGATAN: ${proctorName} bertugas di beberapa ruang pada waktu yang sama!`
                                    : proctorName
                                    ? `${proctorName} (Klik untuk ganti)`
                                    : 'Klik untuk memilih pengawas'
                                }
                              >
                                {proctorName ? (
                                  <div className="flex items-center justify-center gap-0.5">
                                    <span className="text-[10px] leading-tight block truncate">
                                      {formatProctorDisplayName(proctorName)}
                                    </span>
                                    {hasConflict && (
                                      <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0 inline ml-0.5" />
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300 text-[10px] group-hover:text-indigo-600 no-print">
                                    +
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </>
                      )}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>

        {/* Official Document Signatures (Kop & Tanda Tangan) */}
        <div className="pt-6 mt-4 border-t border-black flex justify-between items-start text-xs print:pt-4">
          <div className="text-center w-64">
            <div className="text-[11px] text-black">Mengetahui,</div>
            <div className="text-[11px] font-bold text-black uppercase">Kepala {config.schoolName}</div>
            <div className="h-16 flex items-center justify-center">
              {config.stampEnabled && config.stampUrl && (
                <img src={config.stampUrl} alt="Stempel" className="h-14 opacity-80 object-contain" />
              )}
            </div>
            <div className="font-bold underline text-black text-xs">
              {config.principalName}
            </div>
            <div className="text-[10px] text-black font-mono">
              NIP. {config.principalNip || '-'}
            </div>
          </div>

          <div className="text-center w-64">
            <div className="text-[11px] text-black">
              {config.issuePlace}, {config.issueDate}
            </div>
            <div className="text-[11px] font-bold text-black uppercase">Ketua Panitia Ujian</div>
            <div className="h-16"></div>
            <div className="font-bold underline text-black text-xs">
              {config.committeeHeadName}
            </div>
            <div className="text-[10px] text-black font-mono">
              NIP. {config.committeeHeadNip || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUICK ASSIGNMENT MODAL / POPOVER FOR CELL                                 */}
      {/* ========================================================================= */}
      {activeCell && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <div>
                  <h4 className="font-bold text-xs">Pilih Pengawas Ruang {activeCell.roomCode}</h4>
                  <p className="text-[10px] text-slate-400">
                    {activeCell.dayName} • {activeCell.time} • {activeCell.subject}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCell(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Search proctor */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau NIP guru..."
                  value={proctorSearch}
                  onChange={(e) => setProctorSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Proctor list */}
              <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-slate-100 pr-1">
                {/* Option to clear cell */}
                <button
                  type="button"
                  onClick={() => handleAssignProctor(activeCell.scheduleId, activeCell.roomId, null)}
                  className="w-full text-left p-2 rounded-lg hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5" />
                    Kosongkan Pengawas di Ruang Ini
                  </span>
                  <span className="text-[10px] font-normal text-slate-400">Hapus</span>
                </button>

                {proctors
                  .filter((p) => {
                    if (!proctorSearch.trim()) return true;
                    const q = proctorSearch.toLowerCase();
                    return p.name.toLowerCase().includes(q) || (p.nip && p.nip.includes(q)) || p.subject.toLowerCase().includes(q);
                  })
                  .map((p) => {
                    const currentAlloc = matrix[`${activeCell.scheduleId}__${activeCell.roomId}`];
                    const isSelected = currentAlloc?.proctorName === p.name;
                    const dutyCount = proctorDutyCounts.get(p.name.trim()) || 0;

                    // Check if this teacher is assigned in another room at this exact session
                    const isBusyInAnotherRoom = rooms.some((rm) => {
                      if (rm.id === activeCell.roomId) return false;
                      const a = matrix[`${activeCell.scheduleId}__${rm.id}`];
                      return a && a.proctorName?.trim().toLowerCase() === p.name.trim().toLowerCase();
                    });

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAssignProctor(activeCell.scheduleId, activeCell.roomId, p)}
                        className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border border-emerald-300 font-bold text-emerald-950'
                            : isBusyInAnotherRoom
                            ? 'bg-rose-50/70 hover:bg-rose-100 border border-rose-200 text-slate-900'
                            : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{p.name}</span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {p.subject || 'Guru Mapel'} {p.nip && p.nip !== '-' ? `• NIP. ${p.nip}` : ''}
                          </div>
                          {isBusyInAnotherRoom && (
                            <div className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Sedang bertugas di ruang lain pada jam ini!
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="inline-block px-1.5 py-0.5 bg-slate-200/80 rounded text-[10px] font-mono text-slate-700">
                            {dutyCount}x tugas
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveCell(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
