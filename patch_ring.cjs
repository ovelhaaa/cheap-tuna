const fs = require('fs');

const file = fs.readFileSync('src/App.tsx', 'utf8');

const match = "className={`h-12 relative flex items-center justify-center cursor-pointer transition-colors\\n                                                            ${step.note !== undefined ? 'bg-green-500/30' : step.tie ? 'bg-green-500/10' : 'bg-neutral-950 hover:bg-neutral-900'}\\n                                                            ${isCurrent ? 'border border-green-400' : 'border border-transparent'}\\n                                                        `}";

const insert = "className={`h-12 relative flex items-center justify-center cursor-pointer transition-colors\\n                                                            ${step.note !== undefined ? 'bg-green-500/30' : step.tie ? 'bg-green-500/10' : 'bg-neutral-950 hover:bg-neutral-900'}\\n                                                            ${isCurrent ? 'border border-green-400' : 'border border-transparent'}\\n                                                            ${editingNote?.track === trackName && editingNote?.step === i ? 'ring-2 ring-yellow-400 z-10' : ''}\\n                                                        `}";

const res = file.replace(match, insert);
if (res !== file) {
    fs.writeFileSync('src/App.tsx', res);
    console.log('patched');
} else {
    console.log('no match');
}
