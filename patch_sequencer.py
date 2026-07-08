import re
with open('public/chiptune-worklet.js', 'r') as f:
    content = f.read()

content = content.replace(
    'if (this.currentStep >= this.patternLength) {',
    'if (this.currentStep >= activePattern.pulse1.length) {'
)

with open('public/chiptune-worklet.js', 'w') as f:
    f.write(content)
