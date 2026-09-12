import React from 'react';
import { ActiveTab, AuthUser, ExamConfig } from '../types';
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  DoorOpen, 
  Grid3X3, 
  IdCard, 
  FileText, 
  Printer, 
  RotateCcw, 
  ExternalLink, 
  UserCheck,
  LogOut,
  ShieldCheck,
  GraduationCap,
  Cloud,
  Radio,
  Calendar
} from 'lucide-react';

interface HeaderProps {
  config: ExamConfig;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onResetData: () => void;
  onQuickPrint: () => void;
  authUser?: AuthUser | null;
  onLogout?: () => void;
  isCloudSynced?: boolean;
  isSyncing?: boolean;
  onOpenCloudSyncModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  activeTab,
  setActiveTab,
  onResetData,
  onQuickPrint,
  authUser,
  onLogout,
  isCloudSynced = true,
  isSyncing = false,
  onOpenCloudSyncModal,
}) => {
  const examBadgeColors: Record<string, string> = {
    STS: 'bg-amber-50 text-amber-700 border-amber-200',
    SAS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    SAT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    US: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'config', label: 'Identitas & Ujian', icon: <Settings className="w-4 h-4" /> },
    { id: 'students', label: 'Data Peserta', icon: <Users className="w-4 h-4" /> },
    { id: 'schedules', label: 'Jadwal Ujian', icon: <Calendar className="w-4 h-4" /> },
    { id: 'rooms', label: 'Ruang & Plotting', icon: <DoorOpen className="w-4 h-4" /> },
    { id: 'proctors', label: 'Pengawas & Absen', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'seating', label: 'Denah Meja', icon: <Grid3X3 className="w-4 h-4" /> },
    { id: 'cards', label: 'Cetak Kartu', icon: <IdCard className="w-4 h-4" /> },
    { id: 'documents', label: 'Dokumen Ujian', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & App Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex flex-col items-center justify-center shrink-0 shadow-xs">
              <div className="w-5 h-1 bg-white rounded-full mb-1"></div>
              <div className="w-5 h-1 bg-white rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight leading-none text-base">
                  EXAM-SYNC
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${examBadgeColors[config.examType] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {config.examType}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-1">
                Sistem Manajemen Ujian
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs with Clean Minimalism Border-Bottom Active Indicator */}
          <nav className="hidden lg:flex items-center gap-6 h-full" aria-label="Tabs">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`h-full flex items-center gap-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                    isActive
                      ? 'text-indigo-600 border-indigo-600'
                      : 'text-slate-500 hover:text-slate-800 border-transparent'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Section: School / User Profile & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* User Profile & Role Badge */}
            {authUser ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 py-1 px-2.5 rounded-lg text-left">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0 text-xs font-bold ${
                  authUser.role === 'admin' 
                    ? 'bg-indigo-600' 
                    : authUser.role === 'proctor' 
                    ? 'bg-emerald-600' 
                    : 'bg-amber-600'
                }`}>
                  {authUser.role === 'admin' ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : authUser.role === 'proctor' ? (
                    <UserCheck className="w-4 h-4" />
                  ) : (
                    <GraduationCap className="w-4 h-4" />
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
                    {authUser.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium leading-none">
                    {authUser.roleLabel} {authUser.roomCode ? `• ${authUser.roomCode}` : authUser.className ? `• ${authUser.className}` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[200px]">
                  {config.schoolName}
                </p>
                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">
                  TP {config.academicYear} • Panitia
                </p>
              </div>
            )}

            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              {onOpenCloudSyncModal && (
                <button
                  type="button"
                  onClick={onOpenCloudSyncModal}
                  title="Database Cloud Real-Time Multi-Device Aktif"
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-xs"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="hidden md:inline font-mono text-[11px]">Realtime Cloud</span>
                </button>
              )}

              {typeof window !== 'undefined' && window.self !== window.top && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Buka aplikasi di tab baru browser (layar penuh untuk cetak lancar tanpa batasan iframe)"
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden md:inline">Tab Baru</span>
                </a>
              )}

              <button
                onClick={onResetData}
                title="Kembalikan ke data contoh lengkap"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onQuickPrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cetak</span>
              </button>

              {/* Logout button */}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Keluar ke Portal Utama (Ganti Akun/Peran)"
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="lg:hidden border-t border-slate-100 py-1 overflow-x-auto scrollbar-none flex items-center justify-between gap-4">
          <div className="flex gap-4">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`py-2 px-1 flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                    isActive
                      ? 'text-indigo-600 border-indigo-600'
                      : 'text-slate-500 hover:text-slate-800 border-transparent'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="py-1 px-2.5 my-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-md shrink-0 flex items-center gap-1"
            >
              <LogOut className="w-3 h-3 text-rose-600" />
              <span>Keluar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
