import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';

export function Layout() {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:pb-12">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
