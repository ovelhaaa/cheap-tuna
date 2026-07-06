import { useState, useEffect, useCallback, useMemo, useRef, MouseEvent, TouchEvent } from 'react';
import { audioEngine } from './audio/AudioEngine';
import { Volume2, Power, Activity, Disc3 } from 'lucide-react';

const BASE_NOTES = [
    { key: 'z', noteName: 'C', offset: 0, isBlack: false },
    { key: 's', noteName: 'C#', offset: 1, isBlack: true },
    { key: 'x', noteName: 'D', offset: 2, isBlack: false },
    { key: 'd', noteName: 'D#', offset: 3, isBlack: true },
    { key: 'c', noteName: 'E', offset: 4, isBlack: false },
    { key: 'v', noteName: 'F', offset: 5, isBlack: false },
    { key: 'g', noteName: 'F#', offset: 6, isBlack: true },
    { key: 'b', noteName: 'G', offset: 7, isBlack: false },
    { key: 'h', noteName: 'G#', offset: 8, isBlack: true },
    { key: 'n', noteName: 'A', offset: 9, isBlack: false },
    { key: 'j', noteName: 'A#', offset: 10, isBlack: true },
    { key: 'm', noteName: 'B', offset: 11, isBlack: false },
    { key: ',', noteName: 'C', offset: 12, isBlack: false }
];

const ALL_NOTES_LIST = Array.from({ length: 12 * 7 }, (_, i) => {
    const octave = Math.floor(i / 12) + 1;
    const note = BASE_NOTES[i % 12];
    const a4 = 440;
    const noteIndex = (octave - 4) * 12 + note.offset;
    const freq = a4 * Math.pow(2, (noteIndex - 9) / 12);
    return { name: `${note.noteName}${octave}`, freq };
});

type VoiceType = 'pulse1' | 'pulse2' | 'triangle';

const ARP_PATTERNS = [
    { name: 'Major Triad', value: [0, 4, 7] },
    { name: 'Minor Triad', value: [0, 3, 7] },
    { name: 'Octave Jump', value: [0, 12] },
    { name: 'Octave Arp', value: [0, 12, 24] },
    { name: 'Sus4', value: [0, 5, 7] },
];

interface ArpConfig {
    enabled: boolean;
    pattern: number[];
    speed: number;
}

interface VibratoConfig {
    enabled: boolean;
    rate: number;
    depth: number;
}

interface PulseConfig {
    duty: number;
    decay: number; // For backward compatibility / simple UI
    loop: boolean;
    envMode: 'AD' | 'AHDS';
    attackRate: number;
    holdTime: number;
    sustainLevel: number;
    releaseRate: number;
    detune: number;
    arp: ArpConfig;
    vibrato: VibratoConfig;
}

interface TriangleConfig {
    vibrato: VibratoConfig;
}

type StepData = {
    active: boolean;
    freq?: number;
    noteOff?: boolean;
};

type TrackPattern = StepData[];

type StepPattern = {
    pulse1: TrackPattern;
    pulse2: TrackPattern;
    triangle: TrackPattern;
    noise: TrackPattern;
};

