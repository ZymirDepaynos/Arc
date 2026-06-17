import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { verifyPassword } from "../utils/auth";

export default function PasswordModal({
  open,
  onClose,
  onSuccess,
  action = "continue",
}) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0); // increment to re-trigger shake
  const [lockRemaining, setLockRemaining] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setShowPw(false);
      setError("");
      setLoading(false);
      setLockRemaining(0);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  useEffect(() => {
    if (lockRemaining <= 0) return;
    const t = setInterval(() => {
      setLockRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          setError("");
          return 0;
        }
        const next = prev - 1;
        setError(`Too many attempts. Try again in ${next}s.`);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [lockRemaining]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim() || loading || lockRemaining > 0) return;

    setLoading(true);
    const result = await verifyPassword(password);
    setLoading(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setShakeKey((k) => k + 1);
      setPassword("");
      if (result.locked) {
        setLockRemaining(result.remaining);
        setError(`Too many attempts. Try again in ${result.remaining}s.`);
      } else {
        setError(
          `Incorrect password. ${result.attemptsLeft} attempt${result.attemptsLeft !== 1 ? "s" : ""} left.`,
        );
      }
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  const isLocked = lockRemaining > 0;

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
            key={`pw-modal-${shakeKey}`}
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
            {}
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
                  {isLocked ? (
                    <ShieldAlert size={18} color="#ef4444" />
                  ) : (
                    <Lock size={18} color="var(--accent)" />
                  )}
                </div>
                <h2
                  className="modal-title"
                  style={{ whiteSpace: "nowrap", fontSize: 18 }}
                >
                  Password Required
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
              Enter your password.
            </p>

            <form onSubmit={handleSubmit}>
              {}
              <div
                className="form-group floating-group"
                style={{ position: "relative", marginBottom: 0 }}
              >
                <input
                  ref={inputRef}
                  className="form-input"
                  type={showPw ? "text" : "password"}
                  placeholder=" "
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (!isLocked) setError("");
                  }}
                  disabled={isLocked}
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
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
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      fontSize: 13,
                      color: isLocked ? "#f97316" : "#ef4444",
                      fontWeight: 600,
                      marginTop: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {isLocked && <ShieldAlert size={14} />}
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {}
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
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
                  disabled={loading || isLocked || !password.trim()}
                >
                  {loading
                    ? "Checking…"
                    : isLocked
                      ? `Locked (${lockRemaining}s)`
                      : "Confirm"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
