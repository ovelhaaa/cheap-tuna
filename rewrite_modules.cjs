const fs = require('fs');

let file = fs.readFileSync('src/App.tsx', 'utf8');

// For PulseControls and TriangleControls:
file = file.replace(/className=\{`bg-vintage-bg p-4 rounded-lg border border-vintage-border space-y-4 \$\{isActive \? 'ring-1 ring-amber-primary' : ''\}`\}/g, 
"className={`module-panel p-4 pt-6 rounded-md space-y-4 ${isActive ? 'ring-1 ring-amber-primary' : ''}`}");

// Triangle Controls (if it doesn't have isActive):
// wait, TriangleControls doesn't take isActive in the original code, but wait, it might?
