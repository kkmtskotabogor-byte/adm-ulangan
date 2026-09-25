import React from 'react';
import { Scissors, CheckSquare, Square } from 'lucide-react';
import { ExamConfig } from '../types';

export interface SimpleDispensationData {
  studentName: string;
  className: string;
  examNumber: string;
  roomName: string;
  subject: string;
  dayDate: string;
  timeRange: string;
  reason: string;
  letterNumber: string;
  checkIn: boolean; // Ijin Masuk Ruangan
  checkOut: boolean; // Ijin Keluar Ruangan
  notes: string;
}

interface SimpleDispensationSlipSheetProps {
  config: ExamConfig;
  data: SimpleDispensationData;
  isBlankMode: boolean; // Jika true, kosongkan teks dengan titik-titik siap tulis pulpen
  slipsPerPage?: 2 | 3; // 2 slip (setengah A4) atau 3 slip (hemat)
  pageCopies?: number; // Jumlah lembar cetak
}

export const SimpleDispensationSlipSheet: React.FC<SimpleDispensationSlipSheetProps> = ({
  config,
  data,
  isBlankMode,
  slipsPerPage = 2,
  pageCopies = 1,
}) => {
  const isMadrasah = ['MTs', 'MA', 'MI'].includes(config.schoolLevel);
  const totalSheets = Math.max(1, Math.min(20, pageCopies));
  const sheetArray = Array.from({ length: totalSheets }, (_, i) => i);
  const slipCount = slipsPerPage === 3 ? 3 : 2;
  const slipsArray = Array.from({ length: slipCount }, (_, i) => i);

  // Default / fallback letter number
  const defaultLetterNumber = data.letterNumber || `421/....../PAN-${config.examType || 'UJIAN'}/DISP/${new Date().getFullYear()}`;

  return (
    <div className="space-y-8 print:space-y-0 max-w-[210mm] mx-auto text-slate-950">
      {sheetArray.map((sheetIdx) => (
        <div
          key={`sheet-${sheetIdx}`}
          className={`bg-white p-6 sm:p-8 border border-slate-300 rounded-xl shadow-xs print:shadow-none print:border-none print:m-0 print:p-5 min-h-[297mm] max-h-[297mm] page-break-after-always flex flex-col justify-between ${
            slipsPerPage === 3 ? 'gap-2' : 'gap-4'
          }`}
        >
          {slipsArray.map((slipIdx) => {
            const isLastSlip = slipIdx === slipsArray.length - 1;
            return (
              <React.Fragment key={`slip-${slipIdx}`}>
                <div
                  className={`border-2 border-slate-900 rounded-lg bg-white relative flex flex-col justify-between ${
                    slipsPerPage === 3 ? 'p-3 text-[10px] h-[86mm]' : 'p-4 text-[11px] h-[134mm]'
                  }`}
                >
                  {/* Header / Kop Sekolah */}
                  <div>
                    <div className="flex items-center gap-2.5 border-b-2 border-slate-950 pb-1.5">
                      {config.logoUrl && (
                        <div
                          className={`shrink-0 flex items-center justify-center ${
                            slipsPerPage === 3 ? 'w-10 h-10' : 'w-12 h-12'
                          }`}
                        >
                          <img
                            src={config.logoUrl}
                            alt="Logo Sekolah"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1 text-center font-serif leading-tight">
                        <div className="text-[9px] uppercase font-bold text-slate-700 tracking-wider">
                          {isMadrasah
                            ? `KEMENTERIAN AGAMA REPUBLIK INDONESIA — ${config.district.toUpperCase()}`
                            : `PEMERINTAH PROVINSI ${config.province.toUpperCase()} — DINAS PENDIDIKAN`}
                        </div>
                        <div
                          className={`font-black uppercase text-slate-950 tracking-wide mt-0.5 ${
                            slipsPerPage === 3 ? 'text-xs' : 'text-sm'
                          }`}
                        >
                          PANITIA {config.examTitle.toUpperCase()}
                        </div>
                        <div
                          className={`font-black uppercase text-slate-950 ${
                            slipsPerPage === 3 ? 'text-sm' : 'text-base'
                          }`}
                        >
                          {config.schoolName}
                        </div>
                        <div className="text-[8.5px] font-sans text-slate-600 mt-0.5">
                          {config.address} • Telp: {config.phone} • TA: {config.academicYear}
                        </div>
                      </div>
                    </div>
                    <div className="border-b border-slate-950 mt-0.5"></div>

                    {/* Judul & Nomor Surat */}
                    <div className="text-center my-1.5">
                      <div className="inline-block">
                        <span
                          className={`font-black uppercase tracking-wider text-slate-950 border-b-2 border-slate-950 ${
                            slipsPerPage === 3 ? 'text-xs' : 'text-[13px]'
                          }`}
                        >
                          SURAT DISPENSASI / IZIN MASUK &amp; KELUAR RUANGAN
                        </span>
                        <div className="text-[9px] font-mono font-bold text-slate-800 mt-0.5">
                          Nomor: {defaultLetterNumber}
                        </div>
                      </div>
                    </div>

                    {/* KOTAK CEKLIS IJIN MASUK DAN KELUAR RUANGAN */}
                    <div className="my-1.5 border-2 border-slate-950 bg-slate-50/80 rounded-md p-1.5 font-sans">
                      <div className="text-[9px] font-black uppercase text-slate-700 mb-1 tracking-wider text-center">
                        JENIS PERIZINAN DISPENSASI UJIAN:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Kotak Ceklis Ijin Masuk */}
                        <div
                          className={`flex items-start gap-2 p-1 rounded border ${
                            !isBlankMode && data.checkIn
                              ? 'border-indigo-600 bg-indigo-50/60 font-bold'
                              : 'border-slate-400 bg-white font-semibold'
                          }`}
                        >
                          <div className="w-4 h-4 mt-0.5 border-2 border-slate-950 rounded flex items-center justify-center text-xs shrink-0 bg-white">
                            {!isBlankMode && data.checkIn ? (
                              <span className="font-black text-slate-950 leading-none">✓</span>
                            ) : null}
                          </div>
                          <div className="leading-tight">
                            <span className="text-[10px] font-black uppercase text-slate-950 block">
                              [ &nbsp; ] IJIN MASUK RUANGAN
                            </span>
                            <span className="text-[8px] text-slate-600 block">
                              Terlambat hadir / Dispensasi Panitia / Selesai urusan
                            </span>
                          </div>
                        </div>

                        {/* Kotak Ceklis Ijin Keluar */}
                        <div
                          className={`flex items-start gap-2 p-1 rounded border ${
                            !isBlankMode && data.checkOut
                              ? 'border-indigo-600 bg-indigo-50/60 font-bold'
                              : 'border-slate-400 bg-white font-semibold'
                          }`}
                        >
                          <div className="w-4 h-4 mt-0.5 border-2 border-slate-950 rounded flex items-center justify-center text-xs shrink-0 bg-white">
                            {!isBlankMode && data.checkOut ? (
                              <span className="font-black text-slate-950 leading-none">✓</span>
                            ) : null}
                          </div>
                          <div className="leading-tight">
                            <span className="text-[10px] font-black uppercase text-slate-950 block">
                              [ &nbsp; ] IJIN KELUAR RUANGAN
                            </span>
                            <span className="text-[8px] text-slate-600 block">
                              Keperluan mendesak / Sakit / Mengambil berkas
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Formulir Data Siswa & Ujian */}
                    <div className="space-y-1 font-sans text-slate-900 mt-1.5">
                      <div className="flex items-center">
                        <span className="w-32 font-semibold text-slate-700 shrink-0">Nama Lengkap Siswa</span>
                        <span className="w-3 text-center font-bold">:</span>
                        <span className="flex-1 font-bold text-slate-950 uppercase border-b border-dotted border-slate-500 pb-0.5 min-h-[16px]">
                          {!isBlankMode && data.studentName ? data.studentName : '....................................................................................................'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center">
                          <span className="w-32 font-semibold text-slate-700 shrink-0">Kelas / Rombel</span>
                          <span className="w-3 text-center font-bold">:</span>
                          <span className="flex-1 font-bold text-slate-900 border-b border-dotted border-slate-500 pb-0.5 min-h-[16px]">
                            {!isBlankMode && data.className ? data.className : '................................'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-24 font-semibold text-slate-700 shrink-0">No. Peserta</span>
                          <span className="w-3 text-center font-bold">:</span>
                          <span className="flex-1 font-mono font-bold text-slate-900 border-b border-dotted border-slate-500 pb-0.5 min-h-[16px]">
                            {!isBlankMode && data.examNumber ? data.examNumber : '................................'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center">
                          <span className="w-32 font-semibold text-slate-700 shrink-0">Ruang Ujian</span>
                          <span className="w-3 text-center font-bold">:</span>
                          <span className="flex-1 font-semibold text-slate-900 border-b border-dotted border-slate-500 pb-0.5 min-h-[16px]">
                            {!isBlankMode && data.roomName ? data.roomName : '................................'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-24 font-semibold text-slate-700 shrink-0">Mata Pelajaran</span>
                          <span className="w-3 text-center font-bold">:</span>
                          <span className="flex-1 font-semibold text-slate-900 border-b border-dotted border-slate-500 pb-0.5 min-h-[16px]">
                            {!isBlankMode && data.subject ? data.subject : '................................'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center">
                          <span className="w-32 font-semibold text-slate-700 shrink-0">Hari, Tanggal</span>
                          <span className="w-3 text-center font-bold">:</span>
                          <span className="flex-1 font-semibold text-slate-900 border-b border-dotted border-slate-500 pb-0.5 min-h-[16px]">
                            {!isBlankMode && data.dayDate ? data.dayDate : '................................'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-24 font-semibold text-slate-700 shrink-0">Pukul / Jam Ke-</span>
                          <span className="w-3 text-center font-bold">:</span>
                          <span className="flex-1 font-semibold text-slate-900 border-b border-dotted border-slate-500 pb-0.5 min-h-[16px]">
                            {!isBlankMode && data.timeRange ? data.timeRange : '................................'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <span className="w-32 font-semibold text-slate-700 shrink-0 pt-0.5">Alasan / Keperluan</span>
                        <span className="w-3 text-center font-bold pt-0.5">:</span>
                        <span className="flex-1 text-slate-900 border-b border-dotted border-slate-500 pb-0.5 min-h-[16px]">
                          {!isBlankMode && data.reason ? data.reason : '....................................................................................................'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer & Tanda Tangan */}
                  <div className="mt-2 pt-1 border-t border-slate-400">
                    <div className="flex items-center justify-between text-[8px] text-slate-600 mb-1 italic">
                      <span>*Surat ini wajib diserahkan kepada Pengawas Ruang saat masuk / keluar ruang ujian.</span>
                      <span className="font-serif not-italic">
                        {config.issuePlace}, {!isBlankMode && data.dayDate ? data.dayDate : '................................ 2026'}
                      </span>
                    </div>

                    {/* 3 Signatures */}
                    <div className="grid grid-cols-3 gap-2 text-center font-sans">
                      {/* Siswa */}
                      <div className="flex flex-col justify-between h-14">
                        <p className="text-[8.5px] text-slate-700 font-medium">Siswa Ybs.,</p>
                        <div>
                          <p className="font-bold underline text-slate-900 uppercase truncate">
                            {!isBlankMode && data.studentName ? data.studentName : '(..........................................)'}
                          </p>
                        </div>
                      </div>

                      {/* Pengawas Ruang */}
                      <div className="flex flex-col justify-between h-14">
                        <p className="text-[8.5px] text-slate-700 font-medium">Pengawas Ruang,</p>
                        <div>
                          <p className="font-bold underline text-slate-900 uppercase">
                            (..........................................)
                          </p>
                        </div>
                      </div>

                      {/* Panitia / Piket */}
                      <div className="flex flex-col justify-between h-14 relative">
                        <p className="text-[8.5px] text-slate-700 font-medium">Panitia / Petugas Piket,</p>

                        {/* Stamp preview if enabled */}
                        {config.stampEnabled && config.stampUrl && (
                          <div
                            className="absolute left-1/2 top-2 pointer-events-none transform -translate-x-1/2"
                            style={{
                              width: '45px',
                              opacity: (config.stampOpacity || 90) / 100,
                              transform: `translateX(-50%) rotate(${config.stampRotation || -7}deg)`,
                            }}
                          >
                            <img src={config.stampUrl} alt="Cap" className="w-full h-auto object-contain" />
                          </div>
                        )}

                        <div>
                          <p className="font-bold underline text-slate-900 uppercase truncate">
                            {config.committeeHeadName || '(..........................................)'}
                          </p>
                          <p className="text-[7.5px] text-slate-500">
                            {config.committeeHeadNip ? `NIP: ${config.committeeHeadNip}` : 'Panitia Pelaksana'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Garis Potong (✂) Jika Bukan Slip Terakhir di Lembar Tersebut */}
                {!isLastSlip && (
                  <div className="relative my-1 text-center select-none no-print-optional">
                    <div className="border-t-2 border-dashed border-slate-400 w-full absolute top-1/2 -translate-y-1/2"></div>
                    <span className="relative bg-white px-3 text-[9px] font-mono text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1.5 mx-auto w-fit">
                      <Scissors className="w-3 h-3 text-slate-400 rotate-90" />
                      <span>Garis Potong Slip Dispensasi (✂)</span>
                    </span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
};
