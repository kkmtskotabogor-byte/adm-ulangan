import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Proctor, ExamRoom } from '../types';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Trash2,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Users
} from 'lucide-react';

interface ProctorExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: ExamRoom[];
  existingProctorsCount: number;
  onImportConfirm: (
    newProctors: Omit<Proctor, 'id'>[],
    replaceExisting: boolean
  ) => void;
}

interface ParsedProctorRow {
  name: string;
  nip: string;
  subject: string;
  role: 'Pengawas Ruang' | 'Pengawas Cadangan' | 'Koordinator';
  phone: string;
  assignedRoomCode?: string;
  assignedRoomId?: string;
  assignedPosition?: 1 | 2;
  isValid: boolean;
  validationError?: string;
}

export const ProctorExcelImportModal: React.FC<ProctorExcelImportModalProps> = ({
  isOpen,
  onClose,
  rooms,
  existingProctorsCount,
  onImportConfirm,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);

  // Paste text state
  const [pasteText, setPasteText] = useState('');

  // Parsed rows preview
  const [parsedRows, setParsedRows] = useState<ParsedProctorRow[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('replace');
  const [autoAssignEmptyRooms, setAutoAssignEmptyRooms] = useState(true);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // --- DOWNLOAD OFFICIAL TEMPLATE ---
  const handleDownloadTemplate = () => {
    // Generate clean template with header and realistic sample data
    const templateData = [
      {
        'No': 1,
        'Nama Lengkap (dengan Gelar)': 'Drs. H. Ahmad Fauzi, M.Pd.',
        'NIP / NUPTK': '19780512 200801 1 008',
        'Mata Pelajaran': 'Matematika',
        'Peran': 'Pengawas Ruang',
        'No WhatsApp': '081234567801',
        'Kode Ruang': '01',
      },
      {
        'No': 2,
        'Nama Lengkap (dengan Gelar)': 'Nurul Hidayati, S.Pd.I.',
        'NIP / NUPTK': '19820914 201001 2 015',
        'Mata Pelajaran': 'Akidah Akhlak',
        'Peran': 'Pengawas Ruang',
        'No WhatsApp': '081234567802',
        'Kode Ruang': '01',
      },
      {
        'No': 3,
        'Nama Lengkap (dengan Gelar)': 'Muhammad Rifa\'i, S.Ag.',
        'NIP / NUPTK': '19750318 200501 1 003',
        'Mata Pelajaran': 'Fiqih',
        'Peran': 'Pengawas Ruang',
        'No WhatsApp': '081234567803',
        'Kode Ruang': '02',
      },
      {
        'No': 4,
        'Nama Lengkap (dengan Gelar)': 'Siti Fatimah, S.Pd.',
        'NIP / NUPTK': '19881122 201402 2 004',
        'Mata Pelajaran': 'Bahasa Indonesia',
        'Peran': 'Pengawas Ruang',
        'No WhatsApp': '081234567804',
        'Kode Ruang': '02',
      },
      {
        'No': 5,
        'Nama Lengkap (dengan Gelar)': 'Bambang Supriyanto, S.Kom.',
        'NIP / NUPTK': '-',
        'Mata Pelajaran': 'Informatika',
        'Peran': 'Pengawas Cadangan',
        'No WhatsApp': '081234567805',
        'Kode Ruang': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 32 }, // Nama Lengkap
      { wch: 24 }, // NIP
      { wch: 22 }, // Mata Pelajaran
      { wch: 18 }, // Peran
      { wch: 16 }, // WhatsApp
      { wch: 14 }, // Kode Ruang
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Pengawas');

    // Instruction sheet
    const petunjukData = [
      { 'PETUNJUK PENGISIAN TEMPLATE EXCEL PENGAWAS': '' },
      { '1. Kolom "Nama Lengkap (dengan Gelar)" WAJIB diisi.': '' },
      { '2. Kolom NIP/NUPTK dapat diisi tanda strip (-) jika pengawas non-NIP.': '' },
      { '3. Kolom "Peran" dapat diisi: "Pengawas Ruang" atau "Pengawas Cadangan" atau "Koordinator".': '' },
      { '4. Kolom "Kode Ruang" opsional, bisa diisi format 2 angka (contoh: 01, 02, dst.) atau R-01 sesuai master ruangan.': '' },
      { '5. Anda dapat menambah baris sebanyak jumlah pengawas di sekolah/madrasah Anda.': '' },
    ];
    const wsPetunjuk = XLSX.utils.json_to_sheet(petunjukData, { skipHeader: true });
    wsPetunjuk['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk Pengisian');

    XLSX.writeFile(wb, 'Template_Data_Pengawas_Ujian.xlsx');
  };

  // --- SMART ROW PARSING LOGIC ---
  const processRawDataRows = (rawRows: any[][]) => {
    if (!rawRows || rawRows.length === 0) {
      setParsedRows([]);
      return;
    }

    // Find the header row index (looking for keywords: nama, guru, pengawas, nip)
    let headerIdx = -1;
    let colMap: Record<string, number> = {
      name: -1,
      nip: -1,
      subject: -1,
      role: -1,
      phone: -1,
      room: -1,
    };

    for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      const rowStr = row.map((c) => String(c || '').toLowerCase().trim());

      const nameCol = rowStr.findIndex((c) =>
        c.includes('nama') || c.includes('guru') || c.includes('pengawas') || c === 'nama lengkap'
      );
      const nipCol = rowStr.findIndex((c) =>
        c.includes('nip') || c.includes('nuptk') || c.includes('nik') || c.includes('pegid')
      );

      if (nameCol !== -1) {
        headerIdx = r;
        colMap.name = nameCol;
        colMap.nip = nipCol;
        colMap.subject = rowStr.findIndex((c) =>
          c.includes('mapel') || c.includes('mata pelajaran') || c.includes('bidang') || c.includes('pelajaran')
        );
        colMap.role = rowStr.findIndex((c) =>
          c.includes('peran') || c.includes('role') || c.includes('status') || c.includes('jabatan')
        );
        colMap.phone = rowStr.findIndex((c) =>
          c.includes('wa') || c.includes('whatsapp') || c.includes('hp') || c.includes('telepon') || c.includes('telp') || c.includes('kontak')
        );
        colMap.room = rowStr.findIndex((c) =>
          c.includes('ruang') || c.includes('room') || c.includes('kode ruang') || c.includes('penugasan')
        );
        break;
      }
    }

    // If no header detected, fallback to standard column sequence:
    // Col 0 or 1: Name, Col 1 or 2: NIP, Col 2 or 3: Mapel, Col 3 or 4: Phone
    const startIdx = headerIdx !== -1 ? headerIdx + 1 : 0;
    if (colMap.name === -1) {
      // Check first row type
      const firstRow = rawRows[0] || [];
      // If first column is number (like 1, 2, 3), name is probably in column 1
      const isCol0Number = !isNaN(Number(firstRow[0])) && String(firstRow[0]).trim() !== '';
      colMap = {
        name: isCol0Number ? 1 : 0,
        nip: isCol0Number ? 2 : 1,
        subject: isCol0Number ? 3 : 2,
        role: -1,
        phone: isCol0Number ? 4 : 3,
        room: isCol0Number ? 5 : 4,
      };
    }

    const results: ParsedProctorRow[] = [];

    for (let i = startIdx; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || !Array.isArray(row)) continue;

      const rawName = colMap.name !== -1 ? String(row[colMap.name] || '').trim() : '';
      if (!rawName || rawName.toLowerCase() === 'nama' || rawName.toLowerCase().includes('nama lengkap')) {
        continue; // Skip empty or repeated headers
      }

      const rawNip = colMap.nip !== -1 ? String(row[colMap.nip] || '').trim() : '-';
      const rawSubject = colMap.subject !== -1 ? String(row[colMap.subject] || '').trim() : '';
      const rawRole = colMap.role !== -1 ? String(row[colMap.role] || '').trim() : '';
      const rawPhone = colMap.phone !== -1 ? String(row[colMap.phone] || '').trim() : '';
      const rawRoom = colMap.room !== -1 ? String(row[colMap.room] || '').trim() : '';

      // Normalize Role
      let role: ParsedProctorRow['role'] = 'Pengawas Ruang';
      if (rawRole.toLowerCase().includes('cadangan')) {
        role = 'Pengawas Cadangan';
      } else if (rawRole.toLowerCase().includes('koordinator') || rawRole.toLowerCase().includes('ketua')) {
        role = 'Koordinator';
      }

      // Room matching if specified
      let matchedRoomId: string | undefined;
      let matchedRoomCode: string | undefined;

      if (rawRoom) {
        const cleanRoom = rawRoom.replace(/ruang/gi, '').trim();
        const matched = rooms.find((r) => {
          const rNum = r.roomCode.replace(/\D/g, '');
          const cleanNum = cleanRoom.replace(/\D/g, '');
          return (
            r.roomCode.toLowerCase() === rawRoom.toLowerCase() ||
            (cleanNum && rNum === cleanNum) ||
            r.name.toLowerCase().includes(rawRoom.toLowerCase())
          );
        });

        if (matched) {
          matchedRoomId = matched.id;
          matchedRoomCode = matched.roomCode;
        } else {
          matchedRoomCode = rawRoom;
        }
      }

      const isValid = rawName.length >= 2;
      results.push({
        name: rawName,
        nip: rawNip || '-',
        subject: rawSubject || 'Guru Mata Pelajaran',
        role,
        phone: rawPhone || '',
        assignedRoomCode: matchedRoomCode,
        assignedRoomId: matchedRoomId,
        isValid,
        validationError: isValid ? undefined : 'Nama terlalu pendek atau tidak valid',
      });
    }

    setParsedRows(results);
  };

  // --- HANDLE FILE SELECTION & READING ---
  const handleFile = (file: File) => {
    if (!file) return;

    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');

    const reader = new FileReader();

    // Support both XLSX/XLS binary and CSV text
    if (file.name.endsWith('.csv')) {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          // Parse CSV to 2D array
          const wb = XLSX.read(text, { type: 'string' });
          setWorkbook(wb);
          setSheetNames(wb.SheetNames);
          const firstSheet = wb.SheetNames[0];
          setSelectedSheet(firstSheet);
          const raw = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[firstSheet], { header: 1 });
          processRawDataRows(raw);
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        const firstSheet = wb.SheetNames[0];
        setSelectedSheet(firstSheet);
        const raw = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[firstSheet], { header: 1 });
        processRawDataRows(raw);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleSheetChange = (sheet: string) => {
    setSelectedSheet(sheet);
    if (workbook && workbook.Sheets[sheet]) {
      const raw = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[sheet], { header: 1 });
      processRawDataRows(raw);
    }
  };

  // --- HANDLE PASTE TEXT (TAB-SEPARATED) ---
  const handlePasteChange = (text: string) => {
    setPasteText(text);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    const rawRows = lines.map((line) => line.split('\t'));
    processRawDataRows(rawRows);
  };

  // --- CONFIRM IMPORT ---
  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    // Distribute empty rooms sequentially if requested
    let currentRoomIdx = 0;
    let currentPos: 1 | 2 = 1;

    const toImport: Omit<Proctor, 'id'>[] = validRows.map((r) => {
      let roomId = r.assignedRoomId;
      let roomCode = r.assignedRoomCode;
      let pos = r.assignedPosition;

      if (!roomId && autoAssignEmptyRooms && r.role === 'Pengawas Ruang' && rooms.length > 0) {
        const assignedRoom = rooms[currentRoomIdx % rooms.length];
        if (assignedRoom) {
          roomId = assignedRoom.id;
          roomCode = assignedRoom.roomCode;
          pos = currentPos;

          if (currentPos === 1) {
            currentPos = 2;
          } else {
            currentPos = 1;
            currentRoomIdx++;
          }
        }
      }

      return {
        name: r.name,
        nip: r.nip,
        subject: r.subject,
        role: r.role,
        phone: r.phone,
        assignedRoomId: roomId,
        assignedRoomCode: roomCode,
        assignedPosition: pos,
      };
    });

    onImportConfirm(toImport, importMode === 'replace');
    onClose();
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-snug">
                  Import Data Pengawas Ruang dari File Excel
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 border border-emerald-400/40 text-emerald-100">
                  .XLSX • .XLS • .CSV
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Unggah file Excel daftar guru pengawas madrasah/sekolah untuk di-plot ke ruangan secara instan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP BAR: DOWNLOAD TEMPLATE & INPUT MODE SWITCHER */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Method Tabs */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-700" />
              <span>Upload File Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              <span>Copy-Paste dari Spreadsheet</span>
            </button>
          </div>

          {/* Download Template Button */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Unduh Template Excel Pengawas</span>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: FILE UPLOAD (DRAG & DROP) */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                className="hidden"
              />

              {!fileName ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    dragOver
                      ? 'border-emerald-500 bg-emerald-50/80 scale-[0.99]'
                      : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 bg-slate-50/60'
                  }`}
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Klik untuk memilih file Excel, atau seret file ke sini
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Mendukung file berekstensi <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>. Sistem otomatis mengenali kolom Nama, NIP, Mapel, dan Ruang.
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Pilih dari Komputer
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-700 text-white rounded-lg">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>{fileName}</span>
                        {fileSize && (
                          <span className="text-[10px] text-slate-500 font-mono">({fileSize})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-emerald-800 mt-0.5">
                        {sheetNames.length > 1 ? (
                          <div className="flex items-center gap-2 mt-1">
                            <span>Pilih Sheet:</span>
                            <select
                              value={selectedSheet}
                              onChange={(e) => handleSheetChange(e.target.value)}
                              className="bg-white border border-emerald-300 rounded px-2 py-0.5 text-xs font-semibold text-slate-800"
                            >
                              {sheetNames.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span>File berhasil dimuat dan dibaca.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 rounded-md border border-emerald-300 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Ganti File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFileName(null);
                        setFileSize(null);
                        setWorkbook(null);
                        setParsedRows([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COPY-PASTE DIRECT */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700">
                  Tempel (Paste) baris dari Excel atau Google Spreadsheet:
                </label>
                <span className="text-[11px] text-slate-500">
                  Kolom otomatis: Nama [Tab] NIP [Tab] Mapel [Tab] WA [Tab] Ruang
                </span>
              </div>
              <textarea
                rows={5}
                value={pasteText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder={`Drs. H. Ahmad Fauzi, M.Pd.\t19780512 200801 1 008\tMatematika\t081234567801\t01\nNurul Hidayati, S.Pd.I.\t19820914 201001 2 015\tAkidah Akhlak\t081234567802\t01`}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-[11px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          )}

          {/* PARSED PREVIEW SECTION */}
          {parsedRows.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Pratinjau Hasil Pembacaan Data:
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {validCount} Pengawas Valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      {invalidCount} Baris Diabaikan
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500">
                  Menampilkan {Math.min(parsedRows.length, 10)} dari {parsedRows.length} data
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-2.5 w-10 text-center">No</th>
                      <th className="py-2 px-3">Nama Pengawas</th>
                      <th className="py-2 px-3">NIP / NUPTK</th>
                      <th className="py-2 px-3">Mata Pelajaran</th>
                      <th className="py-2 px-2.5 text-center">Peran</th>
                      <th className="py-2 px-2.5 text-center">Ruang</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {parsedRows.slice(0, 15).map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.isValid
                            ? 'hover:bg-slate-50'
                            : 'bg-rose-50/70 text-rose-700'
                        }
                      >
                        <td className="py-1.5 px-2.5 text-center text-slate-500 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-slate-900">
                          {row.name}
                          {!row.isValid && (
                            <span className="block text-[10px] text-rose-600 font-normal">
                              {row.validationError}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-[11px] text-slate-600">
                          {row.nip}
                        </td>
                        <td className="py-1.5 px-3 text-slate-700">
                          {row.subject}
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              row.role === 'Pengawas Cadangan'
                                ? 'bg-amber-100 text-amber-800'
                                : row.role === 'Koordinator'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-indigo-50 text-indigo-700'
                            }`}
                          >
                            {row.role}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-center font-mono text-[11px] font-bold text-slate-800">
                          {row.assignedRoomCode ? (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                              {row.assignedRoomCode}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">
                              {autoAssignEmptyRooms ? 'Otomatis' : '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 15 && (
                <p className="text-[10px] text-center text-slate-500 italic">
                  ... dan {parsedRows.length - 15} baris pengawas lainnya akan turut di-import.
                </p>
              )}

              {/* IMPORT SETTINGS / OPTIONS */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-700" />
                  <span>Opsi Penyimpanan Data Pengawas</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'bg-white border-emerald-500 shadow-2xs'
                        : 'border-slate-200 hover:bg-white/60 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">
                        Gantikan Seluruh Data Pengawas
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Hapus {existingProctorsCount} pengawas lama, lalu ganti dengan {validCount} pengawas baru dari Excel ini.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'append'
                        ? 'bg-white border-emerald-500 shadow-2xs'
                        : 'border-slate-200 hover:bg-white/60 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">
                        Tambahkan ke Data yang Ada (Merge)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Simpan pengawas yang sudah ada ({existingProctorsCount}), lalu tambahkan {validCount} pengawas baru di bawahnya.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
                    <input
                      type="checkbox"
                      checked={autoAssignEmptyRooms}
                      onChange={(e) => setAutoAssignEmptyRooms(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      <strong>Plotting Ruang Otomatis:</strong> Bagi pengawas ke Ruang 01, Ruang 02, dst. secara berpasangan jika kolom ruang di Excel kosong.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Format yang didukung: Nama, NIP, Mapel, No WA, Kode Ruang.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={validCount === 0}
              onClick={handleConfirmImport}
              className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer ${
                validCount > 0
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Import {validCount} Data Pengawas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
