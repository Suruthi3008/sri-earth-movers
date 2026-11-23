import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

// Login removed for this client: the app is always "signed in" as a guest.
const guestValue = {
  user: { username: 'guest' },
  status: 'authenticated',
  login: async () => {},
  logout: () => {},
};

export function AuthProvider({ children }) {
  return <AuthContext.Provider value={guestValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}