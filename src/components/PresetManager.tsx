import { ChangeEvent } from 'react';
import { Download, Upload } from 'lucide-react';
import { VoiceType } from '../audio/types';

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
    handleImportSong
}: PresetManagerProps) {
    return (
        <div className="tape-slot p-4 rounded space-y-4 mb-4">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                    <h3 className="text-[10px] uppercase text-vintage-text-dim font-bold tracking-wider">Timbre Presets ({activeVoice.toUpperCase()})</h3>
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={timbreFilename} 
                            onChange={e => setTimbreFilename(e.target.value)}
                            placeholder={`timbre-${activeVoice}`}
                            className="bg-vintage-panel border border-vintage-border text-xs rounded px-2 py-1.5 flex-1 focus:outline-none focus:border-amber-primary/50 text-vintage-text min-w-0"
                        />
                        <button 
                            onClick={handleExportTimbre}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-vintage-surface hover:bg-vintage-border text-amber-primary text-xs rounded border border-vintage-border transition-colors btn-hardware shrink-0"
                            title="Export Timbre"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Save
                        </button>
                        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-vintage-surface hover:bg-vintage-border text-amber-primary text-xs rounded border border-vintage-border transition-colors cursor-pointer shrink-0">
                            <Upload className="w-3.5 h-3.5" />
                            Load
                            <input type="file" accept=".json" onChange={handleImportTimbre} className="hidden" />
                        </label>
                    </div>
                </div>
                
                <div className="flex-1 space-y-2">
                    <h3 className="text-[10px] uppercase text-vintage-text-dim font-bold tracking-wider">Song Presets (All Tracks)</h3>
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={songFilename} 
                            onChange={e => setSongFilename(e.target.value)}
                            placeholder={`song-preset`}
                            className="bg-vintage-panel border border-vintage-border text-xs rounded px-2 py-1.5 flex-1 focus:outline-none focus:border-amber-primary/50 text-vintage-text min-w-0"
                        />
                        <button 
                            onClick={handleExportSong}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-vintage-surface hover:bg-vintage-border text-amber-primary text-xs rounded border border-vintage-border transition-colors btn-hardware shrink-0"
                            title="Export Song"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Save
                        </button>
                        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-vintage-surface hover:bg-vintage-border text-amber-primary text-xs rounded border border-vintage-border transition-colors cursor-pointer shrink-0">
                            <Upload className="w-3.5 h-3.5" />
                            Load
                            <input type="file" accept=".json" onChange={handleImportSong} className="hidden" />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
