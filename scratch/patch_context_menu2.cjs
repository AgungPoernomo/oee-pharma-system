const fs = require('fs');
const path = require('path');

const insert_code = "\n" + 
"  const handleInsertRow = useCallback((gridType, rowIdx, position) => {\n" + 
"    const idsRef = gridType === 'oee' ? oeeIds : dtIds;\n" + 
"    const setData = gridType === 'oee' ? setOeeData : setDtData;\n" + 
"    const emptyFunc = gridType === 'oee' ? getEmptyOEE : getEmptyDT;\n" + 
"    \n" + 
"    const insertIdx = position === 'above' ? rowIdx : rowIdx + 1;\n" + 
"    \n" + 
"    setData(prev => {\n" + 
"      const next = [...prev];\n" + 
"      next.splice(insertIdx, 0, emptyFunc());\n" + 
"      \n" + 
"      idsRef.current.splice(insertIdx, 0, null);\n" + 
"      \n" + 
"      localStorage.setItem(gridType === 'oee' ? LS_OEE : LS_DT, JSON.stringify(next));\n" + 
"      localStorage.setItem(gridType === 'oee' ? LS_IDS_OEE : LS_IDS_DT, JSON.stringify(idsRef.current));\n" + 
"      \n" + 
"      return next;\n" + 
"    });\n" + 
"  }, []);\n";

const ui_to_add = "            <button\n" + 
"              type=\"button\"\n" + 
"              onClick={() => {\n" + 
"                handleInsertRow(contextMenu.gridType, contextMenu.rowIdx, 'above');\n" + 
"                setContextMenu(null);\n" + 
"              }}\n" + 
"              className=\"w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors border-b border-slate-100\"\n" + 
"            >\n" + 
"              <span>⬆️</span>\n" + 
"              <span>Insert Row Atas</span>\n" + 
"            </button>\n" + 
"            <button\n" + 
"              type=\"button\"\n" + 
"              onClick={() => {\n" + 
"                handleInsertRow(contextMenu.gridType, contextMenu.rowIdx, 'below');\n" + 
"                setContextMenu(null);\n" + 
"              }}\n" + 
"              className=\"w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors border-b border-slate-100\"\n" + 
"            >\n" + 
"              <span>⬇️</span>\n" + 
"              <span>Insert Row Bawah</span>\n" + 
"            </button>\n" + 
"            <button";

function patchFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf-8');

  if (content.indexOf('handleInsertRow =') === -1) {
    if (content.indexOf('const handleAdd1000Rows = useCallback') !== -1) {
      content = content.replace('const handleAdd1000Rows = useCallback', insert_code.trim() + '\n\n  const handleAdd1000Rows = useCallback');
    } else {
      content = content.replace('const handleDeleteRow = useCallback', insert_code.trim() + '\n\n  const handleDeleteRow = useCallback');
    }
  }

  if (content.indexOf('Insert Row Atas') === -1) {
    const search_str = "style={{ top: contextMenu.y, left: contextMenu.x }}\n          >\n            <button";
    const search_str2 = "style={{ top: contextMenu.y, left: contextMenu.x }}\r\n          >\r\n            <button";
    const search_str3 = "style={{ top: contextMenu.y, left: contextMenu.x }}\n          >\n<button";
    const search_str4 = "style={{ top: contextMenu.y, left: contextMenu.x }}\r\n          >\r\n<button";
    
    if (content.indexOf(search_str) !== -1) {
      content = content.replace(search_str, "style={{ top: contextMenu.y, left: contextMenu.x }}\n          >\n" + ui_to_add);
    } else if (content.indexOf(search_str2) !== -1) {
      content = content.replace(search_str2, "style={{ top: contextMenu.y, left: contextMenu.x }}\r\n          >\r\n" + ui_to_add);
    } else if (content.indexOf(search_str3) !== -1) {
      content = content.replace(search_str3, "style={{ top: contextMenu.y, left: contextMenu.x }}\n          >\n" + ui_to_add);
    } else if (content.indexOf(search_str4) !== -1) {
      content = content.replace(search_str4, "style={{ top: contextMenu.y, left: contextMenu.x }}\r\n          >\r\n" + ui_to_add);
    } else {
      console.log("Warning: could not find UI anchor in " + filepath);
      // fallback: find "contextMenu.gridType === 'oee' ? 'OEE' : 'Downtime'" and insert before its parent <button>
      // this is riskier, let's just log and debug.
    }
  }

  fs.writeFileSync(filepath, content, 'utf-8');
  console.log("Patched " + filepath);
}

const base_dir = path.join(__dirname, '..', 'src', 'pages', 'Inputdata');
const lines = ["DataLine1", "DataLine2", "DataLine3", "DataLine4"];
const comps = ["INPUTC.jsx", "INPUTF.jsx"];

for (let i = 0; i < lines.length; i++) {
  for (let j = 0; j < comps.length; j++) {
    const p = path.join(base_dir, lines[i], comps[j]);
    if (fs.existsSync(p)) {
      patchFile(p);
    } else {
      console.log("Not found: " + p);
    }
  }
}
