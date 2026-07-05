export class AudioEngine {
    private context: AudioContext | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private initialized = false;

    async init() {
        if (this.initialized) return;
        
        this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        try {
            await this.context.audioWorklet.addModule('/chiptune-worklet.js');
            this.workletNode = new AudioWorkletNode(this.context, 'chiptune-processor');
            this.workletNode.connect(this.context.destination);
            this.initialized = true;
            console.log("AudioEngine initialized successfully");
        } catch (e) {
            console.error("Failed to load worklet:", e);
        }
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
    
    setEnvelope(voice: string, decayRate: number, loop: boolean) {
        if (!this.workletNode) return;
        this.workletNode.port.postMessage({ type: 'set_envelope', voice, decayRate, loop });
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
}

export const audioEngine = new AudioEngine();
