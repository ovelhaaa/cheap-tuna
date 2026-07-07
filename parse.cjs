const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const pulse1Start = lines.findIndex(l => l.includes('{/* Pulse 1 */}'));
const pulse2Start = lines.findIndex(l => l.includes('{/* Pulse 2 */}'));
const triStart = lines.findIndex(l => l.includes('{/* Triangle */}'));
const rightColStart = lines.findIndex(l => l.includes('{/* Right Column: Noise & Keyboard */}'));
const noiseStart = lines.findIndex(l => l.includes('{/* Noise Controls */}'));
const kbStart = lines.findIndex(l => l.includes('{/* Keyboard */}'));
const seqStart = lines.findIndex(l => l.includes('{/* Sequencer */}'));

console.log({ pulse1Start, pulse2Start, triStart, rightColStart, noiseStart, kbStart, seqStart });
const leftColStart = lines.findIndex(l => l.includes('{/* Left Column'));
console.log({leftColStart});
