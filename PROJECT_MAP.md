# Struktur Project: OEE-SYSTEM-PRODUCTION

```text
OEE-SYSTEM-PRODUCTION/
├── public
│   ├── factory-bg.jpg
│   ├── logo-perusahaan.png
│   └── vite.svg
├── src // Folder utama source code aplikasi
│   ├── assets // Aset statis seperti gambar, ikon, dan font
│   ├── components
│   │   └── layout
│   │       ├── SidebarAdmin.jsx
│   │       └── SidebarForeman.jsx
│   ├── context
│   │   └── AuthContext.jsx
│   ├── lib
│   │   └── utils.js
│   ├── pages // Kumpulan file antarmuka (UI/UX) HTML
│   │   ├── admin
│   │   │   ├── AccessControl.jsx
│   │   │   ├── MasterData_GeneEditor.jsx
│   │   │   └── NeuralSystemHealth.jsx
│   │   ├── AUTH
│   │   │   └── AccessPortal.jsx
│   │   └── foreman
│   │       ├── Inputdata
│   │       │   ├── DefectCatcherC.jsx
│   │       │   ├── DefectCatcherF.jsx
│   │       │   ├── SmartDowntimeLoggerC.jsx
│   │       │   ├── SmartDowntimeLoggerF.jsx
│   │       │   └── TacticalInputHub.jsx
│   │       ├── DailyOnesheet.jsx
│   │       └── ForemanSettings.jsx
│   ├── services
│   │   └── api.js
│   ├── App.jsx
│   ├── config.js
│   ├── index.css
│   └── main.jsx
├── .dockerignore
├── .gitattributes
├── .gitignore
├── components.json
├── Dockerfile
├── eslint.config.js
├── index.html // Halaman utama (Pintu masuk / Login System)
├── jsconfig.json
├── package.json // Konfigurasi project Node.js dan dependensi
├── postcss.config.cjs
├── struktur_project.txt
├── tailwind.config.js
├── vercel.json
└── vite.config.js

```

*Terakhir diperbarui pada: 15/4/2026, 14.16.18 WIB*