# 8-Bit Synth // P004

A web-based Chiptune Synthesizer and Step Sequencer heavily inspired by classic 8-bit sound chips (like the NES APU). Built with React and Web Audio API (AudioWorklet).

## Features

- **4-Voice Engine**:
  - **Pulse 1 & Pulse 2**: Variable duty cycle (12.5%, 25%, 50%, 75%), AD/AHDS envelope generators, detune, vibrato, and an arpeggiator.
  - **Triangle**: Classic pseudo-triangle wave with vibrato support.
  - **Noise**: Long (white) and Short (metallic) noise generation with variable period.
- **Polyphony Mode**: Play Pulse 1 and Pulse 2 polyphonically from the keyboard.
- **16-Step Sequencer**: Full piano roll grid with note ties, adjustable BPM, and swing amount. 
- **Song Mode**: Chain multiple sequencer patterns together.
- **Randomize Sequence**: Generates pseudo-random musical sequences based on minor pentatonic scales.
- **Preset Management**: Export and import timbre presets (for individual voices) and full song sequences in JSON format.
- **Live Keyboard**: Play the synthesizer using your computer keyboard or the on-screen keys, complete with MIDI keyboard support via the Web MIDI API.
- **Master Mixer & Filter**: Global volume control for each voice and a lowpass filter.
- **Oscilloscope**: Real-time visual feedback of the output waveform.

## Tech Stack

- **React 19**
- **TypeScript**
- **Vite**
- **Tailwind CSS v4**
- **Web Audio API**: Uses `AudioWorkletNode` for sample-accurate, glitch-free audio synthesis running on a separate thread.

## Running Locally

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`
