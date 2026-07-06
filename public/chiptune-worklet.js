const CPU_CLOCK = 1789773; // NES CPU clock base

// NES Noise periods (NTSC)
const NOISE_PERIODS = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];

class Arpeggiator {
    constructor() {
        this.enabled = false;
        this.pattern = [0, 4, 7];
        this.speed = 30; // Hz
        this.stepIndex = 0;
        this.accumulator = 0;
        this.baseFrequency = 0;
    }
    
    setBaseFrequency(freq) {
        this.baseFrequency = freq;
        this.stepIndex = 0;
        this.accumulator = 0;
    }

    tick(sampleRate) {
        if (!this.enabled) return;
        this.accumulator++;
        const samplesPerStep = sampleRate / this.speed;
        if (this.accumulator >= samplesPerStep) {
            this.accumulator -= samplesPerStep;
            this.stepIndex = (this.stepIndex + 1) % this.pattern.length;
        }
    }
    
    getFrequency() {
        if (!this.enabled) return this.baseFrequency;
        return this.baseFrequency * Math.pow(2, this.pattern[this.stepIndex] / 12);
    }
}

class Vibrato {
    constructor() {
        this.enabled = false;
        this.rate = 6;
        this.depth = 2;
        this.phase = 0;
    }
    
    tick(sampleRate) {
        if (!this.enabled) return 0;
        this.phase += this.rate / sampleRate;
        if (this.phase >= 1.0) this.phase -= 1.0;
        
        let tri = 0;
        if (this.phase < 0.25) tri = this.phase * 4;
        else if (this.phase < 0.75) tri = 1 - (this.phase - 0.25) * 4;
        else tri = (this.phase - 0.75) * 4 - 1;
        
        return Math.round(tri * this.depth);
    }
}

const ENV_STATE_IDLE = 0;
const ENV_STATE_ATTACK = 1;
const ENV_STATE_HOLD = 2;
const ENV_STATE_DECAY = 3;
const ENV_STATE_SUSTAIN = 4;
const ENV_STATE_RELEASE = 5;

class Envelope {
    constructor() {
        this.mode = 'AD'; // 'AD' or 'AHDS'
        this.attackRate = 2;
        this.holdTime = 0;
        this.decayRate = 15;
        this.sustainLevel = 8;
        this.releaseRate = 5;
        this.loop = false; // keep for backward compatibility or simple repeat
        
        this.state = ENV_STATE_IDLE;
        this.volume = 0;
        this.divider = 0;
        this.holdCounter = 0;
        this.enabled = false;
    }
    
    start() {
        if (this.attackRate === 0) {
            this.volume = 15;
            if (this.mode === 'AHDS' && this.holdTime > 0) {
                this.state = ENV_STATE_HOLD;
                this.holdCounter = this.holdTime;
            } else {
                this.state = ENV_STATE_DECAY;
                this.divider = this.decayRate + 1;
            }
        } else {
            this.state = ENV_STATE_ATTACK;
            this.volume = 0;
            this.divider = this.attackRate + 1;
        }
        this.enabled = true;
    }
    
    stop() {
        if (this.mode === 'AHDS') {
            if (this.releaseRate === 0) {
                this.volume = 0;
                this.state = ENV_STATE_IDLE;
                this.enabled = false;
            } else {
                this.state = ENV_STATE_RELEASE;
                this.divider = this.releaseRate + 1;
            }
        } else {
            this.enabled = false;
            this.volume = 0;
            this.state = ENV_STATE_IDLE;
        }
    }
    
