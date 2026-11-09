import request from 'supertest';
import { createApp } from '../src/app';

describe('SHASMS Health Check API', () => {
  const app = createApp();

  it('GET /health should return 200 and healthy or degraded operational status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('database');
    expect(response.body).toHaveProperty('hallPolicy');
    expect(response.body.hallPolicy).toHaveProperty('curfewTime', '20:00');
  });

  it('GET /api/v1/health should return version and system status', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body.version).toBe('1.0.0');
    expect(response.body).toHaveProperty('uptime');
  });

  it('GET /api/v1/auth/demo-accounts should return evaluation accounts', async () => {
    const response = await request(app).get('/api/v1/auth/demo-accounts');
    expect(response.status).toBe(200);
    expect(response.body.accounts).toBeInstanceOf(Array);
    expect(response.body.accounts.length).toBeGreaterThanOrEqual(4);
  });
});
