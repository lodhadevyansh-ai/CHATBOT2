import { spawn } from 'child_process';

console.log('🚀 Starting Backend Express Server & Vite Dev Server...');

const server = spawn('node', ['server/server.js'], { stdio: 'inherit', shell: true });
const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

process.on('SIGINT', () => {
  server.kill();
  vite.kill();
  process.exit();
});