    tick() {
        if (!this.enabled || this.state === ENV_STATE_IDLE || this.state === ENV_STATE_SUSTAIN) return;
        
        if (this.state === ENV_STATE_HOLD) {
            if (this.holdCounter > 0) {
                this.holdCounter--;
            } else {
                this.state = ENV_STATE_DECAY;
                this.divider = this.decayRate + 1;
            }
            return;
        }
        
        if (this.divider === 0) {
            if (this.state === ENV_STATE_ATTACK) {
                this.volume++;
                if (this.volume >= 15) {
                    this.volume = 15;
                    if (this.mode === 'AHDS' && this.holdTime > 0) {
                        this.state = ENV_STATE_HOLD;
                        this.holdCounter = this.holdTime;
                    } else {
                        this.state = ENV_STATE_DECAY;
                        this.divider = this.decayRate + 1;
                    }
                } else {
                    this.divider = this.attackRate + 1;
                }
            } else if (this.state === ENV_STATE_DECAY) {
                this.volume--;
                let targetLevel = this.mode === 'AHDS' ? this.sustainLevel : 0;
                if (this.volume <= targetLevel) {
                    this.volume = targetLevel;
                    if (this.mode === 'AHDS') {
                        this.state = ENV_STATE_SUSTAIN;
                    } else {
                        if (this.loop) {
                            this.start();
                        } else {
                            this.state = ENV_STATE_IDLE;
                            this.enabled = false;
                        }
                    }
                } else {
                    this.divider = this.decayRate + 1;
                }
            } else if (this.state === ENV_STATE_RELEASE) {
                this.volume--;
                if (this.volume <= 0) {
                    this.volume = 0;
                    this.state = ENV_STATE_IDLE;
                    this.enabled = false;
                } else {
                    this.divider = this.releaseRate + 1;
                }
            }
        } else {
            this.divider--;
        }
    }
    
    getVolume() {
        if (!this.enabled) return 0;
        return this.volume / 15.0;
    }
}

class PulseVoice {
    constructor() {
        this.timerPeriod = 0;
        this.timerCounter = 0;
        this.dutyMode = 2; // 0=12.5%, 1=25%, 2=50%
        this.sequenceCounter = 0;
        this.enabled = false;
        this.envelope = new Envelope();
        this.arpeggiator = new Arpeggiator();
        this.vibrato = new Vibrato();
        this.baseFrequency = 0;
        this.detune = 0;
        
        // 8 steps sequence. 1 means high, 0 means low.
        this.dutyTable = [
            [0, 1, 0, 0, 0, 0, 0, 0], // 12.5%
            [0, 1, 1, 0, 0, 0, 0, 0], // 25%
            [0, 1, 1, 1, 1, 0, 0, 0], // 50%
            [1, 0, 0, 1, 1, 1, 1, 1]  // 25% negated
        ];
    }
    
    setFrequency(freq) {
        if (freq === 0) {
            this.enabled = false;
            this.envelope.stop();
            return;
        }
        this.baseFrequency = freq;
        this.arpeggiator.setBaseFrequency(freq);
        this.enabled = true;
        this.envelope.start();
    }

    tickSample(sampleRate) {
        if (!this.enabled) return;
        
        this.arpeggiator.tick(sampleRate);
        const freq = this.arpeggiator.getFrequency();
        let period = Math.round((CPU_CLOCK / (16 * freq)) - 1);
        
        const vibDelta = this.vibrato.tick(sampleRate);
        period += vibDelta + this.detune;
        
        if (period < 0) period = 0;
        if (period > 2047) period = 2047;
        
        this.timerPeriod = period;
    }

    setDuty(mode) {
        this.dutyMode = mode & 3;
    }

    // Called every APU clock tick (CPU_CLOCK / 2)
    tick() {
        if (this.timerCounter === 0) {
            this.timerCounter = this.timerPeriod;
            this.sequenceCounter = (this.sequenceCounter - 1) & 7;
        } else {
            this.timerCounter--;
        }
    }

    tickEnvelope() {
        this.envelope.tick();
    }

    getSample() {
        if (!this.enabled || this.timerPeriod < 8) return 0;
        
        const envVol = this.envelope.getVolume();
        const baseLevel = this.dutyTable[this.dutyMode][this.sequenceCounter] ? 1.0 : -1.0;
        return baseLevel * envVol * 0.15; // 0.15 amplitude mapping
    }
}

