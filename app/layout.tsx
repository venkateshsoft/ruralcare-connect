import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RuralCare Connect',
  description: 'Synthetic rural care coordination demonstration prototype'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
