import 'reflect-metadata';

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('real SQLite mood flow', () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'mood-record-e2e-'));
  let app: INestApplication;
  let database: DataSource;
  let tokenA: string;
  let tokenB: string;

  const create = (token: string, torque: number, id = randomUUID()) =>
    request(app.getHttpServer())
      .post('/v1/moods')
      .set('Authorization', `Bearer ${token}`)
      .send({ torque, timezoneOffsetMinutes: -480, clientMutationId: id });

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEV_AUTH = 'true';
    process.env.DATABASE_PATH = join(temporaryDirectory, 'test.sqlite3');
    process.env.JWT_SECRET = 'integration-test-secret-00000000000000000';
    process.env.DEV_AUTH_PEPPER = 'integration-pepper';
    const { AppModule } = await import('../src/app.module.js');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    database = app.get(DataSource);
    const config = app.get(ConfigService);
    expect(config.get('NODE_ENV')).toBe('development');
    expect(config.get('ENABLE_DEV_AUTH')).toBe(true);
    const first = await request(app.getHttpServer())
      .post('/v1/auth/dev/session')
      .send({ testUserCode: 'alice' })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/v1/auth/dev/session')
      .send({ testUserCode: 'bob' })
      .expect(201);
    tokenA = first.body.accessToken as string;
    tokenB = second.body.accessToken as string;
  });

  afterAll(async () => {
    await app?.close();
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('runs explicit migration and SQLite safety pragmas', async () => {
    const [mode] = (await database.query('PRAGMA journal_mode')) as [{ journal_mode: string }];
    const [foreignKeys] = (await database.query('PRAGMA foreign_keys')) as [
      { foreign_keys: number },
    ];
    const [busyTimeout] = (await database.query('PRAGMA busy_timeout')) as [{ timeout: number }];
    expect(mode.journal_mode).toBe('wal');
    expect(foreignKeys.foreign_keys).toBe(1);
    expect(busyTimeout.timeout).toBe(5000);
    expect(await database.showMigrations()).toBe(false);
  });

  it('stores every submission, deduplicates retries, excludes self, and blocks resurrection', async () => {
    const id = randomUUID();
    const savedA = await create(tokenA, -61, id).expect(201);
    const recordA = savedA.body.record.id as string;
    expect(savedA.body.record.moodBand).toBe('VERY_LOW');
    expect(savedA.body.resonance).toMatchObject({ baseCount: 0, displayCount: null });

    const replay = await create(tokenA, -61, id).expect(201);
    expect(replay.body.record.id).toBe(recordA);
    expect(replay.body.idempotentReplay).toBe(true);

    await create(tokenA, -100).expect(201);
    const savedB = await create(tokenB, -70).expect(201);
    expect(savedB.body.resonance).toMatchObject({ baseCount: 1, displayCount: 10 });
    await create(tokenA, -95).expect(201);
    const resonanceB = await request(app.getHttpServer())
      .get('/v1/resonance?moodBand=VERY_LOW&range=TODAY&timezoneOffsetMinutes=-480')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(resonanceB.body.baseCount).toBe(1);

    const todayB = await request(app.getHttpServer())
      .get('/v1/moods/today?timezoneOffsetMinutes=-480')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(todayB.body.records).toHaveLength(1);

    const foreignDelete = await request(app.getHttpServer())
      .delete(`/v1/moods/${recordA}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(foreignDelete.body.deleted).toBe(false);

    await request(app.getHttpServer())
      .delete(`/v1/moods/${recordA}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const repeatDelete = await request(app.getHttpServer())
      .delete(`/v1/moods/${recordA}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(repeatDelete.body.deleted).toBe(false);
    expect((await create(tokenA, -61, id).expect(409)).body.code).toBe('MUTATION_REVERSED');
    const afterDelete = await request(app.getHttpServer())
      .get('/v1/resonance?moodBand=VERY_LOW&range=TODAY&timezoneOffsetMinutes=-480')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(afterDelete.body.baseCount).toBe(1);
  });

  it('rejects unknown ranges and malformed values', async () => {
    await request(app.getHttpServer())
      .get('/v1/resonance?moodBand=CALM&range=LAST_WEEK&timezoneOffsetMinutes=-480')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400);
    await create(tokenA, 101).expect(400);
  });

  it('exports only own CSV, clears and revokes a deleted identity', async () => {
    const exportA = await request(app.getHttpServer())
      .get('/v1/me/export.csv')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(exportA.text.charCodeAt(0)).toBe(0xfeff);
    expect(exportA.text).toContain('很低落');
    expect(exportA.text).not.toContain('Bearer');

    const exportB = await request(app.getHttpServer())
      .get('/v1/me/export.csv')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(exportB.text.split('\r\n')).toHaveLength(3);

    const weekly = await request(app.getHttpServer())
      .get('/v1/review/weekly?timezoneOffsetMinutes=-480')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(weekly.body.days).toHaveLength(7);

    await request(app.getHttpServer())
      .delete('/v1/me/moods')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const today = await request(app.getHttpServer())
      .get('/v1/moods/today?timezoneOffsetMinutes=-480')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(today.body.records).toHaveLength(0);

    await request(app.getHttpServer())
      .delete('/v1/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/v1/moods/today?timezoneOffsetMinutes=-480')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(401);
  });
});
