import re
with open('public/chiptune-worklet.js', 'r') as f:
    content = f.read()

target = r"""                    this\.currentStep\+\+;
                    if \(this\.currentStep >= activePattern\.pulse1\.length\) \{"""

replacement = r"""                    this.currentStep++;
                    const activePattern = this.patterns[this.songSequence[this.currentSongPos]];
                    const patternLength = activePattern ? activePattern.pulse1.length : this.patternLength;
                    if (this.currentStep >= patternLength) {"""

content = re.sub(target, replacement, content)

with open('public/chiptune-worklet.js', 'w') as f:
    f.write(content)

