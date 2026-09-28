import React, { useState, useMemo } from 'react';
import { ActiveTab, ExamRoom, Student } from '../types';
import { 
  DoorOpen, 
  Plus, 
  Shuffle, 
  Layers, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Grid3X3, 
  X, 
  UserCheck,
  Building,
  Users,
  UserPlus,
  UserMinus,
  ArrowLeftRight,
  Search,
  Filter,
  ArrowRight,
  CheckSquare,
  Square,
  LogOut
} from 'lucide-react';

interface RoomsViewProps {
  rooms: ExamRoom[];
  students: Student[];
  onAddRoom: (room: Omit<ExamRoom, 'id'>) => void;
  onUpdateRoom: (room: ExamRoom) => void;
  onDeleteRoom: (id: string) => void;
  onDistributeCross: () => void;
  onDistributeCrossLevel?: () => void;
  onDistributeSequential: () => void;
  onClearDistribution: () => void;
  onSetRoomsPreset?: (presetCapacity: 20 | 40) => void;
  setActiveTab: (tab: ActiveTab) => void;
  onSelectRoomForSeating: (roomId: string) => void;
  onAssignStudentsToRoom?: (studentIds: string[], roomId: string) => void;
  onUnassignStudentsFromRoom?: (studentIds: string[]) => void;
  onTransferStudentRoom?: (studentId: string, targetRoomId: string) => void;
  onSwapStudentsRooms?: (studentId1: string, studentId2: string) => void;
}

