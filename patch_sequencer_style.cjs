const fs = require('fs');

let file = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /className=\{`h-12 relative flex items-center justify-center cursor-pointer transition-colors[\s\S]*?\`\}/;

const replacement = `className={\`h-12 relative flex items-center justify-center cursor-pointer transition-all duration-75
    \${step.note !== undefined 
        ? 'bg-amber-primary text-vintage-bg shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]' 
        : step.tie 
            ? 'bg-hatched opacity-80' 
            : 'bg-[#050505] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] hover:bg-[#111]'}
    \${isCurrent 
        ? step.note !== undefined || step.tie
            ? 'z-10 shadow-[0_0_15px_#ff8c1a,inset_0_0_10px_#fff] brightness-125 ring-1 ring-amber-primary'
            : 'z-10 bg-[#222] shadow-[inset_0_0_10px_#ff8c1a] ring-1 ring-amber-dimmer'
        : 'border-r border-b border-[#000]'}
    \${editingNote?.track === trackName && editingNote?.step === i ? 'ring-2 ring-amber-primary z-20 animate-pulse' : ''}
\`}`;

file = file.replace(regex, replacement);

fs.writeFileSync('src/App.tsx', file);
console.log('patched');
