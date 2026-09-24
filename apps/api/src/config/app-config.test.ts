import { describe, expect, it } from 'vitest';

import { validateEnvironment } from './app-config.js';

describe('development network defaults', () => {
  it('binds to loopback and allows the local H5 origin', () => {
    const config = validateEnvironment({ NODE_ENV: 'development' });
    expect(config.HOST).toBe('127.0.0.1');
    expect(config.CORS_ORIGIN.split(',')).toContain('http://127.0.0.1:5173');
  });

  it('rejects an unsupported bind host', () => {
    expect(() => validateEnvironment({ HOST: 'example.com' })).toThrow();
  });
});
