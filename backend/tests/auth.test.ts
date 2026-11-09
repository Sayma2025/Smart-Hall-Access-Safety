import request from 'supertest';
import { createApp } from '../src/app';

describe('SHASMS Authentication & Server-Enforced RBAC Test Suite', () => {
  const app = createApp();

  let studentToken: string;
  let gateStaffToken: string;
  let wardenToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // 1. Authenticate Student
    const studentRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student@hall.edu', password: 'student123' });
    studentToken = studentRes.body.token;

    // 2. Authenticate Gate Staff
    const gateRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'gatestaff@hall.edu', password: 'gatestaff123' });
    gateStaffToken = gateRes.body.token;

    // 3. Authenticate Warden
    const wardenRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'warden@hall.edu', password: 'warden123' });
    wardenToken = wardenRes.body.token;

    // 4. Authenticate Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hall.edu', password: 'admin123' });
    adminToken = adminRes.body.token;
  });

  describe('1. Authentication & Login Tests', () => {
    it('should successfully log in with valid student credentials and return signed JWT', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'student@hall.edu', password: 'student123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('role', 'STUDENT');
      expect(res.body.user.email).toBe('student@hall.edu');
    });

    it('should successfully log in with Gate Staff credentials and return GATE_STAFF role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'gatestaff@hall.edu', password: 'gatestaff123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('GATE_STAFF');
    });

    it('should successfully log in with Warden credentials and return WARDEN role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'warden@hall.edu', password: 'warden123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('WARDEN');
    });

    it('should successfully log in with Administrator credentials and return ADMIN role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@hall.edu', password: 'admin123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('ADMIN');
    });

    it('should reject invalid password with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'student@hall.edu', password: 'WrongPassword999!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid credentials/i);
    });

    it('should reject non-existent user with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@hall.edu', password: 'anyPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/No account found/i);
    });
  });

  describe('2. Token Protection & Route Guarding', () => {
    it('should reject requests to protected routes without a token with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/auth/profile');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/No authorization token provided/i);
    });

    it('should reject invalid / malformed token with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should allow authenticated profile retrieval with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('student@hall.edu');
    });
  });

  describe('3. Server-Enforced Role-Based Access Control (RBAC)', () => {
    it('should forbid a Student from accessing Gate Scanner API (requires GATE_STAFF)', async () => {
      const res = await request(app)
        .post('/api/v1/access-logs/scan')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentIdentifier: 'ASH2101001M',
          type: 'ENTRY',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Server-enforced role check failed/i);
      expect(res.body.message).toMatch(/STUDENT/);
    });

    it('should allow Gate Staff to record an access scan', async () => {
      const res = await request(app)
        .post('/api/v1/access-logs/scan')
        .set('Authorization', `Bearer ${gateStaffToken}`)
        .send({
          studentIdentifier: 'ASH2101001M',
          type: 'EXIT',
          remarks: 'Automated test exit scan',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should forbid a Student from reviewing late entries (requires WARDEN/ADMIN)', async () => {
      const res = await request(app)
        .patch('/api/v1/access-logs/65f1a1111111111111111111/review')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'APPROVED_LATE' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Server-enforced role check failed/i);
    });

    it('should forbid Gate Staff from reviewing late entries (requires WARDEN/ADMIN)', async () => {
      const res = await request(app)
        .patch('/api/v1/access-logs/65f1a1111111111111111111/review')
        .set('Authorization', `Bearer ${gateStaffToken}`)
        .send({ status: 'APPROVED_LATE' });

      expect(res.status).toBe(403);
    });

    it('should forbid a Student from accessing Administrator user management', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Server-enforced role check failed/i);
    });

    it('should allow Administrator to access user management', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users).toBeInstanceOf(Array);
    });
  });

  describe('4. Privilege Escalation Prevention & Secure Account Creation', () => {
    it('should strictly enforce STUDENT role during public registration even if client supplies role: ADMIN', async () => {
      const uniqueSuffix = Date.now();
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          studentId: `ASH21${uniqueSuffix.toString().slice(-4)}`,
          fullName: 'Malicious Priv Esc Attempt',
          email: `attacker_${uniqueSuffix}@hall.edu`,
          password: 'secretPassword123',
          role: 'ADMIN', // Attacker attempts to become admin
          roomNumber: 'Room 999',
          phoneNumber: '+8801700000000',
          guardianName: 'Guardian Name',
          guardianPhone: '+8801799999999',
        });

      expect(res.status).toBe(201);
      // Server must have forced role to STUDENT!
      expect(res.body.user.role).toBe('STUDENT');
      expect(res.body.user.role).not.toBe('ADMIN');
    });

    it('should allow Administrator to create staff and warden accounts', async () => {
      const uniqueSuffix = Date.now();
      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Newly Appointed Assistant Warden',
          email: `newwarden_${uniqueSuffix}@hall.edu`,
          password: 'securePassword123',
          role: 'WARDEN',
          hallName: 'Pritilata Waddedar Female Hall',
          phoneNumber: '+8801911999999',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('WARDEN');
    });
  });
});
