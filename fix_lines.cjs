const fs = require('fs');

let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

let start = lines.findIndex(l => l.includes("    {step.tie && ("));
let slice = lines.slice(start - 5, start + 20);
console.log(slice.join('\n'));

