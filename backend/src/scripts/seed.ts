import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User';
import { AccessLog } from '../models/AccessLog';
import { LeaveRequest } from '../models/LeaveRequest';
import { EmergencyAlert } from '../models/EmergencyAlert';
import { LateEntryRequest } from '../models/LateEntryRequest';
import { Hall } from '../models/Hall';
import { Room } from '../models/Room';
import { Gate } from '../models/Gate';
import { EnrolledDevice } from '../models/EnrolledDevice';
import { VerificationSession } from '../models/VerificationSession';
import { config } from '../config/env';

async function seedDatabase() {
  console.log('================================================================');
  console.log('🌱  SHASMS Comprehensive Seeder: Students, Halls, Rooms & Gates');
  console.log(`📍  Target URI: ${config.mongodbUri.replace(/:([^:@]+)@/, ':****@')}`);
  console.log('================================================================');

  try {
    await mongoose.connect(config.mongodbUri);
    console.log('[Seed] Connected to MongoDB database successfully.');

    // 1. Clear existing collections
    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      AccessLog.deleteMany({}),
      LeaveRequest.deleteMany({}),
      EmergencyAlert.deleteMany({}),
      LateEntryRequest.deleteMany({}),
      Hall.deleteMany({}),
      Room.deleteMany({}),
      Gate.deleteMany({}),
      EnrolledDevice.deleteMany({}),
      VerificationSession.deleteMany({}),
    ]);

    // 2. Hash passwords with bcrypt (Minimum 10 rounds) - NEVER STORE PLAINTEXT!
    const studentPasswordHash = await bcrypt.hash('student123', 10);
    const gateStaffPasswordHash = await bcrypt.hash('gatestaff123', 10);
    const wardenPasswordHash = await bcrypt.hash('warden123', 10);
    const adminPasswordHash = await bcrypt.hash('admin123', 10);

    // 3. Create Hall
    console.log('[Seed] Creating primary residential hall...');
    const hall = await Hall.create({
      name: 'Pritilata Waddedar Female Residential Hall',
      code: 'PWH',
      gender: 'FEMALE',
      capacity: 650,
      provostName: 'Dr. Sultana Razia',
      curfewTime: '20:00',
      lateGraceMinutes: 15,
      isActive: true,
    });

    // 4. Create Rooms
    console.log('[Seed] Creating residential rooms...');
    const room304 = await Room.create({
      hall: hall._id,
      roomNumber: '304',
      block: 'Block B',
      floor: 3,
      capacity: 4,
      occupiedCount: 2,
      status: 'AVAILABLE',
    });

    const room210 = await Room.create({
      hall: hall._id,
      roomNumber: '210',
      block: 'Block A',
      floor: 2,
      capacity: 4,
      occupiedCount: 1,
      status: 'AVAILABLE',
    });

    await Room.create({
      hall: hall._id,
      roomNumber: '305',
      block: 'Block B',
      floor: 3,
      capacity: 4,
      occupiedCount: 0,
      status: 'AVAILABLE',
    });

    // 5. Create Gates
    console.log('[Seed] Configuring access gates...');
    const mainGate = await Gate.create({
      name: 'Main Pedestrian Terminal Station 1',
      code: 'GATE-01',
      hall: hall._id,
      location: 'East Perimeter Entrance',
      gateType: 'PEDESTRIAN',
      status: 'ACTIVE',
      notes: 'Equipped with digital barcode/QR scanner',
    });

    await Gate.create({
      name: 'West Vehicular & Emergency Access Gate',
      code: 'GATE-02',
      hall: hall._id,
      location: 'West Perimeter Highway Road',
      gateType: 'VEHICULAR',
      status: 'ACTIVE',
      notes: 'Ambulance and official logistics access',
    });

    // 6. Create Users for all 4 Roles
    console.log('[Seed] Provisioning student and staff accounts...');

    // Student 1: Inside Hall
    const student1 = await User.create({
      studentId: 'ASH2101001M',
      fullName: 'Nusrat Jahan (Student 1)',
      email: 'student@hall.edu',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      department: 'Computer Science & Engineering',
      roomNumber: 'Room 304, Block B',
      hallName: hall.name,
      hallId: hall._id,
      roomId: room304._id,
      phoneNumber: '+8801711000001',
      guardianName: 'Md. Rafiqul Islam',
      guardianPhone: '+8801711999999',
      currentStatus: 'INSIDE',
      isActive: true,
    });

    // Student 2: Outside Hall
    const student2 = await User.create({
      studentId: 'ASH2101002F',
      fullName: 'Samia Akter (Student 2)',
      email: 'student2@hall.edu',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      department: 'Electrical & Electronic Engineering',
      roomNumber: 'Room 210, Block A',
      hallName: hall.name,
      hallId: hall._id,
      roomId: room210._id,
      phoneNumber: '+8801711000002',
      guardianName: 'Abdul Karim',
      guardianPhone: '+8801711888888',
      currentStatus: 'OUTSIDE',
      isActive: true,
    });

    // Student 3: Inside Hall
    const student3 = await User.create({
      studentId: 'ASH2101003F',
      fullName: 'Sadia Rahman (Student 3)',
      email: 'student3@hall.edu',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      department: 'Microbiology & Biotechnology',
      roomNumber: 'Room 304, Block B',
      hallName: hall.name,
      hallId: hall._id,
      roomId: room304._id,
      phoneNumber: '+8801711000003',
      guardianName: 'Mizanur Rahman',
      guardianPhone: '+8801711777777',
      currentStatus: 'INSIDE',
      isActive: true,
    });

    // 6.1 Provision Cryptographic Enrolled Devices for Students
    console.log('[Seed] Enrolling trusted resident devices with ECDSA P-256 credentials...');
    
    // Generate standard test ECDSA key pair for Student 1
    const { publicKey: student1PubKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    const student1PubPem = student1PubKey.export({ type: 'spki', format: 'pem' }) as string;
    const student1Fingerprint = crypto.createHash('sha256').update(student1PubPem).digest('hex');

    await EnrolledDevice.create({
      resident: student1._id,
      deviceId: 'DEV-STUDENT1-PRIMARY',
      deviceName: "Nusrat's iPhone 15 Pro (PWA Passkey)",
      publicKey: student1PubPem,
      algorithm: 'ECDSA-P256',
      fingerprint: student1Fingerprint,
      status: 'ACTIVE',
      enrolledAt: new Date(),
      platformInfo: 'iOS 17.5 / Safari Mobile PWA',
    });

    // Student 2 enrolled device
    const { publicKey: student2PubKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    const student2PubPem = student2PubKey.export({ type: 'spki', format: 'pem' }) as string;
    const student2Fingerprint = crypto.createHash('sha256').update(student2PubPem).digest('hex');

    await EnrolledDevice.create({
      resident: student2._id,
      deviceId: 'DEV-STUDENT2-PRIMARY',
      deviceName: "Samia's Galaxy S24 Ultra (Biometric Device)",
      publicKey: student2PubPem,
      algorithm: 'ECDSA-P256',
      fingerprint: student2Fingerprint,
      status: 'ACTIVE',
      enrolledAt: new Date(),
      platformInfo: 'Android 14 / Chrome Mobile PWA',
    });

    // Gate Staff
    const gateStaff = await User.create({
      fullName: 'Kamal Gate Officer (Gate Staff)',
      email: 'gatestaff@hall.edu',
      passwordHash: gateStaffPasswordHash,
      role: 'GATE_STAFF',
      hallName: hall.name,
      hallId: hall._id,
      phoneNumber: '+8801811000002',
      currentStatus: 'INSIDE',
      isActive: true,
    });

    // Warden
    const warden = await User.create({
      fullName: 'Dr. Sultana Razia (Hall Provost / Warden)',
      email: 'warden@hall.edu',
      passwordHash: wardenPasswordHash,
      role: 'WARDEN',
      hallName: hall.name,
      hallId: hall._id,
      phoneNumber: '+8801911000003',
      currentStatus: 'INSIDE',
      isActive: true,
    });

    // Admin
    const admin = await User.create({
      fullName: 'System Administrator',
      email: 'admin@hall.edu',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      hallName: 'Central University Hall Administration',
      phoneNumber: '+8801511000004',
      currentStatus: 'INSIDE',
      isActive: true,
    });

    // 7. Create Access Logs
    console.log('[Seed] Populating gate movement records...');
    const now = new Date();

    await AccessLog.create({
      resident: student1._id,
      type: 'EXIT',
      timestamp: new Date(now.getTime() - 4 * 3600000),
      scannedBy: gateStaff._id,
      isLate: false,
      status: 'NORMAL',
      remarks: 'Exited for Department Project Presentation',
    });

    await AccessLog.create({
      resident: student1._id,
      type: 'ENTRY',
      timestamp: new Date(now.getTime() - 1 * 3600000),
      scannedBy: gateStaff._id,
      isLate: true,
      lateReason: 'Delayed public transit from university campus laboratory',
      status: 'FLAGGED_LATE',
      remarks: 'Late Entry after 8:00 PM curfew',
    });

    await AccessLog.create({
      resident: student2._id,
      type: 'EXIT',
      timestamp: new Date(now.getTime() - 2 * 3600000),
      scannedBy: gateStaff._id,
      isLate: false,
      status: 'NORMAL',
      remarks: 'Library study group visit',
    });

    // 8. Create Leave Request
    console.log('[Seed] Generating sample leave requests...');
    await LeaveRequest.create({
      resident: student1._id,
      leaveType: 'WEEKEND_HOME',
      departureDate: new Date(now.getTime() + 86400000),
      expectedReturnDate: new Date(now.getTime() + 86400000 * 3),
      destinationAddress: 'House 24, Road 7, Dhanmondi, Dhaka',
      emergencyContactPhone: '+8801711999999',
      guardianConsentVerified: true,
      status: 'PENDING',
      wardenRemarks: 'Pending verification call to guardian',
    });

    // 9. Create SOS Alert
    console.log('[Seed] Generating active emergency alert...');
    await EmergencyAlert.create({
      resident: student1._id,
      alertType: 'MEDICAL',
      location: 'Block B - 3rd Floor Common Corridor',
      notes: 'Severe respiratory distress, urgent medical assistance needed',
      status: 'ACTIVE',
      createdAt: new Date(now.getTime() - 15 * 60000),
    });

    // 10. Create Sample Advance Late Entry Request
    console.log('[Seed] Generating sample advance late entry request...');
    await LateEntryRequest.create({
      resident: student1._id,
      targetDate: new Date(),
      expectedArrivalTime: '21:30',
      reason: 'Physics Department Optical Fiber Lab experiment',
      status: 'APPROVED',
      wardenDecisionNote: 'Approved for university academic research',
      reviewedBy: warden._id,
      reviewedAt: new Date(now.getTime() - 3600000),
      hallCutoffTime: '20:00',
      lateGraceMinutes: 15,
      auditLog: [
        {
          action: 'SUBMITTED',
          performedBy: student1._id,
          performedByName: student1.fullName,
          timestamp: new Date(now.getTime() - 7200000),
        },
        {
          action: 'APPROVED',
          performedBy: warden._id,
          performedByName: warden.fullName,
          timestamp: new Date(now.getTime() - 3600000),
          notes: 'Approved for university academic research',
        },
      ],
    });

    console.log('================================================================');
    console.log('🎉  SHASMS Database successfully seeded with full management data!');
    console.log(`    Halls: 1 | Rooms: 3 | Gates: 2 | Students: 3 | Staff: 3`);
    console.log('================================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌  Seeding failed:', error.message);
    process.exit(1);
  }
}

seedDatabase();
