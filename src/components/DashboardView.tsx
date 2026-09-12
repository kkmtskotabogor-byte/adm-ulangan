import React from 'react';
import { ActiveTab, ExamConfig, ExamRoom, ExamScheduleItem, Student } from '../types';
import { 
  Users, 
  DoorOpen, 
  IdCard, 
  CheckCircle2, 
  AlertTriangle, 
  Shuffle, 
  ArrowRight, 
  Printer, 
  Calendar,
  Layers,
  FileCheck2,
  UserCheck
} from 'lucide-react';

interface DashboardViewProps {
  config: ExamConfig;
  students: Student[];
  rooms: ExamRoom[];
  schedules?: ExamScheduleItem[];
  setActiveTab: (tab: ActiveTab) => void;
  onDistributeCross: () => void;
  onDistributeSequential: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  config,
  students,
  rooms,
  schedules = [],
  setActiveTab,
  onDistributeCross,
  onDistributeSequential,
}) => {
  const totalStudents = students.length;
  const assignedStudents = students.filter((s) => s.roomId && s.seatNumber);
  const unassignedStudents = totalStudents - assignedStudents.length;
  const totalCapacity = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);

  // Group by class
  const classBreakdown = students.reduce((acc, s) => {
    acc[s.className] = (acc[s.className] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Welcome & Exam Identity Hero Card - Clean Minimalism */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200/60">
                Status: Berjalan
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-200/60">
                {config.examType} • Semester {config.semester}
              </span>
              <span className="text-xs text-slate-400">
                Tahun Ajaran {config.academicYear}
              </span>
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {config.examTitle}
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              {config.schoolName} — Platform terintegrasi pengaturan peserta ujian, otomatisasi pembagian sistem silang antar rombel, visualisasi denah bangku, serta pencetakan kartu ujian A4 &amp; dokumen presensi.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab('cards')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <IdCard className="w-4 h-4" />
              <span>Cetak Kartu Ujian</span>
            </button>
            <button
              onClick={() => setActiveTab('proctors')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-xs transition-colors"
            >
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Pengawas &amp; Absen</span>
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-xs transition-colors"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Dokumen Ujian</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid - Clean Minimalism */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Siswa */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Peserta</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">{totalStudents}</span>
            <span className="text-xs text-slate-400">Siswa aktif</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{Object.keys(classBreakdown).length} Rombongan Belajar</span>
            <button 
              onClick={() => setActiveTab('students')}
              className="text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1"
            >
              Kelola <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Total Ruangan */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ruang Ujian</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-100">
              <DoorOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">{rooms.length}</span>
            <span className="text-xs text-slate-400">Ruang tersedia</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Kapasitas: {totalCapacity} bangku</span>
            <button 
              onClick={() => setActiveTab('rooms')}
              className="text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1"
            >
              Atur Ruang <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Status Distribusi */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status Plotting</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              unassignedStudents === 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
            }`}>
              {unassignedStudents === 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">{assignedStudents.length}</span>
            <span className="text-xs text-slate-400">/ {totalStudents} terplotting</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            {unassignedStudents === 0 ? (
              <span className="text-emerald-700 font-semibold">100% Seluruh Terbagi</span>
            ) : (
              <span className="text-amber-700 font-semibold">{unassignedStudents} belum dapat bangku</span>
            )}
            <button 
              onClick={() => setActiveTab('seating')}
              className="text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1"
            >
              Denah <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Kartu Ujian Siap Cetak */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Kartu Ujian</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-100">
              <IdCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">{assignedStudents.length}</span>
            <span className="text-xs text-slate-400">Siap cetak</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Format A4 (4 kartu/lbr)</span>
            <button 
              onClick={() => setActiveTab('cards')}
              className="text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1"
            >
              Buka Kartu <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Distribution & Workflow Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Distribution Wizard */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-indigo-600" />
                <span>Distribusi &amp; Pembagian Peserta Ujian</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bagi peserta ke dalam {rooms.length} ruang ujian dengan 1 klik sesuai protokol ujian resmi.
              </p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-md border border-slate-200/60">
              Kapasitas: {totalCapacity} kursi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Cross Class Method */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/60 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded">
                    Sistem Silang Resmi
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Sistem Silang Antar Kelas</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Menyilangkan peserta ujian antar tingkatan/kelas di setiap ruangan (contoh: Meja ganjil Kelas 7A, Meja genap Kelas 8A). Menjamin integritas dan ketertiban ruang.
                </p>
              </div>
              <button
                onClick={onDistributeCross}
                className="mt-4 w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Jalankan Sistem Silang</span>
              </button>
            </div>

            {/* Sequential Method */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded">
                  Metode Urut
                </span>
                <h4 className="text-sm font-bold text-slate-900">Sistem Berurutan per Rombel</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mengisi ruangan berurutan berdasarkan rombongan belajar / kelas dan nomor urut siswa dari Ruang 01 hingga ruang terakhir.
                </p>
              </div>
              <button
                onClick={onDistributeSequential}
                className="mt-4 w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Jalankan Berurutan</span>
              </button>
            </div>
          </div>

          {/* Quick Rooms summary status */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Keterisian Tiap Ruang Ujian
              </h4>
              <span className="text-[11px] text-slate-400">{rooms.length} Ruang Aktif</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {rooms.map((room) => {
                const count = students.filter((s) => s.roomId === room.id).length;
                const percent = Math.min(100, Math.round((count / (room.capacity || 20)) * 100));
                return (
                  <div key={room.id} className="p-3 rounded-lg border border-slate-200 bg-white text-center shadow-xs">
                    <div className="text-xs font-bold text-slate-800">{room.name}</div>
                    <div className="text-sm font-bold text-indigo-600 mt-1">
                      {count} <span className="text-[10px] font-normal text-slate-400">/ {room.capacity}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1 mt-2 overflow-hidden">
                      <div 
                        className={`h-1 rounded-full ${percent >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Workflow Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900">Alur Kerja Panitia Ujian</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Panduan langkah dari persiapan awal hingga pencetakan dokumen.
            </p>
          </div>

          <ol className="space-y-3.5 text-xs pt-1">
            <li className="flex gap-3 items-start">
              <span className="flex-none w-5 h-5 rounded bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px] border border-slate-200">
                1
              </span>
              <div>
                <div className="font-semibold text-slate-800">Identitas &amp; Jenis Ujian</div>
                <p className="text-slate-500 text-[11px]">Pilih STS / SAS / SAT / US, atur kop surat sekolah &amp; nama kepala sekolah.</p>
              </div>
            </li>

            <li className="flex gap-3 items-start">
              <span className="flex-none w-5 h-5 rounded bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px] border border-slate-200">
                2
              </span>
              <div>
                <div className="font-semibold text-slate-800">Data Peserta &amp; Nomor Peserta</div>
                <p className="text-slate-500 text-[11px]">Periksa peserta, import Excel jika ada, generate nomor peserta otomatis.</p>
              </div>
            </li>

            <li className="flex gap-3 items-start">
              <span className="flex-none w-5 h-5 rounded bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px] border border-slate-200">
                3
              </span>
              <div>
                <div className="font-semibold text-slate-800">Pembagian Ruang (Sistem Silang)</div>
                <p className="text-slate-500 text-[11px]">Jalankan pembagian otomatis dengan metode silang antar kelas.</p>
              </div>
            </li>

            <li className="flex gap-3 items-start">
              <span className="flex-none w-5 h-5 rounded bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px] border border-slate-200">
                4
              </span>
              <div>
                <div className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>Jadwal Ulangan &amp; Import Template</span>
                  <button 
                    onClick={() => setActiveTab('schedules')}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    Atur Jadwal &rarr;
                  </button>
                </div>
                <p className="text-slate-500 text-[11px]">
                  {schedules.length > 0
                    ? `${schedules.length} sesi terdaftar (menjadi rujukan Kartu & Pengawas).`
                    : 'Upload jadwal atau import CSV/Excel template.'}
                </p>
              </div>
            </li>

            <li className="flex gap-3 items-start">
              <span className="flex-none w-5 h-5 rounded bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px] border border-slate-200">
                5
              </span>
              <div>
                <div className="font-semibold text-slate-800">Review Denah Tempat Duduk</div>
                <p className="text-slate-500 text-[11px]">Tinjau susunan meja peserta dan posisi meja pengawas di tiap ruang.</p>
              </div>
            </li>

            <li className="flex gap-3 items-start">
              <span className="flex-none w-5 h-5 rounded bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-[11px] border border-indigo-200">
                6
              </span>
              <div>
                <div className="font-semibold text-indigo-900">Cetak Kartu Ujian Siswa</div>
                <p className="text-slate-500 text-[11px]">Cetak kartu ujian A4 (4 kartu per lembar) ber-barcode resmi.</p>
              </div>
            </li>

            <li className="flex gap-3 items-start">
              <span className="flex-none w-5 h-5 rounded bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px] border border-slate-200">
                7
              </span>
              <div>
                <div className="font-semibold text-slate-800">Cetak Dokumen Administrasi</div>
                <p className="text-slate-500 text-[11px]">Daftar hadir (presensi), stiker meja, berita acara &amp; tempelan pintu.</p>
              </div>
            </li>
          </ol>

          <div className="pt-2">
            <button
              onClick={() => setActiveTab('cards')}
              className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Buka Kartu Ujian Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
