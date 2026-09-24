import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, test } from 'node:test';

import { cleanupBackups, createBackup, restoreDrill, verifyDatabase } from './sqlite-ops.mjs';

const requireFromApi = createRequire(new URL('../../apps/api/package.json', import.meta.url));
const Database = requireFromApi('better-sqlite3');
const temporaryDirectories = [];

async function sandbox() {
  const path = await mkdtemp(join(tmpdir(), `mood-record-ops-${randomUUID()}-`));
  temporaryDirectories.push(path);
  return path;
}

afterEach(async () => {
  for (const path of temporaryDirectories.splice(0)) {
    assert.ok(resolve(path).startsWith(resolve(tmpdir(), 'mood-record-ops-')));
    await rm(path, { recursive: true, force: true });
  }
});

test('online backup includes uncheckpointed WAL rows and temporary restore is clean', async () => {
  const root = await sandbox();
  const dataDir = join(root, 'data');
  const backupDir = join(root, 'backups');
  await mkdir(dataDir);
  const databasePath = join(dataDir, 'mood-record.sqlite3');
  const database = new Database(databasePath);
  try {
    database.pragma('journal_mode = WAL');
    database.exec('CREATE TABLE example (id INTEGER PRIMARY KEY, text_value TEXT NOT NULL)');
    database.prepare('INSERT INTO example (text_value) VALUES (?)').run('committed in WAL');
    const backupPath = await createBackup({
      databasePath,
      backupDir,
      now: new Date('2026-09-23T10:11:12.345Z'),
    });
    assert.match(backupPath, /mood-record-20260923T101112345Z-[0-9a-f]{32}\.sqlite3$/);
    const backedUp = new Database(backupPath, { readonly: true });
    try {
      assert.equal(
        backedUp.prepare('SELECT text_value FROM example').get().text_value,
        'committed in WAL',
      );
    } finally {
      backedUp.close();
    }
    assert.deepEqual(await restoreDrill({ backupPath, tempRoot: root }), {
      verified: true,
      backupPath,
    });
    assert.deepEqual((await readdir(root)).sort(), ['backups', 'data']);
  } finally {
    database.close();
  }
});

test('integrity check rejects corrupt input and backup cannot sit inside online data directory', async () => {
  const root = await sandbox();
  const dataDir = join(root, 'data');
  await mkdir(dataDir);
  const databasePath = join(dataDir, 'mood-record.sqlite3');
  const database = new Database(databasePath);
  database.exec('CREATE TABLE example (id INTEGER PRIMARY KEY)');
  database.close();
  await assert.rejects(
    createBackup({ databasePath, backupDir: join(dataDir, 'backups') }),
    /outside/,
  );
  const invalidPath = join(root, 'invalid.sqlite3');
  await writeFile(invalidPath, 'not a SQLite database');
  assert.throws(() => verifyDatabase(invalidPath));
  await assert.rejects(restoreDrill({ backupPath: invalidPath, tempRoot: root }));
  assert.deepEqual((await readdir(root)).sort(), ['data', 'invalid.sqlite3']);
});

test('verification catches foreign-key violations left by an unchecked writer', async () => {
  const root = await sandbox();
  const databasePath = join(root, 'invalid-foreign-key.sqlite3');
  const database = new Database(databasePath);
  try {
    database.pragma('foreign_keys = OFF');
    database.exec('CREATE TABLE parent (id INTEGER PRIMARY KEY)');
    database.exec('CREATE TABLE child (parent_id INTEGER REFERENCES parent(id))');
    database.exec('INSERT INTO child (parent_id) VALUES (42)');
  } finally {
    database.close();
  }
  assert.throws(() => verifyDatabase(databasePath), /foreign_key_check failed/);
});

test('cleanup removes only matching backups older than the 29-day default', async () => {
  const root = await sandbox();
  const backupDir = join(root, 'backups');
  await mkdir(backupDir);
  const suffix = 'aabbccddaabbccddaabbccddaabbccdd';
  const old = `mood-record-20260820T120000000Z-${suffix}.sqlite3`;
  const recent = `mood-record-20260901T120000000Z-${suffix}.sqlite3`;
  const unrelated = `other-20260820T120000000Z-${suffix}.sqlite3`;
  for (const name of [old, recent, unrelated]) await writeFile(join(backupDir, name), 'fixture');
  const now = new Date('2026-09-23T12:00:00.000Z');
  const canonicalDir = await realpath(backupDir);
  assert.deepEqual(await cleanupBackups({ backupDir, now, dryRun: true }), [
    join(canonicalDir, old),
  ]);
  assert.equal((await readdir(backupDir)).length, 3);
  assert.deepEqual(await cleanupBackups({ backupDir, now }), [join(canonicalDir, old)]);
  assert.deepEqual((await readdir(backupDir)).sort(), [recent, unrelated].sort());
  await assert.rejects(cleanupBackups({ backupDir, retentionDays: 31 }), /1 to 30/);
});

test('cleanup CLI rejects unknown flags instead of deleting backups', async () => {
  const root = await sandbox();
  const backupDir = join(root, 'backups');
  await mkdir(backupDir);
  const old = 'mood-record-20200101T000000000Z-aabbccddaabbccddaabbccddaabbccdd.sqlite3';
  await writeFile(join(backupDir, old), 'fixture');

  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('./sqlite-ops-cli.mjs', import.meta.url)),
      'cleanup',
      '--backup-dir',
      backupDir,
      '--dry-rnu',
      'yes',
    ],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 1);
  assert.deepEqual(await readdir(backupDir), [old]);
});
