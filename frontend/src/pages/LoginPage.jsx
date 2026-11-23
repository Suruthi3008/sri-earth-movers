import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import LoadingScreen from '../components/LoadingScreen';

export default function LoginPage() {
  const { status, login } = useAuth();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'authenticated') {
    return <Navigate to={location.state?.from || '/'} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Unable to log in. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <img className="login-card__logo" src="/brand/logo.jpeg" alt="Ramesh Earth Movers logo" />
        <h1 className="login-card__title">Sri Earth Movers</h1>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="username">Username</label>
            <input id="username" className="input" type="text" autoComplete="username"
              autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="password">Password</label>
            <div className="input-wrap">
              <input id="password" className="input" type={showPassword ? 'text' : 'password'}
                autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="input-wrap__toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-accent" disabled={submitting}>
            <LogIn size={20} aria-hidden="true" />
            {submitting ? 'Logging in…' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
