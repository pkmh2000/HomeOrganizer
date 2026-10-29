/**
 * Automatic Version Bumping Script for HomeOrganizer
 * Increments the patch version in src/version.ts and package.json.
 * Can be run locally via `npm run bump` or in CI/CD / GitHub Actions during git push/sync.
 */

import fs from 'fs';
import path from 'path';

const versionFilePath = path.resolve('src/version.ts');
const packageJsonPath = path.resolve('package.json');

if (!fs.existsSync(versionFilePath)) {
  console.error('Cannot find src/version.ts');
  process.exit(1);
}

const content = fs.readFileSync(versionFilePath, 'utf-8');

// Match version e.g. APP_VERSION = '1.00.02';
const match = content.match(/export const APP_VERSION = '([0-9]+\.[0-9]+\.[0-9]+)';/);

if (!match) {
  console.error('Could not match APP_VERSION in src/version.ts');
  process.exit(1);
}

const currentVersion = match[1];
const parts = currentVersion.split('.');
const major = parts[0];
const minor = parts[1];
const patch = parseInt(parts[2], 10) + 1;
const newPatchStr = patch < 10 && parts[2].length > 1 ? `0${patch}` : `${patch}`;
const nextVersion = `${major}.${minor}.${newPatchStr}`;
const newBuildTime = new Date().toISOString();

console.log(`Bumping version from ${currentVersion} to ${nextVersion} (Build: ${newBuildTime})...`);

// Replace in version.ts
let newContent = content.replace(
  /export const APP_VERSION = '([0-9]+\.[0-9]+\.[0-9]+)';/,
  `export const APP_VERSION = '${nextVersion}';`
);

newContent = newContent.replace(
  /export const APP_BUILD_TIME = '[^']+';/,
  `export const APP_BUILD_TIME = '${newBuildTime}';`
);

fs.writeFileSync(versionFilePath, newContent, 'utf-8');

// Also update package.json version if present
if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  pkg.version = nextVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}

console.log(`Successfully bumped version to v${nextVersion}!`);
