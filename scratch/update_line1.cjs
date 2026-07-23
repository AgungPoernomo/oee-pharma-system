const fs = require('fs');

function updateInputC() {
    let content = fs.readFileSync('src/pages/Inputdata/DataLine1/INPUTC.jsx', 'utf8');

    // 1. Update LS keys
    content = content.replace(
        "const LS_OEE = 'C_DATA_OEE_L1', LS_DT = 'C_DATA_DT_L1', LS_IDS_OEE = 'C_IDS_OEE_L1', LS_IDS_DT = 'C_IDS_DT_L1';",
        "const LS_OEE = 'C_DATA_OEE_L1', LS_DT = 'C_DATA_DT_L1', LS_IDS_OEE = 'C_IDS_OEE_L1', LS_IDS_DT = 'C_IDS_DT_L1';\n  const LS_GAS_IDS_OEE = 'C_GAS_IDS_OEE_L1', LS_GAS_IDS_DT = 'C_GAS_IDS_DT_L1';"
    );

    // 2. Add gasOeeIds and gasDtIds
    content = content.replace(
        "const dtIds = useRef(getCachedIds(LS_IDS_DT));",
        "const dtIds = useRef(getCachedIds(LS_IDS_DT));\n  const gasOeeIds = useRef(getCachedIds(LS_GAS_IDS_OEE));\n  const gasDtIds = useRef(getCachedIds(LS_GAS_IDS_DT));"
    );

    // 3. Add to loadDataServer OEE
    content = content.replace(
        "let mappedOEEIds = [];\n      if (resOEE?.status === 'success' && Array.isArray(resOEE.data)) {\n        mappedOEE = resOEE.data.filter(filterCurrentMonth).reverse().map((row) => {\n          mappedOEEIds.push(row.id);",
        "let mappedOEEIds = [];\n      let mappedGasOEEIds = [];\n      if (resOEE?.status === 'success' && Array.isArray(resOEE.data)) {\n        mappedOEE = resOEE.data.filter(filterCurrentMonth).reverse().map((row) => {\n          mappedOEEIds.push(row.id);\n          mappedGasOEEIds.push(row.gas_id || null);"
    );
    
    // Add to loadDataServer DT
    content = content.replace(
        "let mappedDTIds = [];\n      if (resDT?.status === 'success' && Array.isArray(resDT.data)) {\n        mappedDT = resDT.data.filter(filterCurrentMonth).reverse().map((row) => {\n          mappedDTIds.push(row.id);",
        "let mappedDTIds = [];\n      let mappedGasDTIds = [];\n      if (resDT?.status === 'success' && Array.isArray(resDT.data)) {\n        mappedDT = resDT.data.filter(filterCurrentMonth).reverse().map((row) => {\n          mappedDTIds.push(row.id);\n          mappedGasDTIds.push(row.gas_id || null);"
    );

    content = content.replace(
        "dtIds.current = [...mappedDTIds, ...Array(EMPTY_ROWS).fill(null)];",
        "dtIds.current = [...mappedDTIds, ...Array(EMPTY_ROWS).fill(null)];\n      gasOeeIds.current = [...mappedGasOEEIds, ...Array(EMPTY_ROWS).fill(null)];\n      gasDtIds.current = [...mappedGasDTIds, ...Array(EMPTY_ROWS).fill(null)];"
    );
    content = content.replace(
        "localStorage.setItem(LS_IDS_DT, JSON.stringify(dtIds.current));",
        "localStorage.setItem(LS_IDS_DT, JSON.stringify(dtIds.current));\n      localStorage.setItem(LS_GAS_IDS_OEE, JSON.stringify(gasOeeIds.current));\n      localStorage.setItem(LS_GAS_IDS_DT, JSON.stringify(gasDtIds.current));"
    );
    
    fs.writeFileSync('src/pages/Inputdata/DataLine1/INPUTC.jsx', content, 'utf8');
}

updateInputC();
console.log('DONE INPUTC phase 1');
