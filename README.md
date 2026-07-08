# Cheap Tuna - this fish you can tune 

A retro-styled, highly polished, web-based Chiptune Synthesizer and Step Sequencer heavily inspired by classic 8-bit sound chips (such as the NES APU). Built using React, Tailwind CSS, and the Web Audio API with a custom AudioWorklet engine for authentic, high-fidelity sound.

## Features

- **4-Voice Engine**:
  - **Pulse 1 & Pulse 2**: Variable duty cycles (12.5%, 25%, 50%, 75%), AD/AHDS envelope generators, detune, vibrato, and a built-in arpeggiator.
  - **Triangle**: Classic pseudo-triangle wave with pitch vibrato support.
  - **Noise**: Long (white noise) and short (metallic/lo-fi drum loop) noise generation with variable period controls.
- **Polyphony Mode**: Play Pulse 1 and Pulse 2 polyphonically directly from the interactive keyboard.
- **16-Step Sequencer**: Full retro piano roll step editor with individual track grids, note ties, customizable BPM, and adjustable Swing amount.
- **Dynamic LED Timing Indicator**: A small circular amber LED indicator positioned right next to the BPM display that blinks in perfect sync with the current sequencer tempo to provide real-time visual timing confirmation.
- **Song Mode**: Chain multiple sequencer patterns together to compose complete songs.
- **Randomize Sequence**: Instantly generate algorithmic musical sequences based on minor pentatonic scales.
- **Preset Management**: Built-in Preset Manager at the bottom to easily export and import timbre presets (for individual voices) as well as full song sequences in JSON format.
- **Live Keyboard**: Play the synthesizer using your computer keyboard or the interactive on-screen keys. Includes full **MIDI Keyboard Support** via the Web MIDI API.
- **Master Mixer & Filter**: Custom global volume sliders for each audio voice and an interactive lowpass resonant filter control.
- **Oscilloscope**: Custom canvas-based real-time visual feedback of the active 8-bit output waveform.

## Tech Stack

- **React 19 & Vite**
- **TypeScript**
- **Tailwind CSS v4**
- **Web Audio API**: Leverages a highly optimized `AudioWorkletNode` system for sample-accurate, glitch-free audio synthesis running on a dedicated worker thread.

## GitHub Actions & Deployment

This project includes a pre-configured GitHub Actions workflow to build and deploy the application directly to **GitHub Pages**:
- **Workflow File**: `.github/workflows/deploy.yml`
- **Automatic Deployment**: Runs automatically on every push to the `main` or `master` branch.
- **Vite Integration**: Configured with a relative base path (`base: './'`) in `vite.config.ts` to ensure that compiled assets resolve correctly in any subpath/repository directory structure.

## Running Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Build the application**:
   ```bash
   npm run build
   ```
