import { PrismaClient } from '@prisma/client';
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
const localUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : undefined;
// Docker's local published port is IPv4; avoid intermittent localhost IPv6 resolution on Windows.
if (localUrl?.hostname === 'localhost') localUrl.hostname = '127.0.0.1';
export const db =
  globalDb.prisma ??
  new PrismaClient(localUrl ? { datasourceUrl: localUrl.toString() } : undefined);
if (process.env.NODE_ENV !== 'production') globalDb.prisma = db;
