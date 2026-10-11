# Dependency review

The lockfile records exact resolved versions. Initial installation reported 11 advisories, including critical test-worker findings. Vitest was upgraded to 5.0.3 and `deepmerge-ts` overridden to patched 8.0.2; Prisma generation and application checks must pass with that override.

Actual runtime audit: `npm audit --omit=dev` returned **found 0 vulnerabilities**.

Full development audit still reports **5 high** findings in the Next ESLint → fast-glob → micromatch → braces chain. The upstream latest braces version available at this review was 3.0.3, which remains within the advisory range. Do not claim a clean full audit. These packages process trusted repository lint patterns, not patient/API inputs, and are excluded from the standalone runtime. Re-review upstream fixes and independent security assessment before patient launch. Do not use `npm audit fix --force` to downgrade framework tooling without compatibility testing.

CI fails high runtime advisories. The separate full audit should be retained as a reviewed engineering finding until upstream remediation is available. No blanket exemption authorizes real-patient use.
