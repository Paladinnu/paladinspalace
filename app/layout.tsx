import './globals.css';
import React from 'react';
import { Navbar } from '../components/Navbar';
import { Providers } from '../components/Providers';
import { ConfirmProvider } from '../components/ConfirmProvider';

export const metadata = {
  title: 'Paladins Palace • Marketplace',
  description: 'Marketplace privat pentru iteme virtuale. Vinde, cumpără și descoperă oferte — acces pe bază de invitație.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className="min-h-screen antialiased">
        <Providers>
          <ConfirmProvider>
            <Navbar />
            <main className="container py-4">{children}</main>
          </ConfirmProvider>
        </Providers>
      </body>
    </html>
  );
}
