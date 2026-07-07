const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

// replace the last inner map closing manually using string matching
file = file.replace("                                            }\n                                            })}", "                                                );\n                                            })}");

fs.writeFileSync('src/App.tsx', file);
