import 'dotenv/config';
import { db } from '../lib/db';
import { seedDemo } from '../prisma/demo-seed';
async function main() {
  const hostname = new URL(process.env.DATABASE_URL!).hostname;
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.DEMO_MODE !== 'true' ||
    process.env.ALLOW_DEMO_RESET !== 'true' ||
    !['localhost', '127.0.0.1'].includes(hostname)
  )
    throw new Error('Reset restricted to explicitly enabled local development demo.');
  const org = await db.organization.findUnique({
    where: { id: '10000000-0000-4000-8000-000000000001' },
  });
  if (!org || org.name !== 'NurturePath Demonstration Programme')
    throw new Error('Expected demonstration organization not found.');
  await db.$transaction(async (tx) => {
    const scope = { mother: { organizationId: org.id } };
    await tx.messageDelivery.deleteMany({ where: scope });
    await tx.followUp.deleteMany({ where: scope });
    await tx.referral.deleteMany({ where: scope });
    await tx.appointment.deleteMany({ where: scope });
    await tx.consent.deleteMany({ where: scope });
    await tx.mother.deleteMany({ where: { organizationId: org.id } });
    await tx.offlineMutation.deleteMany({
      where: {
        actorId: {
          in: (
            await tx.user.findMany({ where: { organizationId: org.id }, select: { id: true } })
          ).map((u) => u.id),
        },
      },
    });
  });
  await seedDemo();
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
