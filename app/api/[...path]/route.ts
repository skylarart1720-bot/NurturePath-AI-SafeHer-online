import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { requireActor, checkOrigin, rateLimit } from '@/lib/auth';
import { AppError } from '@/lib/permissions';
import { read, write, syncMutation } from '@/lib/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handler(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const correlationId = crypto.randomUUID();
  try {
    const actor = await requireActor();
    await rateLimit('actor:' + actor.id, 180);
    let kind = (await context.params).path.join('/');
    if (request.method === 'GET')
      return NextResponse.json({ data: await read(actor, kind, new URL(request.url)) });
    checkOrigin(request);
    const text = await request.text();
    if (text.length > 20000) throw new AppError(413, 'PAYLOAD', 'Request is too large.');
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new AppError(400, 'JSON', 'Invalid JSON.');
    }
    if (request.method === 'PATCH') {
      if (
        kind.startsWith('mothers/') &&
        kind.split('/').length === 2 &&
        kind !== 'mothers/assign'
      ) {
        data = { ...(data as object), id: kind.split('/')[1] };
        kind = 'mothers/update';
      } else if (['appointments', 'followups', 'referrals'].includes(kind)) kind += '/update';
    }
    return NextResponse.json({
      data:
        kind === 'offline/sync' ? await syncMutation(actor, data) : await write(actor, kind, data),
    });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION',
            message: 'Check the form fields.',
            fields: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
            correlationId,
          },
        },
        { status: 400 },
      );
    if (error instanceof AppError)
      return NextResponse.json(
        { error: { code: error.code, message: error.message, correlationId } },
        { status: error.status },
      );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2034', 'P2002', 'P2025'].includes(error.code)
    )
      return NextResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'Concurrent update detected. Refresh and retry.',
            correlationId,
          },
        },
        { status: 409 },
      );
    console.error(
      JSON.stringify({
        event: 'api_failure',
        correlationId,
        category: error instanceof Error ? error.constructor.name : 'unknown',
      }),
    );
    return NextResponse.json(
      {
        error: {
          code: 'SERVER_ERROR',
          message: 'The request could not be completed. Try again.',
          correlationId,
        },
      },
      { status: 500 },
    );
  }
}
export { handler as GET, handler as POST, handler as PATCH };
