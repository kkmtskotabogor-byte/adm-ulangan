import React, { useState } from 'react';
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
  Building
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
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ExamRoom | null>(null);

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

              {/* Bottom Action */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    onSelectRoomForSeating(room.id);
                    setActiveTab('seating');
                  }}
                  className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Grid3X3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Buka Denah Meja Ruang</span>
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
    </div>
  );
};
