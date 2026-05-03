#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const { dirname, join } = require('node:path');

const cliPath = join(dirname(require.resolve('@ui2v/cli')), 'cli.js');
const result = spawnSync(process.execPath, [cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
