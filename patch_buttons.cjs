const fs = require('fs');

let file = fs.readFileSync('src/App.tsx', 'utf8');

file = file.replace(/<button([^>]*)className="([^"]*)"/g, (match, p1, p2) => {
    if (!p2.includes('btn-hardware') && !p2.includes('&times;') && !p2.includes('absolute')) {
        return `<button${p1}className="${p2} btn-hardware"`;
    }
    return match;
});

fs.writeFileSync('src/App.tsx', file);
console.log('Buttons patched');
