import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AppLayout from './layouts/AppLayout';
import LoadingScreen from './components/LoadingScreen';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import MorePage from './pages/MorePage';
import BillsPage from './pages/BillsPage';
import BillDetailPage from './pages/BillDetailPage';
import BillFormPage from './pages/BillFormPage';
import PaymentsPage from './pages/PaymentsPage';
import ExpensesPage from './pages/ExpensesPage';
import ExpenseFormPage from './pages/ExpenseFormPage';
import JcbWorkPage from './pages/JcbWorkPage';
import DailyWorkPage from './pages/DailyWorkPage';
import DailyWorkFormPage from './pages/DailyWorkFormPage';
import DriversPage from './pages/DriversPage';
import DriverFormPage from './pages/DriverFormPage';
import DriverPaymentsPage from './pages/DriverPaymentsPage';
import DriverPaymentFormPage from './pages/DriverPaymentFormPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import './styles/bills.css';
import './styles/payments.css';
import './styles/work.css';
import './styles/reports.css';

/** Redirects anonymous visitors to /login and remembers where they wanted to go. */
function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<HomePage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="bills/new" element={<BillFormPage />} />
        <Route path="bills/:id" element={<BillDetailPage />} />
        <Route path="bills/:id/edit" element={<BillFormPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="expenses/new" element={<ExpenseFormPage />} />
        <Route path="expenses/:id/edit" element={<ExpenseFormPage />} />
        <Route path="jcb-work" element={<JcbWorkPage />} />
        <Route path="daily-work" element={<DailyWorkPage />} />
        <Route path="daily-work/new" element={<DailyWorkFormPage />} />
        <Route path="daily-work/:id/edit" element={<DailyWorkFormPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="drivers/new" element={<DriverFormPage />} />
        <Route path="drivers/:id/edit" element={<DriverFormPage />} />
        <Route path="driver-payments" element={<DriverPaymentsPage />} />
        <Route path="driver-payments/new" element={<DriverPaymentFormPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="more" element={<MorePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
