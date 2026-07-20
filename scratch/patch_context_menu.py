import os
import glob

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add handleInsertRow after handleDeleteRow
    if 'handleInsertRow =' not in content:
        # Find where handleDeleteRow ends
        # We'll just look for the end of handleDeleteRow block.
        # It's a bit tricky to find the end of a block with regex, so we'll look for:
        # const handleAdd1000Rows = useCallback
        # or just put it before handleAdd1000Rows
        
        insert_code = """
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
"""
        # Let's place it before "const handleAdd1000Rows" if it exists
        if "const handleAdd1000Rows = useCallback" in content:
            content = content.replace("const handleAdd1000Rows = useCallback", insert_code.strip() + "\n\n  const handleAdd1000Rows = useCallback")
        else:
            # If handleAdd1000Rows doesn't exist, let's put it before "const handleSelectRow" or after "handleDeleteRow"
            # It's safer to just replace "const handleDeleteRow = useCallback" with "handleInsertRow" + "const handleDeleteRow"
            content = content.replace("const handleDeleteRow = useCallback", insert_code.strip() + "\n\n  const handleDeleteRow = useCallback")

    # Add Context Menu UI
    ui_to_add = """            <button
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
            <button"""
            
    if 'Insert Row Atas' not in content:
        # We find the existing delete button:
        # <button
        #       type="button"
        #       onClick={() => {
        #         handleDeleteRow(contextMenu.gridType);
        
        # Note: the exact formatting might vary. Let's find:
        # <div
        #     className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-2xl py-1.5 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
        #     style={{ top: contextMenu.y, left: contextMenu.x }}
        #   >
        #     <button
        
        # We will replace `<button` with the new buttons + `<button` inside the context menu portal.
        # But we need to make sure we only replace it inside the context menu.
        search_str = "style={{ top: contextMenu.y, left: contextMenu.x }}\n          >\n            <button"
        if search_str in content:
            content = content.replace(search_str, "style={{ top: contextMenu.y, left: contextMenu.x }}\n          >\n" + ui_to_add)
        else:
            # Maybe spacing is different
            print(f"Warning: could not find UI anchor in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Patched {filepath}")


base_dir = r"d:\PROJECT SATORIA\NEW OEE PRO\oee-pharma-system\src\pages\Inputdata"
for line_dir in ["DataLine1", "DataLine2", "DataLine3", "DataLine4"]:
    for comp in ["INPUTC.jsx", "INPUTF.jsx"]:
        path = os.path.join(base_dir, line_dir, comp)
        if os.path.exists(path):
            patch_file(path)
        else:
            print(f"Not found: {path}")
