import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  CheckCircle2, 
  ArrowRight, 
  Calculator, 
  X, 
  Check, 
  Layers, 
  Sparkles, 
  Award, 
  Users, 
  HelpCircle,
  Clock,
  Filter,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { ExamGradeItem, SubjectGradingConfig } from '../types';
import { getDefaultSubjectConfig, DEFAULT_KKM } from '../utils/gradeUtils';

interface SubjectPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: string[];
  selectedSubject: string;
  onSelectSubject: (subject: string) => void;
  gradingConfigs: Record<string, SubjectGradingConfig>;
  grades: ExamGradeItem[];
  totalStudents: number;
  examTitle?: string;
  schoolName?: string;
  teacherName?: string;
  onExportSubjectExcel?: (subject: string) => void;
  onExportAllSubjectsExcel?: () => void;
}

// Subject color and category mapper
function getSubjectTheme(subject: string) {
  const s = subject.toLowerCase();
  if (s.includes('matematika')) {
    return {
      code: 'MTK',
      bgBadge: 'bg-blue-100 text-blue-800 border-blue-200',
      category: 'Eksakta / Umum',
      accentColor: 'blue',
    };
  }
  if (s.includes('ipa') || s.includes('alam')) {
    return {
      code: 'IPA',
      bgBadge: 'bg-teal-100 text-teal-800 border-teal-200',
      category: 'Sains / Umum',
      accentColor: 'teal',
    };
  }
  if (s.includes('ips') || s.includes('sosial')) {
    return {
      code: 'IPS',
      bgBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      category: 'Sosial / Umum',
      accentColor: 'emerald',
    };
  }
  if (s.includes('indonesia')) {
    return {
      code: 'BIN',
      bgBadge: 'bg-rose-100 text-rose-800 border-rose-200',
      category: 'Bahasa / Umum',
      accentColor: 'rose',
    };
  }
  if (s.includes('inggris')) {
    return {
      code: 'BIG',
      bgBadge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      category: 'Bahasa / Umum',
      accentColor: 'indigo',
    };
  }
  if (s.includes('arab')) {
    return {
      code: 'BAR',
      bgBadge: 'bg-amber-100 text-amber-800 border-amber-200',
      category: 'Keagamaan / PAI',
      accentColor: 'amber',
    };
  }
  if (s.includes('qur\'an') || s.includes('quran') || s.includes('hadis') || s.includes('hadits')) {
    return {
      code: 'QUR',
      bgBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      category: 'Keagamaan / PAI',
      accentColor: 'emerald',
    };
  }
  if (s.includes('akidah') || s.includes('akhlak')) {
    return {
      code: 'AKD',
      bgBadge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      category: 'Keagamaan / PAI',
      accentColor: 'cyan',
    };
  }
  if (s.includes('fikih') || s.includes('fiqih')) {
    return {
      code: 'FIK',
      bgBadge: 'bg-sky-100 text-sky-800 border-sky-200',
      category: 'Keagamaan / PAI',
      accentColor: 'sky',
    };
  }
  if (s.includes('ski') || s.includes('sejarah')) {
    return {
      code: 'SKI',
      bgBadge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      category: 'Keagamaan / PAI',
      accentColor: 'yellow',
    };
  }
  if (s.includes('pancasila') || s.includes('pkn')) {
    return {
      code: 'PKN',
      bgBadge: 'bg-red-100 text-red-800 border-red-200',
      category: 'Kewarganegaraan',
      accentColor: 'red',
    };
  }
  if (s.includes('informatika') || s.includes('tik') || s.includes('prakarya')) {
    return {
      code: 'INF',
      bgBadge: 'bg-purple-100 text-purple-800 border-purple-200',
      category: 'Teknologi & Keterampilan',
      accentColor: 'purple',
    };
  }
  if (s.includes('pjok') || s.includes('jasmani') || s.includes('olahraga')) {
    return {
      code: 'PJK',
      bgBadge: 'bg-lime-100 text-lime-800 border-lime-200',
      category: 'Kebugaran / Umum',
      accentColor: 'lime',
    };
  }
  if (s.includes('seni') || s.includes('budaya')) {
    return {
      code: 'SNB',
      bgBadge: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
      category: 'Seni Budaya',
      accentColor: 'fuchsia',
    };
  }
  if (s.includes('sunda') || s.includes('jawa') || s.includes('daerah')) {
    return {
      code: 'MUL',
      bgBadge: 'bg-stone-100 text-stone-800 border-stone-200',
      category: 'Muatan Lokal',
      accentColor: 'stone',
    };
  }

  return {
    code: subject.substring(0, 3).toUpperCase(),
    bgBadge: 'bg-slate-100 text-slate-800 border-slate-200',
    category: 'Mata Pelajaran',
    accentColor: 'indigo',
  };
}

