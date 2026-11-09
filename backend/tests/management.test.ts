import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase } from '../src/config/db';

describe('SHASMS Student, Hall, Room & Gate Management Test Suite', () => {
  const app = createApp();

  let adminToken: string;
  let gateStaffToken: string;
  let studentToken: string;
  let wardenToken: string;

  beforeAll(async () => {
    // Connect to MongoDB for real-data test execution
    await connectDatabase();

    // Authenticate Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hall.edu', password: 'admin123' });
    adminToken = adminRes.body.token;

    // Authenticate Gate Staff
    const gateRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'gatestaff@hall.edu', password: 'gatestaff123' });
    gateStaffToken = gateRes.body.token;

    // Authenticate Student
    const studentRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student@hall.edu', password: 'student123' });
    studentToken = studentRes.body.token;

    // Authenticate Warden
    const wardenRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'warden@hall.edu', password: 'warden123' });
    wardenToken = wardenRes.body.token;
  });

  describe('1. Duplicate IDs & Conflict Prevention', () => {
    it('should reject registration with an existing student ID with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          studentId: 'ASH2101001M', // Already belongs to Nusrat Jahan
          fullName: 'Duplicate Student Attempt',
          email: 'newunique@hall.edu',
          password: 'password123',
          roomNumber: 'Room 101',
          phoneNumber: '+8801700000000',
          guardianName: 'Guardian Name',
          guardianPhone: '+8801799999999',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Student ID/i);
    });

    it('should reject creating a hall with a duplicate code with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/halls')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Another Hall Name',
          code: 'PWH', // Already belongs to Pritilata Waddedar Hall
          capacity: 400,
          curfewTime: '20:00',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject creating a gate with a duplicate code with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/gates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Gate',
          code: 'GATE-01', // Already exists
          location: 'South Perimeter',
          gateType: 'PEDESTRIAN',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  describe('2. Input Validation Tests', () => {
    it('should reject hall creation with invalid curfew time format with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/halls')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Curfew Hall',
          code: 'ICH',
          capacity: 300,
          curfewTime: '25:99', // Invalid hour and minute
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('errors');
    });

    it('should reject gate creation with missing required fields with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/gates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // missing name and code
          location: 'South Perimeter',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject room creation with invalid capacity with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          hallId: '65f1a1111111111111111111',
          roomNumber: '999',
          block: 'Block C',
          capacity: -5, // Invalid negative capacity
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Role-Based Access Control on Management Endpoints', () => {
    it('should forbid Student from creating halls with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/halls')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Hacked Hall',
          code: 'HH1',
          capacity: 200,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should forbid Gate Staff from creating rooms with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${gateStaffToken}`)
        .send({
          hallId: '65f1a1111111111111111111',
          roomNumber: '102',
          block: 'Block A',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should forbid Student from accessing all students list with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('4. Student Search, Verification & Projections', () => {
    it('should return sanitized verification fields when Gate Staff queries students', async () => {
      const res = await request(app)
        .get('/api/v1/students?search=Nusrat')
        .set('Authorization', `Bearer ${gateStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.students).toBeInstanceOf(Array);
      expect(res.body.students.length).toBeGreaterThan(0);

      const student = res.body.students[0];
      expect(student).toHaveProperty('studentId');
      expect(student).toHaveProperty('fullName');
      expect(student).toHaveProperty('currentStatus');
      expect(student).toHaveProperty('department');
      // Gate staff must NOT see passwordHash or private student email
      expect(student).not.toHaveProperty('passwordHash');
      expect(student).not.toHaveProperty('email');
    });

    it('should allow Student to view their own profile and history', async () => {
      const res = await request(app)
        .get('/api/v1/students/my/profile')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.student).toHaveProperty('studentId');
      expect(res.body).toHaveProperty('recentLogs');
      expect(res.body).toHaveProperty('recentLeaves');
    });
  });

  describe('5. Real Dynamic MongoDB Dashboard Stats', () => {
    it('should return live dynamic statistics from MongoDB collections', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats).toHaveProperty('totalStudents');
      expect(res.body.stats).toHaveProperty('studentsInside');
      expect(res.body.stats).toHaveProperty('studentsOutside');
      expect(res.body.stats).toHaveProperty('infrastructure');
      expect(res.body.stats.infrastructure).toHaveProperty('totalHalls');
      expect(res.body.stats.infrastructure).toHaveProperty('totalRooms');
      expect(res.body.stats.infrastructure).toHaveProperty('totalGates');
      expect(typeof res.body.stats.totalStudents).toBe('number');
    });
  });

  describe('6. Gate Scan Automatic INSIDE/OUTSIDE Status Update', () => {
    it('should automatically update student status to OUTSIDE upon EXIT scan', async () => {
      const scanRes = await request(app)
        .post('/api/v1/access-logs/scan')
        .set('Authorization', `Bearer ${gateStaffToken}`)
        .send({
          studentIdentifier: 'ASH2101001M',
          type: 'EXIT',
          remarks: 'Automated test exit movement',
        });

      expect(scanRes.status).toBe(201);
      expect(scanRes.body.log.resident.currentStatus).toBe('OUTSIDE');

      // Verify the student profile reflects OUTSIDE
      const profileRes = await request(app)
        .get('/api/v1/students/my/profile')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(profileRes.body.student.currentStatus).toBe('OUTSIDE');
    });

    it('should automatically update student status to INSIDE upon ENTRY scan', async () => {
      const scanRes = await request(app)
        .post('/api/v1/access-logs/scan')
        .set('Authorization', `Bearer ${gateStaffToken}`)
        .send({
          studentIdentifier: 'ASH2101001M',
          type: 'ENTRY',
          remarks: 'Automated test return movement',
        });

      expect(scanRes.status).toBe(201);
      expect(scanRes.body.log.resident.currentStatus).toBe('INSIDE');
    });
  });
});
