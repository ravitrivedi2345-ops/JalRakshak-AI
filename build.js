const fs = require('fs');
const cp = require('child_process');

if (fs.existsSync('frontend')) {
  console.log('[Build] Running in root directory. Building frontend...');
  cp.execSync('cd frontend && npm install --legacy-peer-deps && npm run build', { stdio: 'inherit' });
  fs.cpSync('frontend/dist', 'dist', { recursive: true });
  console.log('[Build] Successfully copied frontend/dist to dist');
} else {
  console.log('[Build] Running in frontend directory. Building...');
  cp.execSync('npm run build', { stdio: 'inherit' });
}