export default function App() {
    const [started, setStarted] = useState(false);
    const [activeVoice, setActiveVoice] = useState<VoiceType>('pulse1');
    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
    const [octave, setOctave] = useState(4);

    // Sequencer State
    const [bpm, setBpm] = useState(120);
    const [sequencerPlaying, setSequencerPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [pattern, setPattern] = useState<StepPattern>({
        pulse1: Array.from({ length: 16 }, () => ({ active: false })),
        pulse2: Array.from({ length: 16 }, () => ({ active: false })),
        triangle: Array.from({ length: 16 }, () => ({ active: false })),
        noise: Array.from({ length: 16 }, () => ({ active: false })),
    });

    const currentKeyMap = useMemo(() => {
        const map: Record<string, { note: string, freq: number }> = {};
        for (const note of BASE_NOTES) {
            const actualOctave = octave + Math.floor(note.offset / 12);
            const a4 = 440;
            const noteIndex = (octave - 4) * 12 + note.offset;
            const freq = a4 * Math.pow(2, (noteIndex - 9) / 12);
            map[note.key] = {
                note: `${note.noteName}${actualOctave}`,
                freq
            };
        }
        return map;
    }, [octave]);

    // Pulse Config
    const [pulse1, setPulse1] = useState<PulseConfig>({ 
        duty: 2, decay: 15, loop: false, 
        envMode: 'AD', attackRate: 2, holdTime: 0, sustainLevel: 8, releaseRate: 5, detune: 0,
        arp: { enabled: false, pattern: [0, 4, 7], speed: 30 },
        vibrato: { enabled: false, rate: 6, depth: 2 }
    });
    const [pulse2, setPulse2] = useState<PulseConfig>({ 
        duty: 1, decay: 15, loop: false, 
        envMode: 'AD', attackRate: 2, holdTime: 0, sustainLevel: 8, releaseRate: 5, detune: 0,
        arp: { enabled: false, pattern: [0, 4, 7], speed: 30 },
        vibrato: { enabled: false, rate: 6, depth: 2 }
    });
    
    // Triangle Config
    const [triangle, setTriangle] = useState<TriangleConfig>({
        vibrato: { enabled: false, rate: 6, depth: 2 }
    });

    // Noise Config
    const [noiseMode, setNoiseMode] = useState(0); // 0 = long, 1 = short
    const [noisePeriod, setNoisePeriod] = useState(0); // 0-15
    const [noisePlaying, setNoisePlaying] = useState(false);

    // Polyphony mode
    const [polyMode, setPolyMode] = useState(false);
    const [polyVoices, setPolyVoices] = useState<{pulse1: string | null, pulse2: string | null}>({ pulse1: null, pulse2: null });

    const startEngine = async () => {
        await audioEngine.init();
        await audioEngine.resume();
        setStarted(true);
        // Initialize worklet state
        audioEngine.setDuty('pulse1', pulse1.duty);
        audioEngine.setEnvelope('pulse1', pulse1.decay, pulse1.loop, pulse1.envMode, pulse1.attackRate, pulse1.holdTime, pulse1.sustainLevel, pulse1.releaseRate);
        audioEngine.setDetune('pulse1', pulse1.detune);
        audioEngine.setArp('pulse1', pulse1.arp.enabled, pulse1.arp.pattern, pulse1.arp.speed);
        audioEngine.setVibrato('pulse1', pulse1.vibrato.enabled, pulse1.vibrato.rate, pulse1.vibrato.depth);
        
        audioEngine.setDuty('pulse2', pulse2.duty);
        audioEngine.setEnvelope('pulse2', pulse2.decay, pulse2.loop, pulse2.envMode, pulse2.attackRate, pulse2.holdTime, pulse2.sustainLevel, pulse2.releaseRate);
        audioEngine.setDetune('pulse2', pulse2.detune);
        audioEngine.setArp('pulse2', pulse2.arp.enabled, pulse2.arp.pattern, pulse2.arp.speed);
        audioEngine.setVibrato('pulse2', pulse2.vibrato.enabled, pulse2.vibrato.rate, pulse2.vibrato.depth);
        
        audioEngine.setVibrato('triangle', triangle.vibrato.enabled, triangle.vibrato.rate, triangle.vibrato.depth);
        
        audioEngine.setNoiseMode(noiseMode);
        audioEngine.setNoisePeriod(noisePeriod);

        // Sequencer init
        audioEngine.setSequencerBPM(bpm);
        audioEngine.setSequencerPattern(pattern);
        audioEngine.onStep((step) => {
            setCurrentStep(step);
        });
    };

    useEffect(() => {
        if (started) {
            audioEngine.setSequencerPattern(pattern);
        }
    }, [pattern, started]);

    useEffect(() => {
        if (started) {
            audioEngine.setSequencerBPM(bpm);
        }
    }, [bpm, started]);

    const pressKey = useCallback((key: string) => {
        if (!currentKeyMap[key]) return;
        
        setActiveKeys(prev => {
            const next = new Set(prev);
            next.add(key);
            return next;
        });

        if (polyMode) {
            setPolyVoices(prevVoices => {
                let nextVoices = { ...prevVoices };
                // If key is already assigned, ignore
                if (nextVoices.pulse1 === key || nextVoices.pulse2 === key) return nextVoices;
                
                if (!nextVoices.pulse1) {
                    nextVoices.pulse1 = key;
                    audioEngine.playNote('pulse1', currentKeyMap[key].freq);
                } else if (!nextVoices.pulse2) {
                    nextVoices.pulse2 = key;
                    audioEngine.playNote('pulse2', currentKeyMap[key].freq);
                } else {
                    // Steal pulse1
                    nextVoices.pulse1 = key;
                    audioEngine.playNote('pulse1', currentKeyMap[key].freq);
                }
                return nextVoices;
            });
        } else {
            audioEngine.playNote(activeVoice, currentKeyMap[key].freq);
        }
    }, [activeVoice, polyMode, currentKeyMap]);

    const releaseKey = useCallback((key: string) => {
        if (!currentKeyMap[key]) return;
        
        setActiveKeys(prev => {
            const next = new Set(prev);
            next.delete(key);
            
            if (!polyMode) {
                if (next.size === 0) {
                    audioEngine.stopNote(activeVoice);
                } else {
                    const lastKey = Array.from(next).pop() as string;
                    if (lastKey && currentKeyMap[lastKey]) audioEngine.playNote(activeVoice, currentKeyMap[lastKey].freq);
                }
            }
            return next;
        });

        if (polyMode) {
            setPolyVoices(prevVoices => {
                let nextVoices = { ...prevVoices };
                if (nextVoices.pulse1 === key) {
                    nextVoices.pulse1 = null;
                    audioEngine.stopNote('pulse1');
                }
                if (nextVoices.pulse2 === key) {
                    nextVoices.pulse2 = null;
                    audioEngine.stopNote('pulse2');
                }
                return nextVoices;
            });
        }
    }, [activeVoice, polyMode, currentKeyMap]);

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

    // Handle touch events on keys
    const handleKeyTouchStart = (key: string) => (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();
        pressKey(key);
    };

    const handleKeyTouchEnd = (key: string) => (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();
        releaseKey(key);
    };

    // Updaters
    const updatePulse = (voice: 'pulse1' | 'pulse2', updates: Partial<PulseConfig>) => {
        const setState = voice === 'pulse1' ? setPulse1 : setPulse2;
        setState(prev => {
            const next = { ...prev, ...updates };
            if (updates.duty !== undefined) audioEngine.setDuty(voice, next.duty);
            if (updates.decay !== undefined || updates.loop !== undefined || updates.envMode !== undefined || updates.attackRate !== undefined || updates.holdTime !== undefined || updates.sustainLevel !== undefined || updates.releaseRate !== undefined) {
                audioEngine.setEnvelope(voice, next.decay, next.loop, next.envMode, next.attackRate, next.holdTime, next.sustainLevel, next.releaseRate);
            }
            if (updates.detune !== undefined) audioEngine.setDetune(voice, next.detune);
            if (updates.arp !== undefined) {
                audioEngine.setArp(voice, next.arp.enabled, next.arp.pattern, next.arp.speed);
            }
            if (updates.vibrato !== undefined) {
                audioEngine.setVibrato(voice, next.vibrato.enabled, next.vibrato.rate, next.vibrato.depth);
            }
            return next;
        });
    };

    const updateTriangle = (updates: Partial<TriangleConfig>) => {
        setTriangle(prev => {
            const next = { ...prev, ...updates };
            if (updates.vibrato !== undefined) {
                audioEngine.setVibrato('triangle', next.vibrato.enabled, next.vibrato.rate, next.vibrato.depth);
            }
            return next;
        });
    };

    const toggleNoise = () => {
        const next = !noisePlaying;
        setNoisePlaying(next);
        audioEngine.setNoisePlaying(next);
    };

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!started) return;
        
        let animationId: number;
        
        const draw = () => {
            const canvas = canvasRef.current;
            const analyser = audioEngine.getAnalyser();
            if (!canvas || !analyser) {
                animationId = requestAnimationFrame(draw);
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteTimeDomainData(dataArray);

            ctx.fillStyle = 'rgb(10, 10, 10)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#4ade80'; // green-400
            ctx.beginPath();

            const sliceWidth = canvas.width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [started]);

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col items-center py-12 px-4 font-mono">
            <header className="mb-8 text-center w-full max-w-4xl">
                <h1 className="text-2xl font-bold text-green-400 mb-2 flex items-center justify-center gap-2">
                    <Activity className="w-6 h-6" />
                    8-Bit Synth Prototype
                </h1>
                <p className="text-neutral-500 text-sm mb-6">Full Engine Validation</p>
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
                        <VibratoControls config={triangle.vibrato} onChange={(v) => updateTriangle({ vibrato: v })} />
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
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 mr-4">
                                        <button 
                                            onClick={() => setOctave(o => Math.max(1, o - 1))}
                                            className="px-2 py-0.5 text-[10px] rounded border bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-neutral-300 transition-colors"
                                        >
                                            OCT -
                                        </button>
                                        <span className="text-[10px] text-green-400 w-4 text-center">{octave}</span>
                                        <button 
                                            onClick={() => setOctave(o => Math.min(7, o + 1))}
                                            className="px-2 py-0.5 text-[10px] rounded border bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-neutral-300 transition-colors"
                                        >
                                            OCT +
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase text-neutral-500">Mode</span>
                                        <button 
                                            onClick={() => {
                                                setPolyMode(false);
                                                audioEngine.stopNote('pulse1');
                                                audioEngine.stopNote('pulse2');
                                                setPolyVoices({pulse1: null, pulse2: null});
                                            }}
                                            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${!polyMode ? 'bg-neutral-800 text-green-400 border-green-500/50' : 'bg-neutral-950 text-neutral-500 border-neutral-800'}`}
                                        >
                                            Mono
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setPolyMode(true);
                                                audioEngine.stopNote(activeVoice);
                                            }}
                                            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${polyMode ? 'bg-neutral-800 text-green-400 border-green-500/50' : 'bg-neutral-950 text-neutral-500 border-neutral-800'}`}
                                        >
                                            Poly (2V)
                                        </button>
                                    </div>
                                    {!polyMode ? (
                                        <span className="text-xs text-green-400">Target: {activeVoice.toUpperCase()}</span>
                                    ) : (
                                        <span className="text-xs text-green-400">Target: PULSE 1+2</span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2 overflow-hidden mb-4">
                                <canvas 
                                    ref={canvasRef} 
                                    width={800} 
                                    height={80} 
                                    className="w-full h-20 rounded"
                                />
                            </div>

                            <div className="bg-neutral-950 p-4 rounded border border-neutral-800 select-none touch-none overflow-hidden">
                                <div className="flex relative h-32 gap-1">
                                    {BASE_NOTES.filter(n => !n.isBlack).map((whiteNote) => {
                                        const blackNote = BASE_NOTES.find(n => n.offset === whiteNote.offset + 1 && n.isBlack);
                                        const isWhiteActive = activeKeys.has(whiteNote.key);
                                        return (
                                            <div key={whiteNote.key} className="flex-1 relative">
                                                <div 
                                                    onMouseDown={handleKeyMouseDown(whiteNote.key)}
                                                    onMouseUp={handleKeyMouseUp(whiteNote.key)}
                                                    onMouseLeave={handleKeyMouseLeave(whiteNote.key)}
                                                    onTouchStart={handleKeyTouchStart(whiteNote.key)}
                                                    onTouchEnd={handleKeyTouchEnd(whiteNote.key)}
                                                    onTouchCancel={handleKeyTouchEnd(whiteNote.key)}
                                                    className={`
                                                        absolute inset-0 flex flex-col items-center justify-end pb-2 text-xs rounded border cursor-pointer
                                                        ${isWhiteActive ? '!bg-green-500/20 !text-green-400 !border-green-500' : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-500'}
                                                    `}
                                                >
                                                    <span className="font-bold mb-1">{whiteNote.key.toUpperCase()}</span>
                                                    <span className="opacity-50 text-[10px]">{currentKeyMap[whiteNote.key].note}</span>
                                                </div>
                                                
                                                {blackNote && (
                                                    <div 
                                                        onMouseDown={handleKeyMouseDown(blackNote.key)}
                                                        onMouseUp={handleKeyMouseUp(blackNote.key)}
                                                        onMouseLeave={handleKeyMouseLeave(blackNote.key)}
                                                        onTouchStart={handleKeyTouchStart(blackNote.key)}
                                                        onTouchEnd={handleKeyTouchEnd(blackNote.key)}
                                                        onTouchCancel={handleKeyTouchEnd(blackNote.key)}
                                                        className={`
                                                            absolute top-0 w-8 h-20 z-10 flex flex-col items-center justify-end pb-2 text-xs rounded border cursor-pointer
                                                            ${activeKeys.has(blackNote.key) ? '!bg-green-500/20 !text-green-400 !border-green-500' : 'bg-neutral-900 text-neutral-500 border-neutral-700 hover:border-neutral-500'}
                                                        `}
                                                        style={{ right: '-18px' }}
                                                    >
                                                        <span className="font-bold mb-1">{blackNote.key.toUpperCase()}</span>
                                                        <span className="opacity-50 text-[10px]">{currentKeyMap[blackNote.key].note}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-center text-[10px] text-neutral-600 mt-4 uppercase">
                                    Use computer keyboard or click to play
                                </p>
                            </div>
                        </div>
                        
                        {/* Sequencer */}
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 col-span-1 lg:col-span-3">
                            <div className="flex justify-between items-end mb-4">
                                <h2 className="text-sm uppercase tracking-wider text-neutral-400">Step Sequencer</h2>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase text-neutral-500">BPM</span>
                                        <input 
                                            type="range" 
                                            min="60" max="240" 
                                            value={bpm} 
                                            onChange={(e) => setBpm(Number(e.target.value))}
                                            className="w-24 accent-green-500" 
                                        />
                                        <span className="text-[10px] text-green-400 w-6">{bpm}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                if (sequencerPlaying) {
                                                    audioEngine.pauseSequencer();
                                                    setSequencerPlaying(false);
                                                } else {
                                                    audioEngine.playSequencer();
                                                    setSequencerPlaying(true);
                                                }
                                            }}
                                            className={`px-3 py-1 text-[10px] rounded border transition-colors ${sequencerPlaying ? 'bg-green-500/20 text-green-400 border-green-500' : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-neutral-300'}`}
                                        >
                                            {sequencerPlaying ? 'PAUSE' : 'PLAY'}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                audioEngine.stopSequencer();
                                                setSequencerPlaying(false);
                                            }}
                                            className="px-3 py-1 text-[10px] rounded border bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-neutral-300 transition-colors"
                                        >
                                            STOP
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                {(['pulse1', 'pulse2', 'triangle', 'noise'] as const).map(trackName => (
                                    <div key={trackName} className="flex gap-1 items-center">
                                        <div className="w-20 text-[10px] uppercase text-neutral-500 shrink-0">{trackName}</div>
                                        <div className="flex-1 grid gap-px bg-neutral-800 p-px rounded" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
                                            {pattern[trackName].map((step, i) => {
                                                const isCurrent = i === currentStep;
                                                return (
                                                    <div 
                                                        key={i} 
                                                        className={`h-12 relative flex items-center justify-center cursor-pointer transition-colors
                                                            ${step.active ? 'bg-green-500/30' : step.noteOff ? 'bg-red-500/20' : 'bg-neutral-950 hover:bg-neutral-900'}
                                                            ${isCurrent ? 'border border-green-400' : 'border border-transparent'}
                                                        `}
                                                        onClick={() => {
                                                            setPattern(prev => {
                                                                const next = { ...prev };
                                                                const newTrack = [...next[trackName]];
                                                                
                                                                if (!newTrack[i].active && !newTrack[i].noteOff) {
                                                                    newTrack[i] = { ...newTrack[i], active: true, noteOff: false, freq: newTrack[i].freq || currentKeyMap['z']?.freq || 261.63 };
                                                                } else if (newTrack[i].active) {
                                                                    newTrack[i] = { ...newTrack[i], active: false, noteOff: true };
                                                                } else {
                                                                    newTrack[i] = { ...newTrack[i], active: false, noteOff: false };
                                                                }
                                                                
                                                                next[trackName] = newTrack;
                                                                return next;
                                                            });
                                                        }}
                                                    >
                                                        {step.active && trackName !== 'noise' && (
                                                            <select 
                                                                value={step.freq || ''}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    const freq = Number(e.target.value);
                                                                    setPattern(prev => {
                                                                        const next = { ...prev };
                                                                        const newTrack = [...next[trackName]];
                                                                        newTrack[i] = { ...newTrack[i], freq };
                                                                        next[trackName] = newTrack;
                                                                        return next;
                                                                    });
                                                                }}
                                                                onClick={e => e.stopPropagation()}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            >
                                                                {ALL_NOTES_LIST.map((n, idx) => (
                                                                    <option key={idx} value={n.freq}>{n.name}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        {step.active && trackName !== 'noise' && (
                                                            <div className="text-[8px] pointer-events-none text-green-300 rotate-[-90deg]">
                                                                {ALL_NOTES_LIST.find(n => n.freq === step.freq)?.name || 'C4'}
                                                            </div>
                                                        )}
                                                        {step.active && trackName === 'noise' && (
                                                            <div className="w-2 h-2 rounded-full bg-green-400 pointer-events-none" />
                                                        )}
                                                        {step.noteOff && (
                                                            <div className="w-2 h-2 rounded-full bg-red-500 pointer-events-none" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
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
                        <label className="text-xs text-neutral-500">Detune</label>
                        <span className="text-xs text-green-400">{config.detune}</span>
                    </div>
                    <input 
                        type="range" min="-10" max="10" 
                        value={config.detune}
                        onChange={(e) => onChange({ detune: parseInt(e.target.value) })}
                        className="w-full accent-green-500"
                    />
                </div>
            </div>
            
            <div className="space-y-2 pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-neutral-500 uppercase">Quantized Envelope</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onChange({ envMode: 'AD' })}
                            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${config.envMode === 'AD' ? 'bg-neutral-800 text-green-400 border-green-500/50' : 'bg-neutral-950 text-neutral-500 border-neutral-800'}`}
                        >
                            AD
                        </button>
                        <button
                            onClick={() => onChange({ envMode: 'AHDS' })}
                            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${config.envMode === 'AHDS' ? 'bg-neutral-800 text-green-400 border-green-500/50' : 'bg-neutral-950 text-neutral-500 border-neutral-800'}`}
                        >
                            AHDS
                        </button>
                        <label className="flex items-center gap-1 cursor-pointer ml-2">
                            <input type="checkbox" checked={config.loop} onChange={e => onChange({ loop: e.target.checked })} className="accent-green-500 rounded bg-neutral-900 border-neutral-700" />
                            <span className="text-[10px] text-neutral-400">Loop</span>
                        </label>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col">
                        <div className="flex justify-between">
                            <span className="text-[10px] text-neutral-500">Attack</span>
                            <span className="text-[10px] text-green-400">{config.attackRate}</span>
                        </div>
                        <input type="range" min="0" max="15" value={config.attackRate} onChange={e => onChange({ attackRate: parseInt(e.target.value) })} className="accent-green-500" />
                    </div>
                    {config.envMode === 'AHDS' && (
                        <div className="flex flex-col">
                            <div className="flex justify-between">
                                <span className="text-[10px] text-neutral-500">Hold</span>
                                <span className="text-[10px] text-green-400">{config.holdTime}</span>
                            </div>
                            <input type="range" min="0" max="60" value={config.holdTime} onChange={e => onChange({ holdTime: parseInt(e.target.value) })} className="accent-green-500" />
                        </div>
                    )}
                    <div className="flex flex-col">
                        <div className="flex justify-between">
                            <span className="text-[10px] text-neutral-500">Decay</span>
                            <span className="text-[10px] text-green-400">{config.decay}</span>
                        </div>
                        <input type="range" min="1" max="15" value={config.decay} onChange={e => onChange({ decay: parseInt(e.target.value) })} className="accent-green-500" />
                    </div>
                    {config.envMode === 'AHDS' && (
                        <>
                            <div className="flex flex-col">
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-neutral-500">Sustain</span>
                                    <span className="text-[10px] text-green-400">{config.sustainLevel}</span>
                                </div>
                                <input type="range" min="0" max="15" value={config.sustainLevel} onChange={e => onChange({ sustainLevel: parseInt(e.target.value) })} className="accent-green-500" />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-neutral-500">Release</span>
                                    <span className="text-[10px] text-green-400">{config.releaseRate}</span>
                                </div>
                                <input type="range" min="1" max="15" value={config.releaseRate} onChange={e => onChange({ releaseRate: parseInt(e.target.value) })} className="accent-green-500" />
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            <div className="space-y-2 pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between">
                    <label className="text-xs text-neutral-500 uppercase">Arpeggiator</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={config.arp.enabled}
                            onChange={(e) => onChange({ arp: { ...config.arp, enabled: e.target.checked } })}
                            className="accent-green-500 rounded bg-neutral-900 border-neutral-700"
                        />
                        <span className="text-xs text-neutral-400">Enable</span>
                    </label>
                </div>
                {config.arp.enabled && (
                    <div className="grid grid-cols-2 gap-4">
                        <select 
                            value={JSON.stringify(config.arp.pattern)}
                            onChange={(e) => onChange({ arp: { ...config.arp, pattern: JSON.parse(e.target.value) } })}
                            className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-300"
                        >
                            {ARP_PATTERNS.map(p => (
                                <option key={p.name} value={JSON.stringify(p.value)}>{p.name}</option>
                            ))}
                        </select>
                        <div className="flex flex-col">
                            <div className="flex justify-between">
                                <span className="text-[10px] text-neutral-500">Speed</span>
                                <span className="text-[10px] text-green-400">{config.arp.speed} Hz</span>
                            </div>
                            <input 
                                type="range" min="10" max="60" step="1"
                                value={config.arp.speed}
                                onChange={(e) => onChange({ arp: { ...config.arp, speed: parseInt(e.target.value) } })}
                                className="accent-green-500"
                            />
                        </div>
                    </div>
                )}
            </div>

            <VibratoControls config={config.vibrato} onChange={(v) => onChange({ vibrato: v })} />
        </div>
    );
}

function VibratoControls({ config, onChange }: { config: VibratoConfig, onChange: (u: VibratoConfig) => void }) {
    return (
        <div className="space-y-2 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between">
                <label className="text-xs text-neutral-500 uppercase">Vibrato</label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={config.enabled}
                        onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
                        className="accent-green-500 rounded bg-neutral-900 border-neutral-700"
                    />
                    <span className="text-xs text-neutral-400">Enable</span>
                </label>
            </div>
            {config.enabled && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                        <div className="flex justify-between">
                            <span className="text-[10px] text-neutral-500">Rate</span>
                            <span className="text-[10px] text-green-400">{config.rate} Hz</span>
                        </div>
                        <input 
                            type="range" min="1" max="12" step="0.5"
                            value={config.rate}
                            onChange={(e) => onChange({ ...config, rate: parseFloat(e.target.value) })}
                            className="accent-green-500"
                        />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex justify-between">
                            <span className="text-[10px] text-neutral-500">Depth</span>
                            <span className="text-[10px] text-green-400">{config.depth} Steps</span>
                        </div>
                        <input 
                            type="range" min="1" max="8" step="1"
                            value={config.depth}
                            onChange={(e) => onChange({ ...config, depth: parseInt(e.target.value) })}
                            className="accent-green-500"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
