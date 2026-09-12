/**
 * Utilities for Signature (TTD) and Stamp (Stempel) upload, processing, and SVG presets.
 */

/**
 * Resizes and converts an uploaded Image File into an optimized base64 Data URL.
 * Preserves alpha transparency for PNGs and SVGs.
 */
export async function processSignatureOrStampFile(file: File, maxDimension = 400): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File yang diunggah harus berupa gambar (PNG, JPG, SVG, WebP).');
  }

  // If SVG, read as text / direct data URL to preserve vector crispness
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Export as PNG for transparency support
        const dataUrl = canvas.toDataURL('image/png', 0.92);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Gagal memproses file gambar.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Generate an authentic circular Madrasah/School stamp SVG using the custom school name.
 * Uses traditional stamp-ink purple/indigo color (#4338ca) with concentric borders and stars.
 */
export function createDynamicMadrasahStamp(schoolName: string = 'MTS MANBAUL ISLAM', district: string = 'KABUPATEN BOGOR'): string {
  const cleanSchool = schoolName.toUpperCase().slice(0, 32);
  const cleanDistrict = (district || 'PANITIA UJIAN').toUpperCase().slice(0, 24);

  const svg = `
<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Top arc for School / Ministry Name -->
    <path id="stamp_arc_top" d="M 22,80 A 58,58 0 1,1 138,80" fill="none" />
    <!-- Bottom arc for District / Location -->
    <path id="stamp_arc_bottom" d="M 138,80 A 58,58 0 0,1 22,80" fill="none" />
  </defs>

  <!-- Outer Double Concentric Circles -->
  <circle cx="80" cy="80" r="74" fill="none" stroke="#4338ca" stroke-width="3" />
  <circle cx="80" cy="80" r="69" fill="none" stroke="#4338ca" stroke-width="1" stroke-dasharray="3 1" />
  <circle cx="80" cy="80" r="50" fill="none" stroke="#4338ca" stroke-width="1.8" />

  <!-- Top Text on Arc (School Name) -->
  <text font-family="'Arial', 'Helvetica', sans-serif" font-size="9.5" font-weight="900" fill="#4338ca" letter-spacing="0.5">
    <textPath href="#stamp_arc_top" startOffset="50%" text-anchor="middle">
      ${cleanSchool}
    </textPath>
  </text>

  <!-- Side Stars separating Top and Bottom arcs -->
  <!-- Left Star -->
  <polygon points="20,80 22,76 25,78 23,81 24,84 20,82 17,84 18,81 15,78 19,76" fill="#4338ca" />
  <!-- Right Star -->
  <polygon points="140,80 142,76 145,78 143,81 144,84 140,82 137,84 138,81 135,78 139,76" fill="#4338ca" />

  <!-- Bottom Text on Arc (District / Panitia) -->
  <text font-family="'Arial', 'Helvetica', sans-serif" font-size="8.5" font-weight="bold" fill="#4338ca" letter-spacing="0.5">
    <textPath href="#stamp_arc_bottom" startOffset="50%" text-anchor="middle">
      ★ ${cleanDistrict} ★
    </textPath>
  </text>

  <!-- Center Badge / Emblem Lines -->
  <line x1="42" y1="67" x2="118" y2="67" stroke="#4338ca" stroke-width="1.6" />
  <line x1="42" y1="93" x2="118" y2="93" stroke="#4338ca" stroke-width="1.6" />

  <!-- Center Text -->
  <text x="80" y="77" font-family="'Arial', 'Helvetica', sans-serif" font-size="8.5" font-weight="900" text-anchor="middle" fill="#4338ca">
    PANITIA
  </text>
  <text x="80" y="87" font-family="'Arial', 'Helvetica', sans-serif" font-size="9" font-weight="900" text-anchor="middle" fill="#4338ca" letter-spacing="1">
    ASESMEN
  </text>
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Clean SVG Preset for Official Kementerian Agama (Kemenag) Stamp.
 */
export const PRESET_STAMP_KEMENAG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <path id="arc_kemenag_top" d="M 22,80 A 58,58 0 1,1 138,80" fill="none" />
    <path id="arc_kemenag_bot" d="M 138,80 A 58,58 0 0,1 22,80" fill="none" />
  </defs>
  <circle cx="80" cy="80" r="74" fill="none" stroke="#3730a3" stroke-width="3" />
  <circle cx="80" cy="80" r="50" fill="none" stroke="#3730a3" stroke-width="1.8" />
  <text font-family="Arial, sans-serif" font-size="9" font-weight="900" fill="#3730a3">
    <textPath href="#arc_kemenag_top" startOffset="50%" text-anchor="middle">
      KEMENTERIAN AGAMA REPUBLIK INDONESIA
    </textPath>
  </text>
  <polygon points="20,80 22,76 25,78 23,81 24,84 20,82 17,84 18,81 15,78 19,76" fill="#3730a3" />
  <polygon points="140,80 142,76 145,78 143,81 144,84 140,82 137,84 138,81 135,78 139,76" fill="#3730a3" />
  <text font-family="Arial, sans-serif" font-size="8.5" font-weight="bold" fill="#3730a3">
    <textPath href="#arc_kemenag_bot" startOffset="50%" text-anchor="middle">
      MADRASAH TSANAWIYAH
    </textPath>
  </text>
  <line x1="42" y1="67" x2="118" y2="67" stroke="#3730a3" stroke-width="1.6" />
  <line x1="42" y1="93" x2="118" y2="93" stroke="#3730a3" stroke-width="1.6" />
  <text x="80" y="78" font-family="Arial, sans-serif" font-size="8" font-weight="900" text-anchor="middle" fill="#3730a3">
    IKHLAS BERAMAL
  </text>
  <text x="80" y="87" font-family="Arial, sans-serif" font-size="7.5" font-weight="bold" text-anchor="middle" fill="#3730a3">
    PANITIA UJIAN
  </text>
</svg>
`)}`;

/**
 * Clean SVG Preset for Dinas Pendidikan / Sekolah Stamp in Blue/Indigo ink.
 */
export const PRESET_STAMP_SEKOLAH = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <path id="arc_sch_top" d="M 22,80 A 58,58 0 1,1 138,80" fill="none" />
    <path id="arc_sch_bot" d="M 138,80 A 58,58 0 0,1 22,80" fill="none" />
  </defs>
  <circle cx="80" cy="80" r="74" fill="none" stroke="#1e40af" stroke-width="3" />
  <circle cx="80" cy="80" r="49" fill="none" stroke="#1e40af" stroke-width="1.8" />
  <text font-family="Arial, sans-serif" font-size="9" font-weight="900" fill="#1e40af">
    <textPath href="#arc_sch_top" startOffset="50%" text-anchor="middle">
      PANITIA PENILAIAN &amp; ASESMEN
    </textPath>
  </text>
  <polygon points="20,80 22,76 25,78 23,81 24,84 20,82 17,84 18,81 15,78 19,76" fill="#1e40af" />
  <polygon points="140,80 142,76 145,78 143,81 144,84 140,82 137,84 138,81 135,78 139,76" fill="#1e40af" />
  <text font-family="Arial, sans-serif" font-size="8.5" font-weight="bold" fill="#1e40af">
    <textPath href="#arc_sch_bot" startOffset="50%" text-anchor="middle">
      RESMI SEKOLAH
    </textPath>
  </text>
  <line x1="42" y1="67" x2="118" y2="67" stroke="#1e40af" stroke-width="1.6" />
  <line x1="42" y1="93" x2="118" y2="93" stroke="#1e40af" stroke-width="1.6" />
  <text x="80" y="78" font-family="Arial, sans-serif" font-size="8.5" font-weight="900" text-anchor="middle" fill="#1e40af">
    UJIAN SEKOLAH
  </text>
  <text x="80" y="87" font-family="Arial, sans-serif" font-size="8" font-weight="bold" text-anchor="middle" fill="#1e40af">
    TERVERIFIKASI
  </text>
</svg>
`)}`;

/**
 * Clean SVG Preset for Realistic Blue Ink Digital Signature.
 */
export const PRESET_SIGNATURE_BLUE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg viewBox="0 0 240 90" xmlns="http://www.w3.org/2000/svg">
  <path d="M 22,64 C 36,25 44,18 52,36 C 58,50 63,72 73,42 C 78,28 88,32 94,54 C 100,66 112,46 122,48 C 134,50 144,40 156,52 C 166,62 172,38 184,44 C 196,50 206,46 216,48 M 38,58 Q 90,82 208,54 M 72,34 L 176,28" 
        fill="none" 
        stroke="#1d4ed8" 
        stroke-width="3" 
        stroke-linecap="round" 
        stroke-linejoin="round" />
</svg>
`)}`;

/**
 * Clean SVG Preset for Realistic Black Ink Digital Signature.
 */
export const PRESET_SIGNATURE_BLACK = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg viewBox="0 0 240 90" xmlns="http://www.w3.org/2000/svg">
  <path d="M 20,60 C 35,22 46,16 54,34 C 60,48 64,70 76,40 C 82,26 90,30 96,52 C 102,64 114,44 126,46 C 138,48 148,38 160,50 C 170,60 176,36 188,42 C 200,48 210,44 220,46 M 34,56 Q 88,80 214,52 M 68,32 L 180,26" 
        fill="none" 
        stroke="#0f172a" 
        stroke-width="3.2" 
        stroke-linecap="round" 
        stroke-linejoin="round" />
</svg>
`)}`;
