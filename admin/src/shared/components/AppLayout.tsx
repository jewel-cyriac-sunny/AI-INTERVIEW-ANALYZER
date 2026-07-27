import { Outlet } from 'react-router-dom';
import Sidebar from '@/shared/components/Sidebar';
import Header from '@/shared/components/Header';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
