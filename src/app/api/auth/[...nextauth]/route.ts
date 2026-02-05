import NextAuth, { AuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { env } from '@/env';
import { findRecords } from '@/lib/airtable';
import { AirtableUser } from '@/types/airtable';

/**
 * NextAuth Configuration (Step 3)
 * 
 * Providers:
 * 1. Credentials: Email/password authentication against Airtable Users table
 * 2. Google OAuth: Google sign-in
 * 
 * Security:
 * - Passwords hashed with bcrypt
 * - JWT tokens signed with JWT_SECRET
 * - Session data includes user id, email, role
 */

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'manager' | 'user';
      image?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'manager' | 'user';
    image?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'manager' | 'user';
    image?: string;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    // ========================================
    // Credentials Provider (Email/Password)
    // ========================================
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<NextAuthUser | null> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e password sono obbligatori');
        }

        try {
          // Find user by email in Airtable
          const records = await findRecords<AirtableUser['fields']>('users', {
            filterByFormula: `{Email} = '${credentials.email}'`,
            maxRecords: 1,
          });

          if (!records || records.length === 0) {
            throw new Error('CredentialsSignin');
          }

          const userRecord = records[0];
          const user = userRecord.fields;

          // Check user status (Attivo is boolean in Airtable)
          if (!user.Attivo) {
            throw new Error('Account non attivo. Contatta l\'amministratore.');
          }

          // Verify password (field is "Password" not "PasswordHash")
          if (!user.Password) {
            throw new Error('Account non configurato per login con password');
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.Password
          );

          if (!isPasswordValid) {
            throw new Error('CredentialsSignin');
          }

          // Return user object for JWT
          // Map Airtable fields to NextAuth user object
          return {
            id: userRecord.id,
            email: user.Email,
            name: user.Nome,                    // "Nome" not "Name"
            role: user.Ruolo.toLowerCase() as 'admin' | 'manager' | 'user',  // Convert "Admin" -> "admin"
            image: user.Avatar_URL,             // "Avatar_URL" not "ProfileImage"
          };
        } catch (error: any) {
          console.error('[NextAuth] Credentials auth error:', error.message);
          throw error;
        }
      },
    }),

    // ========================================
    // Google OAuth Provider
    // ========================================
    GoogleProvider({
      clientId: env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],

  // ========================================
  // Callbacks
  // ========================================
  callbacks: {
    /**
     * JWT Callback
     * Runs when JWT is created or updated
     */
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.image = user.image;
      }

      // Google OAuth sign in
      if (account?.provider === 'google' && user) {
        try {
          // Check if user exists in Airtable by Google ID
          const records = await findRecords<AirtableUser['fields']>('users', {
            filterByFormula: `{GoogleId} = '${account.providerAccountId}'`,
            maxRecords: 1,
          });

          if (records && records.length > 0) {
            // Existing user - use their data
            const existingUser = records[0];
            token.id = existingUser.id;
            token.email = existingUser.fields.Email;
            token.name = existingUser.fields.Nome;
            token.role = existingUser.fields.Ruolo.toLowerCase() as 'admin' | 'manager' | 'user';
            token.image = existingUser.fields.Avatar_URL;
          } else {
            // New Google user - check if email exists
            const emailRecords = await findRecords<AirtableUser['fields']>('users', {
              filterByFormula: `{Email} = '${user.email}'`,
              maxRecords: 1,
            });

            if (emailRecords && emailRecords.length > 0) {
              // Link Google account to existing user
              const existingUser = emailRecords[0];
              // TODO: Update user record with GoogleId
              token.id = existingUser.id;
              token.email = existingUser.fields.Email;
              token.name = existingUser.fields.Nome;
              token.role = existingUser.fields.Ruolo.toLowerCase() as 'admin' | 'manager' | 'user';
              token.image = user.image || existingUser.fields.Avatar_URL;
            } else {
              // TODO: Decide if we allow auto-registration via Google
              // For now, throw error - require admin to create user first
              throw new Error('Account non trovato. Contatta l\'amministratore.');
            }
          }
        } catch (error: any) {
          console.error('[NextAuth] Google OAuth error:', error.message);
          throw error;
        }
      }

      return token;
    },

    /**
     * Session Callback
     * Runs when session is checked
     */
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          email: token.email,
          name: token.name,
          role: token.role,
          image: token.image,
        };
      }
      return session;
    },

    /**
     * SignIn Callback
     * Control if user is allowed to sign in
     */
    async signIn({ user, account }) {
      // Allow credentials sign in (already validated in authorize)
      if (account?.provider === 'credentials') {
        return true;
      }

      // For Google OAuth, check is handled in jwt callback
      if (account?.provider === 'google') {
        return true;
      }

      return false;
    },

    /**
     * Redirect Callback
     * Control where to redirect after sign in
     */
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) {
        return url;
      }
      // Default redirect to dashboard
      return `${baseUrl}/dashboard`;
    },
  },

  // ========================================
  // Pages
  // ========================================
  pages: {
    signIn: '/login',
    error: '/login', // Redirect errors to login page
  },

  // ========================================
  // Session Strategy
  // ========================================
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // ========================================
  // JWT Configuration
  // ========================================
  jwt: {
    secret: env.JWT_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // ========================================
  // Other Options
  // ========================================
  secret: env.NEXTAUTH_SECRET,
  // Debug disabilitato (warning: https://next-auth.js.org/warnings#debug_enabled)
  debug: false,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
