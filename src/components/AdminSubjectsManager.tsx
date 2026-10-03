import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Search,
  CheckCircle2,
  Calculator,
  RotateCcw,
  Sparkles,
  AlertCircle,
  X,
  Sliders,
  Check,
  Award,
  Users,
  Layers,
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { ExamGradeItem, SubjectGradingConfig } from '../types';
import { 
  STANDARD_SCHOOL_SUBJECTS, 
  getDefaultSubjectConfig, 
  getSubjectCategory, 
  getSubjectCode, 
  DEFAULT_KKM 
} from '../utils/gradeUtils';

interface AdminSubjectsManagerProps {
  subjects: string[];
  gradingConfigs: Record<string, SubjectGradingConfig>;
  grades: ExamGradeItem[];
  totalStudents: number;
  onAddSubject: (newSubject: string, config: SubjectGradingConfig) => void;
  onEditSubject: (oldName: string, newName: string, config: SubjectGradingConfig) => void;
  onDeleteSubject: (subjectName: string, deleteGrades: boolean) => void;
  onResetToDefaultSubjects: () => void;
  onSelectSubjectToGrade: (subjectName: string) => void;
  showToast: (msg: string) => void;
}

export const AdminSubjectsManager: React.FC<AdminSubjectsManagerProps> = ({
  subjects,
  gradingConfigs,
  grades,
  totalStudents,
  onAddSubject,
  onEditSubject,
  onDeleteSubject,
  onResetToDefaultSubjects,
  onSelectSubjectToGrade,
  showToast,
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scored' | 'unscored'>('all');

  // Modal State for Add / Edit
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSubjectName, setEditingSubjectName] = useState<string | null>(null);

  // Form Fields
  const [formSubjectName, setFormSubjectName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState('Umum');
  const [formKkm, setFormKkm] = useState(DEFAULT_KKM);
  const [formTotalPg, setFormTotalPg] = useState(40);
  const [formTotalEssay, setFormTotalEssay] = useState(5);
  const [formMaxEssay, setFormMaxEssay] = useState(5);
  const [formWeightPg, setFormWeightPg] = useState(70);
  const [formWeightEssay, setFormWeightEssay] = useState(30);
  const [formTeacherName, setFormTeacherName] = useState('');
  const [formTeacherNip, setFormTeacherNip] = useState('-');
  const [formError, setFormError] = useState<string | null>(null);

  // Modal State for Delete Confirmation
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);
  const [deleteGradesToo, setDeleteGradesToo] = useState(false);

  // Reset confirmation modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Category choices
  const categoryOptions = [
    'Umum',
    'PAI / Keagamaan',
    'MIPA & Sains',
    'Bahasa & Sastra',
    'Sosial & Humaniora',
    'Muatan Lokal',
    'Vokasi & Keterampilan',
    'Lainnya',
  ];

  // Helper to open Add modal
  const handleOpenAddModal = (presetName?: string) => {
    const baseName = presetName || '';
    const preset = baseName ? getDefaultSubjectConfig(baseName) : null;
    
    setEditingSubjectName(null);
    setFormSubjectName(baseName);
    setFormCode(preset ? (preset.code || getSubjectCode(baseName)) : '');
    setFormCategory(preset ? (preset.category || getSubjectCategory(baseName)) : 'Umum');
    setFormKkm(preset ? preset.kkm : DEFAULT_KKM);
    setFormTotalPg(preset ? preset.totalPgQuestions : 40);
    setFormTotalEssay(preset ? preset.totalEssayQuestions : 5);
    setFormMaxEssay(preset ? (preset.maxEssayScore || preset.totalEssayQuestions || 5) : 5);
    setFormWeightPg(preset ? preset.weightPg : 70);
    setFormWeightEssay(preset ? preset.weightEssay : 30);
    setFormTeacherName(preset?.teacherName || '');
    setFormTeacherNip(preset?.teacherNip || '-');
    setFormError(null);
    setShowFormModal(true);
  };

  // Helper to open Edit modal
  const handleOpenEditModal = (subName: string) => {
    const cfg = gradingConfigs[subName] || getDefaultSubjectConfig(subName);
    setEditingSubjectName(subName);
    setFormSubjectName(subName);
    setFormCode(cfg.code || getSubjectCode(subName));
    setFormCategory(cfg.category || getSubjectCategory(subName));
    setFormKkm(cfg.kkm || DEFAULT_KKM);
    setFormTotalPg(cfg.totalPgQuestions);
    setFormTotalEssay(cfg.totalEssayQuestions);
    setFormMaxEssay(cfg.maxEssayScore || cfg.totalEssayQuestions || 5);
    setFormWeightPg(cfg.weightPg);
    setFormWeightEssay(cfg.weightEssay);
    setFormTeacherName(cfg.teacherName || '');
    setFormTeacherNip(cfg.teacherNip || '-');
    setFormError(null);
    setShowFormModal(true);
  };

  // Auto-sync weights
  const handleWeightPgChange = (pgVal: number) => {
    const clampedPg = Math.max(0, Math.min(100, pgVal));
    setFormWeightPg(clampedPg);
    setFormWeightEssay(100 - clampedPg);
  };

  const handleWeightEssayChange = (essayVal: number) => {
    const clampedEssay = Math.max(0, Math.min(100, essayVal));
    setFormWeightEssay(clampedEssay);
    setFormWeightPg(100 - clampedEssay);
  };

  // Save Add/Edit
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formSubjectName.trim();
    if (!cleanName) {
      setFormError('Nama mata pelajaran wajib diisi.');
      return;
    }

    // Check duplicate if adding or changing name
    if (
      (!editingSubjectName && subjects.some((s) => s.toLowerCase() === cleanName.toLowerCase())) ||
      (editingSubjectName &&
        editingSubjectName.toLowerCase() !== cleanName.toLowerCase() &&
        subjects.some((s) => s.toLowerCase() === cleanName.toLowerCase()))
    ) {
      setFormError(`Mata pelajaran dengan nama "${cleanName}" sudah terdaftar.`);
      return;
    }

    const newConfig: SubjectGradingConfig = {
      subject: cleanName,
      code: formCode.trim() || getSubjectCode(cleanName),
      category: formCategory,
      kkm: Number(formKkm) || DEFAULT_KKM,
      totalPgQuestions: Math.max(0, Number(formTotalPg) || 0),
      totalEssayQuestions: Math.max(0, Number(formTotalEssay) || 0),
      maxEssayScore: Math.max(0, Number(formMaxEssay) || Number(formTotalEssay) || 0),
      weightPg: Number(formWeightPg),
      weightEssay: Number(formWeightEssay),
      teacherName: formTeacherName.trim() || `Guru ${cleanName}`,
      teacherNip: formTeacherNip.trim() || '-',
      scoringMode: 'item_count',
    };

    if (editingSubjectName) {
      onEditSubject(editingSubjectName, cleanName, newConfig);
      showToast(`Mata pelajaran "${cleanName}" berhasil diperbarui.`);
    } else {
      onAddSubject(cleanName, newConfig);
      showToast(`Mata pelajaran "${cleanName}" berhasil ditambahkan.`);
    }

    setShowFormModal(false);
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = () => {
    if (!subjectToDelete) return;
    onDeleteSubject(subjectToDelete, deleteGradesToo);
    showToast(`Mata pelajaran "${subjectToDelete}" berhasil dihapus.`);
    setSubjectToDelete(null);
    setDeleteGradesToo(false);
  };

  // Analytics & Stats
  const subjectStats = useMemo(() => {
    const list = subjects.map((sub) => {
      const cfg = gradingConfigs[sub] || getDefaultSubjectConfig(sub);
      const subGrades = grades.filter((g) => g.subject === sub);
      const scoredCount = subGrades.length;
      const passedCount = subGrades.filter((g) => g.passed).length;
      const avgScore =
        scoredCount > 0
          ? Math.round((subGrades.reduce((sum, g) => sum + (g.scoreFinal || 0), 0) / scoredCount) * 10) / 10
          : 0;

      return {
        name: sub,
        config: cfg,
        code: cfg.code || getSubjectCode(sub),
        category: cfg.category || getSubjectCategory(sub),
        scoredCount,
        passedCount,
        avgScore,
        hasGrades: scoredCount > 0,
      };
    });

    const totalMapel = list.length;
    const scoredMapel = list.filter((s) => s.hasGrades).length;
    const unscoredMapel = totalMapel - scoredMapel;
    const avgKkm =
      totalMapel > 0
        ? Math.round((list.reduce((sum, s) => sum + (s.config.kkm || 75), 0) / totalMapel) * 10) / 10
        : 75;

    return {
      list,
      totalMapel,
      scoredMapel,
      unscoredMapel,
      avgKkm,
    };
  }, [subjects, gradingConfigs, grades]);

  // Filtered Subject List
  const filteredList = useMemo(() => {
    return subjectStats.list.filter((item) => {
      // Search
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.config.teacherName || '').toLowerCase().includes(searchQuery.toLowerCase());

      // Category
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      // Status
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'scored'
          ? item.hasGrades
          : !item.hasGrades;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [subjectStats.list, searchQuery, selectedCategory, statusFilter]);

  // Category badge color mapper
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'PAI / Keagamaan':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'MIPA & Sains':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Bahasa & Sastra':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Sosial & Humaniora':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Muatan Lokal':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Quick preset curriculum templates for quick add
  const curriculumPresets = [
    { name: 'Tahfidz Al-Qur\'an', category: 'PAI / Keagamaan', code: 'THF' },
    { name: 'Bahasa Sunda', category: 'Muatan Lokal', code: 'SND' },
    { name: 'BTQ (Baca Tulis Al-Qur\'an)', category: 'PAI / Keagamaan', code: 'BTQ' },
    { name: 'Informatika / Komputer', category: 'Umum', code: 'INF' },
    { name: 'Keterampilan / Robotika', category: 'Vokasi & Keterampilan', code: 'ROB' },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Action Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  Daftar &amp; Manajemen Mata Pelajaran (Role Admin)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Master Data
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola katalog resmi mata pelajaran ujian madrasah/sekolah. Tambah mapel baru, ubah butir soal (PG &amp; Esai), bobot nilai, atau hapus mapel.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Kembalikan daftar mata pelajaran ke standar kurikulum madrasah"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Standar</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Mata Pelajaran</span>
            </button>
          </div>
        </div>

        {/* Quick Recommendation Chips */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Tambah Cepat:
          </span>
          {curriculumPresets.map((preset) => {
            const alreadyExists = subjects.some((s) => s.toLowerCase() === preset.name.toLowerCase());
            return (
              <button
                key={preset.name}
                type="button"
                disabled={alreadyExists}
                onClick={() => handleOpenAddModal(preset.name)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 transition-all ${
                  alreadyExists
                    ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 shadow-2xs cursor-pointer'
                }`}
                title={alreadyExists ? 'Sudah ada di daftar mapel' : `Klik untuk menambahkan ${preset.name}`}
              >
                <span>+ {preset.name}</span>
                {alreadyExists && <Check className="w-3 h-3 text-slate-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Stat Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Mata Pelajaran
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {subjectStats.totalMapel}
            </span>
            <span className="text-xs text-slate-400">Mapel</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Siap untuk jadwal &amp; input nilai
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Mapel Sudah Dinilai
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-600 font-mono">
              {subjectStats.scoredMapel}
            </span>
            <span className="text-xs text-slate-400">/ {subjectStats.totalMapel}</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-medium mt-1 block">
            Tersimpan data nilai siswa
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Mapel Belum Diisi
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-600 font-mono">
              {subjectStats.unscoredMapel}
            </span>
            <span className="text-xs text-slate-400">Mapel</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Menunggu input guru
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Rata-Rata Standar KKM
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-indigo-600 font-mono">
              {subjectStats.avgKkm}
            </span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Kriteria Kelulusan Minimal
          </span>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama mapel / kode / guru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-48 sm:w-64 focus:bg-white focus:outline-hidden transition-all text-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden text-slate-700"
          >
            <option value="all">Semua Kategori ({subjects.length})</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden text-slate-700"
          >
            <option value="all">Semua Status</option>
            <option value="scored">Sudah Ada Nilai ({subjectStats.scoredMapel})</option>
            <option value="unscored">Belum Diisi ({subjectStats.unscoredMapel})</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Menampilkan <strong>{filteredList.length}</strong> dari <strong>{subjects.length}</strong> mata pelajaran
        </div>
      </div>

      {/* 4. Desktop Table View & Mobile Responsive Card List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Desktop View Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 w-20">Kode</th>
                <th className="py-3 px-3 min-w-[200px]">Mata Pelajaran</th>
                <th className="py-3 px-3 w-36">Kategori</th>
                <th className="py-3 px-3 w-20 text-center">KKM</th>
                <th className="py-3 px-3 min-w-[170px]">Konfigurasi Butir Soal</th>
                <th className="py-3 px-3 min-w-[160px]">Guru Pengampu</th>
                <th className="py-3 px-3 w-36 text-center">Progres Nilai</th>
                <th className="py-3 px-3 w-44 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada mata pelajaran yang cocok dengan kata kunci atau filter.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, index) => {
                  const { name, config, code, category, scoredCount, hasGrades } = item;
                  const progressPct = totalStudents > 0 ? Math.round((scoredCount / totalStudents) * 100) : 0;

                  return (
                    <tr key={name} className="hover:bg-slate-50/80 transition-colors">
                      {/* No */}
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400">
                        {index + 1}
                      </td>

                      {/* Kode */}
                      <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-xs">
                          {code}
                        </span>
                      </td>

                      {/* Nama Mata Pelajaran */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 text-sm">
                          {name}
                        </div>
                      </td>

                      {/* Kategori */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getCategoryBadgeClass(category)}`}>
                          {category}
                        </span>
                      </td>

                      {/* KKM */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-xs">
                          {config.kkm}
                        </span>
                      </td>

                      {/* Butir Soal & Bobot */}
                      <td className="py-3 px-3">
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center gap-1.5 text-blue-900">
                            <span className="font-semibold">PG:</span>
                            <span>{config.totalPgQuestions} Butir</span>
                            <span className="text-blue-700 font-mono">({config.weightPg}%)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-amber-900">
                            <span className="font-semibold">Esai:</span>
                            <span>{config.totalEssayQuestions} Butir</span>
                            <span className="text-amber-700 font-mono">({config.weightEssay}%)</span>
                          </div>
                        </div>
                      </td>

                      {/* Guru Pengampu */}
                      <td className="py-3 px-3 text-slate-600">
                        <div className="font-medium text-xs text-slate-900">
                          {config.teacherName || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          NIP: {config.teacherNip || '-'}
                        </div>
                      </td>

                      {/* Progres Nilai */}
                      <td className="py-3 px-3 text-center">
                        <div>
                          <span className={`text-[11px] font-mono font-bold ${hasGrades ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {scoredCount} / {totalStudents}
                          </span>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 mt-0.5 block">
                            {progressPct}% dinilai
                          </span>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Input Nilai Shortcut */}
                          <button
                            type="button"
                            onClick={() => onSelectSubjectToGrade(name)}
                            title={`Buka input nilai mata pelajaran ${name}`}
                            className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors cursor-pointer"
                          >
                            Input Nilai
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(name)}
                            title={`Ubah data dan konfigurasi mapel ${name}`}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSubjectToDelete(name);
                              setDeleteGradesToo(false);
                            }}
                            title={`Hapus mata pelajaran ${name}`}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card List (< md) */}
        <div className="md:hidden divide-y divide-slate-200">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 p-4 text-xs">
              Tidak ada mata pelajaran yang cocok dengan pencarian.
            </div>
          ) : (
            filteredList.map((item, index) => {
              const { name, config, code, category, scoredCount, hasGrades } = item;
              const progressPct = totalStudents > 0 ? Math.round((scoredCount / totalStudents) * 100) : 0;

              return (
                <div key={name} className="p-3.5 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900">
                            {name}
                          </h4>
                          <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-semibold border ${getCategoryBadgeClass(category)}`}>
                            {category}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            KKM: <strong className="text-emerald-700 font-mono">{config.kkm}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs font-mono font-bold ${hasGrades ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {scoredCount}/{totalStudents}
                      </span>
                      <span className="block text-[9px] text-slate-400">
                        {progressPct}% dinilai
                      </span>
                    </div>
                  </div>

                  {/* Config Snapshot */}
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Butir Soal &amp; Bobot</span>
                      <span className="font-semibold text-slate-800">
                        {config.totalPgQuestions} PG ({config.weightPg}%) • {config.totalEssayQuestions} Esai ({config.weightEssay}%)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Guru Pengampu</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {config.teacherName || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Mobile */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectSubjectToGrade(name)}
                      className="flex-1 py-1.5 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg text-center transition-colors shadow-2xs"
                    >
                      Buka Input Nilai
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(name)}
                      className="p-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Ubah Mapel"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubjectToDelete(name);
                        setDeleteGradesToo(false);
                      }}
                      className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Hapus Mapel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. MODAL FORM: TAMBAH / EDIT MATA PELAJARAN */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  {editingSubjectName ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {editingSubjectName ? `Edit Mata Pelajaran: ${editingSubjectName}` : 'Tambah Mata Pelajaran Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Atur nama, kode, KKM, butir soal PG/Esai, dan bobot persentase penilaian
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveForm} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Nama Mapel & Kode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nama Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Tahfidz Al-Qur'an, Informatika, Bahasa Sunda..."
                    value={formSubjectName}
                    onChange={(e) => {
                      setFormSubjectName(e.target.value);
                      if (!formCode || formCode === getSubjectCode(formSubjectName)) {
                        setFormCode(getSubjectCode(e.target.value));
                      }
                      if (formCategory === 'Umum') {
                        setFormCategory(getSubjectCategory(e.target.value));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Kode Singkat
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Contoh: THF, MTK"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 uppercase"
                  />
                </div>
              </div>

              {/* 2. Kategori & KKM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Kategori Mata Pelajaran
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800 font-medium"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>Standar KKM / KKTP</span>
                    <span className="text-[10px] text-emerald-600 font-normal">Standar 75</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formKkm}
                    onChange={(e) => setFormKkm(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-emerald-700 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* 3. Konfigurasi Butir Soal PG & Esai */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                    Konfigurasi Jumlah Soal &amp; Bobot Nilai:
                  </span>
                  <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Total Bobot: {Number(formWeightPg) + Number(formWeightEssay)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Pilihan Ganda */}
                  <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 space-y-2">
                    <span className="text-[11px] font-bold text-blue-900 block">
                      1. Soal Pilihan Ganda (PG)
                    </span>
                    <div>
                      <label className="block text-[10px] font-semibold text-blue-800 mb-1">
                        Jumlah Butir Soal PG
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formTotalPg}
                        onChange={(e) => setFormTotalPg(parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-center font-mono font-bold text-xs bg-white border border-blue-300 rounded-md focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-blue-800 mb-1">
                        Bobot Nilai PG (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formWeightPg}
                        onChange={(e) => handleWeightPgChange(parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-center font-mono font-bold text-xs bg-white border border-blue-300 rounded-md focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Soal Esai */}
                  <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 space-y-2">
                    <span className="text-[11px] font-bold text-amber-900 block">
                      2. Soal Esai / Uraian
                    </span>
                    <div>
                      <label className="block text-[10px] font-semibold text-amber-800 mb-1">
                        Jumlah Butir Soal Esai
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={formTotalEssay}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setFormTotalEssay(val);
                          setFormMaxEssay(val);
                        }}
                        className="w-full px-2 py-1.5 text-center font-mono font-bold text-xs bg-white border border-amber-300 rounded-md focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-amber-800 mb-1">
                        Bobot Nilai Esai (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formWeightEssay}
                        onChange={(e) => handleWeightEssayChange(parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-center font-mono font-bold text-xs bg-white border border-amber-300 rounded-md focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 italic">
                  💡 Rumus: Nilai Akhir = (Benar PG / {formTotalPg || 1} × {formWeightPg}%) + (Skor Esai / {formMaxEssay || 1} × {formWeightEssay}%). Jika semua benar, nilai pasti 100!
                </div>
              </div>

              {/* 4. Guru Pengampu & NIP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Guru Pengampu
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Dra. Hj. Siti Fatimah, M.Pd"
                    value={formTeacherName}
                    onChange={(e) => setFormTeacherName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    NIP Guru Pengampu
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 19800101 200501 1 002 atau -"
                    value={formTeacherNip}
                    onChange={(e) => setFormTeacherNip(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingSubjectName ? 'Simpan Perubahan' : 'Tambahkan Mata Pelajaran'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL KONFIRMASI HAPUS MATA PELAJARAN */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Hapus Mata Pelajaran?
                </h3>
                <p className="text-xs text-slate-500">
                  Konfirmasi penghapusan mata pelajaran dari sistem
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 space-y-1.5">
              <p>
                Anda akan menghapus mata pelajaran: <strong>{subjectToDelete}</strong>.
              </p>
              {grades.some((g) => g.subject === subjectToDelete) ? (
                <p className="text-rose-800 font-semibold">
                  ⚠️ Peringatan: Terdapat {grades.filter((g) => g.subject === subjectToDelete).length} data nilai siswa yang sudah tercatat untuk mata pelajaran ini.
                </p>
              ) : (
                <p className="text-slate-600">
                  Mata pelajaran ini belum memiliki data nilai siswa.
                </p>
              )}
            </div>

            {grades.some((g) => g.subject === subjectToDelete) && (
              <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  checked={deleteGradesToo}
                  onChange={(e) => setDeleteGradesToo(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <span>
                  Hapus juga seluruh {grades.filter((g) => g.subject === subjectToDelete).length} data nilai siswa untuk mapel ini.
                </span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSubjectToDelete(null);
                  setDeleteGradesToo(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Mapel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL KONFIRMASI RESET KE STANDAR */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Reset ke Daftar Mapel Standar?
                </h3>
                <p className="text-xs text-slate-500">
                  Kembalikan ke susunan mata pelajaran standar kurikulum madrasah
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan mengembalikan daftar mata pelajaran ke {STANDARD_SCHOOL_SUBJECTS.length} mapel standar kurikulum madrasah (Al-Qur'an Hadis, Akidah Akhlak, Fikih, SKI, Bhs Arab, Matematika, IPA, dll). Nilai siswa yang cocok dengan mapel standar akan tetap terjaga.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetToDefaultSubjects();
                  setShowResetConfirm(false);
                  showToast('Daftar mata pelajaran berhasil direset ke standar kurikulum.');
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ke Standar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
