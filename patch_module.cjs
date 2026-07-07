const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

// Update PulseControls to look like a module
file = file.replace(/className=\{`bg-vintage-bg p-4 rounded-lg border border-vintage-border space-y-4 \$\{isActive \? 'ring-1 ring-amber-primary' : ''\}`\}/g, 
"className={`module-panel p-4 pt-6 rounded space-y-4 ${isActive ? 'ring-1 ring-amber-primary' : ''}`}");

// Triangle doesn't have a wrapper, so we wrap it:
file = file.replace(/\{\/\* Triangle \*\/\}[\s\S]*?<VibratoControls config=\{triangle\.vibrato\} onChange=\{\(v\) => updateTriangle\(\{ vibrato: v \}\)\} \/>/,
`{/* Triangle */}
                        <div className={\`module-panel p-4 pt-6 rounded space-y-4 \${activeVoice === 'triangle' ? 'ring-1 ring-amber-primary' : ''}\`}>
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm uppercase tracking-wider text-amber-primary font-bold">Triangle</h2>
                                <button
                                    onClick={() => setActiveVoice('triangle')}
                                    className={\`px-3 py-1 text-xs rounded border transition-colors \${
                                        activeVoice === 'triangle'
                                        ? 'bg-amber-dimmer text-amber-primary border-amber-primary/50'
                                        : 'bg-vintage-bg text-vintage-text-dim border-vintage-border'
                                    } btn-hardware\`}
                                >
                                    {activeVoice === 'triangle' ? 'Control: Active' : 'Select'}
                                </button>
                            </div>
                            <VibratoControls config={triangle.vibrato} onChange={(v) => updateTriangle({ vibrato: v })} />
                        </div>`);

// Noise Controls wrapper
file = file.replace(/<div className="bg-vintage-panel border border-vintage-border rounded-xl p-6 space-y-6">/g, 
`<div className="module-panel p-4 pt-6 rounded space-y-6">`); // Wait, there are multiple "bg-vintage-panel border border-vintage-border rounded-xl p-6"

fs.writeFileSync('src/App.tsx', file);
