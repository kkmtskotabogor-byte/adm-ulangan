import React, { useState, useEffect } from 'react';
import { ActiveTab, AuthUser, ExamConfig, ExamRoom, ExamScheduleItem, Proctor, Student } from './types';
import { initialConfig, initialProctors, initialRooms, initialSchedule, initialStudents } from './data/initialData';
import { distributeCrossClass, distributeSequential, generateExamNumbers, distributeCrossLevelDoubleDesk } from './utils/distribution';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ConfigView } from './components/ConfigView';
import { StudentsView } from './components/StudentsView';
import { RoomsView } from './components/RoomsView';
import { ProctorsView } from './components/ProctorsView';
import { SeatingChartView } from './components/SeatingChartView';
import { ExamCardsView } from './components/ExamCardsView';
import { ExamDocumentsView } from './components/ExamDocumentsView';
import { LoginPortal } from './components/LoginPortal';
import { CloudSyncModal } from './components/CloudSyncModal';
import {
  subscribeToExamConfig,
  saveExamConfigToCloud,
  subscribeToRooms,
  saveRoomToCloud,
  deleteRoomFromCloud,
  syncRoomsToCloud,
  subscribeToStudents,
  saveStudentToCloud,
  deleteStudentFromCloud,
  deleteStudentsBatchFromCloud,
  clearAllStudentsFromCloud,
  syncStudentsToCloud,
  subscribeToProctors,
  saveProctorToCloud,
  deleteProctorFromCloud,
  syncProctorsToCloud,
  subscribeToSchedules,
  syncSchedulesToCloud,
  subscribeToAttendanceRecords,
  isCloudDatabaseInitialized,
} from './lib/firebase';
import { ProctorAttendanceRecord } from './types';

const STORAGE_KEYS = {
  CONFIG: 'sim_ujian_config_mts_v3',
  STUDENTS: 'sim_ujian_students_mts_v2',
  ROOMS: 'sim_ujian_rooms_mts_v2',
  PROCTORS: 'sim_ujian_proctors_mts_v2',
  SCHEDULES: 'sim_ujian_schedules_mts_v3',
  AUTH_USER: 'sim_ujian_auth_user_v2',
};

