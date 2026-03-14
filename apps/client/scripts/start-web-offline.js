/**
 * Start Expo web with EXPO_OFFLINE=1 so the CLI skips the startup version check.
 * Avoids "TypeError: fetch failed" when the network request to Expo's API fails.
 */
const { spawn } = require('child_process');
const path = require('path');

const env = { ...process.env, EXPO_OFFLINE: '1' };
const child = spawn('npx', ['expo', 'start', '--web'], {
  env,
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..'),
});

child.on('exit', (code, signal) => {
  process.exit(code != null ? code : 1);
});
