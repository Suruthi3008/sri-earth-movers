import { Outlet } from 'react-router-dom';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';

export default function AppLayout() {
  return (
    <div className="app-shell">
      <TopBar />
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
