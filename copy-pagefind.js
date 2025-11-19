// copy-pagefind.js
import { cpSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = join(__dirname, 'dist/client/pagefind');
const dest = join(__dirname, 'dist/pagefind');

try {
  cpSync(source, dest, { recursive: true });
  console.log('✅ Pagefind files copied to dist/pagefind');
} catch (error) {
  console.error('❌ Error copying Pagefind files:', error.message);
}