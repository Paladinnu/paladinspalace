import { PrismaAdapter } from '@next-auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Discord from 'next-auth/providers/discord';
import type { NextAuthOptions } from 'next-auth';
import prisma from './prisma';
import bcrypt from 'bcryptjs';
import { rateLimit } from './rateLimit';
import { audit } from './audit';
import { headers } from 'next/headers';
import { ERR } from './errors';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 3600 },
  // Ensure a stable secret for JWT encryption/decryption
  secret: process.env.NEXTAUTH_SECRET as string,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Parola', type: 'password' }
      },
      async authorize(credentials) {
        // Basic presence check
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();
        const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || headers().get('x-real-ip') || 'unknown';
        const ua = headers().get('user-agent') || '';
        // Rate limit per email+ip combo
        try {
          const rlKey = `login:${email}:${ip}`;
          const rl = await rateLimit({ key: rlKey, limit: 10, windowMs: 15 * 60 * 1000 });
          if (!rl.allowed) {
            audit({ action: 'LOGIN_RATE_LIMIT', ip, userAgent: ua, metadata: { email } });
            return null; // NextAuth will treat as failure; UI can show generic message
          }
        } catch {}

	const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          audit({ action: 'LOGIN_FAIL', ip, userAgent: ua, metadata: { email, reason: 'USER_NOT_FOUND' } });
          return null;
        }
        if (user.status === 'SUSPENDED') {
          audit({
            userId: user.id,
            action: 'LOGIN_BLOCKED',
            entityType: 'USER',
            entityId: user.id,
            ip,
            userAgent: ua,
            metadata: { email, reason: 'SUSPENDED' },
          });
          throw new Error('Unauthorized');
        }
        let ok = false;
        try { ok = await bcrypt.compare(credentials.password, user.passwordHash); } catch {}
        if (!ok) {
          audit({ userId: user.id, action: 'LOGIN_FAIL', entityType: 'USER', entityId: user.id, ip, userAgent: ua, metadata: { email, reason: 'BAD_PASSWORD' } });
          return null;
        }
        audit({ userId: user.id, action: 'LOGIN_SUCCESS', entityType: 'USER', entityId: user.id, ip, userAgent: ua, metadata: { email } });
	return { id: user.id, email: user.email, name: user.displayName, role: user.role, status: user.status, fullNameIC: user.fullNameIC, inGameId: user.inGameId, phoneIC: user.phoneIC } as any;
      }
    }),
    // Discord used for linking only; we don't create users via Discord
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
      // Request email so NextAuth can match the current user by email and link the account
      authorization: { params: { scope: 'identify email' } }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      // We use Discord only for linking to an existing account, not for creating new users
      if (account?.provider === 'discord') {
        // If NextAuth didn't resolve an existing user (would create a new one), block it
        if (!user) return '/login?error=DiscordLinkRequiresLogin';
        return true;
      }
      return true;
    },
    async jwt({ token, user }) {
      // On sign in: copy fields from the User model
      if (user) {
        token.role = (user as any).role;
        token.status = (user as any).status;
        token.fullNameIC = (user as any).fullNameIC;
        token.inGameId = (user as any).inGameId;
        token.phoneIC = (user as any).phoneIC;
        (token as any).accessUntil = (user as any).accessUntil ? new Date((user as any).accessUntil).toISOString() : null;
        (token as any).premiumUntil = (user as any).premiumUntil ? new Date((user as any).premiumUntil).toISOString() : null;
        return token;
      }
      // On subsequent requests: refresh role/status from DB to pick up approvals/suspensions
      if (token?.sub) {
        try {
          const dbUser = await prisma.user.findUnique({ where: { id: token.sub } }) as any;
          if (dbUser) {
            token.role = dbUser.role;
            token.status = dbUser.status;
            (token as any).fullNameIC = dbUser.fullNameIC;
            (token as any).inGameId = dbUser.inGameId;
            (token as any).phoneIC = dbUser.phoneIC;
            (token as any).discordTag = dbUser.discordTag;
            // Backfill: if a normal user has no accessUntil, set 30 days from createdAt
            if (!dbUser.accessUntil && dbUser.role === 'USER') {
              const computed = new Date(dbUser.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
              try { await (prisma as any).user.update({ where: { id: dbUser.id }, data: { accessUntil: computed } }); } catch {}
              (token as any).accessUntil = computed.toISOString();
            } else {
              (token as any).accessUntil = dbUser.accessUntil ? dbUser.accessUntil.toISOString() : null;
            }
            (token as any).premiumUntil = dbUser.premiumUntil ? dbUser.premiumUntil.toISOString() : null;
          }
        } catch {}
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).status = token.status;
  (session.user as any).fullNameIC = (token as any).fullNameIC;
  (session.user as any).inGameId = (token as any).inGameId;
        (session.user as any).phoneIC = (token as any).phoneIC;
        (session.user as any).discordTag = (token as any).discordTag;
        (session.user as any).accessUntil = (token as any).accessUntil;
        (session.user as any).premiumUntil = (token as any).premiumUntil;
      }
      return session;
    }
  },
  events: {
    async linkAccount(message) {
      // When a user links Discord, persist a readable identifier to user.discordTag
      try {
        if (message.user?.id && message.account?.provider === 'discord') {
          // Best effort: use Discord username#discriminator if present, else the providerAccountId
          const tag = message.profile && (message.profile as any).discriminator
            ? `${(message.profile as any).username}#${(message.profile as any).discriminator}`
            : (message.account.providerAccountId || 'discord');
          await prisma.user.update({ where: { id: message.user.id }, data: { discordTag: tag } });
          await audit({ userId: message.user.id, action: 'DISCORD_LINKED', entityType: 'USER', entityId: message.user.id, metadata: { tag } });
        }
      } catch {}
    }
  },
  pages: {
    signIn: '/login'
  }
};