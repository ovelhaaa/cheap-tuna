const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');
file = file.replace(/                                                    <\/div>\n                                            \}\n                                            \}\)\}/g, "                                                    </div>\n                                                );\n                                            })}");
fs.writeFileSync('src/App.tsx', file);
