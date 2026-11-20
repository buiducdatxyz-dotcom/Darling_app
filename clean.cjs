const fs = require('node:fs');

fs.rmSync('dist', { recursive: true, force: true });
fs.rmSync('server.js', { force: true });
