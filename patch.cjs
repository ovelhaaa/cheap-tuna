const fs = require('fs');

const file = fs.readFileSync('src/App.tsx', 'utf8');

// Insert states
const stateInsert = `
    const [timbreFilename, setTimbreFilename] = useState('');
    const [songFilename, setSongFilename] = useState('');
`;

const stateMatch = `    const [polyVoices, setPolyVoices] = useState<{pulse1: string | null, pulse2: string | null}>({ pulse1: null, pulse2: null });`;

// Insert functions
const funcsInsert = `
    const handleExportTimbre = () => {
        let params: any;
        if (activeVoice === 'pulse1') params = pulse1;
        else if (activeVoice === 'pulse2') params = pulse2;
        else if (activeVoice === 'triangle') params = triangle;
        else if (activeVoice === 'noise') params = { noiseMode, noisePeriod };

        const data = {
            type: "cheap-tuna-timbre",
            version: 1,
            voice: activeVoice,
            params
        };
        downloadJson(timbreFilename || \`timbre-\${activeVoice}\`, data);
    };

    const handleImportTimbre = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const data = await loadJson(file);
            if (data?.type !== 'cheap-tuna-timbre') {
                alert('Invalid timbre preset file');
                return;
            }
            const { voice, params } = data;
            if (voice === 'pulse1' || voice === 'pulse2') {
                updatePulse(voice, params);
            } else if (voice === 'triangle') {
                updateTriangle(params);
            } else if (voice === 'noise') {
                if (params.noiseMode !== undefined) {
                    setNoiseMode(params.noiseMode);
                    audioEngine.setNoiseMode(params.noiseMode);
                }
                if (params.noisePeriod !== undefined) {
                    setNoisePeriod(params.noisePeriod);
                    audioEngine.setNoisePeriod(params.noisePeriod);
                }
            }
        } catch (err: any) {
            alert(err.message || 'Failed to load timbre');
        }
        e.target.value = ''; // reset
    };

    const handleExportSong = () => {
        const data = {
            type: "cheap-tuna-song",
            version: 1,
            bpm,
            swingAmount: swing,
            patterns,
            songSequence
        };
        downloadJson(songFilename || 'song-preset', data);
    };

    const handleImportSong = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const data = await loadJson(file);
            if (data?.type !== 'cheap-tuna-song') {
                alert('Invalid song preset file');
                return;
            }
            if (confirm('Loading a song will overwrite your current patterns and sequence. Continue?')) {
                setBpm(data.bpm || 120);
                setSwing(data.swingAmount || 0);
                setPatterns(data.patterns || []);
                setSongSequence(data.songSequence || [0]);
                
                audioEngine.setSequencerBPM(data.bpm || 120);
                audioEngine.setSequencerSwing(data.swingAmount || 0);
                audioEngine.setSequencerPatterns(data.patterns || []);
                audioEngine.setSequencerSong(data.songSequence || [0]);
            }
        } catch (err: any) {
            alert(err.message || 'Failed to load song');
        }
        e.target.value = ''; // reset
    };
`;

const funcMatch = `    const toggleNoise = () => {`;

const uiTimbreMatch = `                        {/* Pulse 1 */}`;
const uiTimbreInsert = `                        <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-3 mb-6">
                            <h3 className="text-xs uppercase text-neutral-500 font-bold tracking-wider">Timbre Presets (Active Voice)</h3>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    value={timbreFilename} 
                                    onChange={e => setTimbreFilename(e.target.value)}
                                    placeholder={\`timbre-\${activeVoice}\`}
                                    className="bg-neutral-900 border border-neutral-700 text-xs rounded px-2 py-1.5 flex-1 focus:outline-none focus:border-green-500/50 text-neutral-300"
                                />
                                <button 
                                    onClick={handleExportTimbre}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-green-400 text-xs rounded border border-neutral-700 transition-colors"
                                    title="Export Timbre"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Save
                                </button>
                                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-green-400 text-xs rounded border border-neutral-700 transition-colors cursor-pointer">
                                    <Upload className="w-3.5 h-3.5" />
                                    Load
                                    <input type="file" accept=".json" onChange={handleImportTimbre} className="hidden" />
                                </label>
                            </div>
                        </div>

`;

const uiSongMatch = `                                <div className="flex gap-2 items-center">`;
const uiSongInsert = `                                <div className="flex gap-2 items-center ml-auto">
                                    <input 
                                        type="text" 
                                        value={songFilename} 
                                        onChange={e => setSongFilename(e.target.value)}
                                        placeholder="song-preset"
                                        className="bg-neutral-950 border border-neutral-800 text-[10px] rounded px-2 py-1 w-24 focus:outline-none focus:border-green-500/50 text-neutral-300"
                                    />
                                    <button 
                                        onClick={handleExportSong}
                                        className="flex items-center gap-1 px-2 py-1 bg-neutral-950 hover:bg-neutral-900 text-green-400 text-[10px] rounded border border-neutral-800 transition-colors"
                                        title="Save Song Preset"
                                    >
                                        <Download className="w-3 h-3" />
                                        Save
                                    </button>
                                    <label className="flex items-center gap-1 px-2 py-1 bg-neutral-950 hover:bg-neutral-900 text-green-400 text-[10px] rounded border border-neutral-800 transition-colors cursor-pointer">
                                        <Upload className="w-3 h-3" />
                                        Load
                                        <input type="file" accept=".json" onChange={handleImportSong} className="hidden" />
                                    </label>
                                </div>
`;

let result = file.replace(stateMatch, stateMatch + '\n' + stateInsert);
result = result.replace(funcMatch, funcsInsert + '\n' + funcMatch);
result = result.replace(uiTimbreMatch, uiTimbreInsert + uiTimbreMatch);
result = result.replace(uiSongMatch, uiSongInsert + uiSongMatch);

fs.writeFileSync('src/App.tsx', result);
console.log('Patched');
