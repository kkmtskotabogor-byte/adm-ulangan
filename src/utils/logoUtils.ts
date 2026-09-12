// Utilities for school/madrasah logos: file reader, auto-compressor, and SVG presets

/**
 * Resizes and converts an uploaded Image File into a compact base64 Data URL.
 * Automatically limits dimension to maxDimension (default 400px) to maintain
 * crisp print resolution while avoiding localStorage quota limits.
 */
export async function processLogoFile(file: File, maxDimension = 400): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File yang diunggah harus berupa gambar (PNG, JPG, SVG, WebP).');
  }

  // If SVG, read as text or direct data URL to preserve vector quality
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
 * Clean SVG Preset for Kementerian Agama (Kemenag RI - Ikhlas Beramal)
 * Suitable for MTs (Madrasah Tsanawiyah), MA, MI.
 */
export const PRESET_LOGO_KEMENAG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <!-- Outer Pentagon / Shield -->
  <polygon points="50,4 96,36 78,92 22,92 4,36" fill="#0b5e28" stroke="#f59e0b" stroke-width="2.5" stroke-linejoin="round"/>
  <!-- Inner Ring / Shield -->
  <polygon points="50,9 91,38 75,88 25,88 9,38" fill="#15803d" stroke="#fef08a" stroke-width="1.2" stroke-linejoin="round"/>
  <!-- Circular White Badge -->
  <circle cx="50" cy="48" r="28" fill="#ffffff" stroke="#f59e0b" stroke-width="1.5"/>
  <!-- Islamic Star & Crescent / Center Symbolism -->
  <polygon points="50,28 53,35 61,35 55,40 57,48 50,43 43,48 45,40 39,35 47,35" fill="#f59e0b" stroke="#000" stroke-width="0.5"/>
  <!-- Scales of Justice (Timbangan) -->
  <line x1="36" y1="46" x2="64" y2="46" stroke="#000" stroke-width="1.5"/>
  <line x1="50" y1="42" x2="50" y2="58" stroke="#000" stroke-width="1.5"/>
  <polygon points="36,46 32,53 40,53" fill="#f59e0b" stroke="#000" stroke-width="0.8"/>
  <polygon points="64,46 60,53 68,53" fill="#f59e0b" stroke="#000" stroke-width="0.8"/>
  <!-- Holy Book (Kitab Suci Al-Qur'an) -->
  <path d="M40,58 C45,56 48,57 50,59 C52,57 55,56 60,58 L60,66 C55,64 52,65 50,67 C48,65 45,64 40,66 Z" fill="#ffffff" stroke="#000" stroke-width="1.2"/>
  <line x1="50" y1="59" x2="50" y2="67" stroke="#000" stroke-width="1.2"/>
  <!-- Ribbon base: IKHLAS BERAMAL -->
  <path d="M22,78 Q50,86 78,78 L75,84 Q50,91 25,84 Z" fill="#fef08a" stroke="#000" stroke-width="1"/>
  <text x="50" y="83" font-family="sans-serif" font-size="5" font-weight="900" text-anchor="middle" fill="#000">IKHLAS BERAMAL</text>
</svg>
`)}`;

/**
 * Clean SVG Preset for Madrasah Tsanawiyah (MTs Custom Logo)
 */
export const PRESET_LOGO_MTS = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <!-- Outer Green Shield -->
  <path d="M50 5 L88 20 C88 56 50 92 50 92 C50 92 12 56 12 20 Z" fill="#047857" stroke="#f59e0b" stroke-width="2.5" />
  <!-- Inner Shield -->
  <path d="M50 11 L82 24 C82 52 50 84 50 84 C50 84 18 52 18 24 Z" fill="#f0fdf4" stroke="#065f46" stroke-width="1.2" />
  <!-- Crescent & Star -->
  <path d="M48 24 A 12 12 0 1 0 62 44 A 14 14 0 1 1 48 24 Z" fill="#f59e0b" stroke="#000" stroke-width="0.5"/>
  <polygon points="62,26 64,30 68,30 65,33 66,37 62,34 58,37 59,33 56,30 60,30" fill="#f59e0b" stroke="#000" stroke-width="0.5"/>
  <!-- Open Book (Al-Qur'an / Ilmu) -->
  <path d="M30 52 C38 48 46 50 50 54 C54 50 62 48 70 52 L70 68 C62 64 54 66 50 70 C46 66 38 64 30 68 Z" fill="#ffffff" stroke="#000" stroke-width="1.5" />
  <path d="M50 54 L50 70" stroke="#000" stroke-width="1.5" />
  <!-- Golden Ribbon Base -->
  <path d="M26 77 Q50 87 74 77" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
  <text x="50" y="84" font-family="sans-serif" font-size="6" font-weight="900" text-anchor="middle" fill="#065f46">MTS</text>
</svg>
`)}`;

/**
 * Clean SVG Preset for Tut Wuri Handayani (Kemdikbud)
 */
export const PRESET_LOGO_TUTWURI = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <!-- Blue Shield -->
  <polygon points="50,6 94,36 78,92 22,92 6,36" fill="#0284c7" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
  <polygon points="50,11 89,38 75,87 25,87 11,38" fill="#e0f2fe" stroke="#0369a1" stroke-width="1.2" stroke-linejoin="round"/>
  <!-- Blencong / Api Tut Wuri -->
  <circle cx="50" cy="38" r="8" fill="#f59e0b" stroke="#000" stroke-width="0.8"/>
  <path d="M46 38 C46 30 50 24 50 24 C50 24 54 30 54 38 Z" fill="#ef4444" stroke="#000" stroke-width="0.8"/>
  <!-- Burung Garuda Wing Stylization -->
  <path d="M30 46 Q50 56 70 46 Q50 68 30 46 Z" fill="#ffffff" stroke="#000" stroke-width="1.2"/>
  <!-- Buku Terbuka -->
  <path d="M34 60 C42 56 48 58 50 61 C52 58 58 56 66 60 L66 72 C58 68 52 70 50 73 C48 70 42 68 34 72 Z" fill="#ffffff" stroke="#000" stroke-width="1.2"/>
  <line x1="50" y1="61" x2="50" y2="73" stroke="#000" stroke-width="1.2"/>
  <text x="50" y="83" font-family="sans-serif" font-size="4.5" font-weight="900" text-anchor="middle" fill="#000">TUT WURI HANDAYANI</text>
</svg>
`)}`;
