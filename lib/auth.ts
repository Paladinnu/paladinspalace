import prisma from './prisma';
import bcrypt from 'bcryptjs';

// Open registration: create pending user without invite linkage
export async function registerUser(params: { email: string; password: string; displayName: string; fullNameIC: string; inGameId: number; phoneIC: string; }) {
  const { email, password, displayName, fullNameIC, inGameId, phoneIC } = params;
  if (displayName.length < 3 || displayName.length > 30) {
    throw new Error('Display name 3-30 caractere');
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email deja folosit');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      fullNameIC,
  inGameId,
      phoneIC,
      status: 'PENDING',
      // Cast to any to avoid type mismatch during incremental schema changes
      // accessUntil defaults to 30 days from now for non-moderators
      accessUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    } as any
  });
  return user;
}

export async function validateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return user;
}
