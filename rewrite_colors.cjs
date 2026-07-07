const fs = require('fs');

let file = fs.readFileSync('src/App.tsx', 'utf8');

// Colors
file = file.replace(/bg-neutral-950/g, 'bg-vintage-bg');
file = file.replace(/bg-neutral-900/g, 'bg-vintage-panel');
file = file.replace(/bg-neutral-800/g, 'bg-vintage-surface');
file = file.replace(/bg-neutral-700/g, 'bg-vintage-border');

file = file.replace(/border-neutral-800/g, 'border-vintage-border');
file = file.replace(/border-neutral-700/g, 'border-vintage-border');
file = file.replace(/border-neutral-600/g, 'border-amber-dim');

file = file.replace(/text-neutral-200/g, 'text-vintage-text');
file = file.replace(/text-neutral-300/g, 'text-vintage-text');
file = file.replace(/text-neutral-400/g, 'text-vintage-text-dim');
file = file.replace(/text-neutral-500/g, 'text-vintage-text-dim');

file = file.replace(/text-green-400/g, 'text-amber-primary');
file = file.replace(/text-green-500/g, 'text-amber-primary');
file = file.replace(/bg-green-500\/10/g, 'bg-amber-dimmer');
file = file.replace(/bg-green-500\/20/g, 'bg-amber-dimmer');
file = file.replace(/bg-green-500\/30/g, 'bg-amber-primary/30');
file = file.replace(/border-green-500\/30/g, 'border-amber-primary/30');
file = file.replace(/border-green-500\/50/g, 'border-amber-primary/50');
file = file.replace(/border-green-400/g, 'border-amber-primary');
file = file.replace(/border-green-500/g, 'border-amber-primary');
file = file.replace(/accent-green-500/g, 'accent-amber-primary');

file = file.replace(/text-yellow-400/g, 'text-amber-primary');
file = file.replace(/bg-yellow-400\/20/g, 'bg-amber-dimmer');
file = file.replace(/border-yellow-400\/30/g, 'border-amber-dim');
file = file.replace(/ring-yellow-400/g, 'ring-amber-primary');

file = file.replace(/ctx\.strokeStyle = '#4ade80';/g, "ctx.strokeStyle = '#ff8c1a';");
file = file.replace(/ctx\.fillStyle = 'rgb\\(10, 10, 10\\)';/g, "ctx.fillStyle = '#0f0f0f';");

file = file.replace(/step\.note !== undefined \? 'bg-amber-primary\/30' : step\.tie \? 'bg-amber-dimmer'/g, "step.note !== undefined ? 'bg-amber-primary/80 text-vintage-bg shadow-[0_0_8px_rgba(255,140,26,0.5)]' : step.tie ? 'bg-hatched'");

// Replace button classes to add btn-hardware (except close buttons or specific buttons)
file = file.split('\n').map(line => {
    if (line.includes('<button') && line.includes('className=')) {
        if (!line.includes('btn-hardware') && !line.includes('&times;')) {
            return line.replace(/className="([^"]+)"/, 'className="$1 btn-hardware"');
        }
    }
    return line;
}).join('\n');

fs.writeFileSync('src/App.tsx', file);
console.log('Colors replaced');
