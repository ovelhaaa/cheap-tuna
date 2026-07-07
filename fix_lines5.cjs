const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].trim() === '}' && lines[i+1].trim() === '})}') {
        lines[i] = '                                                );';
    }
}
fs.writeFileSync('src/App.tsx', lines.join('\n'));
