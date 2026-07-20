const fs = require('fs');
const path = require('path');

const insert_code = `
  const handleInsertRow = useCallback((gridType, rowIdx, position) => {
    const idsRef = gridType === 'oee' ? oeeIds : dtIds;
    const setData = gridType === 'oee' ? setOeeData : setDtData;
    const emptyFunc = gridType === 'oee' ? getEmptyOEE : getEmptyDT;
    
    const insertIdx = position === 'above' ? rowIdx : rowIdx + 1;
    
    setData(prev => {
      const next = [...prev];
      next.splice(insertIdx, 0, emptyFunc());
      
      idsRef.current.splice(insertIdx, 0, null);
      
      localStorage.setItem(gridType === 'oee' ? LS_OEE : LS_DT, JSON.stringify(next));
      localStorage.setItem(gridType === 'oee' ? LS_IDS_OEE : LS_IDS_DT, JSON.stringify(idsRef.current));
      
      return next;
    });
  }, []);
`;

const ui_to_add = `            <button
              type="button"
              onClick={() => {
                handleInsertRow(contextMenu.gridType, contextMenu.rowIdx, 'above');
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors border-b border-slate-100"
            >
              <span>⬆️</span>
              <span>Insert Row Atas</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleInsertRow(contextMenu.gridType, contextMenu.rowIdx, 'below');
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors border-b border-slate-100"
            >
              <span>⬇️</span>
              <span>Insert Row Bawah</span>
            </button>
            <button`;

function patchFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf-8');

  if (!content.includes('handleInsertRow =')) {
    if (content.includes('const handleAdd1000Rows = useCallback')) {
      content = content.replace('const handleAdd1000Rows = useCallback', insert_code.trim() + '\\n\\n  const handleAdd1000Rows = useCallback');
    } else {
      content = content.replace('const handleDeleteRow = useCallback', insert_code.trim() + '\\n\\n  const handleDeleteRow = useCallback');
    }
  }

  if (!content.includes('Insert Row Atas')) {
    const search_str = "style={{ top: contextMenu.y, left: contextMenu.x }}\\n          >\\n            <button";
    const search_str2 = "style={{ top: contextMenu.y, left: contextMenu.x }}\\r\\n          >\\r\\n            <button";
    
    if (content.includes(search_str)) {
      content = content.replace(search_str, "style={{ top: contextMenu.y, left: contextMenu.x }}\\n          >\\n" + ui_to_add);
    } else if (content.includes(search_str2)) {
      content = content.replace(search_str2, "style={{ top: contextMenu.y, left: contextMenu.x }}\\r\\n          >\\r\\n" + ui_to_add);
    } else {
      console.log(\`Warning: could not find UI anchor in \${filepath}\`);
    }
  }

  fs.writeFileSync(filepath, content, 'utf-8');
  console.log(\`Patched \${filepath}\`);
}

const base_dir = path.join(__dirname, '..', 'src', 'pages', 'Inputdata');
const lines = ["DataLine1", "DataLine2", "DataLine3", "DataLine4"];
const comps = ["INPUTC.jsx", "INPUTF.jsx"];

for (const line of lines) {
  for (const comp of comps) {
    const p = path.join(base_dir, line, comp);
    if (fs.existsSync(p)) {
      patchFile(p);
    } else {
      console.log(\`Not found: \${p}\`);
    }
  }
}