export const SubjectPickerModal: React.FC<SubjectPickerModalProps> = ({
  isOpen,
  onClose,
  subjects,
  selectedSubject,
  onSelectSubject,
  gradingConfigs,
  grades,
  totalStudents,
  examTitle = 'Ujian Madrasah / Sekolah',
  schoolName = 'MTs Manbaul Islam',
  teacherName,
  onExportSubjectExcel,
  onExportAllSubjectsExcel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'scored' | 'unscored' | 'pai' | 'umum'>('all');

  // Precalculate stats for each subject
  const subjectStats = useMemo(() => {
    const map = new Map<string, {
      totalGraded: number;
      progressPercent: number;
      avgScore: number | null;
      config: SubjectGradingConfig;
      theme: ReturnType<typeof getSubjectTheme>;
    }>();

    subjects.forEach((sub) => {
      const config = gradingConfigs[sub] || getDefaultSubjectConfig(sub);
      const subGrades = grades.filter((g) => g.subject === sub && typeof g.scoreFinal === 'number');
      const totalGraded = subGrades.length;
      const progressPercent = totalStudents > 0 ? Math.round((totalGraded / totalStudents) * 100) : 0;
      
      let avgScore: number | null = null;
      if (totalGraded > 0) {
        const sum = subGrades.reduce((acc, g) => acc + g.scoreFinal, 0);
        avgScore = Math.round((sum / totalGraded) * 10) / 10;
      }

      map.set(sub, {
        totalGraded,
        progressPercent,
        avgScore,
        config,
        theme: getSubjectTheme(sub),
      });
    });

    return map;
  }, [subjects, gradingConfigs, grades, totalStudents]);

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      const stats = subjectStats.get(sub);
      if (!stats) return true;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = sub.toLowerCase().includes(q);
        const matchCategory = stats.theme.category.toLowerCase().includes(q);
        const matchCode = stats.theme.code.toLowerCase().includes(q);
        if (!matchName && !matchCategory && !matchCode) return false;
      }

      // Category filter
      if (categoryFilter === 'scored') {
        if (stats.totalGraded === 0) return false;
      } else if (categoryFilter === 'unscored') {
        if (stats.totalGraded > 0) return false;
      } else if (categoryFilter === 'pai') {
        if (!stats.theme.category.includes('Keagamaan') && !stats.theme.category.includes('PAI')) return false;
      } else if (categoryFilter === 'umum') {
        if (!stats.theme.category.includes('Umum') && !stats.theme.category.includes('Kewarganegaraan')) return false;
      }

      return true;
    });
  }, [subjects, searchQuery, categoryFilter, subjectStats]);

  if (!isOpen) return null;

  const handlePick = (sub: string) => {
    onSelectSubject(sub);
    onClose();
  };

  const gradedSubjectsCount = subjects.filter((s) => (subjectStats.get(s)?.totalGraded || 0) > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-800 via-indigo-700 to-indigo-800 text-white p-5 sm:p-6 shrink-0 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs border border-white/25 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Portal Nilai Guru Mata Pelajaran
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-900/60 text-purple-200 text-[10px] font-semibold">
                  {subjects.length} Mapel Tersedia
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 text-[10px] font-semibold border border-emerald-400/30">
                  {totalStudents} Siswa Terdaftar
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <BookOpen className="w-6 h-6 text-purple-200" />
                <span>Pilih Mata Pelajaran Yang Mau Di-Input Nilainya</span>
              </h3>
              <p className="text-xs sm:text-sm text-purple-100/90 max-w-2xl leading-relaxed">
                Silakan pilih salah satu mata pelajaran di bawah untuk membuka form penilaian benar-salah siswa. Sistem otomatis menghitung skor PG &amp; Esai (jika benar semua = 100).
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Notice Pill */}
          <div className="mt-3 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs text-purple-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Mapel sedang aktif: <strong className="underline underline-offset-2">{selectedSubject}</strong></span>
            </div>
            {teacherName && (
              <span className="text-[11px] text-purple-200">
                Guru: <strong>{teacherName}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama mata pelajaran (contoh: Matematika, IPA, Fikih, Bahasa Indonesia)..."
                className="w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-2xs"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Semua ({subjects.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('scored')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  categoryFilter === 'scored'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Sudah Diisi ({gradedSubjectsCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('unscored')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  categoryFilter === 'unscored'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Belum Diisi ({subjects.length - gradedSubjectsCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('pai')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  categoryFilter === 'pai'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                PAI / Agama
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('umum')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  categoryFilter === 'umum'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Umum
              </button>
            </div>
          </div>
        </div>

        {/* Subject Grid / List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
          {filteredSubjects.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-2xs">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Mata Pelajaran Tidak Ditemukan</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Tidak ada mata pelajaran yang cocok dengan pencarian &quot;{searchQuery}&quot; atau filter terpilih.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                }}
                className="mt-3 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Reset Pencarian &amp; Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSubjects.map((sub) => {
                const stats = subjectStats.get(sub);
                const isSelected = selectedSubject === sub;
                const totalGraded = stats?.totalGraded || 0;
                const progressPercent = stats?.progressPercent || 0;
                const avgScore = stats?.avgScore;
                const config = stats?.config || getDefaultSubjectConfig(sub);
                const theme = stats?.theme || getSubjectTheme(sub);

                return (
                  <div
                    key={sub}
                    onClick={() => handlePick(sub)}
                    className={`group p-4 rounded-xl border transition-all cursor-pointer relative bg-white flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-purple-600 ring-2 ring-purple-500/20 shadow-md bg-purple-50/20'
                        : 'border-slate-200 hover:border-purple-300 hover:shadow-md hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Top Card Row */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${theme.bgBadge} shadow-2xs`}>
                            {theme.code}
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                              {theme.category}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight">
                              {sub}
                            </h4>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs shrink-0">
                            <Check className="w-3 h-3" />
                            Aktif
                          </span>
                        )}
                      </div>

                      {/* Question Config Pill */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 mt-2.5 pt-2 border-t border-slate-100">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold border border-slate-200">
                          {config.totalPgQuestions ?? 40} PG ({config.weightPg ?? 70}%)
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold border border-slate-200">
                          {config.totalEssayQuestions ?? 5} Esai ({config.weightEssay ?? 30}%)
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-50 rounded text-emerald-800 font-bold border border-emerald-200">
                          KKM {config.kkm || DEFAULT_KKM}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Stats */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>Status Nilai:</span>
                        </span>
                        <span className="font-semibold text-slate-800">
                          {totalGraded === 0 ? (
                            <span className="text-slate-400 font-normal">Belum diinput (0/{totalStudents})</span>
                          ) : (
                            <span>
                              {totalGraded}/{totalStudents} Siswa ({progressPercent}%)
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Progress Track */}
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            progressPercent === 100
                              ? 'bg-emerald-500'
                              : progressPercent > 0
                              ? 'bg-purple-600'
                              : 'bg-transparent'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>

                      {avgScore !== null && (
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                          <span>Rata-rata Skor:</span>
                          <span className="font-bold text-purple-700">{avgScore} / 100</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center gap-2">
                      {isSelected ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePick(sub);
                          }}
                          className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Input Nilai</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePick(sub);
                          }}
                          className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        >
                          <span>Pilih Mapel</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onExportSubjectExcel && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onExportSubjectExcel(sub);
                          }}
                          title={`Download nilai mapel ${sub} format Excel (.xlsx)`}
                          className="py-2 px-2.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs transition-colors cursor-pointer shrink-0"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Excel</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 text-center sm:text-left">
            💡 <strong>Tips:</strong> Anda bisa langsung klik tombol hijau <strong>Excel</strong> pada setiap mapel di atas untuk mengunduh rekap nilainya.
          </p>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onExportAllSubjectsExcel && (
              <button
                type="button"
                onClick={onExportAllSubjectsExcel}
                className="px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Download seluruh nilai semua mata pelajaran ke dalam satu file Excel (multi-sheet)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Download Semua Mapel (.xlsx)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Lanjutkan dengan {selectedSubject}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
