export class AudioEngine {
    private context: AudioContext | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private analyser: AnalyserNode | null = null;
    private initialized = false;

    async init() {
        if (this.initialized) return;
        
        this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        try {
            await this.context.audioWorklet.addModule('/chiptune-worklet.js');
            this.workletNode = new AudioWorkletNode(this.context, 'chiptune-processor');
            
            this.analyser = this.context.createAnalyser();
            this.analyser.fftSize = 2048;
            
            this.workletNode.connect(this.analyser);
            this.analyser.connect(this.context.destination);
            
            this.initialized = true;
            console.log("AudioEngine initialized successfully");
        } catch (e) {
            console.error("Failed to load worklet:", e);
        }
    }

    getAnalyser() {
        return this.analyser;
    }

    async resume() {
        if (this.context?.state === 'suspended') {
            await this.context.resume();
        }
    }

    playNote(voice: string, freq: number) {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'note_on', voice, frequency: freq });
    }

    stopNote(voice: string) {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'note_off', voice });
    }

    setDuty(voice: string, mode: number) {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'set_duty', voice, mode });
    }
    
    setEnvelope(voice: string, decayRate: number, loop: boolean, envMode?: 'AD' | 'AHDS', attackRate?: number, holdTime?: number, sustainLevel?: number, releaseRate?: number) {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'set_envelope', voice, decayRate, loop, envMode, attackRate, holdTime, sustainLevel, releaseRate });
    }
    
    setDetune(voice: string, detune: number) {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'set_detune', voice, detune });
    }
    
    setNoiseMode(mode: number) {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'set_noise_mode', mode });
    }
    
    setNoisePeriod(index: number) {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'set_noise_period', index });
    }
    
    setNoisePlaying(playing: boolean) {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'set_noise_playing', playing });
    }

    setArp(voice: string, enabled: boolean, pattern: number[], speed: number) {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'set_arp', voice, enabled, pattern, speed });
    }

    setVibrato(voice: string, enabled: boolean, rate: number, depth: number) {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'set_vibrato', voice, enabled, rate, depth });
    }

    // Sequencer methods
    playSequencer() {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'sequencer_play' });
    }

    pauseSequencer() {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'sequencer_pause' });
    }

    stopSequencer() {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'sequencer_stop' });
    }

    setSequencerBPM(bpm: number) {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'sequencer_set_bpm', bpm });
    }

    setSequencerPattern(stepPattern: any) {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'sequencer_set_pattern', stepPattern });
    }

    onStep(callback: (step: number) => void) {
        if (!this.workletNode) return;
        // Listen to port messages for step
        this.workletNode.port.addEventListener('message', (e) => {
            if (e.data.type === 'step') {
                callback(e.data.step);
            }
        });
        this.workletNode.port.start();
    }
}

export const audioEngine = new AudioEngine();
