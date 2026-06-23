# Struktur Project: OEE-PHARMA-SYSTEM

```text
OEE-PHARMA-SYSTEM/
├── public
│   ├── factory-bg.jpg
│   ├── logo-perusahaan.png
│   └── vite.svg
├── src // Folder utama source code aplikasi
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
│   │   │   ├── Access.jsx
│   │   │   └── AccessPortal.jsx
│   │   ├── DailyOneSheet
│   │   │   ├── OnesheetLine1
│   │   │   │   └── DailyOnesheet.jsx
│   │   │   ├── OnesheetLine2
│   │   │   │   └── DailyOnesheet.jsx
│   │   │   ├── OnesheetLine3
│   │   │   │   └── DailyOnesheet.jsx
│   │   │   └── OnesheetLine4
│   │   │       └── DailyOnesheet.jsx
│   │   ├── foreman
│   │   │   ├── Inputdata
│   │   │   │   ├── DefectCatcherC.jsx
│   │   │   │   ├── DefectCatcherF.jsx
│   │   │   │   ├── INPUTC.jsx
│   │   │   │   ├── INPUTF.jsx
│   │   │   │   ├── SmartDowntimeLoggerC.jsx
│   │   │   │   ├── SmartDowntimeLoggerF.jsx
│   │   │   │   └── TacticalInputHub.jsx
│   │   │   ├── DailyOnesheet.jsx
│   │   │   └── ForemanSettings.jsx
│   │   └── Inputdata
│   │       ├── DataLine1
│   │       │   ├── INPUTC.jsx
│   │       │   └── INPUTF.jsx
│   │       ├── DataLine2
│   │       │   ├── INPUTC.jsx
│   │       │   └── INPUTF.jsx
│   │       ├── DataLine3
│   │       │   ├── INPUTC.jsx
│   │       │   └── INPUTF.jsx
│   │       └── DataLine4
│   │           ├── INPUTC.jsx
│   │           └── INPUTF.jsx
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
├── PROJECT_MAP.md // Dokumentasi struktur project (Auto-generated)
├── struktur_project.txt
├── tailwind.config.js
├── vercel.json
└── vite.config.js

```

*Terakhir diperbarui pada: 23/6/2026, 08.39.00 WIB*