import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../lib/db';
import { encryptContact } from '../lib/encryption';

export async function seedDemo() {
  if (process.env.DEMO_MODE !== 'true') throw new Error('Seeding requires DEMO_MODE=true.');
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12 || password.startsWith('replace-'))
    throw new Error('Set a DEMO_PASSWORD of at least 12 characters.');
  const passwordHash = await bcrypt.hash(password, 12);
  const org = await db.organization.upsert({
    where: { id: '10000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '10000000-0000-4000-8000-000000000001',
      name: 'NurturePath Demonstration Programme',
    },
  });
  const clinics = [];
  for (const [index, name, region] of [
    [1, 'Demo Adenta Community Clinic', 'Greater Accra'],
    [2, 'Demo Tamale Community Clinic', 'Northern'],
  ] as const) {
    clinics.push(
      await db.clinic.upsert({
        where: { id: `20000000-0000-4000-8000-00000000000${index}` },
        update: {},
        create: {
          id: `20000000-0000-4000-8000-00000000000${index}`,
          organizationId: org.id,
          name,
          region,
        },
      }),
    );
  }
  const accounts = [
    {
      email: 'worker@demo.nurturepath.test',
      name: 'Ama Demo',
      role: 'HEALTH_WORKER' as const,
      clinicId: clinics[0].id,
    },
    {
      email: 'clinic@demo.nurturepath.test',
      name: 'Esi Demo',
      role: 'CLINIC_ADMIN' as const,
      clinicId: clinics[0].id,
    },
    {
      email: 'admin@demo.nurturepath.test',
      name: 'Kofi Demo',
      role: 'PLATFORM_ADMIN' as const,
      clinicId: null,
    },
    {
      email: 'auditor@demo.nurturepath.test',
      name: 'Akua Demo',
      role: 'AUDITOR' as const,
      clinicId: null,
    },
    {
      email: 'worker2@demo.nurturepath.test',
      name: 'Fati Demo',
      role: 'HEALTH_WORKER' as const,
      clinicId: clinics[1].id,
    },
    {
      email: 'colleague@demo.nurturepath.test',
      name: 'Abena Demo',
      role: 'HEALTH_WORKER' as const,
      clinicId: clinics[0].id,
    },
  ];
  const users = [];
  for (const data of accounts)
    users.push(
      await db.user.upsert({
        where: { email: data.email },
        update: {},
        create: { ...data, organizationId: org.id, passwordHash },
      }),
    );
  const reminder = await db.messageTemplate.upsert({
    where: { id: '30000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '30000000-0000-4000-8000-000000000001',
      organizationId: org.id,
      title: 'A friendly appointment reminder',
      locale: 'en',
      category: 'NEUTRAL_REMINDER',
      body: 'Hello. This is a reminder about your scheduled visit. Please contact your clinic if you need to change the time. Reply through your health worker to change contact preferences.',
      approvedBy: users[1].id,
      approvedAt: new Date(),
    },
  });
  await db.messageTemplate.upsert({
    where: { id: '30000000-0000-4000-8000-000000000002' },
    update: {},
    create: {
      id: '30000000-0000-4000-8000-000000000002',
      organizationId: org.id,
      title: 'Preparing for your next visit · demo source',
      locale: 'en',
      category: 'EDUCATIONAL',
      body: 'Keep a note of your next appointment. If you need support with arrangements, contact your healthcare facility approximately one day before your scheduled visit.',
      approvedBy: users[1].id,
      approvedAt: new Date(),
    },
  });
  const names = [
    'Ama',
    'Esi',
    'Abena',
    'Akua',
    'Adwoa',
    'Efua',
    'Yaa',
    'Afia',
    'Fati',
    'Amina',
    'Hawa',
    'Mariam',
    'Naana',
    'Dzifa',
    'Dela',
    'Sena',
    'Akos',
    'Adjo',
    'Salma',
    'Rashida',
  ];
  for (let i = 0; i < 20; i++) {
    const displayCode = `DEMO-${String(i + 1).padStart(3, '0')}`;
    if (await db.mother.findUnique({ where: { displayCode } })) continue;
    const assigned = i < 15 ? users[0] : users[4];
    const scheduledAt = new Date(Date.now() + (i - 8) * 24 * 3600000);
    const m = await db.mother.create({
      data: {
        organizationId: org.id,
        clinicId: assigned.clinicId!,
        assignedWorkerId: assigned.id,
        displayCode,
        name: `Demo ${names[i]} ${i + 1}`,
        phoneEncrypted: encryptContact(`+23300000${String(i).padStart(4, '0')}`),
        preferredLanguage: 'en',
        careStage: i % 4 === 0 ? 'POSTNATAL' : 'ANTENATAL',
        adultConfirmed: true,
        estimatedDueDate: i % 4 === 0 ? null : new Date(Date.now() + (30 + i * 5) * 86400000),
        consents: {
          create: [
            { purpose: 'REGISTRATION', channel: 'IN_PERSON', recordedBy: assigned.id },
            { purpose: 'REMINDERS', channel: 'SMS', recordedBy: assigned.id },
          ],
        },
      },
    });
    const completed = i % 3 === 0 && i < 8;
    const appointment = await db.appointment.create({
      data: {
        motherId: m.id,
        clinicId: m.clinicId,
        scheduledAt,
        kind: m.careStage,
        createdBy: assigned.id,
        status: completed ? 'ATTENDED' : 'SCHEDULED',
      },
    });
    await db.followUp.create({
      data: {
        motherId: m.id,
        appointmentId: appointment.id,
        dueAt: scheduledAt,
        assignedTo: assigned.id,
        status: completed ? 'COMPLETED' : 'PENDING',
        outcome: completed ? 'REACHED' : null,
        completedAt: completed ? new Date(+scheduledAt + 2 * 3600000) : null,
      },
    });
    if (i % 3 === 0)
      await db.referral.create({
        data: {
          motherId: m.id,
          clinicId: m.clinicId,
          receivingFacility: 'Demo District Care Centre',
          reasonCode: 'CONTINUITY_OF_CARE',
          status: i === 0 ? 'CLOSED' : i === 3 ? 'ATTENDED' : i === 6 ? 'ACCEPTED' : 'CREATED',
          closedAt: i === 0 ? new Date() : null,
          closureNotes: i === 0 ? 'Synthetic attendance confirmed by receiving team.' : null,
        },
      });
    if (completed)
      await db.messageDelivery.create({
        data: {
          motherId: m.id,
          templateId: reminder.id,
          channel: 'SMS',
          status: 'SIMULATED_DELIVERED',
          providerId: 'sim-' + randomUUID(),
        },
      });
  }
  console.log(
    'Synthetic seed complete: one programme, two clinics, six role/assignment test accounts, twenty fictional mothers. Existing data preserved.',
  );
}
