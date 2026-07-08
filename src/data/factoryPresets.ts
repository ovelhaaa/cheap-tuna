import { ALL_NOTES_LIST } from '../utils/noteUtils';
import { StepPattern, PulseConfig, TriangleConfig } from '../audio/types';

// Helper to find note frequency
const getFreq = (name: string): number | undefined => {
    const found = ALL_NOTES_LIST.find(n => n.name.toUpperCase() === name.toUpperCase());
    return found ? found.freq : undefined;
};

// Helper to build track pattern from human-readable shorthand arrays
const parseTrack = (steps: (string | null | number)[]): { note?: number, tie?: boolean }[] => {
    return steps.map(s => {
        if (s === null || s === undefined || s === "" || s === " ") return {};
        if (s === '-' || s === 'T' || s === 'tie') return { tie: true };
        if (typeof s === 'number') return { note: s };
        const freq = getFreq(s);
        if (freq !== undefined) return { note: freq };
        return { note: 1 }; // Default fallback for noise triggers or non-frequency notes
    });
};

export interface FactoryTimbre {
    name: string;
    description: string;
    voice: 'pulse1' | 'pulse2' | 'triangle' | 'noise';
    params: any;
}

export interface FactorySong {
    name: string;
    description: string;
    bpm: number;
    swingAmount: number;
    patterns: StepPattern[];
    songSequence: number[];
}

export const FACTORY_TIMBRES: FactoryTimbre[] = [
    {
        name: "Classic 8-Bit Lead",
        description: "Standard 50% duty cycle square wave with rich AHDS envelope, subtle detune, and expressive vibrato.",
        voice: "pulse1",
        params: {
            duty: 2, // 50%
            decay: 12,
            loop: false,
            envMode: "AHDS",
            attackRate: 1,
            holdTime: 2,
            sustainLevel: 8,
            releaseRate: 5,
            detune: 0,
            arp: { enabled: false, pattern: [0, 4, 7], speed: 30 },
            vibrato: { enabled: true, rate: 6, depth: 3 }
        }
    },
    {
        name: "Retro Arpeggiator",
        description: "Thin 25% duty cycle pulse with a fast major arpeggiation cascade. Perfect for space exploration.",
        voice: "pulse1",
        params: {
            duty: 1, // 25%
            decay: 10,
            loop: false,
            envMode: "AD",
            attackRate: 0,
            holdTime: 0,
            sustainLevel: 0,
            releaseRate: 2,
            detune: 4,
            arp: { enabled: true, pattern: [0, 12, 24], speed: 12 },
            vibrato: { enabled: false, rate: 6, depth: 2 }
        }
    },
    {
        name: "Plucky Bass",
        description: "Tight, low-detuned 12.5% pulse wave designed for responsive bass hooks and sharp backing rhythms.",
        voice: "pulse2",
        params: {
            duty: 0, // 12.5%
            decay: 5,
            loop: false,
            envMode: "AD",
            attackRate: 0,
            holdTime: 0,
            sustainLevel: 0,
            releaseRate: 2,
            detune: -2,
            arp: { enabled: false, pattern: [0, 4, 7], speed: 30 },
            vibrato: { enabled: false, rate: 6, depth: 2 }
        }
    },
    {
        name: "Echoing Pulse Chords",
        description: "75% duty cycle pulse using a slow arpeggiator to sound like a multi-voice retro synthesizer chord.",
        voice: "pulse2",
        params: {
            duty: 3, // 75%
            decay: 14,
            loop: false,
            envMode: "AHDS",
            attackRate: 3,
            holdTime: 1,
            sustainLevel: 10,
            releaseRate: 6,
            detune: 1,
            arp: { enabled: true, pattern: [0, 4, 7, 12], speed: 18 },
            vibrato: { enabled: true, rate: 4, depth: 1 }
        }
    },
    {
        name: "Singing Tri Lead",
        description: "Classic pseudo-triangle wave with moderate vibrato depth for a nostalgic, theremin-like melody voice.",
        voice: "triangle",
        params: {
            vibrato: { enabled: true, rate: 7, depth: 4 }
        }
    },
    {
        name: "Heavy Bass Organ",
        description: "Deep, pure, non-vibrato triangle wave providing solid low-end foundation.",
        voice: "triangle",
        params: {
            vibrato: { enabled: false, rate: 6, depth: 2 }
        }
    },
    {
        name: "Metallic Retro Snare",
        description: "Short, noise periodic drum trigger mimicking the famous metallic percussion sound from NES hardware.",
        voice: "noise",
        params: {
            noiseMode: 1, // Short (metallic)
            noisePeriod: 4
        }
    },
    {
        name: "White Noise Explosion",
        description: "Long white noise explosion designed for sound effects, crashing symbols, or deep snare backing.",
        voice: "noise",
        params: {
            noiseMode: 0, // Long (white)
            noisePeriod: 12
        }
    }
];

