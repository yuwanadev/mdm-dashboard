import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Toaster } from '@/components/toaster';

export const metadata: Metadata = {
  title: 'YuwanaDev MDM — Device Manager',
  description: 'Self-hosted Android device management dashboard. Monitor and control your devices in real-time.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
