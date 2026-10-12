// Central place for server-side configuration. Throws a clear error the first
// time a missing variable is actually needed (not at import time, so `next build` works).
export function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export const optionalEnv = (name: string): string | undefined => process.env[name] || undefined;

export const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
