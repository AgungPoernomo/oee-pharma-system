const fs = require('fs');
const files = [
  'src/pages/Inputdata/DataLine1/INPUTF.jsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\s*triggerAutosaveOEE\(rowIdx, calculatedRow\);/g, '');
  content = content.replace(/\s*triggerAutosaveDT\(rowIdx, calculatedRow\);/g, '');
  fs.writeFileSync(file, content);
  console.log('Cleaned ' + file);
}
