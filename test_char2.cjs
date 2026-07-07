const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
for(let i=1120; i<=1126; i++) {
  console.log(`Line ${i}: '${lines[i]}'`);
}
