import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const MAXIMUM_LINES_PER_FILE = 500;

const stylesheetEntries = (await readdir('src', { recursive: true }))
  .filter((path) => path.endsWith('.css'))
  .map((path) => join('src', path));

const countNonBlankLines = async (path) =>
  (await readFile(path, 'utf8')).split('\n').filter((line) => line.trim()).length;

const oversizedFiles = [];
for (const path of stylesheetEntries) {
  const lines = await countNonBlankLines(path);
  if (lines > MAXIMUM_LINES_PER_FILE) {
    oversizedFiles.push(`${path}: ${lines} lines (maximum ${MAXIMUM_LINES_PER_FILE})`);
  }
}

if (oversizedFiles.length > 0) {
  console.error(oversizedFiles.join('\n'));
  process.exitCode = 1;
}
