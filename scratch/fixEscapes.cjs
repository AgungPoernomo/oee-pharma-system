const fs = require('fs');
const file = 'd:/oee-pharma-system/src/pages/Inputdata/DataLine4/INPUTF.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$\{/g, '${');
fs.writeFileSync(file, content);
console.log('Fixed escape characters in INPUTF.jsx');
