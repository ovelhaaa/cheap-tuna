const CPU_CLOCK = 1789773; // NES CPU clock base

class PulseVoice {
    constructor() {
        this.timerPeriod = 0;
        this.timerCounter = 0;
        this.dutyMode = 2; // 0=12.5%, 1=25%, 2=50%
        this.sequenceCounter = 0;
        this.enabled = false;
        
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
            return;
        }
        // Formula: f = CPU_CLOCK / (16 * (period + 1))
        // So: period = (CPU_CLOCK / (16 * f)) - 1
        let period = Math.round((CPU_CLOCK / (16 * freq)) - 1);
        
        // Clamp to 11-bit
        if (period < 0) period = 0;
        if (period > 2047) period = 2047;
        
        this.timerPeriod = period;
        this.enabled = true;
    }

    setDuty(mode) {
        this.dutyMode = mode & 3;
    }

    // Called every APU clock tick (CPU_CLOCK / 2)
    tick() {
        if (this.timerCounter === 0) {
            this.timerCounter = this.timerPeriod;
            // The NES sequence counter decrements
            this.sequenceCounter = (this.sequenceCounter - 1) & 7;
        } else {
            this.timerCounter--;
        }
    }

    getSample() {
        // If the frequency is too high (period < 8), NES APU mutes the channel
        if (!this.enabled || this.timerPeriod < 8) return 0;
        
        // Return a level mapping to audio amplitude. 0.25 to prevent clipping 
        // when we mix more channels later.
        return this.dutyTable[this.dutyMode][this.sequenceCounter] ? 0.25 : -0.25;
    }
}

class ChiptuneProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.pulse1 = new PulseVoice();
        
        // The NES APU timer ticks every 2 CPU cycles
        this.apuClockRate = CPU_CLOCK / 2;
        this.clockAccumulator = 0.0;
        
        this.port.onmessage = (e) => {
            if (e.data.type === 'note_on') {
                this.pulse1.setFrequency(e.data.frequency);
            } else if (e.data.type === 'note_off') {
                this.pulse1.setFrequency(0);
            } else if (e.data.type === 'set_duty') {
                this.pulse1.setDuty(e.data.mode);
            }
        };
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        if (!output || !output[0]) return true;
        
        const channel = output[0];
        const rightChannel = output.length > 1 ? output[1] : null;
        
        // sampleRate is a global variable in AudioWorkletProcessor
        const apuClocksPerSample = this.apuClockRate / sampleRate;

        for (let i = 0; i < channel.length; i++) {
            this.clockAccumulator += apuClocksPerSample;
            let ticks = Math.floor(this.clockAccumulator);
            this.clockAccumulator -= ticks;

            for (let t = 0; t < ticks; t++) {
                this.pulse1.tick();
            }

            let sample = this.pulse1.getSample();
            channel[i] = sample;
            if (rightChannel) {
                rightChannel[i] = sample;
            }
        }
        
        return true; // Keep processor alive
    }
}

registerProcessor('chiptune-processor', ChiptuneProcessor);
