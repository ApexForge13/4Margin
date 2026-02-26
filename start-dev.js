const { execSync } = require('child_process');
const path = require('path');

process.chdir(path.join(__dirname, 'supplement-engine'));
require('./supplement-engine/node_modules/next/dist/bin/next');
