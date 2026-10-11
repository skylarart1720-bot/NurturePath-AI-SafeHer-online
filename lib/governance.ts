import { AppError } from './permissions';

export const launchGates = [
  'PARTNER',
  'LEGAL',
  'CLINICAL',
  'SECURITY',
  'OPERATIONS',
  'PILOT',
] as const;
export function assertOnboardingAllowed() {
  if (process.env.DEMO_MODE === 'true') return;
  // Written external approvals are prerequisites, never inferred from environment flags.
  throw new AppError(
    503,
    'PATIENT_LAUNCH_BLOCKED',
    'Real-patient onboarding is disabled. Complete the documented launch gates and a reviewed release before enabling a patient pilot.',
  );
}
export function requireDemo() {
  if (process.env.DEMO_MODE !== 'true')
    throw new AppError(
      503,
      'DEMO_ONLY',
      'This release is restricted to synthetic demonstration data.',
    );
}
