import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    googleAccessToken?: string;
    googleRefreshToken?: string;
    googleCalendarEmail?: string;
    googleTokenExpiresAt?: number;
  }

  interface JWT {
    googleAccessToken?: string;
    googleRefreshToken?: string;
    googleCalendarEmail?: string;
    googleTokenExpiresAt?: number;
    error?: string;
  }
}