export const RoomsView: React.FC<RoomsViewProps> = ({
  rooms,
  students,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  onDistributeCross,
  onDistributeCrossLevel,
  onDistributeSequential,
  onClearDistribution,
  onSetRoomsPreset,
  setActiveTab,
  onSelectRoomForSeating,
  onAssignStudentsToRoom,
  onUnassignStudentsFromRoom,
  onTransferStudentRoom,
  onSwapStudentsRooms,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ExamRoom | null>(null);

  // Modal Kelola Peserta Ruangan
  const [managingRoom, setManagingRoom] = useState<ExamRoom | null>(null);
  const [managingTab, setManagingTab] = useState<'list' | 'add' | 'swap'>('list');
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalFilterClass, setModalFilterClass] = useState<string>('ALL');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [addModeSource, setAddModeSource] = useState<'unassigned' | 'all'>('unassigned');

  // Modal Tukar Peserta Antar Ruang Global
  const [showGlobalSwapModal, setShowGlobalSwapModal] = useState(false);
  const [swapRoomAId, setSwapRoomAId] = useState<string>('');
  const [swapStudentAId, setSwapStudentAId] = useState<string>('');
  const [swapRoomBId, setSwapRoomBId] = useState<string>('');
  const [swapStudentBId, setSwapStudentBId] = useState<string>('');

  // Transfer state inside room modal
  const [transferTargetRoomId, setTransferTargetRoomId] = useState<string>('');
  const [roomSwapStudentInRoom, setRoomSwapStudentInRoom] = useState<string>('');
  const [roomSwapTargetRoom, setRoomSwapTargetRoom] = useState<string>('');
  const [roomSwapStudentTarget, setRoomSwapStudentTarget] = useState<string>('');

  // Classes list for filters
  const allClasses = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.className))).sort();
  }, [students]);

  const [newRoom, setNewRoom] = useState({
    roomCode: `R.${String(rooms.length + 1).padStart(2, '0')}`,
    name: `Ruang ${String(rooms.length + 1).padStart(2, '0')}`,
    location: 'Gedung A',
    capacity: 20,
    proctor1: '',
  });

  const totalCapacity = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
  const totalAssigned = students.filter((s) => s.roomId).length;
  const isAllAssigned = students.length > 0 && totalAssigned === students.length;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.name) return;

    onAddRoom({
      roomCode: newRoom.roomCode || `R.${String(rooms.length + 1).padStart(2, '0')}`,
      name: newRoom.name,
      location: newRoom.location || 'Gedung Utama',
      capacity: Number(newRoom.capacity) || 20,
      proctor1: newRoom.proctor1 || 'Guru Pengawas',
      proctor2: '',
    });

    setNewRoom({
      roomCode: `R.${String(rooms.length + 2).padStart(2, '0')}`,
      name: `Ruang ${String(rooms.length + 2).padStart(2, '0')}`,
      location: 'Gedung A',
      capacity: 20,
      proctor1: '',
    });
    setShowAddModal(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    onUpdateRoom({
      ...editingRoom,
      capacity: Number(editingRoom.capacity) || 20,
    });
    setEditingRoom(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Distribution Controller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-indigo-600" />
            <span>Plotting &amp; Distribusi Ruang Ujian</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {rooms.length} ruang ujian dengan total kapasitas {totalCapacity} bangku ({students.length} siswa terdaftar).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowGlobalSwapModal(true)}
            title="Tukar peserta dari satu ruangan ke ruangan lain"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tukar Peserta Antar Ruang</span>
          </button>

          <button
            onClick={onClearDistribution}
            title="Kosongkan penempatan ruang seluruh siswa"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-white hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Plotting</span>
          </button>

          <button
            onClick={onDistributeSequential}
            title="Bagi siswa berurutan per kelas sampai penuh"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Plotting Urut</span>
          </button>

          <button
            onClick={onDistributeCross}
            title="Sistem silang antar rombel (meja ganjil-genap selang-seling kelas)"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5 text-slate-500" />
            <span>Silang Kelas (20)</span>
          </button>

          {onDistributeCrossLevel && (
            <button
              onClick={onDistributeCrossLevel}
              title="Sistem silang antar tingkat: 1 meja 2 peserta berbeda tingkat (40 siswa/ruang)"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Plotting Silang Antar-Tingkat (40 Siswa / 2 per Meja)</span>
            </button>
          )}

          {onSetRoomsPreset && (
            <div className="hidden lg:flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
              <button
                onClick={() => onSetRoomsPreset(40)}
                title="Sesuaikan semua ruang ke kapasitas 40 siswa (12 Ruang)"
                className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-white hover:shadow-xs rounded-md transition-all cursor-pointer"
              >
                Preset 40 Siswa
              </button>
              <button
                onClick={() => onSetRoomsPreset(20)}
                title="Kembalikan semua ruang ke kapasitas 20 siswa (24 Ruang)"
                className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-white hover:shadow-xs rounded-md transition-all cursor-pointer"
              >
                Preset 20 Siswa
              </button>
            </div>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Ruang</span>
          </button>
        </div>
      </div>

      {/* Distribution Status Alert */}
      <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
        isAllAssigned
          ? 'bg-white border-emerald-200 text-emerald-900 shadow-xs'
          : 'bg-white border-amber-200 text-amber-900 shadow-xs'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
            isAllAssigned ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {isAllAssigned ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              {isAllAssigned ? 'Seluruh Peserta Telah Terplotting ke Ruangan' : 'Plotting Ruang Belum Menyeluruh'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {totalAssigned} dari {students.length} peserta sudah memiliki ruang dan bangku meja. Sisa {students.length - totalAssigned} siswa belum teralokasi.
            </div>
          </div>
        </div>

        <div className="text-right hidden sm:block shrink-0">
          <div className="text-[11px] font-medium text-slate-400">Daya Tampung Tersedia</div>
          <div className="text-sm font-bold text-slate-900">
            {totalCapacity} Bangku ({totalCapacity - totalAssigned} sisa)
          </div>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => {
          const roomStudents = students.filter((s) => s.roomId === room.id);
          const assignedCount = roomStudents.length;
          const percent = Math.min(100, Math.round((assignedCount / (room.capacity || 20)) * 100));

          // Calculate class composition inside this room
          const classCount = roomStudents.reduce((acc, s) => {
            acc[s.className] = (acc[s.className] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          return (
            <div
              key={room.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {room.roomCode}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{room.name}</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      <span>{room.location}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingRoom(room)}
                      title="Edit Ruang"
                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteRoom(room.id)}
                      title="Hapus Ruang"
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Capacity Bar - Minimalist thin line */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[11px] font-medium text-slate-500">Kapasitas Kursi</span>
                    <span className="font-bold text-slate-900 text-xs">
                      {assignedCount} / {room.capacity} Siswa
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-1 rounded-full transition-all ${
                        assignedCount >= room.capacity
                          ? 'bg-emerald-500'
                          : assignedCount > 0
                          ? 'bg-indigo-600'
                          : 'bg-slate-300'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Composition tags */}
                {assignedCount > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Komposisi Peserta di Ruang:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(classCount).map(([className, count]) => (
                        <span
                          key={className}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-700 border border-slate-200"
                        >
                          {className}: <strong className="text-slate-900 font-semibold">{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proctor */}
                <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pengawas Ruang: <strong className="text-slate-800">{room.proctor1 || '-'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setManagingRoom(room);
                    setManagingTab('list');
                    setSelectedStudentIds([]);
                    setModalSearchTerm('');
                    setModalFilterClass('ALL');
                  }}
                  className="py-2 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Kelola, tambah, keluarkan, atau tukar peserta di ruang ini"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Kelola Peserta ({assignedCount})</span>
                </button>

                <button
                  onClick={() => {
                    onSelectRoomForSeating(room.id);
                    setActiveTab('seating');
                  }}
                  className="py-2 px-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Buka tampilan denah tempat duduk di ruang ini"
                >
                  <Grid3X3 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Denah Meja</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Tambah Ruang */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Tambah Ruang Ujian Baru</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kode Ruang
                  </label>
                  <input
                    type="text"
                    value={newRoom.roomCode}
                    onChange={(e) => setNewRoom({ ...newRoom, roomCode: e.target.value })}
                    placeholder="R.06"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nama Ruang
                  </label>
                  <input
                    type="text"
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                    placeholder="Ruang 06"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kapasitas Kursi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newRoom.capacity}
                    onChange={(e) => setNewRoom({ ...newRoom, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Lokasi / Gedung
                  </label>
                  <input
                    type="text"
                    value={newRoom.location}
                    onChange={(e) => setNewRoom({ ...newRoom, location: e.target.value })}
                    placeholder="Gedung A Lt. 2"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Guru Pengawas Ruang
                </label>
                <input
                  type="text"
                  value={newRoom.proctor1}
                  onChange={(e) => setNewRoom({ ...newRoom, proctor1: e.target.value })}
                  placeholder="Nama Lengkap & Gelar Pengawas Ruang"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs"
                >
                  Simpan Ruang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Ruang */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <span>Edit Ruang Ujian</span>
              </h3>
              <button onClick={() => setEditingRoom(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kode Ruang
                  </label>
                  <input
                    type="text"
                    value={editingRoom.roomCode}
                    onChange={(e) => setEditingRoom({ ...editingRoom, roomCode: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nama Ruang
                  </label>
                  <input
                    type="text"
                    value={editingRoom.name}
                    onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kapasitas Kursi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={editingRoom.capacity}
                    onChange={(e) => setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Lokasi
                  </label>
                  <input
                    type="text"
                    value={editingRoom.location}
                    onChange={(e) => setEditingRoom({ ...editingRoom, location: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Guru Pengawas Ruang
                </label>
                <input
                  type="text"
                  value={editingRoom.proctor1}
                  onChange={(e) => setEditingRoom({ ...editingRoom, proctor1: e.target.value, proctor2: '' })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Nama Lengkap & Gelar Pengawas Ruang"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1: Kelola Peserta Ruangan (Tambah, Keluarkan, Tukar) */}
      {managingRoom && (() => {
        const roomStudents = students
          .filter((s) => s.roomId === managingRoom.id)
          .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

        const unassignedStudents = students.filter((s) => !s.roomId);
        const candidateStudents = addModeSource === 'unassigned'
          ? unassignedStudents
          : students.filter((s) => s.roomId !== managingRoom.id);

        const filteredCandidates = candidateStudents.filter((s) => {
          const matchSearch =
            s.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
            s.className.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
            s.examNumber.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
            (s.nisn || '').toLowerCase().includes(modalSearchTerm.toLowerCase());
          const matchClass = modalFilterClass === 'ALL' || s.className === modalFilterClass;
          return matchSearch && matchClass;
        });

        const filteredRoomStudents = roomStudents.filter((s) => {
          const matchSearch =
            s.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
            s.className.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
            s.examNumber.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
            (s.nisn || '').toLowerCase().includes(modalSearchTerm.toLowerCase());
          const matchClass = modalFilterClass === 'ALL' || s.className === modalFilterClass;
          return matchSearch && matchClass;
        });

        const remainingCapacity = Math.max(0, (managingRoom.capacity || 20) - roomStudents.length);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-2xs">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col justify-between">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-200 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {managingRoom.roomCode}
                    </span>
                    <h3 className="text-base font-black text-slate-900">
                      Kelola Peserta: {managingRoom.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>Lokasi: <strong>{managingRoom.location}</strong></span>
                    <span>•</span>
                    <span>
                      Kapasitas: <strong className="text-slate-900">{roomStudents.length} / {managingRoom.capacity} Kursi</strong>
                      {remainingCapacity > 0 ? (
                        <span className="text-emerald-700 ml-1 font-semibold">({remainingCapacity} kursi kosong)</span>
                      ) : (
                        <span className="text-amber-700 ml-1 font-semibold">(Penuh)</span>
                      )}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    setManagingRoom(null);
                    setSelectedStudentIds([]);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Navigation Tabs */}
              <div className="flex flex-wrap items-center gap-2 pt-3 pb-2 border-b border-slate-100 shrink-0">
                <button
                  onClick={() => {
                    setManagingTab('list');
                    setSelectedStudentIds([]);
                    setModalSearchTerm('');
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                    managingTab === 'list'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Daftar Peserta di Ruang ({roomStudents.length})</span>
                </button>

                <button
                  onClick={() => {
                    setManagingTab('add');
                    setSelectedStudentIds([]);
                    setModalSearchTerm('');
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                    managingTab === 'add'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Tambahkan Peserta</span>
                </button>

                <button
                  onClick={() => {
                    setManagingTab('swap');
                    setSelectedStudentIds([]);
                    setModalSearchTerm('');
                    setRoomSwapStudentInRoom(roomStudents[0]?.id || '');
                    const otherRooms = rooms.filter((r) => r.id !== managingRoom.id);
                    setRoomSwapTargetRoom(otherRooms[0]?.id || '');
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                    managingTab === 'swap'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Tukar / Pindah Ruangan</span>
                </button>
              </div>

              {/* TAB 1: DAFTAR & KELUARKAN PESERTA DARI RUANG */}
              {managingTab === 'list' && (
                <div className="py-3 space-y-3 flex-1 overflow-hidden flex flex-col">
                  {/* Filters & Actions bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                    <div className="flex flex-1 items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Cari nama, NISN, no ujian..."
                          value={modalSearchTerm}
                          onChange={(e) => setModalSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <select
                        value={modalFilterClass}
                        onChange={(e) => setModalFilterClass(e.target.value)}
                        className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium focus:outline-none"
                      >
                        <option value="ALL">Semua Kelas</option>
                        {allClasses.map((cls) => (
                          <option key={cls} value={cls}>Kelas {cls}</option>
                        ))}
                      </select>
                    </div>

                    {selectedStudentIds.length > 0 && (
                      <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
                        <span className="text-xs font-bold text-indigo-900">
                          {selectedStudentIds.length} Terpilih
                        </span>
                        <button
                          onClick={() => {
                            if (window.confirm(`Keluarkan ${selectedStudentIds.length} peserta terpilih dari ${managingRoom.name}?`)) {
                              onUnassignStudentsFromRoom?.(selectedStudentIds);
                              setSelectedStudentIds([]);
                            }
                          }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Keluarkan dari Ruang</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Student List Table */}
                  <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
                    {filteredRoomStudents.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-medium">Tidak ada peserta di ruangan ini yang cocok dengan pencarian.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 w-8 text-center">
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.length === filteredRoomStudents.length && filteredRoomStudents.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStudentIds(filteredRoomStudents.map((s) => s.id));
                                  } else {
                                    setSelectedStudentIds([]);
                                  }
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </th>
                            <th className="py-2.5 px-3 w-16 text-center">Meja</th>
                            <th className="py-2.5 px-3">Nama Peserta</th>
                            <th className="py-2.5 px-3 w-20">Kelas</th>
                            <th className="py-2.5 px-3 w-28">No. Peserta</th>
                            <th className="py-2.5 px-3 w-24 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredRoomStudents.map((student) => {
                            const isSelected = selectedStudentIds.includes(student.id);
                            return (
                              <tr key={student.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                                <td className="py-2 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedStudentIds((prev) => [...prev, student.id]);
                                      } else {
                                        setSelectedStudentIds((prev) => prev.filter((id) => id !== student.id));
                                      }
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                                  {student.seatNumber ? String(student.seatNumber).padStart(2, '0') : '-'}
                                </td>
                                <td className="py-2 px-3 font-semibold text-slate-900">
                                  {student.name}
                                  <span className="block text-[10px] text-slate-400 font-normal">NISN: {student.nisn || '-'}</span>
                                </td>
                                <td className="py-2 px-3 font-medium text-slate-700">{student.className}</td>
                                <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{student.examNumber}</td>
                                <td className="py-2 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`Keluarkan ${student.name} (${student.className}) dari ${managingRoom.name}?`)) {
                                          onUnassignStudentsFromRoom?.([student.id]);
                                        }
                                      }}
                                      title="Keluarkan peserta dari ruangan ini"
                                      className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded border border-rose-200 transition-colors cursor-pointer"
                                    >
                                      <UserMinus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: TAMBAH PESERTA KE RUANGAN */}
              {managingTab === 'add' && (
                <div className="py-3 space-y-3 flex-1 overflow-hidden flex flex-col">
                  {/* Banner Info Kapasitas & Filter Source */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex rounded-lg border border-indigo-200 bg-white p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            setAddModeSource('unassigned');
                            setSelectedStudentIds([]);
                          }}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            addModeSource === 'unassigned'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-indigo-800 hover:bg-indigo-50'
                          }`}
                        >
                          Siswa Belum Punya Ruang ({unassignedStudents.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddModeSource('all');
                            setSelectedStudentIds([]);
                          }}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            addModeSource === 'all'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-indigo-800 hover:bg-indigo-50'
                          }`}
                        >
                          Semua Siswa Terdaftar
                        </button>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-slate-800">
                      Sisa Kapasitas Ruang: <span className="text-indigo-700 underline">{remainingCapacity} Kursi Tersedia</span>
                    </div>
                  </div>

                  {/* Search and Class Filter */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Cari siswa untuk ditambahkan ke ruang ini..."
                        value={modalSearchTerm}
                        onChange={(e) => setModalSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <select
                      value={modalFilterClass}
                      onChange={(e) => setModalFilterClass(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium focus:outline-none"
                    >
                      <option value="ALL">Semua Kelas</option>
                      {allClasses.map((cls) => (
                        <option key={cls} value={cls}>Kelas {cls}</option>
                      ))}
                    </select>
                  </div>

                  {/* Candidate Students Table */}
                  <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
                    {filteredCandidates.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs font-medium">Tidak ada peserta yang memenuhi kriteria untuk ditambahkan.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 w-8 text-center">
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.length === filteredCandidates.length && filteredCandidates.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStudentIds(filteredCandidates.map((s) => s.id));
                                  } else {
                                    setSelectedStudentIds([]);
                                  }
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </th>
                            <th className="py-2.5 px-3">Nama Peserta</th>
                            <th className="py-2.5 px-3 w-20">Kelas</th>
                            <th className="py-2.5 px-3 w-28">No. Peserta</th>
                            <th className="py-2.5 px-3 w-32">Status Ruang Saat Ini</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredCandidates.map((student) => {
                            const isSelected = selectedStudentIds.includes(student.id);
                            return (
                              <tr key={student.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                                <td className="py-2 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedStudentIds((prev) => [...prev, student.id]);
                                      } else {
                                        setSelectedStudentIds((prev) => prev.filter((id) => id !== student.id));
                                      }
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2 px-3 font-semibold text-slate-900">
                                  {student.name}
                                  <span className="block text-[10px] text-slate-400 font-normal">NISN: {student.nisn || '-'}</span>
                                </td>
                                <td className="py-2 px-3 font-medium text-slate-700">{student.className}</td>
                                <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{student.examNumber}</td>
                                <td className="py-2 px-3">
                                  {student.roomId ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                      {student.roomName || 'Ruang Lain'} (Meja {student.seatNumber})
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                      Belum Ada Ruang
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Add action button */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 shrink-0">
                    <span className="text-xs text-slate-500">
                      {selectedStudentIds.length} peserta terpilih untuk dimasukkan ke {managingRoom.name}
                    </span>
                    <button
                      type="button"
                      disabled={selectedStudentIds.length === 0}
                      onClick={() => {
                        onAssignStudentsToRoom?.(selectedStudentIds, managingRoom.id);
                        setSelectedStudentIds([]);
                        setManagingTab('list');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ Tambahkan {selectedStudentIds.length} Peserta ke {managingRoom.name}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: TUKAR / PINDAHKAN PESERTA DARI RUANG INI KE RUANG LAIN */}
              {managingTab === 'swap' && (() => {
                const otherRooms = rooms.filter((r) => r.id !== managingRoom.id);
                const currentSelectedTargetRoom = rooms.find((r) => r.id === roomSwapTargetRoom) || otherRooms[0];
                const targetRoomStudents = students
                  .filter((s) => s.roomId === currentSelectedTargetRoom?.id)
                  .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

                const sourceStudent = roomStudents.find((s) => s.id === roomSwapStudentInRoom) || roomStudents[0];
                const targetStudent = targetRoomStudents.find((s) => s.id === roomSwapStudentTarget);

                return (
                  <div className="py-4 space-y-4 flex-1 overflow-y-auto">
                    <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-4">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <ArrowLeftRight className="w-4 h-4 text-amber-600" />
                        <span>Tukar Posisi atau Transfer Peserta dari {managingRoom.name} ke Ruang Lain</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Kolom 1: Siswa Asal */}
                        <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-2">
                          <label className="block text-xs font-bold text-slate-800">
                            1. Pilih Siswa dari {managingRoom.name}:
                          </label>
                          <select
                            value={roomSwapStudentInRoom}
                            onChange={(e) => setRoomSwapStudentInRoom(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md font-medium bg-white"
                          >
                            {roomStudents.map((s) => (
                              <option key={s.id} value={s.id}>
                                Meja {s.seatNumber} — {s.name} ({s.className})
                              </option>
                            ))}
                          </select>
                          {sourceStudent && (
                            <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded">
                              No. Ujian: <strong>{sourceStudent.examNumber}</strong> • NISN: {sourceStudent.nisn || '-'}
                            </div>
                          )}
                        </div>

                        {/* Kolom 2: Ruangan Tujuan */}
                        <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-2">
                          <label className="block text-xs font-bold text-slate-800">
                            2. Pilih Ruangan Tujuan:
                          </label>
                          <select
                            value={roomSwapTargetRoom}
                            onChange={(e) => {
                              setRoomSwapTargetRoom(e.target.value);
                              setRoomSwapStudentTarget('');
                            }}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md font-medium bg-white"
                          >
                            {otherRooms.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name} ({r.roomCode}) — {students.filter((s) => s.roomId === r.id).length}/{r.capacity} siswa
                              </option>
                            ))}
                          </select>

                          <label className="block text-xs font-bold text-slate-800 pt-1">
                            3. Opsi Siswa di Ruangan Tujuan:
                          </label>
                          <select
                            value={roomSwapStudentTarget}
                            onChange={(e) => setRoomSwapStudentTarget(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md font-medium bg-white"
                          >
                            <option value="">-- Pindahkan Langsung ke Kursi Kosong (Tanpa Tukar) --</option>
                            {targetRoomStudents.map((s) => (
                              <option key={s.id} value={s.id}>
                                Tukar dengan: Meja {s.seatNumber} — {s.name} ({s.className})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          disabled={!sourceStudent}
                          onClick={() => {
                            if (!sourceStudent || !currentSelectedTargetRoom) return;

                            if (roomSwapStudentTarget) {
                              // Swap both students
                              onSwapStudentsRooms?.(sourceStudent.id, roomSwapStudentTarget);
                              setManagingTab('list');
                            } else {
                              // Transfer single student
                              onTransferStudentRoom?.(sourceStudent.id, currentSelectedTargetRoom.id);
                              setManagingTab('list');
                            }
                          }}
                          className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                          <span>
                            {roomSwapStudentTarget ? 'Tukar Posisi Kedua Siswa' : 'Pindahkan Siswa ke Ruangan Tujuan'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500">
                  Perubahan akan langsung disinkronkan ke denah meja, kartu peserta, dan server cloud.
                </span>
                <button
                  type="button"
                  onClick={() => setManagingRoom(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Selesai &amp; Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal 2: Tukar Peserta Antar Ruang Global */}
      {showGlobalSwapModal && (() => {
        const roomA = rooms.find((r) => r.id === (swapRoomAId || rooms[0]?.id)) || rooms[0];
        const roomB = rooms.find((r) => r.id === (swapRoomBId || rooms[1]?.id)) || rooms[1] || rooms[0];

        const roomAStudents = students
          .filter((s) => s.roomId === roomA?.id)
          .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

        const roomBStudents = students
          .filter((s) => s.roomId === roomB?.id)
          .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

        const studentA = roomAStudents.find((s) => s.id === swapStudentAId) || roomAStudents[0];
        const studentB = roomBStudents.find((s) => s.id === swapStudentBId) || roomBStudents[0];

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-2xs">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                  <span>Tukar Peserta Antar Ruangan Ujian</span>
                </h3>
                <button
                  onClick={() => setShowGlobalSwapModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Pilih siswa dari Ruangan 1 dan siswa dari Ruangan 2. Kedua siswa akan saling bertukar ruangan serta nomor meja secara otomatis.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Siswa Ruangan 1 */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Pilih Ruang 1:
                  </label>
                  <select
                    value={roomA?.id}
                    onChange={(e) => {
                      setSwapRoomAId(e.target.value);
                      setSwapStudentAId('');
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.roomCode})
                      </option>
                    ))}
                  </select>

                  <label className="block text-xs font-bold text-slate-800 pt-1">
                    Pilih Siswa di {roomA?.name}:
                  </label>
                  <select
                    value={studentA?.id}
                    onChange={(e) => setSwapStudentAId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
                  >
                    {roomAStudents.length === 0 ? (
                      <option value="">(Ruangan Kosong)</option>
                    ) : (
                      roomAStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          Meja {s.seatNumber} — {s.name} ({s.className})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Siswa Ruangan 2 */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Pilih Ruang 2:
                  </label>
                  <select
                    value={roomB?.id}
                    onChange={(e) => {
                      setSwapRoomBId(e.target.value);
                      setSwapStudentBId('');
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.roomCode})
                      </option>
                    ))}
                  </select>

                  <label className="block text-xs font-bold text-slate-800 pt-1">
                    Pilih Siswa di {roomB?.name}:
                  </label>
                  <select
                    value={studentB?.id}
                    onChange={(e) => setSwapStudentBId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
                  >
                    {roomBStudents.length === 0 ? (
                      <option value="">(Ruangan Kosong)</option>
                    ) : (
                      roomBStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          Meja {s.seatNumber} — {s.name} ({s.className})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {studentA && studentB && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900 flex items-center justify-between">
                  <span>
                    <strong>{studentA.name}</strong> ({roomA.name}) 🔁 <strong>{studentB.name}</strong> ({roomB.name})
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGlobalSwapModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!studentA || !studentB || studentA.id === studentB.id}
                  onClick={() => {
                    if (studentA && studentB) {
                      onSwapStudentsRooms?.(studentA.id, studentB.id);
                      setShowGlobalSwapModal(false);
                    }
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Tukar Ruangan Kedua Siswa</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
