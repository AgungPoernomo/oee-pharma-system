import fs from 'fs';
import path from 'path';

// 1. DAFTAR PENGECUALIAN (Folder/file yang tidak akan ditampilkan)
const IGNORE_LIST = [
    'node_modules', 
    '.git', 
    '.vscode', 
    'dist', 
    'package-lock.json',
    'generate-map.js' // Abaikan script ini sendiri
];

// 2. KAMUS DESKRIPSI (Tambahkan atau ubah sesuai kebutuhan project Anda)
const DESCRIPTIONS = {
    'src': 'Folder utama source code aplikasi',
    'pages': 'Kumpulan file antarmuka (UI/UX) HTML',
    'js': 'Logika JavaScript (Frontend & Integrasi Data)',
    'config': 'Konfigurasi sistem (API, Variabel Global)',
    'assets': 'Aset statis seperti gambar, ikon, dan font',
    'index.html': 'Halaman utama (Pintu masuk / Login System)',
    'package.json': 'Konfigurasi project Node.js dan dependensi',
    'PROJECT_MAP.md': 'Dokumentasi struktur project (Auto-generated)'
};

function generateTree(dir, prefix = '') {
    let output = '';
    
    // Baca direktori dan filter file/folder yang masuk IGNORE_LIST
    const items = fs.readdirSync(dir)
        .filter(item => !IGNORE_LIST.includes(item))
        .sort((a, b) => {
            // Urutkan: folder di atas, file di bawah
            const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
            const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.localeCompare(b);
        });

    items.forEach((item, index) => {
        const isLast = index === items.length - 1;
        const itemPath = path.join(dir, item);
        const isDirectory = fs.statSync(itemPath).isDirectory();

        // Simbol cabang tree
        const pointer = isLast ? '└── ' : '├── ';
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');

        // Sisipkan deskripsi jika tersedia di kamus
        const desc = DESCRIPTIONS[item] ? ` // ${DESCRIPTIONS[item]}` : '';

        output += `${prefix}${pointer}${item}${desc}\n`;

        // Rekursif jika item adalah sebuah folder
        if (isDirectory) {
            output += generateTree(itemPath, nextPrefix);
        }
    });

    return output;
}

// 3. FORMATTING OUTPUT (Bentuk Markdown agar rapi saat dibaca di VS Code/GitHub)
const projectName = path.basename(process.cwd()).toUpperCase();
const header = `# Struktur Project: ${projectName}\n\n\`\`\`text\n${projectName}/\n`;
const footer = `\n\`\`\`\n\n*Terakhir diperbarui pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB*`;

const finalOutput = header + generateTree(process.cwd()) + footer;

// 4. EKSEKUSI PENYIMPANAN
try {
    fs.writeFileSync('PROJECT_MAP.md', finalOutput);
    console.log('\x1b[32m%s\x1b[0m', '✅ BINGGO! Struktur project berhasil dipetakan ke PROJECT_MAP.md');
} catch (err) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Gagal membuat struktur project:', err);
}