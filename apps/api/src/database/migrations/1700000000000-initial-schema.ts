import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        auth_provider TEXT NOT NULL CHECK(auth_provider IN ('DEV', 'WECHAT')),
        provider_subject_hash TEXT NOT NULL UNIQUE,
        data_environment TEXT NOT NULL CHECK(data_environment IN ('TEST', 'LIVE')),
        created_at_utc DATETIME NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mood_records (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        torque INTEGER NOT NULL CHECK(torque BETWEEN -100 AND 100),
        mood_band TEXT NOT NULL CHECK(mood_band IN ('VERY_LOW', 'LOW', 'CALM', 'HAPPY', 'VERY_HAPPY')),
        occurred_at_utc DATETIME NOT NULL,
        timezone_offset_minutes INTEGER NOT NULL CHECK(timezone_offset_minutes BETWEEN -840 AND 840),
        client_mutation_id TEXT NOT NULL,
        created_at_utc DATETIME NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT fk_mood_records_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT uq_mood_records_user_mutation UNIQUE(user_id, client_mutation_id)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_mood_records_user_occurred ON mood_records(user_id, occurred_at_utc)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_mood_records_band_occurred_user ON mood_records(mood_band, occurred_at_utc, user_id)',
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mutation_receipts (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        client_mutation_id TEXT NOT NULL,
        record_id TEXT,
        state TEXT NOT NULL CHECK(state IN ('ACTIVE', 'REVERSED')),
        expires_at_utc DATETIME NOT NULL,
        CONSTRAINT fk_mutation_receipts_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT uq_mutation_receipts_user_mutation UNIQUE(user_id, client_mutation_id)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_mutation_receipts_expires ON mutation_receipts(expires_at_utc)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS mutation_receipts');
    await queryRunner.query('DROP TABLE IF EXISTS mood_records');
    await queryRunner.query('DROP TABLE IF EXISTS users');
  }
}
