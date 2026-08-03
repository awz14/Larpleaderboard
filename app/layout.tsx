import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LarpLeaderboard — Buy Your Spot. Flex Your Link.',
  description: 'The premier leaderboard for high-rollers and flexers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased selection:bg-emerald-500/20 selection:text-emerald-300">{children}</body>
    </html>
  );
}