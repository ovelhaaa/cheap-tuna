const fs = require('fs');

const file = fs.readFileSync('src/App.tsx', 'utf8');

const pressKeyMatch = `    const pressKey = useCallback((key: string) => {
        if (!currentKeyMap[key]) return;
        
        setActiveKeys(prev => {`;

const pressKeyInsert = `    const pressKey = useCallback((key: string) => {
        if (!currentKeyMap[key]) return;
        
        if (editingNote) {
            setPatterns(p => {
                const next = [...p];
                const pat = {...next[currentPatternIndex]};
                const track = [...pat[editingNote.track]];
                track[editingNote.step] = { ...track[editingNote.step], note: currentKeyMap[key].freq };
                pat[editingNote.track] = track;
                next[currentPatternIndex] = pat;
                audioEngine.setSequencerPattern(currentPatternIndex, pat);
                return next;
            });
            
            setActiveKeys(prev => {
                const next = new Set(prev);
                next.add(key);
                return next;
            });

            const targetVoice = editingNote.track !== 'noise' ? editingNote.track : activeVoice;
            audioEngine.playNote(targetVoice, currentKeyMap[key].freq);
            setTimeout(() => audioEngine.stopNote(targetVoice), 150);
            
            setEditingNote(null);
            return;
        }

        setActiveKeys(prev => {`;

let res = file.replace(pressKeyMatch, pressKeyInsert);

const depMatch = `    }, [activeVoice, polyMode, currentKeyMap]);`;
const depInsert = `    }, [activeVoice, polyMode, currentKeyMap, editingNote, currentPatternIndex]);`;
res = res.replace(depMatch, depInsert);

// Also remove NotePickerPopup logic from return
const pickerMatch = `            {editingNote && (
                <NotePickerPopup 
                    initialFreq={patterns[currentPatternIndex][editingNote.track][editingNote.step].note || 0}
                    onSelect={(freq) => {
                        setPatterns(p => {
                            const next = [...p];
                            const pat = {...next[currentPatternIndex]};
                            const track = [...pat[editingNote.track]];
                            track[editingNote.step] = { ...track[editingNote.step], note: freq };
                            pat[editingNote.track] = track;
                            next[currentPatternIndex] = pat;
                            audioEngine.setSequencerPattern(currentPatternIndex, pat);
                            return next;
                        });
                        setEditingNote(null);
                    }}
                    onClose={() => setEditingNote(null)}
                />
            )}`;

res = res.replace(pickerMatch, '');

fs.writeFileSync('src/App.tsx', res);
console.log('patched');
