import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json to get version
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

const version = {
  version: packageJson.version || '1.0.0',
  buildTime: new Date().toISOString()
};

const versionPath = join(__dirname, '..', 'public', 'version.json');
writeFileSync(versionPath, JSON.stringify(version, null, 2));

console.log(`✓ Version updated: ${version.version} (${version.buildTime})`);

