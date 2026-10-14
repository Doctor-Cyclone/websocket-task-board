import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { storedBoardsSchema, type StoredBoards } from './storageSchema.js';

export const DEFAULT_STORAGE_PATH = fileURLToPath(new URL('../data/boards.json', import.meta.url));

export function loadBoards(path: string): StoredBoards {
  if (!existsSync(path)) return { formatVersion: 1, rooms: [] };

  // Invalid files stop startup instead of silently replacing existing data.
  return storedBoardsSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

export function saveBoards(path: string, boards: StoredBoards): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(boards, null, 2), 'utf8');
  renameSync(temporaryPath, path);
}
