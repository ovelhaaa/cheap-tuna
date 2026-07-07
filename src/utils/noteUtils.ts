export const BASE_NOTES = [
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

export const ALL_NOTES_LIST = Array.from({ length: 12 * 7 }, (_, i) => {
    const octave = Math.floor(i / 12) + 1;
    const note = BASE_NOTES[i % 12];
    const a4 = 440;
    const noteIndex = (octave - 4) * 12 + note.offset;
    const freq = a4 * Math.pow(2, (noteIndex - 9) / 12);
    return { name: `${note.noteName}${octave}`, freq };
});

export const ARP_PATTERNS = [
    { name: 'Major Triad', value: [0, 4, 7] },
    { name: 'Minor Triad', value: [0, 3, 7] },
    { name: 'Octave Jump', value: [0, 12] },
    { name: 'Octave Arp', value: [0, 12, 24] },
    { name: 'Sus4', value: [0, 5, 7] },
];
