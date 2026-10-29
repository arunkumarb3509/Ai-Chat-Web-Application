import React, { useState } from 'react';
import { X, User, Lock, Mail, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { api, setAuthToken } from '../services/api';

export function AuthModal({ isOpen, onClose, currentUser, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let res;
      if (isRegister) {
        res = await api.auth.register({ username, password, email: email || null });
      } else {
        res = await api.auth.login({ username, password });
      }
      setAuthToken(res.access_token);
      if (onAuthSuccess) onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.getGuestSession();
      setAuthToken(res.access_token);
      if (onAuthSuccess) onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to start guest session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3>{isRegister ? 'Create an Account' : 'Sign In'}</h3>
          <button className="action-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{ marginBottom: 16, padding: '8px 12px', background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--danger)' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>
                Username
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '8px 12px', background: 'var(--bg-primary)' }}>
                <User size={16} color="var(--text-muted)" style={{ marginRight: 8 }} />
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>
                  Email (Optional)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '8px 12px', background: 'var(--bg-primary)' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ marginRight: 8 }} />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>
                Password
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '8px 12px', background: 'var(--bg-primary)' }}>
                <Lock size={16} color="var(--text-muted)" style={{ marginRight: 8 }} />
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="new-chat-btn"
              style={{ margin: '8px 0 0', width: '100%' }}
              disabled={loading}
            >
              {isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
              <span>{isRegister ? 'Register' : 'Sign In'}</span>
            </button>
          </form>

          <div style={{ textAlign: 'center', margin: '14px 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            or
          </div>

          <button
            type="button"
            className="footer-btn"
            style={{ justifyContent: 'center' }}
            onClick={handleGuestSession}
            disabled={loading}
          >
            Continue as Guest
          </button>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {isRegister ? 'Already have an account?' : "Don't have an account?"}
            </span>{' '}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
            >
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

