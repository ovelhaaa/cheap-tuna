import re
with open('public/chiptune-worklet.js', 'r') as f:
    content = f.read()

pulse_match = re.search(r'class PulseVoice \{[\s\S]*?\}\s*\}\n\nclass TriangleVoice', content)
if pulse_match:
    pulse = pulse_match.group(0)
    
    pulse = re.sub(r'\s*this\.enabled = false;', '', pulse)
    pulse = re.sub(r'\s*this\.enabled = true;', '', pulse)
    pulse = re.sub(r'this\.enabled', 'this.envelope.enabled', pulse)
    
    content = content.replace(pulse_match.group(0), pulse)
    with open('public/chiptune-worklet.js', 'w') as f:
        f.write(content)
    print("Patched PulseVoice")
else:
    print("Could not find PulseVoice")