class TriangleVoice {
    constructor() {
        this.timerPeriod = 0;
        this.timerCounter = 0;
        this.sequenceCounter = 0;
        this.enabled = false;
        this.vibrato = new Vibrato();
        this.baseFrequency = 0;
        
        // 32 steps (0 to 15, then 15 to 0)
        this.sequenceTable = [
            15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
        ];
    }
    
    setFrequency(freq) {
        if (freq === 0) {
            this.enabled = false;
            return;
        }
        this.baseFrequency = freq;
        this.enabled = true;
    }

    tickSample(sampleRate) {
        if (!this.enabled) return;
        
        let period = Math.round((CPU_CLOCK / (32 * this.baseFrequency)) - 1);
        
        const vibDelta = this.vibrato.tick(sampleRate);
        period += vibDelta;
        
        if (period < 0) period = 0;
        if (period > 2047) period = 2047;
        
        this.timerPeriod = period;
    }

    // Called every CPU clock tick
    tick() {
        if (this.timerCounter === 0) {
            this.timerCounter = this.timerPeriod;
            if (this.enabled && this.timerPeriod >= 0) {
                this.sequenceCounter = (this.sequenceCounter + 1) & 31;
            }
        } else {
            this.timerCounter--;
        }
    }

    getSample() {
        if (!this.enabled) return 0;
        
        // Normalize 0-15 to -1.0 to 1.0
        const level = (this.sequenceTable[this.sequenceCounter] / 7.5) - 1.0;
        return level * 0.15; 
    }
}

class NoiseVoice {
    constructor() {
        this.timerPeriod = NOISE_PERIODS[0];
        this.timerCounter = 0;
        this.enabled = false;
        this.mode = 0; // 0 = long, 1 = short
        this.shiftRegister = 1; // 15-bit shift register, initial value 1
    }
    
    setPeriodIndex(index) {
        if (index < 0) index = 0;
        if (index > 15) index = 15;
        this.timerPeriod = NOISE_PERIODS[index];
    }
    
    setMode(mode) {
        this.mode = mode; // 0 or 1
    }
    
    setPlaying(playing) {
        this.enabled = playing;
    }

    // Called every APU clock tick (CPU_CLOCK / 2)
    tick() {
        if (this.timerCounter === 0) {
            this.timerCounter = this.timerPeriod;
            
            const tapBit = this.mode === 1 ? 6 : 1;
            const bit0 = this.shiftRegister & 1;
            const bitTap = (this.shiftRegister >> tapBit) & 1;
            const feedback = bit0 ^ bitTap;
            
            this.shiftRegister = (this.shiftRegister >> 1) | (feedback << 14);
            
        } else {
            this.timerCounter--;
        }
    }

    getSample() {
        if (!this.enabled) return 0;
        
        const output = (this.shiftRegister & 1) ? 0 : 1;
        return output ? 0.15 : 0.0;
    }
}

class ChiptuneProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.pulse1 = new PulseVoice();
        this.pulse2 = new PulseVoice();
        this.triangle = new TriangleVoice();
        this.noise = new NoiseVoice();
        
        this.clockAccumulator = 0.0;
        this.halfClockParity = 0;
        this.frameAccumulator = 0;
        this.FRAME_COUNTER_PERIOD = 7457; // ~240Hz frame counter (CPU ticks)
        
        this.port.onmessage = (e) => {
            const { type, voice, frequency, mode, index, decayRate, loop, playing, enabled, pattern, speed, rate, depth, envMode, attackRate, holdTime, sustainLevel, releaseRate, detune } = e.data;
            
            if (type === 'note_on') {
                if (voice === 'pulse1') this.pulse1.setFrequency(frequency);
                if (voice === 'pulse2') this.pulse2.setFrequency(frequency);
                if (voice === 'triangle') this.triangle.setFrequency(frequency);
            } else if (type === 'note_off') {
                if (voice === 'pulse1') this.pulse1.setFrequency(0);
                if (voice === 'pulse2') this.pulse2.setFrequency(0);
                if (voice === 'triangle') this.triangle.setFrequency(0);
            } else if (type === 'set_duty') {
                if (voice === 'pulse1') this.pulse1.setDuty(mode);
                if (voice === 'pulse2') this.pulse2.setDuty(mode);
            } else if (type === 'set_envelope') {
                const voiceObj = voice === 'pulse1' ? this.pulse1 : (voice === 'pulse2' ? this.pulse2 : null);
                if (voiceObj) {
                    voiceObj.envelope.decayRate = decayRate !== undefined ? decayRate : voiceObj.envelope.decayRate;
                    voiceObj.envelope.loop = loop !== undefined ? loop : voiceObj.envelope.loop;
                    if (envMode !== undefined) voiceObj.envelope.mode = envMode;
                    if (attackRate !== undefined) voiceObj.envelope.attackRate = attackRate;
                    if (holdTime !== undefined) voiceObj.envelope.holdTime = holdTime;
                    if (sustainLevel !== undefined) voiceObj.envelope.sustainLevel = sustainLevel;
                    if (releaseRate !== undefined) voiceObj.envelope.releaseRate = releaseRate;
                }
            } else if (type === 'set_detune') {
                if (voice === 'pulse2') this.pulse2.detune = detune;
                if (voice === 'pulse1') this.pulse1.detune = detune;
            } else if (type === 'set_noise_mode') {
                this.noise.setMode(mode);
            } else if (type === 'set_noise_period') {
                this.noise.setPeriodIndex(index);
            } else if (type === 'set_noise_playing') {
                this.noise.setPlaying(playing);
            } else if (type === 'set_arp') {
                if (voice === 'pulse1') {
                    this.pulse1.arpeggiator.enabled = enabled;
                    this.pulse1.arpeggiator.pattern = pattern;
                    this.pulse1.arpeggiator.speed = speed;
                } else if (voice === 'pulse2') {
                    this.pulse2.arpeggiator.enabled = enabled;
                    this.pulse2.arpeggiator.pattern = pattern;
                    this.pulse2.arpeggiator.speed = speed;
                }
            } else if (type === 'set_vibrato') {
                const voiceObj = voice === 'pulse1' ? this.pulse1 : (voice === 'pulse2' ? this.pulse2 : (voice === 'triangle' ? this.triangle : null));
                if (voiceObj) {
                    voiceObj.vibrato.enabled = enabled;
                    voiceObj.vibrato.rate = rate;
                    voiceObj.vibrato.depth = depth;
                }
            }
        };
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        if (!output || !output[0]) return true;
        
        const channel = output[0];
        const rightChannel = output.length > 1 ? output[1] : null;
        
        const cpuClocksPerSample = CPU_CLOCK / sampleRate;

        for (let i = 0; i < channel.length; i++) {
            this.pulse1.tickSample(sampleRate);
            this.pulse2.tickSample(sampleRate);
            this.triangle.tickSample(sampleRate);
            
            this.clockAccumulator += cpuClocksPerSample;
            let ticks = Math.floor(this.clockAccumulator);
            this.clockAccumulator -= ticks;

            for (let t = 0; t < ticks; t++) {
                this.triangle.tick();
                
                if (this.halfClockParity === 0) {
                    this.pulse1.tick();
                    this.pulse2.tick();
                    this.noise.tick();
                }
                this.halfClockParity ^= 1;
            }
            
            this.frameAccumulator += ticks;
            
            while (this.frameAccumulator >= this.FRAME_COUNTER_PERIOD) {
                this.pulse1.tickEnvelope();
                this.pulse2.tickEnvelope();
                this.frameAccumulator -= this.FRAME_COUNTER_PERIOD;
            }

            let sample = this.pulse1.getSample() + 
                         this.pulse2.getSample() + 
                         this.triangle.getSample() + 
                         this.noise.getSample();
                         
            // Normalization clipping to avoid exceeding ±1.0
            if (sample > 1.0) sample = 1.0;
            if (sample < -1.0) sample = -1.0;

            channel[i] = sample;
            if (rightChannel) {
                rightChannel[i] = sample;
            }
        }
        
        return true; 
    }
}

registerProcessor('chiptune-processor', ChiptuneProcessor);
