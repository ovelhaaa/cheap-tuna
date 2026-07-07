const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
console.log(lines[1122].trim());
console.log(lines[1123].trim());
