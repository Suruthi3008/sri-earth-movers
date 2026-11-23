import { NavLink } from 'react-router-dom';
import { FileText, Home, MoreHorizontal, Wallet } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/bills', label: 'Bills', icon: FileText },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/more', label: 'More', icon: MoreHorizontal },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `bottom-nav__item${isActive ? ' is-active' : ''}`}
        >
          <Icon size={20} strokeWidth={2} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
