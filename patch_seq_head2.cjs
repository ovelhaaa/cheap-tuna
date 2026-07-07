const fs = require('fs');
const file = fs.readFileSync('src/App.tsx', 'utf8');

const match = `                                            <span className="text-[10px] uppercase bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-400/30 flex items-center gap-1 animate-pulse">
                                                Press a piano key to set note
                                                <button onClick={() => setEditingNote(null)} className="ml-2 hover:text-white">&times;</button>
                                            </span>`;

const insert = `                                            <span className="text-[10px] uppercase bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-400/30 flex items-center gap-2">
                                                <span className="animate-pulse">Select note on keyboard</span>
                                                <button 
                                                    onClick={() => {
                                                        setPatterns(p => {
                                                            const next = [...p];
                                                            const pat = {...next[currentPatternIndex]};
                                                            const track = [...pat[editingNote.track]];
                                                            track[editingNote.step] = {};
                                                            pat[editingNote.track] = track;
                                                            next[currentPatternIndex] = pat;
                                                            audioEngine.setSequencerPattern(currentPatternIndex, pat);
                                                            return next;
                                                        });
                                                        setEditingNote(null);
                                                    }}
                                                    className="bg-red-500/20 text-red-400 border border-red-500/50 px-1.5 rounded hover:bg-red-500/40 not-italic"
                                                    title="Erase Note"
                                                >
                                                    Erase
                                                </button>
                                                <button onClick={() => setEditingNote(null)} className="ml-1 hover:text-white px-1">&times;</button>
                                            </span>`;

const res = file.replace(match, insert);
if (res !== file) {
    fs.writeFileSync('src/App.tsx', res);
    console.log('patched');
} else {
    console.log('no match');
}
