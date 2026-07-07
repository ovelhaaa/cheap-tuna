import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Main container
content = content.replace(
    'className="min-h-screen bg-vintage-bg text-vintage-text flex flex-col items-center py-12 px-4 font-mono"',
    'className="min-h-screen bg-vintage-bg text-vintage-text flex flex-col items-center py-4 px-2 sm:py-12 sm:px-4 font-mono"'
)

# 2. Header
content = content.replace(
    'className="mb-8 pb-4 border-b-4 border-amber-primary flex flex-col sm:flex-row justify-between items-center w-full max-w-4xl gap-2"',
    'className="mb-4 pb-2 sm:mb-8 sm:pb-4 border-b-4 border-amber-primary flex flex-col sm:flex-row justify-between items-center w-full max-w-4xl gap-2"'
)

# 3. Main gap
content = content.replace(
    'className="w-full max-w-4xl flex flex-col gap-6"',
    'className="w-full max-w-4xl flex flex-col gap-3 sm:gap-6"'
)

# 4. Module Panels (p-4 pt-6 -> p-3 sm:p-4 sm:pt-6)
content = re.sub(
    r'className="module-panel p-4 pt-6 rounded space-y-([0-9]+)([^"]*)"',
    r'className="module-panel p-3 sm:p-4 pt-4 sm:pt-6 rounded space-y-\1 sm:space-y-\1\2"',
    content
)

content = re.sub(
    r'className="module-panel p-6 rounded([^"]*)"',
    r'className="module-panel p-3 sm:p-6 rounded\1"',
    content
)

# 5. Grid gaps
content = content.replace('gap-6', 'gap-3 sm:gap-6')
content = content.replace('gap-4', 'gap-2 sm:gap-4')

with open('src/App.tsx', 'w') as f:
    f.write(content)

