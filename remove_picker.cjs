const fs = require('fs');
const file = fs.readFileSync('src/App.tsx', 'utf8');

const match = `function NotePickerPopup({ initialFreq, onSelect, onClose }: { initialFreq: number, onSelect: (freq: number) => void, onClose: () => void }) {
    const [octave, setOctave] = useState(4);
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onPointerDown={onClose}>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 w-full max-w-sm" onPointerDown={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold">Select Note</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setOctave(o => Math.max(1, o - 1))} className="px-2 py-1 bg-neutral-800 rounded text-xs text-neutral-300">-</button>
                        <span className="text-xs text-green-400 w-12 text-center">OCT {octave}</span>
                        <button onClick={() => setOctave(o => Math.min(7, o + 1))} className="px-2 py-1 bg-neutral-800 rounded text-xs text-neutral-300">+</button>
                    </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                    {BASE_NOTES.map(note => {
                        const actualOctave = octave + Math.floor(note.offset / 12);
                        const a4 = 440;
                        const noteIndex = (octave - 4) * 12 + note.offset;
                        const freq = a4 * Math.pow(2, (noteIndex - 9) / 12);
                        const isCurrent = Math.abs(freq - initialFreq) < 0.1;
                        
                        return (
                            <button
                                key={note.offset}
                                onClick={() => onSelect(freq)}
                                className={\`py-3 rounded border text-xs font-bold transition-colors \${isCurrent ? 'bg-green-500/20 border-green-500 text-green-400' : note.isBlack ? 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600' : 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:border-neutral-500'}\`}
                            >
                                {note.noteName}{actualOctave}
                            </button>
                        );
                    })}
                </div>
                
                <div className="mt-4 pt-4 border-t border-neutral-800 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-xs text-neutral-400 hover:text-white">Cancel</button>
                </div>
            </div>
        </div>
    );
}`;

const res = file.replace(match, '');
if (res !== file) {
    fs.writeFileSync('src/App.tsx', res);
    console.log('patched');
} else {
    console.log('no match');
}
