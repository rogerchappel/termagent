import path from 'node:path';
import { readJsonFile } from '../lib/fs.js';
import type { SessionFixture } from './types.js';

export async function loadFixture(fixturePath: string): Promise<SessionFixture> {
  const fixture = await readJsonFile<SessionFixture>(path.resolve(fixturePath));
  return fixture;
}
