const fs = require('fs');
const file = fs.readFileSync('src/App.tsx', 'utf8');

const match = `    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.repeat) return;
        const key = e.key.toLowerCase();
        pressKey(key);
    }, [pressKey]);`;

const insert = `    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setEditingNote(null);
            return;
        }
        if (e.repeat) return;
        
        // Disable piano keys when typing in an input
        if (document.activeElement?.tagName === 'INPUT') return;

        const key = e.key.toLowerCase();
        pressKey(key);
    }, [pressKey]);`;

const res = file.replace(match, insert);
if (res !== file) {
    fs.writeFileSync('src/App.tsx', res);
    console.log('patched');
} else {
    console.log('no match');
}
