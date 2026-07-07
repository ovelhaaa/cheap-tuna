const fs = require('fs');
const file = fs.readFileSync('src/App.tsx', 'utf8');

const match = `                                    <h2 className="text-sm uppercase tracking-wider text-neutral-400">Step Sequencer</h2>`;

const insert = `                                    <div className="flex items-center gap-3">
                                        <h2 className="text-sm uppercase tracking-wider text-neutral-400">Step Sequencer</h2>
                                        {editingNote && (
                                            <span className="text-[10px] uppercase bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-400/30 flex items-center gap-1 animate-pulse">
                                                Press a piano key to set note
                                                <button onClick={() => setEditingNote(null)} className="ml-2 hover:text-white">&times;</button>
                                            </span>
                                        )}
                                    </div>`;

const res = file.replace(match, insert);
if (res !== file) {
    fs.writeFileSync('src/App.tsx', res);
    console.log('patched');
} else {
    console.log('no match');
}
