import type { Role } from '@prisma/client';
export type Actor = {
  id: string;
  organizationId: string;
  clinicId: string | null;
  role: Role;
  name: string;
  email: string;
};
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function allow(actor: Actor, roles: Role[]) {
  if (!roles.includes(actor.role))
    throw new AppError(403, 'FORBIDDEN', 'Your role cannot perform this action.');
}
export function motherScope(actor: Actor) {
  allow(actor, ['HEALTH_WORKER', 'CLINIC_ADMIN']);
  return {
    organizationId: actor.organizationId,
    clinicId: actor.clinicId ?? 'NO_CLINIC',
    archivedAt: null,
    ...(actor.role === 'HEALTH_WORKER' ? { assignedWorkerId: actor.id } : {}),
  };
}
