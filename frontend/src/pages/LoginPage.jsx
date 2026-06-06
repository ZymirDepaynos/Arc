import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    if (isSignUp) {
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPw) {
        toast.error('Passwords do not match');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Account created! You can now log in.');
        setIsSignUp(false);
        setPassword('');
        setConfirmPw('');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back!');
      }
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-page)',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,107,0,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        left: '-10%',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,107,0,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{
          width: '100%',
          maxWidth: 420,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C38 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 32px rgba(255, 107, 0, 0.3)',
            }}
          >
            <span style={{
              fontSize: 32,
              fontWeight: 900,
              color: '#FFFFFF',
              fontFamily: 'Montserrat, sans-serif',
              letterSpacing: '-1px',
            }}>A</span>
          </motion.div>

          <h1 style={{
            fontSize: 28,
            fontWeight: 900,
            color: 'var(--text-primary)',
            letterSpacing: '-0.5px',
            marginBottom: 8,
            fontFamily: 'Montserrat, sans-serif',
          }}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p style={{
            fontSize: 14,
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}>
            {isSignUp ? 'Set up your Arc account' : 'Sign in to your Arc dashboard'}
          </p>
        </div>

        <div style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 24,
          padding: 32,
          boxShadow: '0 12px 48px rgba(0,0,0,0.3)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group floating-group">
              <input
                className="form-input"
                type="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                id="login-email"
              />
              <label className="floating-label">Email Address</label>
            </div>

            <div className="form-group floating-group" style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPw ? 'text' : 'password'}
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                style={{ paddingRight: 44 }}
                id="login-password"
              />
              <label className="floating-label">Password</label>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text-muted)', padding: 4,
                  fontSize: 13, fontWeight: 600,
                }}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>

            <AnimatePresence>
              {isSignUp && (
                <motion.div
                  className="form-group floating-group"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <input
                    className="form-input"
                    type={showPw ? 'text' : 'password'}
                    placeholder=" "
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    required
                    autoComplete="new-password"
                    id="login-confirm-password"
                  />
                  <label className="floating-label">Confirm Password</label>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 700,
                marginTop: 8,
                position: 'relative',
                overflow: 'hidden',
              }}
              id="login-submit"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  style={{
                    width: 20, height: 20,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#FFFFFF',
                    borderRadius: '50%',
                  }}
                />
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div style={{
            textAlign: 'center',
            marginTop: 24,
            paddingTop: 20,
            borderTop: '1px solid var(--border)',
          }}>
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setPassword(''); setConfirmPw(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--accent)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
              id="login-toggle-mode"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
