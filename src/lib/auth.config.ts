import { type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { encryptionService } from "@/lib/encryption";

console.log('[NextAuth] Loading config...');
console.log('[NextAuth] CLIENT_ID:', process.env.GOOGLE_OAUTH_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('[NextAuth] CLIENT_SECRET:', process.env.GOOGLE_OAUTH_CLIENT_SECRET ? '✅ Set' : '❌ Missing');

if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
  throw new Error('Google OAuth credentials are missing!');
}

export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent", // Forza re-consent per ottenere refresh token
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Prima volta: salva tokens di Google
      if (account) {
        console.log('[NextAuth] Saving Google tokens for user:', user?.email);
        // Encrypta i tokens sensibili
        const encryptedAccessToken = encryptionService.encrypt(account.access_token || '');
        const encryptedRefreshToken = account.refresh_token ? encryptionService.encrypt(account.refresh_token) : '';
        
        return {
          ...token,
          googleAccessToken: encryptedAccessToken,
          googleRefreshToken: encryptedRefreshToken,
          googleTokenExpiresAt: account.expires_at || Math.floor(Date.now() / 1000) + 3600,
          googleCalendarEmail: account.email || user?.email,
        };
      }

      // Refresh token se scaduto
      if (token.googleTokenExpiresAt && typeof token.googleTokenExpiresAt === 'number') {
        const now = Math.floor(Date.now() / 1000);
        const isExpired = now >= token.googleTokenExpiresAt - 300; // Refresh 5 min prima

        if (isExpired && token.googleRefreshToken) {
          console.log('[NextAuth] Token scaduto, refreshing...');
          try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              body: new URLSearchParams({
                client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
                client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
                grant_type: 'refresh_token',
                refresh_token: encryptionService.decrypt(token.googleRefreshToken as string),
              }),
            });

            const refreshedTokens = await response.json();

            if (!response.ok) {
              throw new Error('Token refresh failed');
            }

            return {
              ...token,
              googleAccessToken: encryptionService.encrypt(refreshedTokens.access_token),
              googleTokenExpiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
            };
          } catch (error) {
            console.error('[NextAuth] Token refresh error:', error);
            return { ...token, error: 'RefreshTokenExpired' };
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Aggiungi tokens al session object
      session.googleAccessToken = token.googleAccessToken as string;
      session.googleRefreshToken = token.googleRefreshToken as string;
      session.googleCalendarEmail = token.googleCalendarEmail as string;
      session.googleTokenExpiresAt = token.googleTokenExpiresAt as number;
      return session;
    },

    async signIn({ user, account }) {
      console.log('[NextAuth] Sign in:', user?.email);
      // Puoi aggiungere logica qui per salvare su database
      return true;
    },

    async redirect({ url, baseUrl }) {
      // Reindirizza dopo sign-in
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 giorni
    updateAge: 24 * 60 * 60, // Update ogni 24 ore
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  trustHost: true,
} satisfies NextAuthConfig;
