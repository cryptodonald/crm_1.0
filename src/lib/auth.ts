import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '@/env';

const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d'; // Token valido per 7 giorni

export interface UserData {
  id: string;
  nome: string;
  email?: string;
  ruolo: string;
  avatar?: string;
  telefono?: string;
}

export interface JwtPayload {
  userId: string;
  email?: string;
  nome: string;
  ruolo: string;
  iat?: number;
  exp?: number;
}

/**
 * Hash di una password usando bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verifica se una password corrisponde al suo hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

/**
 * Genera un JWT token per l'utente
 */
export function generateToken(user: UserData): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    nome: user.nome,
    ruolo: user.ruolo,
  };

  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN 
  });
}

/**
 * Verifica e decodifica un JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Validazione email semplice
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validazione password (minimo 6 caratteri)
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

/**
 * Sanitizzazione dati utente per risposta API (rimuove dati sensibili)
 */
export function sanitizeUser(user: UserData): Omit<UserData, 'password'> {
  const { ...sanitized } = user;
  return sanitized;
}

/**
 * Estrae il token dal header Authorization
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Genera un ID di sessione unico
 */
export function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}