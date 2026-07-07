const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

// I will just use regex to fix it
file = file.replace(/                                                \);\n                                            }\n                                            \}\)}/g, 
"                                                );\n                                            })}");

fs.writeFileSync('src/App.tsx', file);
