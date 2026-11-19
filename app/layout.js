import './globals.css';
import Nav from '@/components/Nav';

export const metadata = { title: 'Escape Room Platform', description: 'Solve puzzle rooms, earn points, climb the leaderboard.' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}