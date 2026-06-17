import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ zIndex: 1000 }}
        >
          <motion.div
            className="modal"
            style={{ maxWidth: 400, padding: 32 }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: "var(--status-active-bg)",
                  color: "var(--status-active-text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                }}
              >
                <AlertCircle size={32} />
              </div>

              <h2
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 24,
                  marginBottom: 12,
                  fontWeight: 700,
                }}
              >
                {title || "Are you sure?"}
              </h2>

              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 15,
                  lineHeight: 1.6,
                  marginBottom: 32,
                }}
              >
                {message || "This action cannot be undone."}
              </p>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    background: "var(--status-active-text)",
                    boxShadow: "0 4px 0 rgba(255,77,77,0.4)",
                  }}
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                >
                  Agree
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
