import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "../lib/api";
import { ShieldAlert, X } from "lucide-react";
import logoUrl from "../assets/logo.png";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showRecreateModal, setShowRecreateModal] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [recreateError, setRecreateError] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!email.trim() || !password.trim()) return;

    if (isSignUp) {
      if (password.length < 6) {
        setLoginError("Password must be at least 6 characters");
        return;
      }
      if (password !== confirmPw) {
        setLoginError("Passwords do not match");
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await api.post("/api/auth/signup", { email, password });
        toast.success("Account created! You can now log in.");
        setIsSignUp(false);
        setPassword("");
        setConfirmPw("");
      } else {
        const res = await api.post("/api/auth/login", { email, password });
        const { session } = res.data;
        localStorage.setItem("bv_session_token", session.access_token);
        localStorage.setItem("bv_user", JSON.stringify(session.user));
        toast.success("Welcome back!");
        // Refresh page to load app
        window.location.hash = "#/";
        window.location.reload();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      if (isSignUp && errorMsg === "Account already exists") {
        setShowRecreateModal(true);
        setRecreateError("");
      } else {
        setLoginError(errorMsg || "Incorrect username or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecreate = async (e) => {
    e.preventDefault();
    if (!currentUsername.trim() || !currentPw.trim()) return;

    setLoading(true);
    setRecreateError("");
    try {
      await api.post("/api/auth/recreate", {
        email,
        current_username: currentUsername,
        current_password: currentPw,
        new_password: password,
      });
      toast.success(
        "Account credentials successfully changed! Your data is safe. Please log in.",
      );
      setShowRecreateModal(false);
      setCurrentUsername("");
      setCurrentPw("");
      setIsSignUp(false);
      setPassword("");
      setConfirmPw("");
    } catch (err) {
      setRecreateError(
        err.response?.data?.error || "Failed to overwrite account",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-page)",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,107,0,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-15%",
          left: "-10%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,107,0,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{
          width: "100%",
          maxWidth: 420,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <img
              src={logoUrl}
              alt="Basic Ventures Logo"
              style={{
                width: "100%",
                maxWidth: "300px",
                height: "auto",
                borderRadius: 8,
              }}
            />
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.5px",
              marginBottom: 8,
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            {isSignUp ? "Create an Account" : "Welcome Back"}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            {isSignUp
              ? "Get started with Basic Ventures"
              : "Sign in to access Basic Ventures"}
          </p>
        </div>

        <div
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            borderRadius: 24,
            padding: 32,
            boxShadow: "0 12px 48px rgba(0,0,0,0.3)",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div className="form-group floating-group">
              <input
                className="form-input"
                type="text"
                placeholder=" "
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLoginError("");
                }}
                required
                autoComplete="username"
                id="login-email"
              />
              <label className="floating-label">Username</label>
            </div>

            <div
              className="form-group floating-group"
              style={{ position: "relative" }}
            >
              <input
                className="form-input"
                type={showPw ? "text" : "password"}
                placeholder=" "
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError("");
                }}
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
                style={{ paddingRight: 44 }}
                id="login-password"
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
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>

            <AnimatePresence>
              {isSignUp && (
                <motion.div
                  className="form-group floating-group"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <input
                    className="form-input"
                    type={showPw ? "text" : "password"}
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

            <AnimatePresence>
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    fontSize: 13,
                    color: "#ef4444",
                    fontWeight: 600,
                    marginTop: -4,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ShieldAlert size={14} style={{ flexShrink: 0 }} />
                  <span>{loginError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 700,
                marginTop: 8,
                position: "relative",
                overflow: "hidden",
              }}
              id="login-submit"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  style={{
                    width: 20,
                    height: 20,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#FFFFFF",
                    borderRadius: "50%",
                  }}
                />
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div
            style={{
              textAlign: "center",
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setPassword("");
                setConfirmPw("");
                setLoginError("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.color = "var(--accent)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--text-muted)")}
              id="login-toggle-mode"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showRecreateModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ zIndex: 10000 }}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              style={{ maxWidth: 400, width: "100%" }}
            >
              <div className="modal-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "#fee2e2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ShieldAlert size={18} color="#ef4444" />
                  </div>
                  <h2 className="modal-title">Recreate Account?</h2>
                </div>
                <button
                  className="btn-icon"
                  onClick={() => setShowRecreateModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-muted)",
                  marginBottom: 20,
                  lineHeight: 1.5,
                }}
              >
                An account already exists on this machine.
                <br />
                <br />
                If you proceed,{" "}
                <strong>
                  your login credentials will be overwritten
                </strong> with {email}, but{" "}
                <strong>ALL YOUR PREVIOUS DATA WILL BE PRESERVED</strong>.
                <br />
                <br />
                To confirm this change, please enter the{" "}
                <strong>current</strong> username and password for the existing
                account.
              </p>

              <form
                onSubmit={handleRecreate}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div className="form-group floating-group">
                  <input
                    className="form-input"
                    type="text"
                    placeholder=" "
                    value={currentUsername}
                    onChange={(e) => setCurrentUsername(e.target.value)}
                    required
                    autoFocus
                  />
                  <label className="floating-label">Current Username</label>
                </div>

                <div className="form-group floating-group">
                  <input
                    className="form-input"
                    type="password"
                    placeholder=" "
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    required
                  />
                  <label className="floating-label">Current Password</label>
                </div>

                <AnimatePresence>
                  {recreateError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        fontSize: 13,
                        color: "#ef4444",
                        fontWeight: 600,
                      }}
                    >
                      {recreateError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => setShowRecreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Overwrite Credentials"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
