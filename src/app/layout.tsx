import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HMI Control - Engine Assembly Line',
  description: 'Manufacturing HMI Control Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
