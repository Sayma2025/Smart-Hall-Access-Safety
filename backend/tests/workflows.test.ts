import request from 'supertest';
import { createApp } from '../src/app';
import { connectDatabase } from '../src/config/db';
import { LateEntryRequest } from '../src/models/LateEntryRequest';
import { LeaveRequest } from '../src/models/LeaveRequest';
import { EmergencyAlert } from '../src/models/EmergencyAlert';
import { AccessLog } from '../src/models/AccessLog';

describe('SHASMS Three Complete Workflows: Late Entry, Leave Management & Emergency SOS', () => {
  const app = createApp();

  let adminToken: string;
  let wardenToken: string;
  let gateStaffToken: string;
  let student1Token: string;
  let student2Token: string;

  beforeAll(async () => {
    await connectDatabase();

    // Authenticate Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hall.edu', password: 'admin123' });
    adminToken = adminRes.body.token;

    // Authenticate Warden
    const wardenRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'warden@hall.edu', password: 'warden123' });
    wardenToken = wardenRes.body.token;

    // Authenticate Gate Staff
    const gateRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'gatestaff@hall.edu', password: 'gatestaff123' });
    gateStaffToken = gateRes.body.token;

    // Authenticate Student 1
    const s1Res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student@hall.edu', password: 'student123' });
    student1Token = s1Res.body.token;

    // Authenticate Student 2
    const s2Res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student2@hall.edu', password: 'student123' });
    student2Token = s2Res.body.token;

    // Clean up test data
    await LateEntryRequest.deleteMany({});
    await LeaveRequest.deleteMany({});
    await EmergencyAlert.deleteMany({});
  });

  // ==========================================
  // Workflow A: Late Entry Permission
  // ==========================================
  describe('Workflow A: Late Entry Permission', () => {
    let createdLateEntryId: string;

    it('should allow student to submit an advance late entry request with arrival time & reason', async () => {
      const res = await request(app)
        .post('/api/v1/late-entries')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          reason: 'University robotics team presentation preparation at central lab',
          expectedArrivalTime: '22:30',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.lateEntry).toHaveProperty('_id');
      expect(res.body.lateEntry.status).toBe('PENDING');
      expect(res.body.lateEntry.expectedArrivalTime).toBe('22:30');
      expect(res.body.lateEntry.hallCutoffTime).toBeDefined();

      createdLateEntryId = res.body.lateEntry._id;
    });

    it('should reject a duplicate pending late entry request for the same date with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/late-entries')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          reason: 'Duplicate request test',
          expectedArrivalTime: '23:00',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already have a pending late entry/i);
    });

    it('should reject invalid arrival time format with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/late-entries')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          reason: 'Late arrival',
          expectedArrivalTime: '25:99', // Invalid!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should forbid Gate Staff from reviewing late entry permissions with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/v1/late-entries/${createdLateEntryId}/review`)
        .set('Authorization', `Bearer ${gateStaffToken}`)
        .send({
          status: 'APPROVED',
          wardenDecisionNote: 'Unauthorized staff attempt',
        });

      expect(res.status).toBe(403);
    });

    it('should allow Warden to approve late entry request with a decision note', async () => {
      const initialLogsCount = await AccessLog.countDocuments();

      const res = await request(app)
        .patch(`/api/v1/late-entries/${createdLateEntryId}/review`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          status: 'APPROVED',
          wardenDecisionNote: 'Approved for robotics lab work. Ensure return by 22:30.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.lateEntry.status).toBe('APPROVED');
      expect(res.body.lateEntry.wardenDecisionNote).toMatch(/Approved for robotics/);

      // Verify that an approved request does NOT itself create an entry record
      const finalLogsCount = await AccessLog.countDocuments();
      expect(finalLogsCount).toBe(initialLogsCount);
    });

    it('should allow Gate Staff to check the current approved permission for the student', async () => {
      const res = await request(app)
        .get('/api/v1/late-entries/check-permission/ASH2101001M')
        .set('Authorization', `Bearer ${gateStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.hasApprovedPermission).toBe(true);
      expect(res.body.permission).not.toBeNull();
      expect(res.body.permission.status).toBe('APPROVED');
    });

    it('should allow student to cancel their own pending late entry request', async () => {
      // Submit a new request for Student 2
      const submitRes = await request(app)
        .post('/api/v1/late-entries')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          reason: 'Study session at departmental seminar room',
          expectedArrivalTime: '21:30',
        });

      const s2RequestId = submitRes.body.lateEntry._id;

      // Student 2 cancels it
      const cancelRes = await request(app)
        .patch(`/api/v1/late-entries/${s2RequestId}/cancel`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.lateEntry.status).toBe('CANCELLED');

      // Attempting to cancel again should fail
      const cancelAgainRes = await request(app)
        .patch(`/api/v1/late-entries/${s2RequestId}/cancel`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(cancelAgainRes.status).toBe(400);
    });
  });

  // ==========================================
  // Workflow B: Leave Management
  // ==========================================
  describe('Workflow B: Leave Management', () => {
    let leaveId: string;

    it('should allow student to submit leave request with departure, return date, and destination', async () => {
      const departureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
      const expectedReturnDate = new Date(Date.now() + 86400000 * 3).toISOString(); // 3 days later

      const res = await request(app)
        .post('/api/v1/leaves')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          leaveType: 'WEEKEND_HOME',
          reason: 'Family visit over weekend',
          departureDate,
          expectedReturnDate,
          destinationAddress: 'House 42, Road 11, Dhanmondi, Dhaka',
          emergencyContactPhone: '+8801711999999',
          guardianConsentVerified: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.leave.status).toBe('PENDING');
      expect(res.body.leave.destinationAddress).toMatch(/Dhanmondi/);

      leaveId = res.body.leave._id;
    });

    it('should reject leave request if return date is before departure date', async () => {
      const res = await request(app)
        .post('/api/v1/leaves')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          leaveType: 'ACADEMIC',
          reason: 'Conference in Chittagong',
          departureDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          expectedReturnDate: new Date(Date.now() + 86400000).toISOString(), // Before departure!
          destinationAddress: 'Chittagong University Guest House',
          emergencyContactPhone: '+8801711888888',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/after the departure date/i);
    });

    it('should allow student to track their leave requests via /leaves/my-leaves', async () => {
      const res = await request(app)
        .get('/api/v1/leaves/my-leaves')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.leaves).toBeInstanceOf(Array);
      expect(res.body.leaves.length).toBeGreaterThan(0);
    });

    it('should forbid student from approving leave requests with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/v1/leaves/${leaveId}/status`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          status: 'APPROVED_BY_WARDEN',
          wardenRemarks: 'Self-approval attempt',
        });

      expect(res.status).toBe(403);
    });

    it('should allow Warden to approve leave request', async () => {
      const initialLogs = await AccessLog.countDocuments();

      const res = await request(app)
        .patch(`/api/v1/leaves/${leaveId}/status`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          status: 'APPROVED_BY_WARDEN',
          wardenRemarks: 'Guardian phone verification completed. Approved.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.leave.status).toBe('APPROVED_BY_WARDEN');

      // An approved leave request is NOT proof of actual departure (no access log created)
      const afterLogs = await AccessLog.countDocuments();
      expect(afterLogs).toBe(initialLogs);
    });

    it('should allow Gate Staff to see authorized leave permissions', async () => {
      const res = await request(app)
        .get('/api/v1/leaves/authorized-permissions')
        .set('Authorization', `Bearer ${gateStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.authorizedLeaves).toBeInstanceOf(Array);
    });
  });

  // ==========================================
  // Workflow C: Emergency Assistance (SOS)
  // ==========================================
  describe('Workflow C: Emergency Assistance (SOS)', () => {
    let alertId: string;

    it('should allow student to trigger Emergency SOS assistance with category and notes', async () => {
      const res = await request(app)
        .post('/api/v1/sos/trigger')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          alertType: 'MEDICAL',
          location: 'Block B - 3rd Floor Common Room',
          notes: 'Resident having acute allergic reaction, epinephrine needed urgently',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.alert.status).toBe('ACTIVE');
      expect(res.body.alert.alertType).toBe('MEDICAL');
      expect(res.body.alert.actionLog.length).toBeGreaterThan(0);

      alertId = res.body.alert._id;
    });

    it('should allow authorized staff to view active alerts with sensitive information', async () => {
      const res = await request(app)
        .get('/api/v1/sos/active')
        .set('Authorization', `Bearer ${gateStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.alerts).toBeInstanceOf(Array);
      expect(res.body.alerts.length).toBeGreaterThan(0);
      const activeAlert = res.body.alerts.find((a: any) => a._id === alertId);
      expect(activeAlert).toBeDefined();
      expect(activeAlert.resident).toHaveProperty('phoneNumber');
    });

    it('should forbid regular students from viewing all active emergency alerts with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/sos/active')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(403);
    });

    it('should allow student to view their own emergency alert history', async () => {
      const res = await request(app)
        .get('/api/v1/sos/my-alerts')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.alerts).toBeInstanceOf(Array);
      expect(res.body.alerts.length).toBeGreaterThan(0);
    });

    it('should allow authorized staff to acknowledge and dispatch to the alert', async () => {
      const res = await request(app)
        .patch(`/api/v1/sos/${alertId}/acknowledge`)
        .set('Authorization', `Bearer ${gateStaffToken}`)
        .send({
          notes: 'Security Officer Kamal dispatched with first aid kit and oxygen unit',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.alert.status).toBe('ACKNOWLEDGED');
      expect(res.body.alert.acknowledgedBy).toBeDefined();
    });

    it('should reject acknowledging an already acknowledged alert with 400 Bad Request', async () => {
      const res = await request(app)
        .patch(`/api/v1/sos/${alertId}/acknowledge`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({ notes: 'Secondary duplicate acknowledgment' });

      expect(res.status).toBe(400);
    });

    it('should allow authorized staff to resolve the emergency alert with resolution notes', async () => {
      const res = await request(app)
        .patch(`/api/v1/sos/${alertId}/resolve`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          status: 'RESOLVED',
          resolutionNotes: 'University medical team administered treatment. Resident stabilized and resting.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.alert.status).toBe('RESOLVED');
      expect(res.body.alert.resolvedBy).toBeDefined();
    });

    it('should reject resolving an already resolved alert with 400 Bad Request', async () => {
      const res = await request(app)
        .patch(`/api/v1/sos/${alertId}/resolve`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          status: 'RESOLVED',
          resolutionNotes: 'Duplicate close attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already been closed/i);
    });
  });
});

