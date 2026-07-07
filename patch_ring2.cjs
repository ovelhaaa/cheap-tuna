const fs = require('fs');

const file = fs.readFileSync('src/App.tsx', 'utf8');

const match = "${isCurrent ? 'border border-green-400' : 'border border-transparent'}";
const insert = "${isCurrent ? 'border border-green-400' : 'border border-transparent'}\n                                                            ${editingNote?.track === trackName && editingNote?.step === i ? 'ring-2 ring-yellow-400 z-10' : ''}";

const res = file.replace(match, insert);
if (res !== file) {
    fs.writeFileSync('src/App.tsx', res);
    console.log('patched');
} else {
    console.log('no match');
}
