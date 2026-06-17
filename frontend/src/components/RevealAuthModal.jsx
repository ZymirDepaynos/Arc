import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Eye, EyeOff, ShieldAlert, Mail } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function RevealAuthModal({ open, onClose, onSuccess }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const passwordInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setEmail(user?.email || "");
      setPassword("");
      setShowPw(false);
      setError("");
      setLoading(false);
      setTimeout(() => passwordInputRef.current?.focus(), 120);
    }
  }, [open, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      await api.post("/api/auth/login", { email: email.trim(), password });
      onSuccess();
      onClose();
    } catch (err) {
      setShakeKey((k) => k + 1);
      setPassword("");
      setError(
        err.response?.data?.error ||
          err.message ||
          "Incorrect email or password. Please try again.",
      );
      setTimeout(() => passwordInputRef.current?.focus(), 80);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ zIndex: 10000 }}
        >
          <motion.div
            key={`reveal-auth-modal-${shakeKey}`}
            className="modal"
            initial={{
              opacity: 0,
              scale: 0.95,
              y: 16,
              x: shakeKey > 0 ? [-8, 8, -8, 8, 0] : 0,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              x: shakeKey > 0 ? [0, -10, 10, -8, 8, -4, 4, 0] : 0,
            }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{
              duration: shakeKey > 0 ? 0.45 : 0.2,
              ease: "easeInOut",
            }}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 400, width: "100%" }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "var(--accent-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Lock size={18} color="var(--accent)" />
                </div>
                <h2
                  className="modal-title"
                  style={{ whiteSpace: "nowrap", fontSize: 18 }}
                >
                  Verify Identity
                </h2>
              </div>
              <button className="btn-icon" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <p
              style={{
                fontSize: 14,
                color: "var(--text-muted)",
                margin: "4px 0 20px",
              }}
            >
              Please enter your credentials to confirm your identity and reveal
              the customer records.
            </p>

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div
                className="form-group floating-group"
                style={{ position: "relative" }}
              >
                <input
                  className="form-input"
                  type="text"
                  placeholder=" "
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  required
                  autoComplete="username"
                  style={{ paddingRight: 40 }}
                />
                <label className="floating-label">Username</label>
                <div
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Mail size={16} />
                </div>
              </div>

              <div
                className="form-group floating-group"
                style={{ position: "relative" }}
              >
                <input
                  ref={passwordInputRef}
                  className="form-input"
                  type={showPw ? "text" : "password"}
                  placeholder=" "
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 40 }}
                />
                <label className="floating-label">Password</label>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      fontSize: 13,
                      color: "#ef4444",
                      fontWeight: 600,
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <ShieldAlert size={14} style={{ flexShrink: 0 }} />
                    <span style={{ lineHeight: "1.4" }}>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  disabled={loading || !email.trim() || !password.trim()}
                >
                  {loading ? "Verifying…" : "Confirm"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
