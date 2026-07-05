import { useState, useEffect, useCallback } from 'react';
import { audioEngine } from './audio/AudioEngine';
import { Volume2, Power, Activity } from 'lucide-react';

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

export default function App() {
    const [started, setStarted] = useState(false);
    const [dutyMode, setDutyMode] = useState(2); // 50%
    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

    const startEngine = async () => {
        await audioEngine.init();
        await audioEngine.resume();
        setStarted(true);
    };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.repeat) return;
        const key = e.key.toLowerCase();
        if (KEY_FREQUENCIES[key]) {
            setActiveKeys(prev => {
                const next = new Set(prev);
                next.add(key);
                return next;
            });
            audioEngine.playNote(KEY_FREQUENCIES[key].freq);
        }
    }, []);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (KEY_FREQUENCIES[key]) {
            setActiveKeys(prev => {
                const next = new Set(prev);
                next.delete(key);
                // If it was the last key, stop playing. 
                // A better approach for monophonic synth is tracking a stack of keys,
                // but this works for simple validation.
                if (next.size === 0) {
                    audioEngine.stopNote();
                } else {
                    // Play the most recently held key in the set
                    const lastKey = Array.from(next).pop();
                    if (lastKey) {
                        audioEngine.playNote(KEY_FREQUENCIES[lastKey].freq);
                    }
                }
                return next;
            });
        }
    }, []);

    useEffect(() => {
        if (!started) return;
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [started, handleKeyDown, handleKeyUp]);

    const handleDutyChange = (mode: number) => {
        setDutyMode(mode);
        audioEngine.setDuty(mode);
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col items-center py-12 px-4 font-mono">
            <header className="mb-12 text-center">
                <h1 className="text-2xl font-bold text-green-400 mb-2 flex items-center justify-center gap-2">
                    <Activity className="w-6 h-6" />
                    8-Bit Synth Prototype
                </h1>
                <p className="text-neutral-500 text-sm">Pulse Voice Validation</p>
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
                <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl p-8 space-y-8">
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm uppercase tracking-wider text-neutral-400">Pulse 1 Configuration</h2>
                            <div className="flex items-center gap-2 text-green-400">
                                <Volume2 className="w-4 h-4" />
                                <span className="text-xs">Active</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-neutral-500">Duty Cycle</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 0, label: '12.5%' },
                                    { value: 1, label: '25%' },
                                    { value: 2, label: '50%' }
                                ].map((duty) => (
                                    <button
                                        key={duty.value}
                                        onClick={() => handleDutyChange(duty.value)}
                                        className={`py-2 text-sm rounded border transition-colors ${
                                            dutyMode === duty.value 
                                            ? 'bg-neutral-800 text-green-400 border-green-500/50' 
                                            : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:border-neutral-700'
                                        }`}
                                    >
                                        {duty.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-neutral-800">
                        <h2 className="text-sm uppercase tracking-wider text-neutral-400">Keyboard Controls</h2>
                        <div className="bg-neutral-950 p-4 rounded border border-neutral-800">
                            <div className="grid grid-cols-13 gap-1 relative h-32">
                                {/* Simple visual representation of keys */}
                                {Object.entries(KEY_FREQUENCIES).map(([key, data], i) => {
                                    const isBlack = data.note.includes('#');
                                    const isActive = activeKeys.has(key);
                                    
                                    return (
                                        <div 
                                            key={key}
                                            className={`
                                                flex flex-col items-center justify-end pb-2 text-xs rounded border
                                                ${isBlack ? 'bg-neutral-900 text-neutral-500 border-neutral-700 absolute h-20 w-8 z-10' : 'bg-neutral-800 text-neutral-300 border-neutral-700 h-full w-full'}
                                                ${isActive ? '!bg-green-500/20 !text-green-400 !border-green-500' : ''}
                                            `}
                                            style={isBlack ? { left: `${(i - 0.5) * (100 / 7)}%` } : {}}
                                        >
                                            <span className="font-bold mb-1">{key.toUpperCase()}</span>
                                            <span className="opacity-50 text-[10px]">{data.note}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-center text-xs text-neutral-600 mt-4">
                                Use your computer keyboard (Z to ,) to play notes
                            </p>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
