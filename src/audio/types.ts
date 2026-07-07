export type VoiceType = 'pulse1' | 'pulse2' | 'triangle' | 'noise';

export interface ArpConfig {
    enabled: boolean;
    pattern: number[];
    speed: number;
}

export interface VibratoConfig {
    enabled: boolean;
    rate: number;
    depth: number;
}

export interface PulseConfig {
    duty: number;
    decay: number;
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

export interface TriangleConfig {
    vibrato: VibratoConfig;
}

export type StepData = {
    note?: number;
    tie?: boolean;
};

export type TrackPattern = StepData[];

export type StepPattern = {
    pulse1: TrackPattern;
    pulse2: TrackPattern;
    triangle: TrackPattern;
    noise: TrackPattern;
};
