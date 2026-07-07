import { useState, useEffect, ChangeEvent, useCallback, useMemo, useRef, MouseEvent, TouchEvent } from 'react';
import { audioEngine } from './audio/AudioEngine';
import { Volume2, Power, Activity, Disc3, Download, Upload, Dices } from 'lucide-react';
import { downloadJson, loadJson } from './utils/presets';

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

type VoiceType = 'pulse1' | 'pulse2' | 'triangle' | 'noise';

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
    note?: number;
    tie?: boolean;
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
    const [currentSongPos, setCurrentSongPos] = useState(0);
    const [swing, setSwing] = useState(0);

    const [patterns, setPatterns] = useState<StepPattern[]>([{
        pulse1: Array.from({ length: 16 }, () => ({})),
        pulse2: Array.from({ length: 16 }, () => ({})),
        triangle: Array.from({ length: 16 }, () => ({})),
        noise: Array.from({ length: 16 }, () => ({})),
    }]);
    const [songSequence, setSongSequence] = useState<number[]>([0]);
    const [currentPatternIndex, setCurrentPatternIndex] = useState(0);

    const [editingNote, setEditingNote] = useState<{track: keyof StepPattern, step: number} | null>(null);

    const [dragContext, setDragContext] = useState<{
        track: keyof StepPattern | null;
        startStep: number;
        mode: 'tie' | 'erase' | null;
        couldErase: boolean;
        isEditClick: boolean;
    }>({ track: null, startStep: -1, mode: null, couldErase: false, isEditClick: false });

    useEffect(() => {
        const handlePointerUp = () => {
            setDragContext(prev => {
                if (prev.isEditClick && prev.track && prev.startStep !== -1) {
                    setEditingNote({ track: prev.track, step: prev.startStep });
                } else if (prev.couldErase && prev.track && prev.startStep !== -1) {
                    setPatterns(p => {
                        const next = [...p];
                        const nextPattern = { ...next[currentPatternIndex] };
                        const newTrack = [...nextPattern[prev.track!]];
                        newTrack[prev.startStep] = {}; // Erase on click release if no drag happened
                        nextPattern[prev.track!] = newTrack;
                        next[currentPatternIndex] = nextPattern;
                        audioEngine.setSequencerPattern(currentPatternIndex, nextPattern);
                        return next;
                    });
                }
                return { track: null, startStep: -1, mode: null, couldErase: false, isEditClick: false };
            });
        };
        window.addEventListener('pointerup', handlePointerUp);
        return () => window.removeEventListener('pointerup', handlePointerUp);
    }, []);

    const activeFreqsRef = useRef(new Map<string, number>());
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

    // Voice level settings
    const [pulse1Level, setPulse1Level] = useState(1.0);
    const [pulse2Level, setPulse2Level] = useState(1.0);
    const [triangleLevel, setTriangleLevel] = useState(1.0);
    const [noiseLevel, setNoiseLevel] = useState(1.0);

    // Filter settings
    const [filterCutoff, setFilterCutoff] = useState(20000);
    const [filterResonance, setFilterResonance] = useState(1.0);

    // Polyphony mode
    const [polyMode, setPolyMode] = useState(false);
    const [polyVoices, setPolyVoices] = useState<{pulse1: string | null, pulse2: string | null}>({ pulse1: null, pulse2: null });

    const [timbreFilename, setTimbreFilename] = useState('');
    const [songFilename, setSongFilename] = useState('');


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

        // Mixer & Filter init
        audioEngine.setVoiceLevel('pulse1', pulse1Level);
        audioEngine.setVoiceLevel('pulse2', pulse2Level);
        audioEngine.setVoiceLevel('triangle', triangleLevel);
        audioEngine.setVoiceLevel('noise', noiseLevel);
        
        audioEngine.setFilterCutoff(filterCutoff);
        audioEngine.setFilterResonance(filterResonance);

        // Sequencer init
        audioEngine.setSequencerBPM(bpm);
        audioEngine.setSequencerPatterns(patterns);
        audioEngine.setSequencerSong(songSequence);
        audioEngine.setSequencerSwing(swing);
        audioEngine.onStep((step, songPos) => {
            setCurrentStep(step);
            setCurrentSongPos(songPos);
        });
    };

    useEffect(() => {
        if (started) {
            audioEngine.setSequencerSwing(swing);
        }
    }, [swing, started]);

    useEffect(() => {
        if (started) {
            audioEngine.setSequencerSong(songSequence);
        }
    }, [songSequence, started]);

    useEffect(() => {
        if (started) {
            audioEngine.setSequencerBPM(bpm);
        }
    }, [bpm, started]);



    const triggerNoteOn = useCallback((id: string, freq: number) => {
        activeFreqsRef.current.set(id, freq);

        if (editingNote) {
            setPatterns(p => {
                const next = [...p];
                const pat = {...next[currentPatternIndex]};
                const track = [...pat[editingNote.track]];
                track[editingNote.step] = { ...track[editingNote.step], note: freq };
                pat[editingNote.track] = track;
                next[currentPatternIndex] = pat;
                audioEngine.setSequencerPattern(currentPatternIndex, pat);
                return next;
            });
            
            setActiveKeys(prev => {
                const next = new Set(prev);
                next.add(id);
                return next;
            });

            const targetVoice = editingNote.track !== 'noise' ? editingNote.track : activeVoice;
            audioEngine.playNote(targetVoice, freq);
            setTimeout(() => audioEngine.stopNote(targetVoice), 150);
            
            setEditingNote(null);
            return;
        }

        setActiveKeys(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });

        if (polyMode) {
            setPolyVoices(prevVoices => {
                let nextVoices = { ...prevVoices };
                if (nextVoices.pulse1 === id || nextVoices.pulse2 === id) return nextVoices;
                
                if (!nextVoices.pulse1) {
                    nextVoices.pulse1 = id;
                    audioEngine.playNote('pulse1', freq);
                } else if (!nextVoices.pulse2) {
                    nextVoices.pulse2 = id;
                    audioEngine.playNote('pulse2', freq);
                } else {
                    nextVoices.pulse1 = id;
                    audioEngine.playNote('pulse1', freq);
                }
                return nextVoices;
            });
        } else {
            audioEngine.playNote(activeVoice, freq);
        }
    }, [activeVoice, polyMode, editingNote, currentPatternIndex]);

    const triggerNoteOff = useCallback((id: string) => {
        activeFreqsRef.current.delete(id);
        
        setActiveKeys(prev => {
            const next = new Set(prev);
            next.delete(id);
            
            if (!polyMode) {
                if (next.size === 0) {
                    audioEngine.stopNote(activeVoice);
                } else {
                    const lastKey = Array.from(next).pop() as string;
                    const freq = activeFreqsRef.current.get(lastKey);
                    if (freq) audioEngine.playNote(activeVoice, freq);
                }
            }
            return next;
        });

        if (polyMode) {
            setPolyVoices(prevVoices => {
                let nextVoices = { ...prevVoices };
                if (nextVoices.pulse1 === id) {
                    nextVoices.pulse1 = null;
                    audioEngine.stopNote('pulse1');
                }
                if (nextVoices.pulse2 === id) {
                    nextVoices.pulse2 = null;
                    audioEngine.stopNote('pulse2');
                }
                return nextVoices;
            });
        }
    }, [activeVoice, polyMode]);

    const pressKey = useCallback((key: string) => {
        if (!currentKeyMap[key]) return;
        triggerNoteOn(key, currentKeyMap[key].freq);
    }, [currentKeyMap, triggerNoteOn]);

    const releaseKey = useCallback((key: string) => {
        if (!currentKeyMap[key]) return;
        triggerNoteOff(key);
    }, [currentKeyMap, triggerNoteOff]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setEditingNote(null);
            return;
        }
        if (e.repeat) return;
        
        // Disable piano keys when typing in an input
        if (document.activeElement?.tagName === 'INPUT') return;

        if (e.key === '[') {
            setOctave(o => Math.max(1, o - 1));
            return;
        }
        if (e.key === ']') {
            setOctave(o => Math.min(7, o + 1));
            return;
        }

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

    useEffect(() => {
        if (!started) return;
        
        let midiAccess: any = null;

        const onMIDIMessage = (message: any) => {
            const command = message.data[0];
            const note = message.data[1];
            const velocity = (message.data.length > 2) ? message.data[2] : 0;
            
            const cmd = command & 0xf0;
            
            if (cmd === 144 && velocity > 0) {
                const freq = 440 * Math.pow(2, (note - 69) / 12);
                
                const noteOctave = Math.floor(note / 12) - 1;
                const noteOffset = note % 12;
                
                let uiKey = `midi-${note}`;
                if (noteOctave === octave) {
                    const mappedKey = BASE_NOTES.find(n => n.offset === noteOffset);
                    if (mappedKey) uiKey = mappedKey.key;
                }
                
                triggerNoteOn(uiKey, freq);
            } else if (cmd === 128 || (cmd === 144 && velocity === 0)) {
                const noteOctave = Math.floor(note / 12) - 1;
                const noteOffset = note % 12;
                
                let uiKey = `midi-${note}`;
                if (noteOctave === octave) {
                    const mappedKey = BASE_NOTES.find(n => n.offset === noteOffset);
                    if (mappedKey) uiKey = mappedKey.key;
                }
                
                triggerNoteOff(uiKey);
            }
        };

        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then(access => {
                midiAccess = access;
                for (const input of midiAccess.inputs.values()) {
                    input.onmidimessage = onMIDIMessage;
                }
                
                midiAccess.onstatechange = (e: any) => {
                    if (e.port.type === 'input' && e.port.state === 'connected') {
                        e.port.onmidimessage = onMIDIMessage;
                    }
                };
            }).catch(err => {
                console.log("MIDI access denied or not supported:", err);
            });
        }
        
        return () => {
            if (midiAccess) {
                for (const input of midiAccess.inputs.values()) {
                    input.onmidimessage = null;
                }
            }
        };
    }, [started, octave, triggerNoteOn, triggerNoteOff]);

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
        downloadJson(timbreFilename || `timbre-${activeVoice}`, data);
    };

    const handleImportTimbre = async (e: ChangeEvent<HTMLInputElement>) => {
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

    const handleImportSong = async (e: ChangeEvent<HTMLInputElement>) => {
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

    const toggleNoise = () => {
        const next = !noisePlaying;
        setNoisePlaying(next);
        audioEngine.setNoisePlaying(next);
    };

    const handleRandomizePattern = useCallback(() => {
        const scaleOffsets = [0, 2, 3, 5, 7, 8, 10]; // minor pentatonic/natural minor scale notes
        
        const getFreqForOffset = (off: number, octOffset: number) => {
            const actualOctave = octave + octOffset;
            const a4 = 440;
            const noteIndex = (actualOctave - 4) * 12 + off;
            return a4 * Math.pow(2, (noteIndex - 9) / 12);
        };

        setPatterns(prev => {
            const next = [...prev];
            const pat = { ...next[currentPatternIndex] };
            const tracksToRandomize = ['pulse1', 'pulse2', 'triangle', 'noise'] as const;

            for (const track of tracksToRandomize) {
                const trackData: TrackPattern = Array.from({ length: 16 }, (_, stepIdx) => {
                    if (track === 'noise') {
                        let chance = 0.1;
                        if (stepIdx % 4 === 0) chance = 0.45;
                        else if (stepIdx % 2 === 0) chance = 0.25;

                        if (Math.random() < chance) {
                            return { note: 1 };
                        }
                        return {};
                    } else {
                        let noteChance = 0.35;
                        if (track === 'triangle') noteChance = 0.45;

                        if (Math.random() < noteChance) {
                            const randOffset = scaleOffsets[Math.floor(Math.random() * scaleOffsets.length)];
                            let octOff = 0;
                            if (track === 'pulse1') {
                                octOff = Math.random() < 0.4 ? 1 : 0;
                            } else if (track === 'pulse2') {
                                octOff = Math.random() < 0.3 ? -1 : 0;
                            } else if (track === 'triangle') {
                                octOff = Math.random() < 0.5 ? -2 : -1;
                            }
                            const freq = getFreqForOffset(randOffset, octOff);
                            return { note: freq };
                        }
                        return {};
                    }
                });

                if (track !== 'noise') {
                    for (let stepIdx = 1; stepIdx < 16; stepIdx++) {
                        const prevStep = trackData[stepIdx - 1];
                        if ((prevStep.note !== undefined || prevStep.tie) && Math.random() < 0.25) {
                            if (trackData[stepIdx].note === undefined) {
                                trackData[stepIdx] = { tie: true };
                            }
                        }
                    }
                }

                pat[track] = trackData;
            }

            next[currentPatternIndex] = pat;
            audioEngine.setSequencerPattern(currentPatternIndex, pat);
            return next;
        });
    }, [octave, currentPatternIndex]);

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
            ctx.strokeStyle = '#ff8c1a'; // green-400
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
        <div className="min-h-screen bg-vintage-bg text-vintage-text flex flex-col items-center py-4 px-2 sm:py-12 sm:px-4 font-mono">
            <header className="mb-4 pb-2 sm:mb-8 sm:pb-4 border-b-4 border-amber-primary flex flex-col sm:flex-row justify-between items-center w-full max-w-4xl gap-2">
                <div className="text-2xl font-extrabold tracking-tight text-vintage-text uppercase">8-BIT SYNTH // P004</div>
                <div className="text-xs tracking-widest text-amber-primary font-bold">SYSTEM STATUS: ONLINE</div>
            </header>

            {!started ? (
                <button 
                    onClick={startEngine}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-dimmer text-amber-primary border border-amber-primary/30 rounded hover:bg-amber-dimmer transition-colors btn-hardware"
                >
                    <Power className="w-5 h-5" />
                    Start Audio Engine
                </button>
            ) : (
                <div className="w-full max-w-4xl flex flex-col gap-3 sm:gap-3 sm:gap-6">
                    <div className="module-panel p-3 sm:p-4 pt-3 sm:pt-4 rounded space-y-4 sm:space-y-6 sm:space-y-4 sm:space-y-6">
                        
                        <div className="tape-slot p-4 rounded space-y-3 mb-4">
                            <h3 className="text-xs uppercase text-vintage-text-dim font-bold tracking-wider">Timbre Presets (Active Voice)</h3>
                            <div className="flex items-center gap-2 ">
                                <input 
                                    type="text" 
                                    value={timbreFilename} 
                                    onChange={e => setTimbreFilename(e.target.value)}
                                    placeholder={`timbre-${activeVoice}`}
                                    className="bg-vintage-panel border border-vintage-border text-xs rounded px-2 py-1.5 flex-1 focus:outline-none focus:border-amber-primary/50 text-vintage-text"
                                />
                                <button 
                                    onClick={handleExportTimbre}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-vintage-surface hover:bg-vintage-border text-amber-primary text-xs rounded border border-vintage-border transition-colors btn-hardware"
                                    title="Export Timbre"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Save
                                </button>
                                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-vintage-surface hover:bg-vintage-border text-amber-primary text-xs rounded border border-vintage-border transition-colors cursor-pointer">
                                    <Upload className="w-3.5 h-3.5" />
                                    Load
                                    <input type="file" accept=".json" onChange={handleImportTimbre} className="hidden" />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4 sm:space-y-6">
                            {/* Voice Tabs */}
                            <div className="flex bg-vintage-surface rounded border border-vintage-border overflow-x-auto overflow-y-hidden hide-scrollbar scroll-smooth">
                                {(["pulse1", "pulse2", "triangle", "noise"] as VoiceType[]).map((voice) => (
                                    <button
                                        key={voice}
                                        onClick={() => setActiveVoice(voice)}
                                        className={`flex-1 min-w-[80px] min-h-[44px] py-2 px-4 text-xs uppercase tracking-wider font-bold transition-colors whitespace-nowrap ${
                                            activeVoice === voice 
                                            ? 'bg-amber-dimmer text-amber-primary border-b-2 border-amber-primary' 
                                            : 'text-vintage-text-dim hover:bg-vintage-bg hover:text-vintage-text border-b-2 border-transparent'
                                        }`}
                                    >
                                        {voice === 'pulse1' ? 'Pulse 1' : voice === 'pulse2' ? 'Pulse 2' : voice === 'triangle' ? 'Triangle' : 'Noise'}
                                    </button>
                                ))}
                            </div>

                            <div className="module-panel p-3 sm:p-4 pt-3 sm:pt-4 rounded space-y-4 sm:space-y-4 min-h-[300px]">
                                {activeVoice === 'pulse1' && (
                                    <PulseControls 
                                        title="Pulse 1" 
                                        config={pulse1} 
                                        onChange={(u) => updatePulse('pulse1', u)} 
                                        isActive={true}
                                        onSelect={() => {}}
                                    />
                                )}
                                
                                {activeVoice === 'pulse2' && (
                                    <PulseControls 
                                        title="Pulse 2" 
                                        config={pulse2} 
                                        onChange={(u) => updatePulse('pulse2', u)} 
                                        isActive={true}
                                        onSelect={() => {}}
                                    />
                                )}
                                
                                {activeVoice === 'triangle' && (
                                    <div className="space-y-4 sm:space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-sm uppercase tracking-wider text-amber-primary font-bold">Triangle</h2>
                                        </div>
                                        <VibratoControls config={triangle.vibrato} onChange={(v) => updateTriangle({ vibrato: v })} />
                                    </div>
                                )}
                                
                                {activeVoice === 'noise' && (
                                    <div className="space-y-4 sm:space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-sm uppercase tracking-wider text-amber-primary font-bold">Noise Channel</h2>
                                            <button
                                                onClick={toggleNoise}
                                                className={`flex items-center justify-center gap-2 px-4 min-h-[44px] text-xs rounded border transition-colors ${
                                                    noisePlaying
                                                    ? 'bg-red-500/20 text-red-400 border-red-500/50'
                                                    : 'bg-vintage-bg text-vintage-text-dim border-vintage-border'
                                                }`}
                                            >
                                                <Disc3 className={`w-4 h-4 ${noisePlaying ? 'animate-spin' : ''}`} />
                                                {noisePlaying ? 'Stop' : 'Play'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                                            <div className="space-y-3">
                                                <label className="text-xs text-vintage-text-dim uppercase tracking-wider">Mode</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => { setNoiseMode(0); audioEngine.setNoiseMode(0); }}
                                                        className={`py-3 px-2 min-h-[44px] text-xs font-medium rounded border transition-colors ${
                                                            noiseMode === 0 ? 'bg-vintage-surface text-amber-primary border-amber-primary/50' : 'bg-vintage-bg text-vintage-text-dim border-vintage-border'
                                                        }`}
                                                    >
                                                        Long (White)
                                                    </button>
                                                    <button
                                                        onClick={() => { setNoiseMode(1); audioEngine.setNoiseMode(1); }}
                                                        className={`py-3 px-2 min-h-[44px] text-xs font-medium rounded border transition-colors ${
                                                            noiseMode === 1 ? 'bg-vintage-surface text-amber-primary border-amber-primary/50' : 'bg-vintage-bg text-vintage-text-dim border-vintage-border'
                                                        }`}
                                                    >
                                                        Short (Metallic)
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center h-4">
                                                    <label className="text-xs text-vintage-text-dim uppercase tracking-wider">Period Index</label>
                                                    <span className="text-xs text-amber-primary font-bold bg-vintage-surface px-2 py-0.5 rounded border border-vintage-border">{noisePeriod}</span>
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
                                                    className="w-full h-10 accent-amber-primary"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Master Mixer & Filter Panel */}
                            <div className="module-panel p-3 sm:p-4 pt-3 sm:pt-4 rounded space-y-4 sm:space-y-4 col-span-1 md:col-span-2 border border-amber-primary/10">
                                <h2 className="text-sm uppercase tracking-wider text-amber-primary font-bold">Master Mixer & Filter</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                                    {/* Voice Levels (Mixer) */}
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] sm:text-xs uppercase text-vintage-text-dim font-bold tracking-wider border-b border-vintage-border pb-1">Mixer</h3>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        {/* Pulse 1 Level */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase text-vintage-text-dim font-medium">Pulse 1 Volume</span>
                                                <span className="text-xs text-amber-primary font-bold">{Math.round(pulse1Level * 100)}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" max="1" step="0.01"
                                                value={pulse1Level}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    setPulse1Level(v);
                                                    audioEngine.setVoiceLevel('pulse1', v);
                                                }}
                                                className="w-full h-10 accent-amber-primary cursor-pointer"
                                                
                                            />
                                        </div>

                                        {/* Pulse 2 Level */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase text-vintage-text-dim font-medium">Pulse 2 Volume</span>
                                                <span className="text-xs text-amber-primary font-bold">{Math.round(pulse2Level * 100)}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" max="1" step="0.01"
                                                value={pulse2Level}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    setPulse2Level(v);
                                                    audioEngine.setVoiceLevel('pulse2', v);
                                                }}
                                                className="w-full h-10 accent-amber-primary cursor-pointer"
                                                
                                            />
                                        </div>

                                        {/* Triangle Level */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase text-vintage-text-dim font-medium">Triangle Volume</span>
                                                <span className="text-xs text-amber-primary font-bold">{Math.round(triangleLevel * 100)}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" max="1" step="0.01"
                                                value={triangleLevel}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    setTriangleLevel(v);
                                                    audioEngine.setVoiceLevel('triangle', v);
                                                }}
                                                className="w-full h-10 accent-amber-primary cursor-pointer"
                                                
                                            />
                                        </div>

                                        {/* Noise Level */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase text-vintage-text-dim font-medium">Noise Volume</span>
                                                <span className="text-xs text-amber-primary font-bold">{Math.round(noiseLevel * 100)}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" max="1" step="0.01"
                                                value={noiseLevel}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    setNoiseLevel(v);
                                                    audioEngine.setVoiceLevel('noise', v);
                                                }}
                                                className="w-full h-10 accent-amber-primary cursor-pointer"
                                                
                                            />
                                        </div>
                                    </div>

                                    {/* Low-pass Filter Controls */}
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] sm:text-xs uppercase text-vintage-text-dim font-bold tracking-wider border-b border-vintage-border pb-1">Filter</h3>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        
                                        {/* Cutoff Frequency */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase text-vintage-text-dim font-medium">Cutoff Frequency</span>
                                                <span className="text-xs text-amber-primary font-bold">{filterCutoff} Hz</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="100" max="20000" step="10"
                                                value={filterCutoff}
                                                onChange={(e) => {
                                                    const v = parseInt(e.target.value);
                                                    setFilterCutoff(v);
                                                    audioEngine.setFilterCutoff(v);
                                                }}
                                                className="w-full h-10 accent-amber-primary cursor-pointer"
                                                
                                            />
                                        </div>

                                        {/* Resonance (Q) */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase text-vintage-text-dim font-medium">Resonance (Q)</span>
                                                <span className="text-xs text-amber-primary font-bold">{filterResonance.toFixed(2)}</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0.1" max="15" step="0.1"
                                                value={filterResonance}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    setFilterResonance(v);
                                                    audioEngine.setFilterResonance(v);
                                                }}
                                                className="w-full h-10 accent-amber-primary cursor-pointer"
                                                
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                        {/* Keyboard */}
                        <div className="module-panel p-3 sm:p-4 rounded">
                            <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-2 sm:gap-4 mb-4">
                                <h2 className="text-sm uppercase tracking-wider text-vintage-text-dim">Keyboard Controls</h2>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                    <div className="flex items-center gap-2 mr-4">
                                        <button 
                                            onClick={() => setOctave(o => Math.max(1, o - 1))}
                                            className="px-2 py-0.5 text-[10px] rounded border bg-vintage-bg text-vintage-text-dim border-vintage-border hover:text-vintage-text transition-colors"
                                        >
                                            OCT -
                                        </button>
                                        <span className="text-[10px] text-amber-primary w-4 text-center">{octave}</span>
                                        <button 
                                            onClick={() => setOctave(o => Math.min(7, o + 1))}
                                            className="px-2 py-0.5 text-[10px] rounded border bg-vintage-bg text-vintage-text-dim border-vintage-border hover:text-vintage-text transition-colors"
                                        >
                                            OCT +
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 ">
                                        <span className="text-[10px] uppercase text-vintage-text-dim">Mode</span>
                                        <button 
                                            onClick={() => {
                                                setPolyMode(false);
                                                audioEngine.stopNote('pulse1');
                                                audioEngine.stopNote('pulse2');
                                                setPolyVoices({pulse1: null, pulse2: null});
                                            }}
                                            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${!polyMode ? 'bg-vintage-surface text-amber-primary border-amber-primary/50' : 'bg-vintage-bg text-vintage-text-dim border-vintage-border'}`}
                                        >
                                            Mono
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setPolyMode(true);
                                                audioEngine.stopNote(activeVoice);
                                            }}
                                            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${polyMode ? 'bg-vintage-surface text-amber-primary border-amber-primary/50' : 'bg-vintage-bg text-vintage-text-dim border-vintage-border'}`}
                                        >
                                            Poly (2V)
                                        </button>
                                    </div>
                                    {!polyMode ? (
                                        <span className="text-xs text-amber-primary">Target: {activeVoice.toUpperCase()}</span>
                                    ) : (
                                        <span className="text-xs text-amber-primary">Target: PULSE 1+2</span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="w-full bg-vintage-bg border border-vintage-border rounded-xl p-2 overflow-hidden mb-4">
                                <canvas 
                                    ref={canvasRef} 
                                    width={800} 
                                    height={80} 
                                    className="w-full h-20 rounded"
                                />
                            </div>

                            <div className="bg-vintage-bg p-2 sm:p-4 rounded border border-vintage-border select-none touch-none overflow-x-auto">
                                <div className="flex relative h-32 gap-1 min-w-[600px] sm:min-w-full">
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
                                                        ${isWhiteActive ? '!bg-amber-dimmer !text-amber-primary !border-amber-primary' : 'bg-vintage-surface text-vintage-text border-vintage-border hover:border-amber-dim'}
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
                                                            ${activeKeys.has(blackNote.key) ? '!bg-amber-dimmer !text-amber-primary !border-amber-primary' : 'bg-vintage-panel text-vintage-text-dim border-vintage-border hover:border-amber-dim'}
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
                                <p className="text-center text-[10px] text-vintage-text-dim mt-4 uppercase">
                                    Use computer keyboard or click to play
                                </p>
                            </div>
                        {/* Sequencer */}
                        <div className="module-panel p-3 sm:p-4 rounded col-span-1 lg:col-span-3">
                            <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-2 sm:gap-4 mb-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-sm uppercase tracking-wider text-vintage-text-dim">Step Sequencer</h2>
                                        {editingNote && (
                                            <span className="text-[10px] uppercase bg-amber-dimmer text-amber-primary px-2 py-0.5 rounded border border-amber-dim flex items-center gap-2">
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
                                                    className="bg-red-500/20 text-red-400 border border-red-500/50 px-1.5 rounded hover:bg-red-500/40 not-italic btn-hardware"
                                                    title="Erase Note"
                                                >
                                                    Erase
                                                </button>
                                                <button onClick={() => setEditingNote(null)} className="ml-1 hover:text-white px-1">&times;</button>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col xl:flex-row gap-3 sm:gap-6 mb-4 justify-between w-full">
                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 items-start sm:items-center overflow-x-auto w-full">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-vintage-text-dim mb-1">Song Sequence</span>
                                        <div className="flex gap-1 items-center bg-vintage-bg p-1 rounded border border-vintage-border overflow-x-auto w-full md:max-w-[400px]">
                                            {songSequence.map((patIdx, i) => (
                                                <div key={i} className="flex flex-col items-center shrink-0">
                                                    <div 
                                                        className={`w-10 h-10 flex items-center justify-center text-xs font-mono rounded relative transition-colors
                                                            ${(sequencerPlaying && currentSongPos === i) ? 'bg-amber-dimmer text-amber-primary border border-amber-primary/50' : 'bg-vintage-panel text-vintage-text-dim border border-vintage-border hover:border-vintage-border'}
                                                        `}
                                                    >
                                                        <select 
                                                            value={patIdx}
                                                            onChange={e => {
                                                                const next = [...songSequence];
                                                                next[i] = Number(e.target.value);
                                                                setSongSequence(next);
                                                            }}
                                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                        >
                                                            {patterns.map((_, pIdx) => (
                                                                <option key={pIdx} value={pIdx}>{pIdx}</option>
                                                            ))}
                                                        </select>
                                                        {patIdx}
                                                    </div>
                                                    {songSequence.length > 1 && (
                                                        <button onClick={() => setSongSequence(s => s.filter((_, idx) => idx !== i))} className="text-[8px] text-red-500 mt-1 hover:text-red-400 btn-hardware">X</button>
                                                    )}
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => setSongSequence(s => [...s, 0])}
                                                className="w-10 h-10 flex items-center justify-center text-xs font-mono rounded bg-vintage-panel text-vintage-text-dim border border-vintage-border hover:border-vintage-border ml-1 shrink-0 btn-hardware"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col w-full md:w-auto">
                                        <span className="text-[10px] uppercase text-vintage-text-dim mb-1">Edit Pattern</span>
                                        <div className="flex gap-1 items-center bg-vintage-bg p-1 rounded border border-vintage-border overflow-x-auto w-full md:max-w-[200px]">
                                            {patterns.map((_, pIdx) => (
                                                <button
                                                    key={pIdx}
                                                    onClick={() => setCurrentPatternIndex(pIdx)}
                                                    className={`w-10 h-10 flex items-center justify-center text-xs font-mono rounded transition-colors shrink-0
                                                        ${currentPatternIndex === pIdx ? 'bg-amber-dimmer text-amber-primary border border-amber-primary' : 'bg-vintage-panel text-vintage-text-dim border border-vintage-border hover:border-vintage-border'}
                                                    `}
                                                >
                                                    {pIdx}
                                                </button>
                                            ))}
                                            <button 
                                                onClick={() => {
                                                    const newIdx = patterns.length;
                                                    const newPatterns = [...patterns, {
                                                        pulse1: Array.from({ length: 16 }, () => ({})),
                                                        pulse2: Array.from({ length: 16 }, () => ({})),
                                                        triangle: Array.from({ length: 16 }, () => ({})),
                                                        noise: Array.from({ length: 16 }, () => ({})),
                                                    }];
                                                    setPatterns(newPatterns);
                                                    audioEngine.setSequencerPatterns(newPatterns);
                                                    setCurrentPatternIndex(newIdx);
                                                }}
                                                className="w-10 h-10 flex items-center justify-center text-xs font-mono rounded bg-vintage-panel text-vintage-text-dim border border-vintage-border hover:border-vintage-border ml-1 shrink-0 btn-hardware"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col w-full md:w-auto">
                                        <span className="text-[10px] uppercase text-vintage-text-dim mb-1">Functions</span>
                                        <div className="flex gap-1 items-center bg-vintage-bg p-1 rounded border border-vintage-border h-12">
                                            <button 
                                                onClick={handleRandomizePattern}
                                                className="flex items-center gap-1.5 px-3 bg-vintage-panel hover:bg-vintage-surface text-amber-primary text-[10px] font-bold rounded border border-vintage-border transition-colors btn-hardware h-10 shrink-0"
                                                title="Randomize Selected Pattern"
                                            >
                                                <Dices className="w-3.5 h-3.5" />
                                                Randomize
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 w-full xl:w-auto shrink-0">
                                    <div className="flex flex-col w-full">
                                        <span className="text-[10px] uppercase text-vintage-text-dim mb-1">Save / Load Song</span>
                                        <div className="flex items-center gap-2 tape-slot p-1 px-3 rounded border border-vintage-border bg-vintage-bg h-12 w-full">
                                            <input 
                                                type="text" 
                                                value={songFilename} 
                                                onChange={e => setSongFilename(e.target.value)}
                                                placeholder="song-preset"
                                                className="bg-vintage-bg border border-vintage-border text-[10px] rounded px-2 flex-1 focus:outline-none focus:border-amber-primary/50 text-vintage-text h-10 font-mono min-w-0"
                                            />
                                            <button 
                                                onClick={handleExportSong}
                                                className="flex items-center gap-1.5 px-2 bg-vintage-panel hover:bg-vintage-surface text-amber-primary text-[10px] font-bold rounded border border-vintage-border transition-colors btn-hardware h-10 shrink-0"
                                                title="Save Song Preset"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                Save
                                            </button>
                                            <label className="flex items-center gap-1.5 px-2 bg-vintage-panel hover:bg-vintage-surface text-amber-primary text-[10px] font-bold rounded border border-vintage-border transition-colors cursor-pointer h-10 shrink-0">
                                                <Upload className="w-3.5 h-3.5" />
                                                Load
                                                <input type="file" accept=".json" onChange={handleImportSong} className="hidden" />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 bg-vintage-bg p-1.5 rounded border border-vintage-border w-full">
                                        <div className="flex items-center gap-1 sm:gap-2">
                                            <span className="text-[10px] uppercase text-vintage-text-dim font-bold hidden sm:inline">BPM</span>
                                            <input 
                                                type="range" 
                                                min="60" max="240" 
                                                value={bpm} 
                                                onChange={(e) => setBpm(Number(e.target.value))}
                                                className="w-16 sm:w-24 accent-amber-primary cursor-pointer" 
                                            />
                                            <span className="text-[10px] text-amber-primary w-6 text-right font-bold">{bpm}</span>
                                        </div>
                                        <div className="flex items-center gap-1 sm:gap-2 border-l border-vintage-border pl-2 sm:pl-3">
                                            <span className="text-[10px] uppercase text-vintage-text-dim font-bold hidden sm:inline">SWG</span>
                                            <input 
                                                type="range" 
                                                min="0" max="100" 
                                                value={swing * 100} 
                                                onChange={(e) => setSwing(Number(e.target.value) / 100)}
                                                className="w-12 sm:w-20 accent-amber-primary cursor-pointer" 
                                            />
                                            <span className="text-[10px] text-amber-primary w-8 text-right font-bold">{Math.round(swing * 100)}%</span>
                                        </div>
                                        <div className="flex gap-1 border-l border-vintage-border pl-2 sm:pl-3">
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
                                                className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${sequencerPlaying ? 'bg-amber-dimmer text-amber-primary border-amber-primary' : 'bg-vintage-panel text-vintage-text-dim border-vintage-border hover:text-vintage-text hover:border-amber-primary/30'}`}
                                            >
                                                {sequencerPlaying ? 'PAUSE' : 'PLAY'}
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    audioEngine.stopSequencer();
                                                    setSequencerPlaying(false);
                                                }}
                                                className="px-2 py-1 text-[10px] font-bold rounded border bg-vintage-panel text-vintage-text-dim border-vintage-border hover:text-vintage-text hover:border-amber-primary/30 transition-colors"
                                            >
                                                STOP
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                {(['pulse1', 'pulse2', 'triangle', 'noise'] as const).map(trackName => {
                                    const shortName = trackName === 'pulse1' ? 'S1' : trackName === 'pulse2' ? 'S2' : trackName === 'triangle' ? 'TR' : 'NZ';
                                    return (
                                    <div key={trackName} className="flex gap-1 items-center">
                                        <div className="w-6 text-[10px] font-bold text-amber-dim text-center shrink-0" title={trackName}>{shortName}</div>
                                        <div className="flex-1 grid gap-px bg-vintage-surface p-px rounded" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
                                            {patterns[currentPatternIndex][trackName].map((step, i) => {
                                                const isCurrent = sequencerPlaying && songSequence[currentSongPos] === currentPatternIndex && i === currentStep;
                                                return (
                                                    <div 
                                                        key={i} 
                                                        className={`h-12 relative flex items-center justify-center cursor-pointer transition-all duration-75
    ${step.note !== undefined 
        ? 'bg-amber-primary text-vintage-bg shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]' 
        : step.tie 
            ? 'bg-hatched opacity-80' 
            : 'bg-[#050505] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] hover:bg-[#111]'}
    ${isCurrent 
        ? step.note !== undefined || step.tie
            ? 'z-10 shadow-[0_0_15px_#ff8c1a,inset_0_0_10px_#fff] brightness-125 ring-1 ring-amber-primary'
            : 'z-10 bg-[#222] shadow-[inset_0_0_10px_#ff8c1a] ring-1 ring-amber-dimmer'
        : 'border-r border-b border-[#000]'}
    ${editingNote?.track === trackName && editingNote?.step === i ? 'ring-2 ring-amber-primary z-20 animate-pulse' : ''}
`}
                                                        onPointerDown={(e) => {
                                                            e.preventDefault();
                                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                                            const isRightClick = e.button === 2;
                                                            
                                                            setPatterns(prev => {
                                                                const next = [...prev];
                                                                const pat = {...next[currentPatternIndex]};
                                                                const newTrack = [...pat[trackName]];
                                                                const currentStepInfo = newTrack[i];
                                                                
                                                                if (isRightClick) {
                                                                    newTrack[i] = {};
                                                                    setDragContext({ track: trackName, startStep: i, mode: 'erase', couldErase: false, isEditClick: false });
                                                                } else {
                                                                    if (currentStepInfo.note !== undefined) {
                                                                        // Clicked a note, enable dragging to tie, and mark it for erasing if we release without drag
                                                                        setDragContext({ track: trackName, startStep: i, mode: 'tie', couldErase: true, isEditClick: trackName !== 'noise' });
                                                                    } else if (currentStepInfo.tie) {
                                                                        // Clicked tie, turn to note
                                                                        newTrack[i] = { note: trackName === 'noise' ? 1 : (currentKeyMap['z']?.freq || 261.63) };
                                                                        setDragContext({ track: trackName, startStep: i, mode: 'tie', couldErase: false, isEditClick: false });
                                                                    } else {
                                                                        // Clicked empty, draw note
                                                                        newTrack[i] = { note: trackName === 'noise' ? 1 : (currentKeyMap['z']?.freq || 261.63) };
                                                                        setDragContext({ track: trackName, startStep: i, mode: 'tie', couldErase: false, isEditClick: false });
                                                                    }
                                                                }
                                                                
                                                                pat[trackName] = newTrack;
                                                                next[currentPatternIndex] = pat;
                                                                audioEngine.setSequencerPattern(currentPatternIndex, pat);
                                                                return next;
                                                            });
                                                        }}
                                                        onPointerEnter={() => {
                                                            if (!dragContext.mode || dragContext.track !== trackName) return;
                                                            
                                                            setDragContext(prev => ({ ...prev, couldErase: false, isEditClick: false })); // If we moved, don't erase the start note
                                                            
                                                            setPatterns(prev => {
                                                                const next = [...prev];
                                                                const pat = {...next[currentPatternIndex]};
                                                                const newTrack = [...pat[trackName]];
                                                                
                                                                if (dragContext.mode === 'erase') {
                                                                    newTrack[i] = {};
                                                                } else if (dragContext.mode === 'tie') {
                                                                    if (i > dragContext.startStep) {
                                                                        for (let j = dragContext.startStep + 1; j <= i; j++) {
                                                                            if (newTrack[j].note === undefined) {
                                                                                newTrack[j] = { tie: true };
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                                
                                                                pat[trackName] = newTrack;
                                                                next[currentPatternIndex] = pat;
                                                                audioEngine.setSequencerPattern(currentPatternIndex, pat);
                                                                return next;
                                                            });
                                                        }}
                                                        onContextMenu={(e) => e.preventDefault()}
                                                    >
                                                        {step.note !== undefined && trackName !== 'noise' && (
                                                            <div className="text-[8px] pointer-events-none text-[#050505] rotate-[-90deg]">
                                                                {ALL_NOTES_LIST.find(n => n.freq === step.note)?.name || 'C4'}
                                                            </div>
                                                        )}
                                                        {step.note !== undefined && trackName === 'noise' && (
                                                            <div className="w-2 h-2 rounded-full bg-[#050505] pointer-events-none" />
                                                        )}
                                                        {step.tie && (
                                                            <div className="w-full h-1 bg-amber-dimmer pointer-events-none" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                                })}
                            </div>
                        </div>

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
                <h2 className="text-sm uppercase tracking-wider text-amber-primary font-bold">{title}</h2>
                <button
                    onClick={onSelect}
                    className={`px-3 py-1 text-xs rounded border transition-colors ${
                        isActive 
                        ? 'bg-amber-dimmer text-amber-primary border-amber-primary/50' 
                        : 'bg-vintage-bg text-vintage-text-dim border-vintage-border hover:border-vintage-border'
                    }`}
                >
                    {isActive ? 'Control: Active' : 'Select'}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="space-y-2">
                    <label className="text-xs text-vintage-text-dim">Duty Cycle</label>
                    <div className="grid grid-cols-3 gap-1">
                        {[{v: 0, l: '12%'}, {v: 1, l: '25%'}, {v: 2, l: '50%'}].map(d => (
                            <button
                                key={d.v}
                                onClick={() => onChange({ duty: d.v })}
                                className={`py-1 text-xs rounded border transition-colors ${
                                    config.duty === d.v ? 'bg-vintage-surface text-amber-primary border-amber-primary/50' : 'bg-vintage-bg text-vintage-text-dim border-vintage-border'
                                }`}
                            >
                                {d.l}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <label className="text-xs text-vintage-text-dim">Detune</label>
                        <span className="text-xs text-amber-primary">{config.detune}</span>
                    </div>
                    <input 
                        type="range" min="-10" max="10" 
                        value={config.detune}
                        onChange={(e) => onChange({ detune: parseInt(e.target.value) })}
                        className="w-full h-10 accent-amber-primary cursor-pointer"
                    />
                </div>
            </div>
            
            <div className="space-y-2 pt-2 border-t border-vintage-border">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-vintage-text-dim uppercase">Quantized Envelope</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onChange({ envMode: 'AD' })}
                            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${config.envMode === 'AD' ? 'bg-vintage-surface text-amber-primary border-amber-primary/50' : 'bg-vintage-bg text-vintage-text-dim border-vintage-border'}`}
                        >
                            AD
                        </button>
                        <button
                            onClick={() => onChange({ envMode: 'AHDS' })}
                            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${config.envMode === 'AHDS' ? 'bg-vintage-surface text-amber-primary border-amber-primary/50' : 'bg-vintage-bg text-vintage-text-dim border-vintage-border'}`}
                        >
                            AHDS
                        </button>
                        <label className="flex items-center gap-1 cursor-pointer ml-2">
                            <input type="checkbox" checked={config.loop} onChange={e => onChange({ loop: e.target.checked })} className="accent-amber-primary rounded bg-vintage-panel border-vintage-border" />
                            <span className="text-[10px] text-vintage-text-dim">Loop</span>
                        </label>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                    <div className="flex flex-col">
                        <div className="flex justify-between">
                            <span className="text-[10px] text-vintage-text-dim">Attack</span>
                            <span className="text-[10px] text-amber-primary">{config.attackRate}</span>
                        </div>
                        <input 
                            type="range" min="0" max="15" value={config.attackRate} 
                            onChange={e => onChange({ attackRate: parseInt(e.target.value) })} 
                            className="w-full h-10 accent-amber-primary cursor-pointer" 
                            
                        />
                    </div>
                    {config.envMode === 'AHDS' && (
                        <div className="flex flex-col">
                            <div className="flex justify-between">
                                <span className="text-[10px] text-vintage-text-dim">Hold</span>
                                <span className="text-[10px] text-amber-primary">{config.holdTime}</span>
                            </div>
                            <input 
                                type="range" min="0" max="60" value={config.holdTime} 
                                onChange={e => onChange({ holdTime: parseInt(e.target.value) })} 
                                className="w-full h-10 accent-amber-primary cursor-pointer" 
                            />
                        </div>
                    )}
                    <div className="flex flex-col">
                        <div className="flex justify-between">
                            <span className="text-[10px] text-vintage-text-dim">Decay</span>
                            <span className="text-[10px] text-amber-primary">{config.decay}</span>
                        </div>
                        <input 
                            type="range" min="1" max="15" value={config.decay} 
                            onChange={e => onChange({ decay: parseInt(e.target.value) })} 
                            className="w-full h-10 accent-amber-primary cursor-pointer" 
                        />
                    </div>
                    {config.envMode === 'AHDS' && (
                        <>
                            <div className="flex flex-col">
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-vintage-text-dim">Sustain</span>
                                    <span className="text-[10px] text-amber-primary">{config.sustainLevel}</span>
                                </div>
                                <input 
                                    type="range" min="0" max="15" value={config.sustainLevel} 
                                    onChange={e => onChange({ sustainLevel: parseInt(e.target.value) })} 
                                    className="w-full h-10 accent-amber-primary cursor-pointer" 
                                    
                                />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-vintage-text-dim">Release</span>
                                    <span className="text-[10px] text-amber-primary">{config.releaseRate}</span>
                                </div>
                                <input 
                                    type="range" min="1" max="15" value={config.releaseRate} 
                                    onChange={e => onChange({ releaseRate: parseInt(e.target.value) })} 
                                    className="w-full h-10 accent-amber-primary cursor-pointer" 
                                    
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            <div className="space-y-2 pt-2 border-t border-vintage-border">
                <div className="flex items-center justify-between">
                    <label className="text-xs text-vintage-text-dim uppercase">Arpeggiator</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={config.arp.enabled}
                            onChange={(e) => onChange({ arp: { ...config.arp, enabled: e.target.checked } })}
                            className="accent-amber-primary rounded bg-vintage-panel border-vintage-border"
                        />
                        <span className="text-xs text-vintage-text-dim">Enable</span>
                    </label>
                </div>
                {config.arp.enabled && (
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        <select 
                            value={JSON.stringify(config.arp.pattern)}
                            onChange={(e) => onChange({ arp: { ...config.arp, pattern: JSON.parse(e.target.value) } })}
                            className="bg-vintage-bg border border-vintage-border rounded px-2 py-1 text-xs text-vintage-text"
                            
                        >
                            {ARP_PATTERNS.map(p => (
                                <option key={p.name} value={JSON.stringify(p.value)}>{p.name}</option>
                            ))}
                        </select>
                        <div className="flex flex-col">
                            <div className="flex justify-between">
                                <span className="text-[10px] text-vintage-text-dim">Speed</span>
                                <span className="text-[10px] text-amber-primary">{config.arp.speed} Hz</span>
                            </div>
                            <input 
                                type="range" min="10" max="60" step="1"
                                value={config.arp.speed}
                                onChange={(e) => onChange({ arp: { ...config.arp, speed: parseInt(e.target.value) } })}
                                className="w-full h-10 accent-amber-primary cursor-pointer"
                                
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
        <div className="space-y-2 pt-2 border-t border-vintage-border">
            <div className="flex items-center justify-between">
                <label className="text-xs text-vintage-text-dim uppercase">Vibrato</label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={config.enabled}
                        onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
                        className="accent-amber-primary rounded bg-vintage-panel border-vintage-border"
                    />
                    <span className="text-xs text-vintage-text-dim">Enable</span>
                </label>
            </div>
            {config.enabled && (
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="flex flex-col">
                        <div className="flex justify-between">
                            <span className="text-[10px] text-vintage-text-dim">Rate</span>
                            <span className="text-[10px] text-amber-primary">{config.rate} Hz</span>
                        </div>
                        <input 
                            type="range" min="1" max="12" step="0.5"
                            value={config.rate}
                            onChange={(e) => onChange({ ...config, rate: parseFloat(e.target.value) })}
                            className="w-full h-10 accent-amber-primary cursor-pointer"
                            
                        />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex justify-between">
                            <span className="text-[10px] text-vintage-text-dim">Depth</span>
                            <span className="text-[10px] text-amber-primary">{config.depth} Steps</span>
                        </div>
                        <input 
                            type="range" min="1" max="8" step="1"
                            value={config.depth}
                            onChange={(e) => onChange({ ...config, depth: parseInt(e.target.value) })}
                            className="w-full h-10 accent-amber-primary cursor-pointer"
                            
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
