import { createRequire } from 'node:module';
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  rename,
  rmdir,
  unlink,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const requireFromApi = createRequire(new URL('../../apps/api/package.json', import.meta.url));
const Database = requireFromApi('better-sqlite3');
const BACKUP_NAME = /^mood-record-(\d{8}T\d{9}Z)-[0-9a-f]{32}\.sqlite3$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function isWithin(path, parent) {
  const delta = relative(parent, path);
  return delta === '' || (!delta.startsWith('..') && !isAbsolute(delta));
}

function timestamp(date) {
  return date.toISOString().replaceAll(/[-:.]/g, '');
}

function openExisting(databasePath) {
  return new Database(databasePath, { readonly: true, fileMustExist: true });
}

export function verifyDatabase(databasePath) {
  const database = openExisting(databasePath);
  try {
    const problems = database.pragma('integrity_check', { simple: false });
    if (problems.length !== 1 || problems[0].integrity_check !== 'ok') {
      throw new Error(
        `SQLite integrity_check failed: ${problems.map((row) => row.integrity_check).join('; ')}`,
      );
    }
    const foreignKeyProblems = database.pragma('foreign_key_check', { simple: false });
    if (foreignKeyProblems.length !== 0) {
      throw new Error(`SQLite foreign_key_check failed: ${foreignKeyProblems.length} violation(s)`);
    }
  } finally {
    database.close();
  }
}

export async function createBackup({ databasePath, backupDir, now = new Date() }) {
  const source = await realpath(databasePath);
  await mkdir(backupDir, { recursive: true, mode: 0o700 });
  const destinationDir = await realpath(backupDir);
  if (isWithin(destinationDir, dirname(source))) {
    throw new Error('Backup directory must be outside the online database directory');
  }

  const destination = join(
    destinationDir,
    `mood-record-${timestamp(now)}-${randomUUID().replaceAll('-', '')}.sqlite3`,
  );
  const temporary = `${destination}.partial-${randomUUID()}`;
  const database = openExisting(source);
  try {
    await database.backup(temporary);
    await chmod(temporary, 0o600);
    verifyDatabase(temporary);
    await rename(temporary, destination);
    return destination;
  } finally {
    database.close();
    for (const path of [temporary, `${temporary}-wal`, `${temporary}-shm`]) {
      await unlink(path).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  }
}

export async function restoreDrill({ backupPath, tempRoot = tmpdir() }) {
  const source = await realpath(backupPath);
  const temporaryDir = await mkdtemp(join(resolve(tempRoot), 'mood-record-restore-'));
  const restored = join(temporaryDir, 'restored.sqlite3');
  try {
    await copyFile(source, restored);
    await chmod(restored, 0o600);
    verifyDatabase(restored);
    return { verified: true, backupPath: source };
  } finally {
    for (const path of [restored, `${restored}-wal`, `${restored}-shm`]) {
      await unlink(path).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    await rmdir(temporaryDir);
  }
}

export async function cleanupBackups({
  backupDir,
  now = new Date(),
  retentionDays = 29,
  dryRun = false,
}) {
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 30) {
    throw new Error('retentionDays must be an integer from 1 to 30');
  }
  const directory = await realpath(backupDir);
  if (directory === dirname(directory)) throw new Error('Refusing to clean a filesystem root');
  const cutoff = now.getTime() - retentionDays * DAY_MS;
  const expired = [];
  for (const name of await readdir(directory)) {
    const match = BACKUP_NAME.exec(name);
    if (!match) continue;
    const dateText = match[1];
    const created = Date.parse(
      `${dateText.slice(0, 4)}-${dateText.slice(4, 6)}-${dateText.slice(6, 8)}T${dateText.slice(9, 11)}:${dateText.slice(11, 13)}:${dateText.slice(13, 15)}.${dateText.slice(15, 18)}Z`,
    );
    if (!Number.isFinite(created) || created > cutoff) continue;
    const path = join(directory, name);
    if (!(await lstat(path)).isFile()) continue;
    expired.push(path);
    if (!dryRun) await unlink(path);
  }
  return expired;
}
