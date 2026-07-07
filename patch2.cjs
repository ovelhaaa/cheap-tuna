const fs = require('fs');

const file = fs.readFileSync('src/App.tsx', 'utf8');

const match = `                                <h2 className="text-sm uppercase tracking-wider text-neutral-400">Step Sequencer</h2>`;

const insert = `                                <div className="flex flex-col gap-1">
                                    <h2 className="text-sm uppercase tracking-wider text-neutral-400">Step Sequencer</h2>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="text" 
                                            value={songFilename} 
                                            onChange={e => setSongFilename(e.target.value)}
                                            placeholder="song-preset"
                                            className="bg-neutral-950 border border-neutral-800 text-[10px] rounded px-2 py-1 w-32 focus:outline-none focus:border-green-500/50 text-neutral-300"
                                        />
                                        <button 
                                            onClick={handleExportSong}
                                            className="flex items-center gap-1 px-2 py-1 bg-neutral-950 hover:bg-neutral-900 text-green-400 text-[10px] rounded border border-neutral-800 transition-colors"
                                            title="Save Song Preset"
                                        >
                                            <Download className="w-3 h-3" />
                                            Save Song
                                        </button>
                                        <label className="flex items-center gap-1 px-2 py-1 bg-neutral-950 hover:bg-neutral-900 text-green-400 text-[10px] rounded border border-neutral-800 transition-colors cursor-pointer">
                                            <Upload className="w-3 h-3" />
                                            Load Song
                                            <input type="file" accept=".json" onChange={handleImportSong} className="hidden" />
                                        </label>
                                    </div>
                                </div>`;

let res = file.replace(match, insert);
fs.writeFileSync('src/App.tsx', res);
console.log('patched');