export default function App() {
  // Load auth state from localStorage
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Check URL parameters for direct print bypass or tab
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autoPrint') === 'true' || params.get('print') === 'true') {
        return {
          id: 'user-admin-print',
          username: 'admin',
          name: 'Administrator Panitia Ujian',
          role: 'admin',
          roleLabel: 'Panitia Ujian (Admin)',
          loginTime: '08:00',
        };
      }
    }
    return null;
  });

  // Load from localStorage or initial defaults
  const [config, setConfig] = useState<ExamConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
    return saved ? JSON.parse(saved) : initialConfig;
  });

  const [rooms, setRooms] = useState<ExamRoom[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ROOMS);
    return saved ? JSON.parse(saved) : initialRooms;
  });

  const [proctors, setProctors] = useState<Proctor[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROCTORS);
    return saved ? JSON.parse(saved) : initialProctors;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (saved) {
      return JSON.parse(saved);
    }
    // Pre-distribute initial students using Cross-Class so user gets an instant ready-to-test preview
    const { updatedStudents } = distributeCrossClass(initialStudents, initialRooms);
    return updatedStudents;
  });

  const [schedules, setSchedules] = useState<ExamScheduleItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    return saved ? JSON.parse(saved) : initialSchedule;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as ActiveTab;
      if (tab && ['dashboard', 'config', 'students', 'rooms', 'proctors', 'seating', 'cards', 'documents'].includes(tab)) {
        return tab;
      }
    }
    return 'dashboard';
  });
  const [selectedRoomForSeating, setSelectedRoomForSeating] = useState<string>(rooms[0]?.id || '');
  const [notification, setNotification] = useState<string | null>(null);

  // Cloud Firestore Real-time Synchronization States
  const [attendanceRecords, setAttendanceRecords] = useState<ProctorAttendanceRecord[]>([]);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState<boolean>(false);

  // Check URL query parameters for autoPrint when opened in a new tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autoPrint') === 'true' || params.get('print') === 'true') {
        const timer = setTimeout(() => {
          try {
            window.print();
          } catch (err) {
            console.warn('Auto print error:', err);
          }
        }, 900);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // 1. Initialize Cloud Firestore Database if empty & Subscribe to Real-Time Updates
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // Check if cloud database already has documents; if not, initialize automatically
    isCloudDatabaseInitialized()
      .then((isInitialized) => {
        if (!isInitialized) {
          saveExamConfigToCloud(config);
          syncRoomsToCloud(rooms);
          syncStudentsToCloud(students);
          syncProctorsToCloud(proctors);
          syncSchedulesToCloud(schedules);
        }
      })
      .catch((err) => {
        console.warn('Cloud database check note:', err);
      });

    try {
      // Real-time listener for Exam Identity Config
      unsubs.push(
        subscribeToExamConfig(
          (cloudConfig) => {
            if (cloudConfig) {
              setConfig(cloudConfig);
              setIsCloudConnected(true);
            }
          },
          () => setIsCloudConnected(false)
        )
      );

      // Real-time listener for Exam Rooms
      unsubs.push(
        subscribeToRooms(
          (cloudRooms) => {
            if (cloudRooms && cloudRooms.length > 0) {
              setRooms(cloudRooms);
              setIsCloudConnected(true);
            }
          },
          () => setIsCloudConnected(false)
        )
      );

      // Real-time listener for Students
      unsubs.push(
        subscribeToStudents(
          (cloudStudents) => {
            if (cloudStudents && cloudStudents.length > 0) {
              setStudents(cloudStudents);
              setIsCloudConnected(true);
            }
          },
          () => setIsCloudConnected(false)
        )
      );

      // Real-time listener for Proctors
      unsubs.push(
        subscribeToProctors(
          (cloudProctors) => {
            if (cloudProctors && cloudProctors.length > 0) {
              setProctors(cloudProctors);
              setIsCloudConnected(true);
            }
          },
          () => setIsCloudConnected(false)
        )
      );

      // Real-time listener for Exam Schedules
      unsubs.push(
        subscribeToSchedules(
          (cloudSchedules) => {
            if (cloudSchedules && cloudSchedules.length > 0) {
              setSchedules(cloudSchedules);
              setIsCloudConnected(true);
            }
          },
          () => setIsCloudConnected(false)
        )
      );

      // Real-time listener for Proctor Attendance & Digital Signatures
      unsubs.push(
        subscribeToAttendanceRecords(
          (records) => {
            if (records) {
              setAttendanceRecords(records);
            }
          },
          () => {}
        )
      );
    } catch (err) {
      console.warn('Firebase subscriptions setup note:', err);
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROCTORS, JSON.stringify(proctors));
  }, [proctors]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  }, [schedules]);

  // Auto-heal any same-tingkat desks from previous cached sessions
  useEffect(() => {
    if (rooms.length > 0 && (rooms[0].capacity || 0) >= 40) {
      let hasConflict = false;
      for (const r of rooms) {
        const roomS = students.filter((s) => s.roomId === r.id);
        const half = Math.floor((r.capacity || 40) / 2);
        for (let i = 1; i <= half; i++) {
          const sLeft = roomS.find((s) => s.seatNumber === i);
          const sRight = roomS.find((s) => s.seatNumber === half + i);
          if (sLeft && sRight) {
            const tL = sLeft.className.replace(/\s*[A-Z0-9].*$/i, '').trim() || sLeft.className;
            const tR = sRight.className.replace(/\s*[A-Z0-9].*$/i, '').trim() || sRight.className;
            if (tL === tR) {
              hasConflict = true;
              break;
            }
          }
        }
        if (hasConflict) break;
      }
      if (hasConflict) {
        const { updatedStudents } = distributeCrossLevelDoubleDesk(students, rooms, 'photo_order');
        setStudents(updatedStudents);
      }
    }
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // --- Cloud Synchronization Actions ---
  const handleForceSyncAllToCloud = async () => {
    setIsSyncing(true);
    try {
      await saveExamConfigToCloud(config);
      await syncRoomsToCloud(rooms);
      await syncStudentsToCloud(students);
      await syncProctorsToCloud(proctors);
      await syncSchedulesToCloud(schedules);
      setIsCloudConnected(true);
      showToast('Seluruh data berhasil disinkronkan ke Cloud Firestore.');
    } catch (err) {
      console.error('Failed to sync to cloud:', err);
      showToast('Gagal sinkronisasi: ' + (err instanceof Error ? err.message : String(err)));
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // --- Handlers ---
  const handleSaveConfig = (updated: ExamConfig) => {
    setConfig(updated);
    saveExamConfigToCloud(updated).catch((err) => console.warn('Cloud config save note:', err));
    showToast('Konfigurasi identitas ujian berhasil disimpan.');
  };

  const handleAddStudent = (newStudent: Omit<Student, 'id'>) => {
    const student: Student = {
      ...newStudent,
      id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setStudents((prev) => [...prev, student]);
    saveStudentToCloud(student).catch((err) => console.warn('Cloud student save note:', err));
    showToast(`Siswa "${student.name}" berhasil ditambahkan.`);
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
    saveStudentToCloud(updatedStudent).catch((err) => console.warn('Cloud student update note:', err));
    showToast(`Data siswa "${updatedStudent.name}" diperbarui.`);
  };

  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    deleteStudentFromCloud(id).catch((err) => console.warn('Cloud student delete note:', err));
    showToast('Siswa berhasil dihapus.');
  };

  const handleBulkDeleteStudents = (ids: string[]) => {
    if (ids.length === 0) return;
    const idsSet = new Set(ids);
    const updated = students.filter((s) => !idsSet.has(s.id));
    setStudents(updated);
    deleteStudentsBatchFromCloud(ids).catch((err) => console.warn('Cloud batch delete note:', err));
    showToast(`Berhasil menghapus ${ids.length} data peserta secara kolektif.`);
  };

  const handleClearAllStudents = () => {
    setStudents([]);
    clearAllStudentsFromCloud().catch((err) => console.warn('Cloud clear students note:', err));
    showToast('Seluruh data peserta ujian berhasil dikosongkan.');
  };

  const handleBulkImport = (newStudents: Omit<Student, 'id'>[]) => {
    const created: Student[] = newStudents.map((s, idx) => ({
      ...s,
      id: `std-import-${Date.now()}-${idx}`,
    }));
    const nextStudents = [...students, ...created];
    setStudents(nextStudents);
    syncStudentsToCloud(nextStudents).catch((err) => console.warn('Cloud bulk import note:', err));
    showToast(`Berhasil menambahkan ${created.length} siswa baru dari Excel.`);
  };

  const handleRegenerateNumbers = () => {
    const updated = generateExamNumbers(students, config.codePrefix || '25-04');
    setStudents(updated);
    syncStudentsToCloud(updated).catch((err) => console.warn('Cloud regenerate note:', err));
    showToast('Nomor peserta berhasil di-generate otomatis per kelas/rombel.');
  };

  const handleAddRoom = (newRoom: Omit<ExamRoom, 'id'>) => {
    const room: ExamRoom = {
      ...newRoom,
      id: `room-${Date.now()}`,
    };
    setRooms((prev) => [...prev, room]);
    saveRoomToCloud(room).catch((err) => console.warn('Cloud room save note:', err));
    showToast(`Ruang "${room.name}" berhasil ditambahkan.`);
  };

  const handleUpdateRoom = (updatedRoom: ExamRoom) => {
    setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));
    saveRoomToCloud(updatedRoom).catch((err) => console.warn('Cloud room update note:', err));
    showToast(`Data ${updatedRoom.name} diperbarui.`);
  };

  const handleDeleteRoom = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
    deleteRoomFromCloud(id).catch((err) => console.warn('Cloud room delete note:', err));
    // Clear assignments for students in deleted room
    setStudents((prev) => {
      const updated = prev.map((s) => (s.roomId === id ? { ...s, roomId: undefined, roomName: undefined, seatNumber: undefined } : s));
      syncStudentsToCloud(updated).catch(() => {});
      return updated;
    });
    showToast('Ruang berhasil dihapus dan peserta di dalamnya dikosongkan.');
  };

  // --- Proctor Handlers ---
  const handleSyncRoomsWithProctors = (updatedProctors: Proctor[]) => {
    setProctors(updatedProctors);
    syncProctorsToCloud(updatedProctors).catch((err) => console.warn('Cloud proctors sync note:', err));
    // Automatically update proctor in rooms
    setRooms((prevRooms) => {
      const nextRooms = prevRooms.map((room) => {
        const p1 = updatedProctors.find((p) => p.assignedRoomId === room.id);
        return {
          ...room,
          proctor1: p1 ? p1.name : room.proctor1,
          proctor2: undefined,
        };
      });
      syncRoomsToCloud(nextRooms).catch((err) => console.warn('Cloud rooms sync note:', err));
      return nextRooms;
    });
  };

  const handleAddProctor = (newProctor: Omit<Proctor, 'id'>) => {
    const proctor: Proctor = {
      ...newProctor,
      id: `prc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const updated = [...proctors, proctor];
    handleSyncRoomsWithProctors(updated);
    showToast(`Pengawas "${proctor.name}" berhasil ditambahkan.`);
  };

  const handleUpdateProctor = (updatedProctor: Proctor) => {
    const updated = proctors.map((p) => (p.id === updatedProctor.id ? updatedProctor : p));
    handleSyncRoomsWithProctors(updated);
    showToast(`Data pengawas "${updatedProctor.name}" diperbarui.`);
  };

  const handleDeleteProctor = (id: string) => {
    const updated = proctors.filter((p) => p.id !== id);
    deleteProctorFromCloud(id).catch((err) => console.warn('Cloud proctor delete note:', err));
    handleSyncRoomsWithProctors(updated);
    showToast('Pengawas berhasil dihapus.');
  };

  const handleBulkAddProctors = (newProctors: Omit<Proctor, 'id'>[], replaceExisting: boolean = false) => {
    const created: Proctor[] = newProctors.map((p, idx) => ({
      ...p,
      id: `prc-import-${Date.now()}-${idx}`,
    }));
    const updated = replaceExisting ? created : [...proctors, ...created];
    handleSyncRoomsWithProctors(updated);
    showToast(
      replaceExisting
        ? `Berhasil mengganti data dengan ${created.length} pengawas baru dari Excel.`
        : `Berhasil menambahkan ${created.length} pengawas baru dari Excel.`
    );
  };

  const handleResetProctors = () => {
    handleSyncRoomsWithProctors(initialProctors);
    showToast('Data pengawas berhasil di-reset ke data pengawas standar.');
  };

  // Distribution triggers
  const handleDistributeCross = () => {
    const { updatedStudents, unassignedStudents } = distributeCrossClass(students, rooms);
    setStudents(updatedStudents);
    syncStudentsToCloud(updatedStudents).catch((err) => console.warn('Cloud sync students note:', err));
    if (unassignedStudents.length > 0) {
      showToast(`Pembagian Sistem Silang selesai! Catatan: ${unassignedStudents.length} siswa belum dapat ruang karena kapasitas kurang.`);
    } else {
      showToast('Pembagian Sistem Silang berhasil! Semua siswa diselingi antar kelas di setiap ruang.');
    }
  };

  const handleDistributeSequential = () => {
    const { updatedStudents, unassignedStudents } = distributeSequential(students, rooms);
    setStudents(updatedStudents);
    syncStudentsToCloud(updatedStudents).catch((err) => console.warn('Cloud sync students note:', err));
    if (unassignedStudents.length > 0) {
      showToast(`Pembagian Berurutan selesai! Catatan: ${unassignedStudents.length} siswa belum dapat ruang.`);
    } else {
      showToast('Pembagian berurutan per rombel berhasil dialokasikan.');
    }
  };

  const handleDistributeCrossLevel = (pattern: 'photo_order' | 'sequential_desk' = 'photo_order') => {
    // If rooms currently have capacity 20, bump them up to 40 so that 40 students fit per room
    let currentRooms = rooms;
    if (rooms.length > 0 && (rooms[0].capacity || 0) < 40) {
      currentRooms = rooms.slice(0, 12).map((r, idx) => ({
        ...r,
        roomCode: `R.${String(idx + 1).padStart(2, '0')}`,
        name: `Ruang ${String(idx + 1).padStart(2, '0')}`,
        capacity: 40,
      }));
      setRooms(currentRooms);
      syncRoomsToCloud(currentRooms).catch(() => {});
    }
    const { updatedStudents, unassignedStudents } = distributeCrossLevelDoubleDesk(students, currentRooms, pattern);
    setStudents(updatedStudents);
    syncStudentsToCloud(updatedStudents).catch((err) => console.warn('Cloud sync students note:', err));
    if (unassignedStudents.length > 0) {
      showToast(`Plotting Silang Antar-Tingkat selesai! Catatan: ${unassignedStudents.length} siswa belum dapat ruang.`);
    } else {
      showToast('Plotting Silang Antar-Tingkat (1 Meja 2 Siswa Beda Tingkat - 0 Meja Se-Tingkat) berhasil!');
    }
  };

  const handleSetRoomsPreset = (presetCapacity: 20 | 40) => {
    if (presetCapacity === 40) {
      const updatedRooms: ExamRoom[] = rooms.slice(0, 12).map((r, idx) => ({
        ...r,
        roomCode: `R.${String(idx + 1).padStart(2, '0')}`,
        name: `Ruang ${String(idx + 1).padStart(2, '0')}`,
        capacity: 40,
      }));
      setRooms(updatedRooms);
      syncRoomsToCloud(updatedRooms).catch(() => {});
      const { updatedStudents } = distributeCrossLevelDoubleDesk(students, updatedRooms, 'photo_order');
      setStudents(updatedStudents);
      syncStudentsToCloud(updatedStudents).catch(() => {});
      showToast('Kapasitas semua ruang diset 40 siswa (12 Ruang) dengan Plotting Silang Antar-Tingkat Bebas Se-Tingkat!');
    } else {
      const updatedRooms: ExamRoom[] = Array.from({ length: 24 }, (_, idx) => {
        const existing = rooms[idx];
        return {
          id: existing?.id || `room-${idx + 1}`,
          roomCode: `R.${String(idx + 1).padStart(2, '0')}`,
          name: `Ruang ${String(idx + 1).padStart(2, '0')}`,
          location: existing?.location || `Gedung A - R.${String(idx + 1).padStart(2, '0')}`,
          capacity: 20,
          proctor1: existing?.proctor1 || 'Guru Pengawas',
        };
      });
      setRooms(updatedRooms);
      syncRoomsToCloud(updatedRooms).catch(() => {});
      const { updatedStudents } = distributeCrossClass(students, updatedRooms);
      setStudents(updatedStudents);
      syncStudentsToCloud(updatedStudents).catch(() => {});
      showToast('Kapasitas semua ruang diset 20 siswa (24 Ruang) dengan Plotting Silang Kelas!');
    }
  };

  const handleClearDistribution = () => {
    const cleared = students.map((s) => ({
      ...s,
      roomId: undefined,
      roomName: undefined,
      seatNumber: undefined,
    }));
    setStudents(cleared);
    syncStudentsToCloud(cleared).catch(() => {});
    showToast('Seluruh penempatan ruang dan nomor meja telah dikosongkan.');
  };

  // Swap Seats between two students
  const handleSwapSeats = (studentId1: string, studentId2: string) => {
    setStudents((prev) => {
      const s1 = prev.find((s) => s.id === studentId1);
      const s2 = prev.find((s) => s.id === studentId2);
      if (!s1 || !s2) return prev;

      const swapped = prev.map((s) => {
        if (s.id === studentId1) {
          return {
            ...s,
            roomId: s2.roomId,
            roomName: s2.roomName,
            seatNumber: s2.seatNumber,
          };
        }
        if (s.id === studentId2) {
          return {
            ...s,
            roomId: s1.roomId,
            roomName: s1.roomName,
            seatNumber: s1.seatNumber,
          };
        }
        return s;
      });
      syncStudentsToCloud(swapped).catch(() => {});
      return swapped;
    });

    showToast('Posisi tempat duduk kedua siswa berhasil ditukar.');
  };

  // Reset to initial full realistic dataset
  const handleResetData = () => {
    if (window.confirm('Apakah Anda yakin ingin memulihkan data MTs Manbaul Islam (463 siswa, 24 ruang)?')) {
      const { updatedStudents } = distributeCrossClass(initialStudents, initialRooms);
      setConfig(initialConfig);
      setRooms(initialRooms);
      setProctors(initialProctors);
      setStudents(updatedStudents);
      setSchedules(initialSchedule);
      localStorage.removeItem(STORAGE_KEYS.CONFIG);
      localStorage.removeItem(STORAGE_KEYS.STUDENTS);
      localStorage.removeItem(STORAGE_KEYS.ROOMS);
      localStorage.removeItem(STORAGE_KEYS.PROCTORS);
      localStorage.removeItem(STORAGE_KEYS.SCHEDULES);

      // Force push to cloud
      saveExamConfigToCloud(initialConfig).catch(() => {});
      syncRoomsToCloud(initialRooms).catch(() => {});
      syncStudentsToCloud(updatedStudents).catch(() => {});
      syncProctorsToCloud(initialProctors).catch(() => {});
      syncSchedulesToCloud(initialSchedule).catch(() => {});

      showToast('Data aplikasi berhasil dikembalikan ke data awal lengkap dan disinkronkan ke cloud.');
    }
  };

  const handleQuickPrint = () => {
    setActiveTab('cards');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    setNotification(`Selamat datang, ${user.name}! Anda masuk sebagai ${user.roleLabel}.`);
    if (user.role === 'proctor') {
      setActiveTab('proctors');
    } else if (user.role === 'student') {
      setActiveTab('cards');
    }
  };

  const handleLogout = () => {
    setAuthUser(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    setNotification('Anda telah berhasil keluar dari sesi.');
  };

  // If user is not logged in, render Portal Utama Login
  if (!authUser) {
    return (
      <>
        <LoginPortal
          config={config}
          proctors={proctors}
          students={students}
          onLogin={handleLogin}
          isCloudConnected={isCloudConnected}
        />
        {notification && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 no-print">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{notification}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Navigation Header */}
      <Header
        config={config}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetData={handleResetData}
        onQuickPrint={handleQuickPrint}
        authUser={authUser}
        onLogout={handleLogout}
        isCloudSynced={isCloudConnected}
        isSyncing={isSyncing}
        onOpenCloudSyncModal={() => setShowCloudSyncModal(true)}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 no-print">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{notification}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            config={config}
            students={students}
            rooms={rooms}
            setActiveTab={setActiveTab}
            onDistributeCross={handleDistributeCross}
            onDistributeSequential={handleDistributeSequential}
          />
        )}

        {activeTab === 'config' && (
          <ConfigView
            config={config}
            onSaveConfig={handleSaveConfig}
          />
        )}

        {activeTab === 'students' && (
          <StudentsView
            students={students}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onBulkDeleteStudents={handleBulkDeleteStudents}
            onBulkImport={handleBulkImport}
            onRegenerateNumbers={handleRegenerateNumbers}
            onClearAll={handleClearAllStudents}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomsView
            rooms={rooms}
            students={students}
            onAddRoom={handleAddRoom}
            onUpdateRoom={handleUpdateRoom}
            onDeleteRoom={handleDeleteRoom}
            onDistributeCross={handleDistributeCross}
            onDistributeCrossLevel={handleDistributeCrossLevel}
            onDistributeSequential={handleDistributeSequential}
            onClearDistribution={handleClearDistribution}
            onSetRoomsPreset={handleSetRoomsPreset}
            setActiveTab={setActiveTab}
            onSelectRoomForSeating={setSelectedRoomForSeating}
          />
        )}

        {activeTab === 'proctors' && (
          <ProctorsView
            config={config}
            proctors={proctors}
            rooms={rooms}
            schedules={schedules}
            onAddProctor={handleAddProctor}
            onUpdateProctor={handleUpdateProctor}
            onDeleteProctor={handleDeleteProctor}
            onBulkAddProctors={handleBulkAddProctors}
            onResetProctors={handleResetProctors}
            onSyncRoomsWithProctors={handleSyncRoomsWithProctors}
          />
        )}

        {activeTab === 'seating' && (
          <SeatingChartView
            config={config}
            rooms={rooms}
            students={students}
            selectedRoomId={selectedRoomForSeating || rooms[0]?.id || ''}
            onSelectRoom={setSelectedRoomForSeating}
            onSwapSeats={handleSwapSeats}
            onDistributeCrossLevel={handleDistributeCrossLevel}
          />
        )}

        {activeTab === 'cards' && (
          <ExamCardsView
            config={config}
            students={students}
            rooms={rooms}
            schedules={schedules}
            onUpdateSchedules={(updatedSchedules) => {
              setSchedules(updatedSchedules);
              syncSchedulesToCloud(updatedSchedules).catch(() => {});
            }}
            onUpdateConfig={handleSaveConfig}
          />
        )}

        {activeTab === 'documents' && (
          <ExamDocumentsView
            config={config}
            students={students}
            rooms={rooms}
            schedules={schedules}
          />
        )}
      </main>

      {/* Cloud Firestore Multi-Device Sync Modal */}
      <CloudSyncModal
        isOpen={showCloudSyncModal}
        onClose={() => setShowCloudSyncModal(false)}
        config={config}
        students={students}
        rooms={rooms}
        proctors={proctors}
        schedules={schedules}
        attendanceRecords={attendanceRecords}
        isConnected={isCloudConnected}
        isSyncing={isSyncing}
        onForceSyncAllToCloud={handleForceSyncAllToCloud}
      />

      {/* App Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {config.schoolName} — Sistem Informasi Manajemen Ujian Sekolah (STS, SAS &amp; US)
          </span>
          <span className="text-[11px] text-slate-400">
            Mendukung kurikulum Indonesia: Pembagian Sistem Silang &amp; Kartu Ujian Cetak A4
          </span>
        </div>
      </footer>
    </div>
  );
}
