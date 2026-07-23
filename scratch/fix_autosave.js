const fs = require('fs');
const files = [
  'src/pages/Inputdata/DataLine1/INPUTC.jsx',
  'src/pages/Inputdata/DataLine1/INPUTF.jsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Remove handleTypingAutoSave block (lines start from const handleTypingAutoSave = ... to its closing block)
  // Since it's around 30 lines, we can use a regex or just substring.
  const handleTypingRegex = /const handleTypingAutoSave = useCallback\(\(rowIdx, colIdx, typingValue, gridType\) => \{[\s\S]*?\}, \[triggerAutosaveOEE, triggerAutosaveDT\]\);\s*/;
  content = content.replace(handleTypingRegex, '');

  // 2. Remove onTypingAutoSave={handleTypingAutoSave} from <SpreadsheetRow>
  content = content.replace(/\s*onTypingAutoSave=\{handleTypingAutoSave\}/g, '');

  // 3. Remove onTypingAutoSave prop from SpreadsheetRow definition
  content = content.replace(/,\s*onTypingAutoSave/g, '');

  // 4. Remove onTypingAutoSave call from SpreadsheetRow's input onChange
  const onChangeRegex = /onChange=\{\(e\) => \{\s*if \(onTypingAutoSave\) onTypingAutoSave\(rowIdx, colIdx, e\.target\.value, gridType\);\s*\}\}/g;
  content = content.replace(onChangeRegex, 'onChange={(e) => {}}');
  
  // Also clean up any empty onChange={(e) => {}} just to avoid lint errors if we want, but it's fine.
  
  // 5. Enlarge Action column size from 70 to 120.
  // We look for minWidth: 70, maxWidth: 70
  content = content.replace(/minWidth: 70, maxWidth: 70/g, 'minWidth: 120, maxWidth: 120');

  fs.writeFileSync(file, content);
  console.log('Fixed ' + file);
}
