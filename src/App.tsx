import { useState, useEffect, useCallback, MouseEvent } from 'react';
import { audioEngine } from './audio/AudioEngine';
import { Volume2, Power, Activity, Disc3 } from 'lucide-react';

const KEY_FREQUENCIES: Record<string, { note: string, freq: number }> = {
    'z': { note: 'C4', freq: 261.63 },
    's': { note: 'C#4', freq: 277.18 },
    'x': { note: 'D4', freq: 293.66 },
    'd': { note: 'D#4', freq: 311.13 },
    'c': { note: 'E4', freq: 329.63 },
    'v': { note: 'F4', freq: 349.23 },
    'g': { note: 'F#4', freq: 369.99 },
    'b': { note: 'G4', freq: 392.00 },
    'h': { note: 'G#4', freq: 415.30 },
    'n': { note: 'A4', freq: 440.00 },
    'j': { note: 'A#4', freq: 466.16 },
    'm': { note: 'B4', freq: 493.88 },
    ',': { note: 'C5', freq: 523.25 },
};

type VoiceType = 'pulse1' | 'pulse2' | 'triangle';

interface PulseConfig {
    duty: number;
    decay: number;
    loop: boolean;
}

export default function App() {
    const [started, setStarted] = useState(false);
    const [activeVoice, setActiveVoice] = useState<VoiceType>('pulse1');
    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

    // Pulse Config
    const [pulse1, setPulse1] = useState<PulseConfig>({ duty: 2, decay: 15, loop: false });
    const [pulse2, setPulse2] = useState<PulseConfig>({ duty: 1, decay: 15, loop: false });

    // Noise Config
    const [noiseMode, setNoiseMode] = useState(0); // 0 = long, 1 = short
    const [noisePeriod, setNoisePeriod] = useState(0); // 0-15
    const [noisePlaying, setNoisePlaying] = useState(false);

    const startEngine = async () => {
        await audioEngine.init();
        await audioEngine.resume();
        setStarted(true);
        // Initialize worklet state
        audioEngine.setDuty('pulse1', pulse1.duty);
        audioEngine.setEnvelope('pulse1', pulse1.decay, pulse1.loop);
        audioEngine.setDuty('pulse2', pulse2.duty);
        audioEngine.setEnvelope('pulse2', pulse2.decay, pulse2.loop);
        audioEngine.setNoiseMode(noiseMode);
        audioEngine.setNoisePeriod(noisePeriod);
    };

    const pressKey = useCallback((key: string) => {
        if (KEY_FREQUENCIES[key]) {
            setActiveKeys(prev => {
                const next = new Set(prev);
                next.add(key);
                return next;
            });
            audioEngine.playNote(activeVoice, KEY_FREQUENCIES[key].freq);
        }
    }, [activeVoice]);

    const releaseKey = useCallback((key: string) => {
        if (KEY_FREQUENCIES[key]) {
            setActiveKeys(prev => {
                const next = new Set(prev);
                next.delete(key);
                if (next.size === 0) {
                    audioEngine.stopNote(activeVoice);
                } else {
                    const lastKey = Array.from(next).pop();
                    if (lastKey) audioEngine.playNote(activeVoice, KEY_FREQUENCIES[lastKey].freq);
                }
                return next;
            });
        }
    }, [activeVoice]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.repeat) return;
        const key = e.key.toLowerCase();
        pressKey(key);
    }, [pressKey]);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        releaseKey(key);
    }, [releaseKey]);

    useEffect(() => {
        if (!started) return;
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [started, handleKeyDown, handleKeyUp]);

    // Handle mouse events on keys
    const handleKeyMouseDown = (key: string) => (e: MouseEvent) => {
        e.preventDefault();
        pressKey(key);
    };

    const handleKeyMouseUp = (key: string) => (e: MouseEvent) => {
        e.preventDefault();
        releaseKey(key);
    };

    const handleKeyMouseLeave = (key: string) => (e: MouseEvent) => {
        if (activeKeys.has(key)) {
            releaseKey(key);
        }
    };

    // Updaters
    const updatePulse = (voice: 'pulse1' | 'pulse2', updates: Partial<PulseConfig>) => {
        const setState = voice === 'pulse1' ? setPulse1 : setPulse2;
        setState(prev => {
            const next = { ...prev, ...updates };
            if (updates.duty !== undefined) audioEngine.setDuty(voice, next.duty);
            if (updates.decay !== undefined || updates.loop !== undefined) {
                audioEngine.setEnvelope(voice, next.decay, next.loop);
            }
            return next;
        });
    };

    const toggleNoise = () => {
        const next = !noisePlaying;
        setNoisePlaying(next);
        audioEngine.setNoisePlaying(next);
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col items-center py-12 px-4 font-mono">
            <header className="mb-12 text-center">
                <h1 className="text-2xl font-bold text-green-400 mb-2 flex items-center justify-center gap-2">
                    <Activity className="w-6 h-6" />
                    8-Bit Synth Prototype
                </h1>
                <p className="text-neutral-500 text-sm">Full Engine Validation</p>
            </header>

            {!started ? (
                <button 
                    onClick={startEngine}
                    className="flex items-center gap-2 px-6 py-3 bg-green-500/10 text-green-400 border border-green-500/30 rounded hover:bg-green-500/20 transition-colors"
                >
                    <Power className="w-5 h-5" />
                    Start Audio Engine
                </button>
            ) : (
                <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Left Column: Pulses & Triangle */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
                        
                        {/* Pulse 1 */}
                        <PulseControls 
                            title="Pulse 1" 
                            config={pulse1} 
                            onChange={(u) => updatePulse('pulse1', u)} 
                            isActive={activeVoice === 'pulse1'}
                            onSelect={() => setActiveVoice('pulse1')}
                        />
                        
                        <div className="h-px bg-neutral-800 w-full" />

                        {/* Pulse 2 */}
                        <PulseControls 
                            title="Pulse 2" 
                            config={pulse2} 
                            onChange={(u) => updatePulse('pulse2', u)} 
                            isActive={activeVoice === 'pulse2'}
                            onSelect={() => setActiveVoice('pulse2')}
                        />

                        <div className="h-px bg-neutral-800 w-full" />
                        
                        {/* Triangle */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm uppercase tracking-wider text-neutral-400">Triangle</h2>
                            <button
                                onClick={() => setActiveVoice('triangle')}
                                className={`px-3 py-1 text-xs rounded border transition-colors ${
                                    activeVoice === 'triangle'
                                    ? 'bg-green-500/20 text-green-400 border-green-500/50'
                                    : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                                }`}
                            >
                                {activeVoice === 'triangle' ? 'Control: Active' : 'Select'}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Noise & Keyboard */}
                    <div className="space-y-6">
                        {/* Noise Controls */}
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm uppercase tracking-wider text-neutral-400">Noise Channel</h2>
                                <button
                                    onClick={toggleNoise}
                                    className={`flex items-center gap-2 px-3 py-1 text-xs rounded border transition-colors ${
                                        noisePlaying
                                        ? 'bg-red-500/20 text-red-400 border-red-500/50'
                                        : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                                    }`}
                                >
                                    <Disc3 className={`w-3 h-3 ${noisePlaying ? 'animate-spin' : ''}`} />
                                    {noisePlaying ? 'Stop' : 'Play'}
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-500">Mode</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => { setNoiseMode(0); audioEngine.setNoiseMode(0); }}
                                            className={`py-2 text-xs rounded border transition-colors ${
                                                noiseMode === 0 ? 'bg-neutral-800 text-green-400 border-green-500/50' : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                                            }`}
                                        >
                                            Long (White)
                                        </button>
                                        <button
                                            onClick={() => { setNoiseMode(1); audioEngine.setNoiseMode(1); }}
                                            className={`py-2 text-xs rounded border transition-colors ${
                                                noiseMode === 1 ? 'bg-neutral-800 text-green-400 border-green-500/50' : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                                            }`}
                                        >
                                            Short (Metallic)
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-xs text-neutral-500">Period Index</label>
                                        <span className="text-xs text-green-400">{noisePeriod}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" max="15" 
                                        value={noisePeriod}
                                        onChange={(e) => {
                                            const v = parseInt(e.target.value);
                                            setNoisePeriod(v);
                                            audioEngine.setNoisePeriod(v);
                                        }}
                                        className="w-full accent-green-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Keyboard */}
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                            <div className="flex justify-between items-end mb-4">
                                <h2 className="text-sm uppercase tracking-wider text-neutral-400">Keyboard Controls</h2>
                                <span className="text-xs text-green-400">Target: {activeVoice.toUpperCase()}</span>
                            </div>
                            <div className="bg-neutral-950 p-4 rounded border border-neutral-800 select-none">
                                <div className="grid grid-cols-13 gap-1 relative h-32">
                                    {Object.entries(KEY_FREQUENCIES).map(([key, data], i) => {
                                        const isBlack = data.note.includes('#');
                                        const isActive = activeKeys.has(key);
                                        return (
                                            <div 
                                                key={key}
                                                onMouseDown={handleKeyMouseDown(key)}
                                                onMouseUp={handleKeyMouseUp(key)}
                                                onMouseLeave={handleKeyMouseLeave(key)}
                                                className={`
                                                    flex flex-col items-center justify-end pb-2 text-xs rounded border cursor-pointer
                                                    ${isBlack ? 'bg-neutral-900 text-neutral-500 border-neutral-700 absolute h-20 w-8 z-10' : 'bg-neutral-800 text-neutral-300 border-neutral-700 h-full w-full'}
                                                    ${isActive ? '!bg-green-500/20 !text-green-400 !border-green-500' : 'hover:border-neutral-500'}
                                                `}
                                                style={isBlack ? { left: `calc(${(i - 0.5) * (100 / 7)}% + 2px)` } : {}}
                                            >
                                                <span className="font-bold mb-1">{key.toUpperCase()}</span>
                                                <span className="opacity-50 text-[10px]">{data.note}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-center text-[10px] text-neutral-600 mt-4 uppercase">
                                    Use computer keyboard or click to play
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

function PulseControls({ 
    title, 
    config, 
    onChange, 
    isActive, 
    onSelect 
}: { 
    title: string; 
    config: PulseConfig; 
    onChange: (u: Partial<PulseConfig>) => void;
    isActive: boolean;
    onSelect: () => void;
}) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-sm uppercase tracking-wider text-neutral-400">{title}</h2>
                <button
                    onClick={onSelect}
                    className={`px-3 py-1 text-xs rounded border transition-colors ${
                        isActive 
                        ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                        : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:border-neutral-700'
                    }`}
                >
                    {isActive ? 'Control: Active' : 'Select'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs text-neutral-500">Duty Cycle</label>
                    <div className="grid grid-cols-3 gap-1">
                        {[{v: 0, l: '12%'}, {v: 1, l: '25%'}, {v: 2, l: '50%'}].map(d => (
                            <button
                                key={d.v}
                                onClick={() => onChange({ duty: d.v })}
                                className={`py-1 text-xs rounded border transition-colors ${
                                    config.duty === d.v ? 'bg-neutral-800 text-green-400 border-green-500/50' : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                                }`}
                            >
                                {d.l}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <label className="text-xs text-neutral-500">Envelope Decay</label>
                        <span className="text-xs text-green-400">{config.decay}</span>
                    </div>
                    <input 
                        type="range" 
                        min="1" max="15" 
                        value={config.decay}
                        onChange={(e) => onChange({ decay: parseInt(e.target.value) })}
                        className="w-full accent-green-500"
                    />
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                        <input 
                            type="checkbox" 
                            checked={config.loop}
                            onChange={(e) => onChange({ loop: e.target.checked })}
                            className="accent-green-500 rounded bg-neutral-900 border-neutral-700"
                        />
                        <span className="text-xs text-neutral-400">Loop Envelope</span>
                    </label>
                </div>
            </div>
        </div>
    );
}
