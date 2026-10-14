import 'dotenv/config';
import { db } from '../lib/db';
import { maintainSafeher } from '../lib/safeher-maintenance';
try {
  console.log(
    JSON.stringify({ completedAt: new Date().toISOString(), ...(await maintainSafeher()) }),
  );
} finally {
  await db.$disconnect();
}
