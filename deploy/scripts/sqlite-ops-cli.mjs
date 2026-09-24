#!/usr/bin/env node
import { cleanupBackups, createBackup, restoreDrill, verifyDatabase } from './sqlite-ops.mjs';

function usage() {
  throw new Error(
    'Usage: node deploy/scripts/sqlite-ops-cli.mjs backup --db PATH --backup-dir DIR | verify --db PATH | restore-drill --backup PATH [--temp-root DIR] | cleanup --backup-dir DIR [--dry-run]',
  );
}

function options(args) {
  const result = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!flag.startsWith('--') || result.has(flag)) usage();
    if (flag === '--dry-run') {
      result.set(flag, true);
    } else {
      const value = args[++index];
      if (!value || value.startsWith('--')) usage();
      result.set(flag, value);
    }
  }
  return result;
}

function required(args, flag) {
  const value = args.get(flag);
  if (typeof value !== 'string') usage();
  return value;
}

function allowOnly(args, allowed) {
  for (const flag of args.keys()) {
    if (!allowed.includes(flag)) usage();
  }
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = options(rest);
  switch (command) {
    case 'backup': {
      allowOnly(args, ['--db', '--backup-dir']);
      const path = await createBackup({
        databasePath: required(args, '--db'),
        backupDir: required(args, '--backup-dir'),
      });
      console.log(`Verified online backup: ${path}`);
      break;
    }
    case 'verify':
      allowOnly(args, ['--db']);
      verifyDatabase(required(args, '--db'));
      console.log('SQLite integrity and foreign keys: ok');
      break;
    case 'restore-drill': {
      allowOnly(args, ['--backup', '--temp-root']);
      const result = await restoreDrill({
        backupPath: required(args, '--backup'),
        tempRoot: args.get('--temp-root'),
      });
      console.log(`Temporary restore verified: ${result.backupPath}`);
      break;
    }
    case 'cleanup': {
      allowOnly(args, ['--backup-dir', '--dry-run']);
      const deleted = await cleanupBackups({
        backupDir: required(args, '--backup-dir'),
        dryRun: args.has('--dry-run'),
      });
      console.log(
        `${args.has('--dry-run') ? 'Would remove' : 'Removed'} ${deleted.length} expired backup(s)`,
      );
      break;
    }
    default:
      usage();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
