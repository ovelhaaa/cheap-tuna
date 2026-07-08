import { ChangeEvent, useState } from 'react';
import { Download, Upload, Disc3, Music, Sparkles } from 'lucide-react';
import { VoiceType } from '../audio/types';
import { FACTORY_TIMBRES, FACTORY_SONGS, FactoryTimbre, FactorySong } from '../data/factoryPresets';

interface PresetManagerProps {
    activeVoice: VoiceType;
    timbreFilename: string;
    setTimbreFilename: (val: string) => void;
    songFilename: string;
    setSongFilename: (val: string) => void;
    handleExportTimbre: () => void;
    handleImportTimbre: (e: ChangeEvent<HTMLInputElement>) => void;
    handleExportSong: () => void;
    handleImportSong: (e: ChangeEvent<HTMLInputElement>) => void;
    loadFactoryTimbre: (timbre: FactoryTimbre) => void;
    loadFactorySong: (song: FactorySong) => void;
}

export function PresetManager({
    activeVoice,
    timbreFilename,
    setTimbreFilename,
    songFilename,
    setSongFilename,
    handleExportTimbre,
    handleImportTimbre,
    handleExportSong,
    handleImportSong,
    loadFactoryTimbre,
    loadFactorySong
}: PresetManagerProps) {
    // Filter timbres by current voice category
    const matchingTimbres = FACTORY_TIMBRES.filter(t => {
        if (activeVoice === 'pulse1' || activeVoice === 'pulse2') {
            return t.voice === 'pulse1' || t.voice === 'pulse2';
        }
        return t.voice === activeVoice;
    });

    const [selectedTimbreDesc, setSelectedTimbreDesc] = useState<string>('');
    const [selectedSongDesc, setSelectedSongDesc] = useState<string>('');

    return (
        <div className="tape-slot p-4 rounded space-y-4 mb-4">
            {/* Top Bar: Factory ROM Library */}
            <div className="border border-amber-primary/20 p-3 rounded bg-[#15120e] space-y-3">
                <div className="flex items-center gap-1.5 pb-2 border-b border-amber-primary/10">
                    <Disc3 className="w-4 h-4 text-amber-primary animate-spin" style={{ animationDuration: '8s' }} />
                    <span className="text-[11px] uppercase tracking-wider text-amber-primary font-bold">Factory Sound ROM & Cartridges</span>
                </div>

                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Factory Timbres */}
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase text-vintage-text-dim font-bold tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-primary/70" />
                                ROM Patches ({activeVoice === 'pulse1' ? 'Pulse 1' : activeVoice === 'pulse2' ? 'Pulse 2' : activeVoice === 'triangle' ? 'Triangle' : 'Noise'})
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {matchingTimbres.map((timbre) => (
                                <button
                                    key={timbre.name}
                                    onClick={() => {
                                        loadFactoryTimbre(timbre);
                                        setSelectedTimbreDesc(timbre.description);
                                    }}
                                    onMouseEnter={() => setSelectedTimbreDesc(timbre.description)}
                                    className="px-2.5 py-1.5 bg-vintage-panel hover:bg-vintage-surface text-vintage-text text-[10px] font-bold rounded border border-vintage-border hover:border-amber-primary/40 text-left transition-all truncate btn-hardware flex items-center gap-1.5"
                                    title={timbre.description}
                                >
                                    <span className="w-1.5 h-1.5 bg-amber-primary rounded-full shrink-0"></span>
                                    {timbre.name}
                                </button>
                            ))}
                        </div>
                        {selectedTimbreDesc && (
                            <div className="text-[9px] text-vintage-text-dim italic leading-tight px-1 py-0.5 border-l-2 border-amber-primary/30 min-h-[24px]">
                                {selectedTimbreDesc}
                            </div>
                        )}
                    </div>

                    {/* Factory Songs */}
                    <div className="flex-1 space-y-2">
                        <span className="text-[10px] uppercase text-vintage-text-dim font-bold tracking-wider flex items-center gap-1">
                            <Music className="w-3 h-3 text-amber-primary/70" />
                            ROM Song Cartridges
                        </span>
                        <div className="grid grid-cols-3 gap-1.5">
                            {FACTORY_SONGS.map((song) => (
                                <button
                                    key={song.name}
                                    onClick={() => {
                                        loadFactorySong(song);
                                        setSelectedSongDesc(song.description);
                                    }}
                                    onMouseEnter={() => setSelectedSongDesc(song.description)}
                                    className="px-2 py-1.5 bg-vintage-panel hover:bg-vintage-surface text-amber-primary text-[10px] font-extrabold rounded border border-vintage-border hover:border-amber-primary/50 text-center transition-all truncate btn-hardware"
                                    title={song.description}
                                >
                                    {song.name.replace("Tuna's ", "")}
                                </button>
                            ))}
                        </div>
                        {selectedSongDesc && (
                            <div className="text-[9px] text-vintage-text-dim italic leading-tight px-1 py-0.5 border-l-2 border-amber-primary/30 min-h-[24px]">
                                {selectedSongDesc}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Bar: Disk Storage (User import/export) */}
            <div className="border border-vintage-border/30 p-3 rounded bg-vintage-bg/40 space-y-3">
                <div className="text-[10px] uppercase tracking-wider text-vintage-text-dim font-bold">
                    User Floppy Storage
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                    {/* User Timbre */}
                    <div className="flex-1 space-y-1.5">
                        <h4 className="text-[9px] uppercase text-vintage-text-dim font-bold tracking-wider">Floppy Slot A // Save/Load Timbre ({activeVoice.toUpperCase()})</h4>
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                value={timbreFilename} 
                                onChange={e => setTimbreFilename(e.target.value)}
                                placeholder={`timbre-${activeVoice}`}
                                className="bg-vintage-panel border border-vintage-border text-[11px] rounded px-2 py-1 flex-1 focus:outline-none focus:border-amber-primary/50 text-vintage-text min-w-0 font-mono"
                            />
                            <button 
                                onClick={handleExportTimbre}
                                className="flex items-center gap-1.5 px-3 py-1 bg-vintage-surface hover:bg-vintage-border text-amber-primary text-[10px] font-bold rounded border border-vintage-border transition-colors btn-hardware shrink-0"
                                title="Export Timbre to file"
                            >
                                <Download className="w-3 h-3" />
                                Save
                            </button>
                            <label className="flex items-center gap-1.5 px-3 py-1 bg-vintage-surface hover:bg-vintage-border text-amber-primary text-[10px] font-bold rounded border border-vintage-border transition-colors cursor-pointer shrink-0">
                                <Upload className="w-3 h-3" />
                                Load
                                <input type="file" accept=".json" onChange={handleImportTimbre} className="hidden" />
                            </label>
                        </div>
                    </div>
                    
                    {/* User Song */}
                    <div className="flex-1 space-y-1.5">
                        <h4 className="text-[9px] uppercase text-vintage-text-dim font-bold tracking-wider">Floppy Slot B // Save/Load Song (All Tracks)</h4>
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                value={songFilename} 
                                onChange={e => setSongFilename(e.target.value)}
                                placeholder={`song-preset`}
                                className="bg-vintage-panel border border-vintage-border text-[11px] rounded px-2 py-1 flex-1 focus:outline-none focus:border-amber-primary/50 text-vintage-text min-w-0 font-mono"
                            />
                            <button 
                                onClick={handleExportSong}
                                className="flex items-center gap-1.5 px-3 py-1 bg-vintage-surface hover:bg-vintage-border text-amber-primary text-[10px] font-bold rounded border border-vintage-border transition-colors btn-hardware shrink-0"
                                title="Export Song to file"
                            >
                                <Download className="w-3 h-3" />
                                Save
                            </button>
                            <label className="flex items-center gap-1.5 px-3 py-1 bg-vintage-surface hover:bg-vintage-border text-amber-primary text-[10px] font-bold rounded border border-vintage-border transition-colors cursor-pointer shrink-0">
                                <Upload className="w-3 h-3" />
                                Load
                                <input type="file" accept=".json" onChange={handleImportSong} className="hidden" />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
