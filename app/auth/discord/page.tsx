"use client";
import { useEffect } from 'react';
import { signIn } from 'next-auth/react';

export default function DiscordAuthKickoff() {
  useEffect(() => {
    // Start the proper NextAuth OAuth flow so state/PKCE cookies are set
    signIn('discord', { callbackUrl: '/profile' });
  }, []);

  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <p className="text-sm text-gray-400">Pornim conectarea prin Discord...</p>
    </div>
  );
}
