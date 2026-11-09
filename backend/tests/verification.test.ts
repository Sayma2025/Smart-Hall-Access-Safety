import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app';
import { connectDatabase } from '../src/config/db';
import { User } from '../src/models/User';
import { EnrolledDevice } from '../src/models/EnrolledDevice';
import { VerificationSession } from '../src/models/VerificationSession';
import { AccessLog } from '../src/models/AccessLog';

describe('SHASMS Core Verification Feature: Cryptographic Device & Gate Session Suite', () => {
  const app = createApp();

  let adminToken: string;
  let gateStaffToken: string;
  let student1Token: string;
  let student2Token: string;
  let student1User: any;
  let student2User: any;

  // Key pair generated for Student 1 in tests
  let student1KeyPair: { publicKey: crypto.KeyObject; privateKey: crypto.KeyObject };
  let student1PubPem: string;
  let student1DeviceId: string;

  beforeAll(async () => {
    await connectDatabase();

    // Generate fresh ECDSA P-256 key pair for test execution
    student1KeyPair = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    student1PubPem = student1KeyPair.publicKey.export({ type: 'spki', format: 'pem' }) as string;

    // 1. Authenticate Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hall.edu', password: 'admin123' });
    adminToken = adminRes.body.token;

    // 2. Authenticate Gate Staff
    const gateRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'gatestaff@hall.edu', password: 'gatestaff123' });
    gateStaffToken = gateRes.body.token;

    // 3. Authenticate Student 1 (Nusrat - starts INSIDE)
    const s1Res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student@hall.edu', password: 'student123' });
    student1Token = s1Res.body.token;
    student1User = s1Res.body.user;

    // 4. Authenticate Student 2 (Samia - starts OUTSIDE)
    const s2Res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student2@hall.edu', password: 'student123' });
    student2Token = s2Res.body.token;
    student2User = s2Res.body.user;

    // Clean up any stale verification sessions for test isolation
    await VerificationSession.deleteMany({});
  });

  describe('1. Device Enrollment & Password Re-Authentication', () => {
    it('should reject device enrollment if password re-authentication fails', async () => {
      const res = await request(app)
        .post('/api/v1/devices/enroll')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          deviceName: 'Attacker Imposter Device',
          publicKey: student1PubPem,
          password: 'WRONG_PASSWORD',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Re-authentication failed/i);
    });

    it('should reject device enrollment with malformed public key', async () => {
      const res = await request(app)
        .post('/api/v1/devices/enroll')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          deviceName: 'Broken Key Device',
          publicKey: 'THIS_IS_NOT_A_VALID_CRYPTOGRAPHIC_KEY',
          password: 'student123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/public key/i);
    });

    it('should successfully enroll a cryptographic device with correct password re-authentication', async () => {
      const res = await request(app)
        .post('/api/v1/devices/enroll')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          deviceName: "Nusrat's Automated Test iPhone",
          publicKey: student1PubPem,
          password: 'student123',
          platformInfo: 'Jest Automated Test Runner / Node.js Crypto',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.device).toHaveProperty('deviceId');
      expect(res.body.device.status).toBe('ACTIVE');

      student1DeviceId = res.body.device.deviceId;
    });

    it('should allow student to list their enrolled devices', async () => {
      const res = await request(app)
        .get('/api/v1/devices/my')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.devices).toBeInstanceOf(Array);
      expect(res.body.devices.length).toBeGreaterThan(0);
      const enrolled = res.body.devices.find((d: any) => d.deviceId === student1DeviceId);
      expect(enrolled).toBeDefined();
      expect(enrolled.status).toBe('ACTIVE');
    });
  });

  describe('2. Verification Session Initiation & Role Restrictions', () => {
    it('should forbid a Student from initiating a verification session with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/verification/sessions/initiate')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          studentIdentifier: 'ASH2101001M',
          requestedMovement: 'EXIT',
        });

      expect(res.status).toBe(403);
    });

    it('should allow Gate Staff to initiate an EXIT request for Student 1 (currently INSIDE)', async () => {
      // Ensure student1 is recorded as INSIDE
      await User.findByIdAndUpdate(student1User.id, { currentStatus: 'INSIDE' });

      const res = await request(app)
        .post('/api/v1/verification/sessions/initiate')
        .set('Authorization', `Bearer ${gateStaffToken}`)
        .send({
          studentIdentifier: 'ASH2101001M',
          requestedMovement: 'EXIT',
          remarks: 'Going to university library for evening studies',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.session).toHaveProperty('challenge');
      expect(res.body.session.requestedMovement).toBe('EXIT');
      expect(res.body.session).toHaveProperty('expiresAt');
    });
  });

  describe('3. Concurrency, Duplicate Requests & Invalid State Transitions', () => {
    it('should reject a second concurrent verification session for the same student with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/verification/sessions/initiate')
        .set('Authorization', `Bearer ${gateStaffToken}`)
        .send({
          studentIdentifier: 'ASH2101001M',
          requestedMovement: 'EXIT',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already pending/i);
    });

    it('should reject invalid state transition: cannot record ENTRY if already INSIDE', async () => {
      // Clear pending session first
      await VerificationSession.deleteMany({ student: student1User.id });
      await User.findByIdAndUpdate(student1User.id, { currentStatus: 'INSIDE' });

      const res = await request(app)
        .post('/api/v1/verification/sessions/initiate')
        .set('Authorization', `Bearer ${gateStaffToken}`)
        .send({
          studentIdentifier: 'ASH2101001M',
          requestedMovement: 'ENTRY', // Invalid because already INSIDE!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already recorded as INSIDE/i);
    });

    it('should reject invalid state transition: cannot record EXIT if already OUTSIDE', async () => {
      // Student 2 is recorded as OUTSIDE
      await User.findByIdAndUpdate(student2User.id, { currentStatus: 'OUTSIDE' });

      const res = await request(app)
        .post('/api/v1/verification/sessions/initiate')
        .set('Authorization', `Bearer ${gateStaffToken}`)
        .send({
          studentIdentifier: 'ASH2101002F',
          requestedMovement: 'EXIT', // Invalid because already OUTSIDE!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already recorded as OUTSIDE/i);
    });
  });

  describe('4. Cryptographic Approval, Movement Logging & Status Update', () => {
    let activeSessionId: string;
    let challenge: string;

    beforeEach(async () => {
      await VerificationSession.deleteMany({ student: student1User.id });
      await User.findByIdAndUpdate(student1User.id, { currentStatus: 'INSIDE' });

      const initRes = await request(app)
        .post('/api/v1/verification/sessions/initiate')
        .set('Authorization', `Bearer ${gateStaffToken}`)
        .send({
          studentIdentifier: 'ASH2101001M',
          requestedMovement: 'EXIT',
        });

      activeSessionId = initRes.body.session._id;
      challenge = initRes.body.session.challenge;
    });

    it('should reject approval with a tampered / invalid cryptographic signature with 401 Unauthorized', async () => {
      const res = await request(app)
        .post(`/api/v1/verification/sessions/${activeSessionId}/approve`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          deviceId: student1DeviceId,
          signature: Buffer.from('TAMPERED_INVALID_SIGNATURE_STRING').toString('hex'),
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/signature verification failed/i);
    });

    it('should reject approval attempt by an unauthorized student with 403 Forbidden', async () => {
      // Student 2 tries to sign Student 1's request
      const signature = crypto
        .sign('SHA256', Buffer.from(challenge), student1KeyPair.privateKey)
        .toString('hex');

      const res = await request(app)
        .post(`/api/v1/verification/sessions/${activeSessionId}/approve`)
        .set('Authorization', `Bearer ${student2Token}`) // Student 2!
        .send({
          deviceId: student1DeviceId,
          signature,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Unauthorized approval attempt/i);
    });

    it('should successfully verify valid ECDSA signature, record movement log, and update presence to OUTSIDE', async () => {
      // Legitimate cryptographic signature over the exact challenge using student's private key
      const signature = crypto
        .sign('SHA256', Buffer.from(challenge), student1KeyPair.privateKey)
        .toString('hex');

      const res = await request(app)
        .post(`/api/v1/verification/sessions/${activeSessionId}/approve`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          deviceId: student1DeviceId,
          signature,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.session.status).toBe('APPROVED');
      expect(res.body).toHaveProperty('log');
      expect(res.body.log.type).toBe('EXIT');

      // Verify Student 1's presence status is now OUTSIDE
      const updatedUser = await User.findById(student1User.id);
      expect(updatedUser?.currentStatus).toBe('OUTSIDE');

      // Verify AccessLog exists in database
      const logInDb = await AccessLog.findById(res.body.log._id);
      expect(logInDb).not.toBeNull();
      expect(logInDb?.type).toBe('EXIT');
    });

    it('should prevent replay attack: cannot approve an already resolved session with 409 Conflict', async () => {
      const signature = crypto
        .sign('SHA256', Buffer.from(challenge), student1KeyPair.privateKey)
        .toString('hex');

      // First approval
      await request(app)
        .post(`/api/v1/verification/sessions/${activeSessionId}/approve`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ deviceId: student1DeviceId, signature });

      // Second replay attempt
      const replayRes = await request(app)
        .post(`/api/v1/verification/sessions/${activeSessionId}/approve`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ deviceId: student1DeviceId, signature });

      expect(replayRes.status).toBe(409);
      expect(replayRes.body.success).toBe(false);
      expect(replayRes.body.message).toMatch(/Replay attack prevented/i);
    });
  });

  describe('5. Explicit Denial Workflow', () => {
    let denialSessionId: string;

    beforeEach(async () => {
      await VerificationSession.deleteMany({ student: student1User.id });
      await User.findByIdAndUpdate(student1User.id, { currentStatus: 'INSIDE' });

      const initRes = await request(app)
        .post('/api/v1/verification/sessions/initiate')
        .set('Authorization', `Bearer ${gateStaffToken}`)
        .send({
          studentIdentifier: 'ASH2101001M',
          requestedMovement: 'EXIT',
        });

      denialSessionId = initRes.body.session._id;
    });

    it('should allow student to explicitly deny the request, leaving presence status unchanged', async () => {
      const res = await request(app)
        .post(`/api/v1/verification/sessions/${denialSessionId}/deny`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ reason: 'I did not request gate exit; security alert!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.session.status).toBe('DENIED');

      // Check student presence remains INSIDE
      const user = await User.findById(student1User.id);
      expect(user?.currentStatus).toBe('INSIDE');

      // Ensure no movement log was created
      const logs = await AccessLog.find({ resident: student1User.id, createdAt: { $gt: new Date(Date.now() - 5000) } });
      const exitLogs = logs.filter(l => l.remarks?.includes('I did not request'));
      expect(exitLogs.length).toBe(0);
    });
  });

  describe('6. Expiration Defense & Device Revocation', () => {
    it('should reject approval of an expired session with 400 Bad Request', async () => {
      await VerificationSession.deleteMany({ student: student1User.id });
      await User.findByIdAndUpdate(student1User.id, { currentStatus: 'INSIDE' });

      // Create an expired session in DB
      const expiredSession = await VerificationSession.create({
        sessionToken: 'VS-EXPIRED-' + Date.now(),
        student: student1User.id,
        initiatedBy: student1User.id,
        requestedMovement: 'EXIT',
        challenge: 'expiredchallenge123',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 10000), // 10 seconds ago
      });

      const signature = crypto
        .sign('SHA256', Buffer.from(expiredSession.challenge), student1KeyPair.privateKey)
        .toString('hex');

      const res = await request(app)
        .post(`/api/v1/verification/sessions/${expiredSession._id}/approve`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          deviceId: student1DeviceId,
          signature,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired/i);
    });

    it('should forbid approval when using a revoked device credential', async () => {
      // Find the device and revoke it
      const device = await EnrolledDevice.findOne({ deviceId: student1DeviceId });
      expect(device).not.toBeNull();

      await request(app)
        .patch(`/api/v1/devices/${device?._id}/revoke`)
        .set('Authorization', `Bearer ${student1Token}`);

      // Initiate a new session
      await VerificationSession.deleteMany({ student: student1User.id });
      await User.findByIdAndUpdate(student1User.id, { currentStatus: 'INSIDE' });

      // Enroll another device so student can initiate session
      const tempKey = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
      await request(app)
        .post('/api/v1/devices/enroll')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          deviceName: 'Backup iPad',
          publicKey: tempKey.publicKey.export({ type: 'spki', format: 'pem' }) as string,
          password: 'student123',
        });

      const initRes = await request(app)
        .post('/api/v1/verification/sessions/initiate')
        .set('Authorization', `Bearer ${gateStaffToken}`)
        .send({
          studentIdentifier: 'ASH2101001M',
          requestedMovement: 'EXIT',
        });

      const sessionId = initRes.body.session._id;
      const challenge = initRes.body.session.challenge;
      const signature = crypto
        .sign('SHA256', Buffer.from(challenge), student1KeyPair.privateKey)
        .toString('hex');

      // Attempt to approve using the REVOKED deviceId
      const approveRes = await request(app)
        .post(`/api/v1/verification/sessions/${sessionId}/approve`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          deviceId: student1DeviceId, // Revoked!
          signature,
        });

      expect(approveRes.status).toBe(403);
      expect(approveRes.body.success).toBe(false);
      expect(approveRes.body.message).toMatch(/REVOKED/i);
    });
  });

  describe('7. Polling Fallback & Pending Session Retrieval', () => {
    it('should allow polling session status at /verification/sessions/:id/status', async () => {
      await VerificationSession.deleteMany({ student: student1User.id });
      const initRes = await request(app)
        .post('/api/v1/verification/sessions/initiate')
        .set('Authorization', `Bearer ${gateStaffToken}`)
        .send({
          studentIdentifier: 'ASH2101001M',
          requestedMovement: 'EXIT',
        });

      const sessionId = initRes.body.session._id;

      const statusRes = await request(app)
        .get(`/api/v1/verification/sessions/${sessionId}/status`)
        .set('Authorization', `Bearer ${gateStaffToken}`);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.session.status).toBe('PENDING');
      expect(statusRes.body.session).toHaveProperty('expiresAt');
    });

    it('should allow student to query pending session at /verification/sessions/pending-for-me', async () => {
      const res = await request(app)
        .get('/api/v1/verification/sessions/pending-for-me')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pendingSession).not.toBeNull();
      expect(res.body.pendingSession.status).toBe('PENDING');
    });
  });
});

