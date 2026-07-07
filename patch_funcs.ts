export const handleImportTimbre = `
    const [timbreFilename, setTimbreFilename] = useState('');
    const [songFilename, setSongFilename] = useState('');

    const handleExportTimbre = () => {
        let params: any;
        if (activeVoice === 'pulse1') params = pulse1;
        else if (activeVoice === 'pulse2') params = pulse2;
        else if (activeVoice === 'triangle') params = triangle;
        else if (activeVoice === 'noise') params = { noiseMode, noisePeriod };

        const data = {
            type: "cheap-tuna-timbre",
            version: 1,
            voice: activeVoice,
            params
        };
        downloadJson(timbreFilename || \`timbre-\${activeVoice}\`, data);
    };

    const handleImportTimbre = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const data = await loadJson(file);
            if (data?.type !== 'cheap-tuna-timbre') {
                alert('Invalid timbre preset file');
                return;
            }
            const { voice, params } = data;
            if (voice === 'pulse1' || voice === 'pulse2') {
                updatePulse(voice, params);
            } else if (voice === 'triangle') {
                updateTriangle(params);
            } else if (voice === 'noise') {
                if (params.noiseMode !== undefined) {
                    setNoiseMode(params.noiseMode);
                    audioEngine.setNoiseMode(params.noiseMode);
                }
                if (params.noisePeriod !== undefined) {
                    setNoisePeriod(params.noisePeriod);
                    audioEngine.setNoisePeriod(params.noisePeriod);
                }
            }
        } catch (err: any) {
            alert(err.message || 'Failed to load timbre');
        }
        e.target.value = ''; // reset
    };

    const handleExportSong = () => {
        const data = {
            type: "cheap-tuna-song",
            version: 1,
            bpm,
            swingAmount: swing,
            patterns,
            songSequence
        };
        downloadJson(songFilename || 'song-preset', data);
    };

    const handleImportSong = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const data = await loadJson(file);
            if (data?.type !== 'cheap-tuna-song') {
                alert('Invalid song preset file');
                return;
            }
            if (confirm('Loading a song will overwrite your current patterns and sequence. Continue?')) {
                setBpm(data.bpm || 120);
                setSwing(data.swingAmount || 0);
                setPatterns(data.patterns || []);
                setSongSequence(data.songSequence || [0]);
                
                audioEngine.setSequencerBPM(data.bpm || 120);
                audioEngine.setSequencerSwing(data.swingAmount || 0);
                audioEngine.setSequencerPatterns(data.patterns || []);
                audioEngine.setSequencerSong(data.songSequence || [0]);
            }
        } catch (err: any) {
            alert(err.message || 'Failed to load song');
        }
        e.target.value = ''; // reset
    };
`;
