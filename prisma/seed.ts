import 'dotenv/config';
import { seedDemo } from './demo-seed';
import { db } from '../lib/db';
seedDemo()
  .catch(() => {
    console.error('Seed failed. Check demo configuration and database availability.');
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
