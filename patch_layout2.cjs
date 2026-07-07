const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const leftColStart = lines.findIndex(l => l.includes('{/* Left Column'));
const pulse1Start = lines.findIndex(l => l.includes('{/* Pulse 1 */}'));
const pulse2Start = lines.findIndex(l => l.includes('{/* Pulse 2 */}'));
const triStart = lines.findIndex(l => l.includes('{/* Triangle */}'));
const rightColStart = lines.findIndex(l => l.includes('{/* Right Column: Noise & Keyboard */}'));
const noiseStart = lines.findIndex(l => l.includes('{/* Noise Controls */}'));
const kbStart = lines.findIndex(l => l.includes('{/* Keyboard */}'));
const seqStart = lines.findIndex(l => l.includes('{/* Sequencer */}'));
const endReturn = lines.findIndex((l, i) => i > seqStart && l.includes('</div'));

// Extract blocks
// Timbre presets: from leftColStart+1 to pulse1Start-1
const timbreBlock = lines.slice(leftColStart + 2, pulse1Start).join('\n');
const pulse1Block = lines.slice(pulse1Start, pulse2Start).join('\n');
const pulse2Block = lines.slice(pulse2Start, triStart).join('\n');
// Triangle block ends at rightColStart - 2 (since there is a closing div and a blank line)
const triBlock = lines.slice(triStart, rightColStart - 2).join('\n');

const noiseBlock = lines.slice(noiseStart, kbStart).join('\n');
// Keyboard block ends at seqStart - 2
const kbBlock = lines.slice(kbStart, seqStart - 2).join('\n');
// Sequencer block ends at endReturn - 1
const seqBlock = lines.slice(seqStart, endReturn).join('\n');

const newGridStart = lines.findIndex(l => l.includes('<div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">'));

let newLines = lines.slice(0, newGridStart);
newLines.push('                <div className="w-full max-w-4xl flex flex-col gap-6">');
newLines.push('                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">');
newLines.push(timbreBlock);
newLines.push('                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">');
newLines.push('                            <div className="space-y-6">');
newLines.push(pulse1Block);
newLines.push(pulse2Block);
newLines.push('                            </div>');
newLines.push('                            <div className="space-y-6">');
newLines.push(triBlock);
newLines.push(noiseBlock);
newLines.push('                            </div>');
newLines.push('                        </div>');
newLines.push('                    </div>');
newLines.push(kbBlock);
newLines.push(seqBlock);
newLines.push(...lines.slice(endReturn));

fs.writeFileSync('src/App.tsx', newLines.join('\n'));
console.log('Patched layout');