export const FACTORY_SONGS: FactorySong[] = [
    {
        name: "Tuna's Anthem",
        description: "An upbeat, classic retro adventure theme. Features a catchy, singing lead, pulsing harmony, steady triangle bassline, and structured noise drums.",
        bpm: 120,
        swingAmount: 0.0,
        patterns: [
            {
                pulse1: parseTrack(["C4", "", "G4", "", "C5", "", "B4", "", "A4", "B4", "C5", "", "G4", "", "E4", ""]),
                pulse2: parseTrack(["E3", "", "C4", "", "E4", "", "D4", "", "C4", "D4", "E4", "", "C4", "", "G3", ""]),
                triangle: parseTrack(["C3", "-", "C3", "-", "G3", "-", "G3", "-", "A3", "-", "F3", "-", "G3", "-", "G3", "-"]),
                noise: parseTrack(["1", "", "", "", "1", "", "", "", "1", "", "", "", "1", "", "", ""])
            },
            {
                pulse1: parseTrack(["F4", "", "A4", "", "D5", "", "C5", "", "B4", "C5", "D5", "", "B4", "", "G4", ""]),
                pulse2: parseTrack(["A3", "", "F4", "", "A4", "", "G4", "", "F4", "G4", "A4", "", "G4", "", "D4", ""]),
                triangle: parseTrack(["F3", "-", "F3", "-", "C3", "-", "C3", "-", "D3", "-", "B2", "-", "C3", "-", "C3", "-"]),
                noise: parseTrack(["1", "", "", "", "1", "", "", "", "1", "", "", "", "1", "", "", ""])
            }
        ],
        songSequence: [0, 1, 0, 1]
    },
    {
        name: "Castle Danger",
        description: "A dark, driving gothic chiptune progression in A Minor. Features dramatic pulse melodies, polyphonic runs, galloping bass, and metallic noise snares.",
        bpm: 135,
        swingAmount: 0.0,
        patterns: [
            {
                pulse1: parseTrack(["A4", "", "B4", "", "C5", "", "B4", "", "A4", "E4", "A4", "B4", "C5", "D5", "E5", ""]),
                pulse2: parseTrack(["E4", "", "G4", "", "A4", "", "G4", "", "C4", "", "E4", "", "A4", "", "B4", ""]),
                triangle: parseTrack(["A2", "A3", "A2", "A3", "E2", "E3", "E2", "E3", "F2", "F3", "F2", "F3", "G2", "G3", "G2", "G3"]),
                noise: parseTrack(["1", "", "1", "", "1", "", "1", "", "1", "", "1", "", "1", "", "1", ""])
            },
            {
                pulse1: parseTrack(["F5", "", "E5", "", "D5", "", "C5", "", "B4", "A4", "B4", "C5", "D5", "C5", "B4", ""]),
                pulse2: parseTrack(["D4", "", "C4", "", "B3", "", "A3", "", "G3", "", "B3", "", "D4", "", "E4", ""]),
                triangle: parseTrack(["D2", "D3", "D2", "D3", "A2", "A3", "A2", "A3", "E2", "E3", "E2", "E3", "A2", "A3", "A2", "A3"]),
                noise: parseTrack(["1", "", "1", "", "1", "", "1", "", "1", "", "1", "", "1", "", "1", ""])
            }
        ],
        songSequence: [0, 1]
    },
    {
        name: "Retro Tuna-Wave",
        description: "A laidback, stylish synthwave/outrun loop. Features long chord sweeps, jazzy syncopated backbeats, swinging bass, and classic kick-snare patterns.",
        bpm: 105,
        swingAmount: 0.15,
        patterns: [
            {
                pulse1: parseTrack(["F4", "-", "-", "", "G4", "-", "-", "", "A4", "-", "-", "", "C5", "-", "-", ""]),
                pulse2: parseTrack(["", "C4", "", "E4", "", "D4", "", "G4", "", "E4", "", "A4", "", "G4", "", ""]),
                triangle: parseTrack(["F3", "", "F3", "", "G3", "", "G3", "", "A3", "", "A3", "", "C3", "", "C3", ""]),
                noise: parseTrack(["", "", "", "", "1", "", "", "", "", "", "", "", "1", "", "", ""])
            },
            {
                pulse1: parseTrack(["D4", "-", "-", "", "E4", "-", "-", "", "F4", "-", "-", "", "G4", "-", "-", ""]),
                pulse2: parseTrack(["", "A3", "", "C4", "", "B3", "", "E4", "", "C4", "", "F4", "", "E4", "", ""]),
                triangle: parseTrack(["D3", "", "D3", "", "E3", "", "E3", "", "F3", "", "F3", "", "G3", "", "G3", ""]),
                noise: parseTrack(["", "", "", "", "1", "", "", "", "", "", "", "", "1", "", "", ""])
            }
        ],
        songSequence: [0, 1]
    }
];
