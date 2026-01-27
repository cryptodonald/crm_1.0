// Central env re-export — delegate to src/env.ts
import envModule from '@/env';

export const env = envModule;

export function getEnvVar(name: string): string {
  return envModule[name as keyof typeof envModule] as string;
}

export function getEnvVarWithDefault(name: string, defaultValue: string): string {
  const v = process.env[name];
  return v ?? defaultValue;
}

export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return env.NEXT_PUBLIC_APP_URL;
};
