const fs = require('fs');

let file = fs.readFileSync('src/App.tsx', 'utf8');

const match = `                                {(['pulse1', 'pulse2', 'triangle', 'noise'] as const).map(trackName => (
                                    <div key={trackName} className="flex gap-1 items-center">
                                        <div className="w-20 text-[10px] uppercase text-vintage-text-dim shrink-0">{trackName}</div>`;

const replace = `                                {(['pulse1', 'pulse2', 'triangle', 'noise'] as const).map(trackName => {
                                    const shortName = trackName === 'pulse1' ? 'S1' : trackName === 'pulse2' ? 'S2' : trackName === 'triangle' ? 'TR' : 'NZ';
                                    return (
                                    <div key={trackName} className="flex gap-1 items-center">
                                        <div className="w-6 text-[10px] font-bold text-amber-dim text-center shrink-0" title={trackName}>{shortName}</div>`;

file = file.replace(match, replace);
file = file.replace('                                                );', '                                                );\n                                            }\n'); // close the map properly wait I need to close the map

fs.writeFileSync('src/App.tsx', file);
console.log('patched track names');
