import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const url = new URL(process.env.DATABASE_URL);
console.log('Database endpoint:', url.hostname, url.port);
const db = new PrismaClient();
try {
  console.log('Database reachable; users:', await db.user.count());
} finally {
  await db.$disconnect();
}
