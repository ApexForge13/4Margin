const { execSync } = require('child_process');
const path = require('path');

process.chdir(path.join(__dirname, 'apps', 'contractor'));
require('./node_modules/next/dist/bin/next');
