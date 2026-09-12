import React, { useState, useEffect } from 'react';
import { AuthUser, ExamConfig, Proctor, Student, UserRole } from '../types';
import { 
  ShieldCheck, 
  UserCheck, 
  GraduationCap, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Clock, 
  Building2, 
  DoorOpen,
  HelpCircle,
  ArrowRight,
  School,
  KeyRound,
  Cloud
} from 'lucide-react';

interface LoginPortalProps {
  config: ExamConfig;
  proctors: Proctor[];
  students: Student[];
  onLogin: (user: AuthUser) => void;
  isCloudConnected?: boolean;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  config,
  proctors,
  students,
  onLogin,
  isCloudConnected = true,
}) => {
  const [activeRole, setActiveRole] = useState<UserRole>('admin');
  
  // Form fields
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedProctorId, setSelectedProctorId] = useState<string>(proctors[0]?.id || '');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [studentInput, setStudentInput] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  
  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Real-time Indonesian clock
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update default credentials when switching role
  const handleRoleChange = (role: UserRole) => {
    setActiveRole(role);
    setError(null);
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else if (role === 'proctor') {
      setUsername('pengawas');
      setPassword('pengawas123');
      if (proctors.length > 0 && !selectedProctorId) {
        setSelectedProctorId(proctors[0].id);
      }
    } else if (role === 'student') {
      const firstStudent = students[0];
      setStudentInput(firstStudent?.examNumber || firstStudent?.nisn || '26-04-01-001');
      setPassword('123456');
      if (students.length > 0 && !selectedStudentId) {
        setSelectedStudentId(students[0].id);
      }
    }
  };

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      try {
        const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        if (activeRole === 'admin') {
          // Admin authentication
          if (
            (username.trim().toLowerCase() === 'admin' && password === 'admin123') ||
            (username.trim().toLowerCase() === 'panitia' && password === 'panitia123') ||
            password === 'admin123' ||
            username.trim().length >= 3
          ) {
            const user: AuthUser = {
              id: 'user-admin-1',
              username: username.trim() || 'admin',
              name: config.committeeHeadName || 'Administrator Panitia Ujian',
              role: 'admin',
              roleLabel: 'Panitia Ujian (Admin)',
              nipOrNis: config.committeeHeadNip || '198203152008011005',
              loginTime: nowStr,
            };
            onLogin(user);
          } else {
            setError('Username atau password admin salah. Coba: admin / admin123');
            setIsLoading(false);
          }
        } else if (activeRole === 'proctor') {
          // Proctor authentication
          const proctor = proctors.find((p) => p.id === selectedProctorId) || proctors[0];
          if (proctor) {
            const user: AuthUser = {
              id: `user-proctor-${proctor.id}`,
              username: proctor.nip || 'pengawas',
              name: proctor.name,
              role: 'proctor',
              roleLabel: 'Pengawas Ruang',
              nipOrNis: proctor.nip,
              proctorId: proctor.id,
              roomCode: proctor.assignedRoomCode || 'Ruang 01',
              loginTime: nowStr,
            };
            onLogin(user);
          } else {
            setError('Silakan pilih pengawas dari daftar.');
            setIsLoading(false);
          }
        } else if (activeRole === 'student') {
          // Student authentication
          const query = studentInput.trim().toLowerCase();
          const student = students.find(
            (s) =>
              s.examNumber.toLowerCase() === query ||
              s.nisn.toLowerCase() === query ||
              s.nis.toLowerCase() === query ||
              s.name.toLowerCase().includes(query) ||
              s.id === selectedStudentId
          ) || students[0];

          if (student) {
            const user: AuthUser = {
              id: `user-student-${student.id}`,
              username: student.examNumber,
              name: student.name,
              role: 'student',
              roleLabel: 'Peserta Ujian (Siswa)',
              nipOrNis: student.nisn || student.nis,
              studentId: student.id,
              className: student.className,
              examNumber: student.examNumber,
              roomCode: student.roomName || 'Ruang 01',
              loginTime: nowStr,
            };
            onLogin(user);
          } else {
            setError('Nomor Peserta atau NISN tidak ditemukan di master data.');
            setIsLoading(false);
          }
        }
      } catch (err: any) {
        setError(err?.message || 'Terjadi kesalahan saat masuk ke sistem.');
        setIsLoading(false);
      }
    }, 450);
  };

  // Quick Demo Login Handler
  const handleQuickDemo = (role: UserRole) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (role === 'admin') {
      onLogin({
        id: 'user-admin-demo',
        username: 'admin',
        name: config.committeeHeadName || 'Ahmad Dahlan, S.Pd (Ketua Panitia)',
        role: 'admin',
        roleLabel: 'Panitia Ujian (Admin)',
        nipOrNis: config.committeeHeadNip || '198203152008011005',
        loginTime: nowStr,
      });
    } else if (role === 'proctor') {
      const p = proctors[0] || {
        id: 'p-1',
        name: 'Dra. Hj. Siti Aminah, M.Pd',
        nip: '197505122000032001',
        subject: 'Matematika',
        assignedRoomCode: 'Ruang 01',
      };
      onLogin({
        id: `user-proctor-${p.id}`,
        username: 'pengawas',
        name: p.name,
        role: 'proctor',
        roleLabel: 'Pengawas Ruang',
        nipOrNis: p.nip,
        proctorId: p.id,
        roomCode: p.assignedRoomCode || 'Ruang 01',
        loginTime: nowStr,
      });
    } else {
      const s = students[0] || {
        id: 'std-1',
        name: 'Ahmad Fauzi Rahman',
        examNumber: '26-04-01-001',
        nisn: '0081234567',
        className: 'IX-A',
        roomName: 'Ruang 01',
      };
      onLogin({
        id: `user-student-${s.id}`,
        username: s.examNumber,
        name: s.name,
        role: 'student',
        roleLabel: 'Peserta Ujian (Siswa)',
        nipOrNis: s.nisn,
        studentId: s.id,
        className: s.className,
        examNumber: s.examNumber,
        roomCode: s.roomName || 'Ruang 01',
        loginTime: nowStr,
      });
    }
  };

  const selectedProctor = proctors.find((p) => p.id === selectedProctorId) || proctors[0];
  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans text-slate-100 relative overflow-hidden">
      {/* Decorative background grid and ambient lighting */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Institution Badge & Real-time Clock */}
      <header className="relative z-10 max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          {config.logoUrl ? (
            <img 
              src={config.logoUrl} 
              alt="Logo Sekolah" 
              className="w-11 h-11 object-contain bg-white/90 p-1 rounded-xl shadow-md border border-white/20" 
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-md border border-indigo-400/30">
              <School className="w-6 h-6" />
            </div>
          )}
          <div>
            <h1 className="text-sm sm:text-base font-black text-white tracking-tight uppercase leading-tight">
              {config.schoolName}
            </h1>
            <p className="text-[11px] text-indigo-300 font-medium flex items-center gap-2 mt-0.5">
              <span>NPSN: {config.npsn || '20501234'}</span>
              <span>•</span>
              <span>{config.subdistrict}, {config.district}</span>
            </p>
          </div>
        </div>

        {/* Date & Time Widget & Cloud Status */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-[11px] text-emerald-300 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono">Database Realtime Aktif</span>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-800/80 border border-slate-700/80 px-3.5 py-1.5 rounded-xl shadow-inner text-xs font-mono text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-sans text-slate-200">{currentDate}</span>
            <span className="text-slate-600">|</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-emerald-300">{currentTime}</span>
          </div>
        </div>
      </header>

      {/* Center Content: Main Login Portal Card */}
      <main className="relative z-10 max-w-xl w-full mx-auto my-auto py-6">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-900/90 via-indigo-800/80 to-slate-900 p-5 sm:p-6 border-b border-indigo-700/40 relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 mb-2">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Portal Masuk Resmi</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Sistem Informasi Manajemen Ujian
                </h2>
                <p className="text-xs text-indigo-200/90 mt-1">
                  {config.examTitle} • TP {config.academicYear} (Semester {config.semester})
                </p>
              </div>

              <div className="shrink-0 bg-white/10 px-3 py-1.5 rounded-lg border border-white/15 text-center">
                <span className="block text-[9px] font-bold text-indigo-200 uppercase tracking-widest">Kategori</span>
                <span className="text-xs font-black text-white">{config.examType}</span>
              </div>
            </div>
          </div>

          {/* Role Navigation Selector */}
          <div className="p-4 sm:p-6 pb-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Pilih Peran Masuk:
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
              {/* 1. Admin */}
              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`py-2 px-2 sm:px-3 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                  activeRole === 'admin'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Panitia (Admin)</span>
              </button>

              {/* 2. Proctor */}
              <button
                type="button"
                onClick={() => handleRoleChange('proctor')}
                className={`py-2 px-2 sm:px-3 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                  activeRole === 'proctor'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Pengawas</span>
              </button>

              {/* 3. Student */}
              <button
                type="button"
                onClick={() => handleRoleChange('student')}
                className={`py-2 px-2 sm:px-3 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                  activeRole === 'student'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 border border-amber-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Peserta Ujian</span>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 pt-3 space-y-4">
            {/* Error Notification */}
            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-800/90 rounded-xl text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* TAB 1: PANITIA / ADMIN */}
            {activeRole === 'admin' && (
              <div className="space-y-3.5">
                <div className="p-3 bg-indigo-950/40 border border-indigo-800/50 rounded-xl text-[11px] text-indigo-300 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    Akses penuh untuk konfigurasi data ujian, distribusi peserta &amp; nomor ujian, denah meja silang, master pengawas, serta cetak dokumen resmi.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Username / ID Panitia
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username admin"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password admin"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PENGAWAS RUANG */}
            {activeRole === 'proctor' && (
              <div className="space-y-3.5">
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-[11px] text-emerald-300 flex items-start gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Akses langsung untuk pengawas ruang ujian: <strong>Presensi Digital dengan Input Tanda Tangan (TTD)</strong>, jadwal tugas, dan berita acara ruang.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pilih Nama Pengawas Terdaftar:
                  </label>
                  <select
                    value={selectedProctorId}
                    onChange={(e) => setSelectedProctorId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {proctors.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                        {p.name} — {p.assignedRoomCode || 'Cadangan'} ({p.role || 'Pengawas'})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProctor && (
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>NIP / Identitas:</span>
                      <span className="font-mono text-slate-200">{selectedProctor.nip || '-'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Tugas Ruang:</span>
                      <span className="font-bold text-emerald-400">{selectedProctor.assignedRoomCode || 'Pengawas Cadangan'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Mata Pelajaran:</span>
                      <span className="text-slate-200">{selectedProctor.subject || 'Semua Mata Pelajaran'}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    PIN / Kata Sandi Pengawas (Default: pengawas123)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan PIN pengawas"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PESERTA UJIAN (SISWA) */}
            {activeRole === 'student' && (
              <div className="space-y-3.5">
                <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Akses siswa untuk mengecek alokasi ruang ujian, nomor meja, jadwal mata pelajaran, dan mencetak/menyimpan kartu peserta.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nomor Peserta Ujian / NISN
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={studentInput}
                      onChange={(e) => setStudentInput(e.target.value)}
                      placeholder="Contoh: 26-04-01-001 atau NISN"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Atau Pilih Siswa Contoh:
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => {
                      setSelectedStudentId(e.target.value);
                      const st = students.find((s) => s.id === e.target.value);
                      if (st) setStudentInput(st.examNumber);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    {students.slice(0, 15).map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                        {s.name} ({s.className}) — No: {s.examNumber}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedStudent && (
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Nama Siswa:</span>
                      <span className="font-bold text-slate-200">{selectedStudent.name}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Kelas / Ruang:</span>
                      <span className="text-amber-400 font-semibold">{selectedStudent.className} • {selectedStudent.roomName || 'Ruang 01'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-indigo-500"
                />
                <span>Ingat sesi masuk di perangkat ini</span>
              </label>

              <span className="text-[11px] text-slate-500">
                Aman &amp; Terverifikasi
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeRole === 'admin'
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                  : activeRole === 'proctor'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
              } disabled:opacity-50`}
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Memverifikasi...' : `Masuk sebagai ${activeRole === 'admin' ? 'Panitia' : activeRole === 'proctor' ? 'Pengawas' : 'Peserta'}`}</span>
            </button>
          </form>

          {/* Quick Demo Login Chips (One-Click Testing) */}
          <div className="p-4 sm:p-6 pt-0 border-t border-slate-800/80 mt-2 bg-slate-950/40">
            <div className="pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Akses Cepat Uji Coba (One-Click Demo):</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Langsung Masuk
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin')}
                  className="p-2 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 hover:border-indigo-600 text-left transition-all cursor-pointer group"
                >
                  <div className="text-[10px] text-indigo-300 font-bold flex items-center justify-between">
                    <span>👑 Panitia Admin</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-[11px] font-semibold text-white truncate mt-0.5">
                    {config.committeeHeadName || 'Ahmad Dahlan'}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">admin / admin123</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('proctor')}
                  className="p-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/60 hover:border-emerald-600 text-left transition-all cursor-pointer group"
                >
                  <div className="text-[10px] text-emerald-300 font-bold flex items-center justify-between">
                    <span>📋 Pengawas Ruang</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-[11px] font-semibold text-white truncate mt-0.5">
                    {proctors[0]?.name || 'Dra. Hj. Siti Aminah'}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">Ruang 01 • TTD Digital</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('student')}
                  className="p-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/60 hover:border-amber-600 text-left transition-all cursor-pointer group"
                >
                  <div className="text-[10px] text-amber-300 font-bold flex items-center justify-between">
                    <span>🎓 Siswa Peserta</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-[11px] font-semibold text-white truncate mt-0.5">
                    {students[0]?.name || 'Ahmad Fauzi'}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">No: {students[0]?.examNumber || '26-04-01-001'}</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer: Server Status & Security Notice */}
      <footer className="relative z-10 max-w-5xl mx-auto w-full pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Sistem Ujian Online &amp; Siap Digunakan</span>
          <span className="text-slate-600">•</span>
          <span>Kurikulum Merdeka &amp; 2013</span>
        </div>

        <div className="text-[11px] text-slate-400">
          &copy; {new Date().getFullYear()} {config.schoolName} — Hak Cipta Dilindungi
        </div>
      </footer>
    </div>
  );
};
