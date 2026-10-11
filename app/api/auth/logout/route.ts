import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkOrigin, hashToken, sessionCookie } from '@/lib/auth';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const jar = await cookies();
    const token = jar.get(sessionCookie)?.value;
    if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
    jar.delete(sessionCookie);
    return NextResponse.json({ data: { ok: true } });
  } catch {
    return NextResponse.json({ error: { message: 'Unable to sign out.' } }, { status: 400 });
  }
}
