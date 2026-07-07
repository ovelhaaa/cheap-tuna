const fs = require('fs');

let file = fs.readFileSync('src/App.tsx', 'utf8');

file = file.replace(/className="([^"]+)"/g, (match, p1) => {
    // If it's a button class string, let's just look at the surrounding context manually...
    // simpler: just look for standard button classes and append btn-hardware
    if (
        (p1.includes('rounded border transition-colors') || 
         p1.includes('rounded hover:') || 
         p1.includes('rounded bg-vintage-panel text-vintage-text-dim border border-vintage-border')) &&
        !p1.includes('btn-hardware') &&
        !p1.includes('absolute')
    ) {
        return `className="${p1} btn-hardware"`;
    }
    return match;
});

fs.writeFileSync('src/App.tsx', file);
console.log('Buttons patched 2');
