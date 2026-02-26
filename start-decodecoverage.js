const path = require('path');

// Change to the decodecoverage app directory so Next.js finds the right next.config.ts
process.chdir(path.join(__dirname, 'apps', 'decodecoverage'));

// next binary is hoisted to root node_modules
process.argv = [process.argv[0], 'next', 'dev', '--port', '3001'];
require(path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next'));
