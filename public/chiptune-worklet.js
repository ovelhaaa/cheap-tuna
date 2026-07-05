const CPU_CLOCK = 1789773; // NES CPU clock base

// NES Noise periods (NTSC)
const NOISE_PERIODS = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];

class Envelope {
    constructor() {
        this.decayRate = 15; // 1-15
        this.loop = false;
        
        this.volume = 0; // 0-15
        this.divider = 0;
        this.enabled = false;
    }
    
    start() {
        this.volume = 15;
        this.divider = this.decayRate;
        this.enabled = true;
    }
    
    stop() {
        this.enabled = false;
        this.volume = 0;
    }
    
    tick() {
        if (!this.enabled) return;
        
        if (this.divider === 0) {
            this.divider = this.decayRate;
            if (this.volume > 0) {
                this.volume--;
            } else if (this.loop) {
                this.volume = 15;
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
        // Formula: f = CPU_CLOCK / (16 * (period + 1))
        let period = Math.round((CPU_CLOCK / (16 * freq)) - 1);
        
        // Clamp to 11-bit
        if (period < 0) period = 0;
        if (period > 2047) period = 2047;
        
        this.timerPeriod = period;
        this.enabled = true;
        this.envelope.start();
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
        let period = Math.round((CPU_CLOCK / (32 * freq)) - 1);
        
        if (period < 0) period = 0;
        if (period > 2047) period = 2047;
        
        this.timerPeriod = period;
        this.enabled = true;
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
        return (output ? 1.0 : -1.0) * 0.15;
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
        this.cpuTicksAccumulator = 0;
        this.FRAME_COUNTER_PERIOD = 7457; // ~240Hz frame counter (CPU ticks)
        
        this.port.onmessage = (e) => {
            const { type, voice, frequency, mode, index, decayRate, loop, playing } = e.data;
            
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
                if (voice === 'pulse1') {
                    this.pulse1.envelope.decayRate = decayRate;
                    this.pulse1.envelope.loop = loop;
                }
                if (voice === 'pulse2') {
                    this.pulse2.envelope.decayRate = decayRate;
                    this.pulse2.envelope.loop = loop;
                }
            } else if (type === 'set_noise_mode') {
                this.noise.setMode(mode);
            } else if (type === 'set_noise_period') {
                this.noise.setPeriodIndex(index);
            } else if (type === 'set_noise_playing') {
                this.noise.setPlaying(playing);
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
            this.clockAccumulator += cpuClocksPerSample;
            let ticks = Math.floor(this.clockAccumulator);
            this.clockAccumulator -= ticks;

            for (let t = 0; t < ticks; t++) {
                this.triangle.tick();
                
                if ((this.cpuTicksAccumulator + t) % 2 === 0) {
                    this.pulse1.tick();
                    this.pulse2.tick();
                    this.noise.tick();
                }
            }
            
            this.cpuTicksAccumulator += ticks;
            
            while (this.cpuTicksAccumulator >= this.FRAME_COUNTER_PERIOD) {
                this.pulse1.tickEnvelope();
                this.pulse2.tickEnvelope();
                this.cpuTicksAccumulator -= this.FRAME_COUNTER_PERIOD;
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
