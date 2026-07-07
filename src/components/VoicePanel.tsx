import { PulseConfig, VibratoConfig } from '../audio/types';
import { ARP_PATTERNS } from '../utils/noteUtils';

export function VibratoControls({ config, onChange }: { config: VibratoConfig, onChange: (u: VibratoConfig) => void }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-vintage-border pb-1">
                <span className="text-[10px] sm:text-xs uppercase text-vintage-text-dim font-bold tracking-wider">Vibrato</span>
                <button 
                    onClick={() => onChange({ ...config, enabled: !config.enabled })}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${config.enabled ? 'bg-amber-dimmer text-amber-primary border-amber-primary' : 'bg-vintage-bg text-vintage-text-dim border-vintage-border'}`}
                >
                    {config.enabled ? 'ON' : 'OFF'}
                </button>
            </div>
            <div className={`grid grid-cols-2 gap-4 ${!config.enabled ? 'opacity-30 pointer-events-none' : ''}`}>
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span className="text-[10px] uppercase text-vintage-text-dim">Rate</span>
                        <span className="text-[10px] text-amber-primary">{config.rate}Hz</span>
                    </div>
                    <input 
                        type="range" min="1" max="20" step="0.1" 
                        value={config.rate} 
                        onChange={e => onChange({ ...config, rate: parseFloat(e.target.value) })}
                        className="w-full accent-amber-primary"
                    />
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span className="text-[10px] uppercase text-vintage-text-dim">Depth</span>
                        <span className="text-[10px] text-amber-primary">{config.depth}ST</span>
                    </div>
                    <input 
                        type="range" min="0" max="12" step="0.1" 
                        value={config.depth} 
                        onChange={e => onChange({ ...config, depth: parseFloat(e.target.value) })}
                        className="w-full accent-amber-primary"
                    />
                </div>
            </div>
        </div>
    );
}

export function PulseControls({ title, config, onChange, isActive, onSelect }: { 
    title: string, 
    config: PulseConfig, 
    onChange: (u: Partial<PulseConfig>) => void,
    isActive: boolean,
    onSelect: () => void
}) {
    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-sm uppercase tracking-wider text-amber-primary font-bold">{title}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="space-y-3">
                    <label className="text-[10px] sm:text-xs text-vintage-text-dim uppercase tracking-wider border-b border-vintage-border pb-1 block">Duty Cycle</label>
                    <div className="grid grid-cols-4 gap-1">
                        {[0, 1, 2, 3].map(d => (
                            <button
                                key={d}
                                onClick={() => onChange({ duty: d })}
                                className={`py-3 px-1 min-h-[44px] text-xs font-medium rounded border transition-colors ${
                                    config.duty === d ? 'bg-vintage-surface text-amber-primary border-amber-primary/50' : 'bg-vintage-bg text-vintage-text-dim border-vintage-border'
                                }`}
                            >
                                {d === 0 ? '12.5%' : d === 1 ? '25%' : d === 2 ? '50%' : '75%'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-vintage-border pb-1">
                        <label className="text-[10px] sm:text-xs text-vintage-text-dim uppercase tracking-wider">Envelope</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => onChange({ envMode: 'AD' })}
                                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${config.envMode === 'AD' ? 'bg-amber-dimmer text-amber-primary border-amber-primary' : 'bg-vintage-bg text-vintage-text-dim border-vintage-border'}`}
                            >
                                AD
                            </button>
                            <button 
                                onClick={() => onChange({ envMode: 'AHDS' })}
                                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${config.envMode === 'AHDS' ? 'bg-amber-dimmer text-amber-primary border-amber-primary' : 'bg-vintage-bg text-vintage-text-dim border-vintage-border'}`}
                            >
                                AHDS
                            </button>
                        </div>
                    </div>
                    
                    {config.envMode === 'AD' ? (
                        <div className="space-y-2">
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] uppercase text-vintage-text-dim">Decay Rate</span>
                                    <span className="text-xs text-amber-primary font-bold bg-vintage-surface px-2 py-0.5 rounded border border-vintage-border">{config.decay}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" max="15" 
                                    value={config.decay}
                                    onChange={(e) => onChange({ decay: parseInt(e.target.value) })}
                                    className="w-full h-10 accent-amber-primary"
                                />
                            </div>
                            <label className="flex justify-between items-center bg-vintage-surface p-2 rounded border border-vintage-border">
                                <span className="text-[10px] uppercase text-vintage-text-dim">Loop Env</span>
                                <input 
                                    type="checkbox" 
                                    checked={config.loop} 
                                    onChange={(e) => onChange({ loop: e.target.checked })}
                                    className="accent-amber-primary h-5 w-5"
                                />
                            </label>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            <div className="space-y-1">
                                <div className="flex justify-between items-center"><span className="text-[10px] uppercase text-vintage-text-dim">Atk</span><span className="text-[10px] text-amber-primary">{config.attackRate}</span></div>
                                <input type="range" min="1" max="15" value={config.attackRate} onChange={e => onChange({ attackRate: parseInt(e.target.value) })} className="w-full accent-amber-primary" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center"><span className="text-[10px] uppercase text-vintage-text-dim">Hold</span><span className="text-[10px] text-amber-primary">{config.holdTime}</span></div>
                                <input type="range" min="0" max="15" value={config.holdTime} onChange={e => onChange({ holdTime: parseInt(e.target.value) })} className="w-full accent-amber-primary" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center"><span className="text-[10px] uppercase text-vintage-text-dim">Decay</span><span className="text-[10px] text-amber-primary">{config.decay}</span></div>
                                <input type="range" min="1" max="15" value={config.decay} onChange={e => onChange({ decay: parseInt(e.target.value) })} className="w-full accent-amber-primary" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center"><span className="text-[10px] uppercase text-vintage-text-dim">Sus</span><span className="text-[10px] text-amber-primary">{config.sustainLevel}</span></div>
                                <input type="range" min="0" max="15" value={config.sustainLevel} onChange={e => onChange({ sustainLevel: parseInt(e.target.value) })} className="w-full accent-amber-primary" />
                            </div>
                            <div className="space-y-1 col-span-2">
                                <div className="flex justify-between items-center"><span className="text-[10px] uppercase text-vintage-text-dim">Rel</span><span className="text-[10px] text-amber-primary">{config.releaseRate}</span></div>
                                <input type="range" min="1" max="15" value={config.releaseRate} onChange={e => onChange({ releaseRate: parseInt(e.target.value) })} className="w-full accent-amber-primary" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-vintage-border pb-1">
                            <span className="text-[10px] sm:text-xs uppercase text-vintage-text-dim font-bold tracking-wider">Arpeggiator</span>
                            <button 
                                onClick={() => onChange({ arp: { ...config.arp, enabled: !config.arp.enabled } })}
                                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${config.arp.enabled ? 'bg-amber-dimmer text-amber-primary border-amber-primary' : 'bg-vintage-bg text-vintage-text-dim border-vintage-border'}`}
                            >
                                {config.arp.enabled ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        <div className={`space-y-2 ${!config.arp.enabled ? 'opacity-30 pointer-events-none' : ''}`}>
                            <select 
                                className="w-full bg-vintage-surface border border-vintage-border text-xs rounded p-2 focus:outline-none focus:border-amber-primary/50 text-vintage-text"
                                value={JSON.stringify(config.arp.pattern)}
                                onChange={e => onChange({ arp: { ...config.arp, pattern: JSON.parse(e.target.value) } })}
                            >
                                {ARP_PATTERNS.map((p, i) => (
                                    <option key={i} value={JSON.stringify(p.value)}>{p.name}</option>
                                ))}
                            </select>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase text-vintage-text-dim">Speed</span>
                                <input 
                                    type="range" min="5" max="60" 
                                    value={config.arp.speed} 
                                    onChange={e => onChange({ arp: { ...config.arp, speed: parseInt(e.target.value) } })}
                                    className="flex-1 accent-amber-primary"
                                />
                            </div>
                        </div>
                    </div>

                    <VibratoControls config={config.vibrato} onChange={(v) => onChange({ vibrato: v })} />

                    <div className="space-y-1 pt-2 border-t border-vintage-border">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] sm:text-xs uppercase text-vintage-text-dim font-bold tracking-wider">Detune</span>
                            <span className="text-[10px] text-amber-primary">{config.detune > 0 ? '+' : ''}{config.detune}</span>
                        </div>
                        <input 
                            type="range" min="-50" max="50" 
                            value={config.detune} 
                            onChange={e => onChange({ detune: parseInt(e.target.value) })}
                            className="w-full accent-amber-primary"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
