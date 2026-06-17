import { TrendingDown, CheckCircle, Search, EyeOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const renderAmount = (amount, isLarge = true) => {
  const formatted = parseFloat(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        letterSpacing: "-0.01em",
      }}
    >
      <span
        style={{
          marginRight: isLarge ? "10px" : "6px",
          fontWeight: 400,
          opacity: 0.75,
          fontSize: "0.85em",
          color: "var(--text-secondary)",
          letterSpacing: "normal",
        }}
      >
        ₱
      </span>
      <span>{formatted}</span>
    </span>
  );
};

export default function SummaryStats({
  totals,
  filteredTotals,
  searchLabel,
  onClose,
  onLockClick,
}) {
  const isFiltered = !!(searchLabel && filteredTotals);

  return (
    <div className="modal-overlay" style={{ zIndex: 300 }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="modal modal-stats"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--accent-light)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 12px var(--accent-light)",
              }}
            >
              <TrendingDown size={18} />
            </div>
            <h2
              className="modal-title"
              style={{
                fontSize: 24,
                margin: 0,
                letterSpacing: "-0.5px",
                fontWeight: 800,
              }}
            >
              Financial Overview
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={onLockClick}
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                padding: "8px 16px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--status-danger)";
                e.currentTarget.style.borderColor = "var(--status-danger)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
              title="Lock Statistics"
            >
              <EyeOff size={14} />
              <span>Lock Overview</span>
            </button>

            <button
              className="modal-close-btn"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--border)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div>
          {/* Active Search Filtered Stats */}
          <AnimatePresence>
            {isFiltered && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                  marginBottom: 24,
                }}
              >
                {/* Search Term Banner */}
                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 24px",
                    background: "var(--accent-light)",
                    border: "1px solid var(--accent)",
                    borderRadius: 16,
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--accent)",
                    letterSpacing: "-0.2px",
                  }}
                >
                  <Search size={16} />
                  Results for&nbsp;
                  <span style={{ fontWeight: 900 }}>"{searchLabel}"</span>
                  &nbsp;—&nbsp;
                  {filteredTotals.activeCount +
                    filteredTotals.partialCount +
                    filteredTotals.paidCount}{" "}
                  customer(s) found
                </div>

                {/* Filtered Outstanding Card */}
                <div
                  style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 20,
                    padding: "24px 32px",
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: "var(--status-active-bg)",
                      color: "var(--status-active-text)",
                      display: "flex",
                      alignItems: "center",
                      justifycontent: "center",
                      flexShrink: 0,
                      justifyContent: "center",
                    }}
                  >
                    <TrendingDown size={22} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 6,
                      }}
                    >
                      Total Outstanding
                    </div>
                    <div
                      style={{
                        fontSize: "clamp(24px, 3vw, 32px)",
                        fontWeight: 900,
                        color: "var(--text-primary)",
                      }}
                    >
                      {renderAmount(filteredTotals.totalBalance, false)}
                    </div>
                  </div>
                </div>

                {/* Filtered Collected Card */}
                <div
                  style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 20,
                    padding: "24px 32px",
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: "var(--status-paid-bg)",
                      color: "var(--status-paid-text)",
                      display: "flex",
                      alignItems: "center",
                      justifycontent: "center",
                      flexShrink: 0,
                      justifyContent: "center",
                    }}
                  >
                    <CheckCircle size={22} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 6,
                      }}
                    >
                      Total Collected
                    </div>
                    <div
                      style={{
                        fontSize: "clamp(24px, 3vw, 32px)",
                        fontWeight: 900,
                        color: "var(--text-primary)",
                      }}
                    >
                      {renderAmount(filteredTotals.totalAdvance, false)}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Stats Cards Grid */}
          <div className="stats-grid">
            {/* Left Card: Total Outstanding */}
            <div
              className="stat-box"
              style={{
                display: "flex",
                flexDirection: "column",
                padding: 32,
                minHeight: 220,
                justifyContent: "space-between",
              }}
            >
              <div
                className="stat-box-header"
                style={{
                  marginBottom: 24,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  className="stat-box-title"
                  style={{
                    fontSize: 14,
                    color: "var(--text-muted)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Total Outstanding
                </span>
                <div
                  className="row-avatar"
                  style={{
                    background: "var(--status-active-bg)",
                    color: "var(--status-active-text)",
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TrendingDown size={18} />
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  paddingBottom: 8,
                }}
              >
                <div
                  className="stat-box-value"
                  style={{
                    fontSize: "clamp(32px, 3.5vw, 44px)",
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    lineHeight: 1.1,
                  }}
                >
                  {renderAmount(totals?.totalBalance || 0)}
                </div>
                <div style={{ marginTop: 16 }}>
                  <span
                    className="stat-sub-value"
                    style={{
                      marginLeft: 0,
                      background: "var(--status-paid-bg)",
                      color: "var(--status-paid-text)",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Outstanding Customers
                  </span>
                </div>
              </div>
            </div>

            {/* Right Card: Total Collected */}
            <div
              className="stat-box"
              style={{
                display: "flex",
                flexDirection: "column",
                padding: 32,
                minHeight: 220,
                justifyContent: "space-between",
              }}
            >
              <div
                className="stat-box-header"
                style={{
                  marginBottom: 24,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  className="stat-box-title"
                  style={{
                    fontSize: 14,
                    color: "var(--text-muted)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Total Collected
                </span>
                <div
                  className="row-avatar"
                  style={{
                    background: "var(--status-paid-bg)",
                    color: "var(--status-paid-text)",
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle size={18} />
                </div>
              </div>

              <div>
                <div
                  className="stat-box-value"
                  style={{
                    fontSize: "clamp(32px, 3.5vw, 44px)",
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    lineHeight: 1.1,
                    marginBottom: 8,
                  }}
                >
                  {renderAmount(totals?.totalAdvance || 0)}
                </div>
                <div style={{ marginTop: 12 }}>
                  <span
                    className="stat-sub-value"
                    style={{
                      marginLeft: 0,
                      background: "var(--status-paid-bg)",
                      color: "var(--status-paid-text)",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Total Recovery
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 3,
                    height: 8,
                    marginTop: 24,
                    borderRadius: 4,
                    overflow: "hidden",
                    background: "var(--border)",
                  }}
                >
                  <div
                    style={{
                      flex: totals?.activeCount || 1,
                      background: "var(--status-active-text)",
                    }}
                  ></div>
                  <div
                    style={{
                      flex: totals?.partialCount || 0,
                      background: "var(--accent)",
                    }}
                  ></div>
                  <div
                    style={{
                      flex: totals?.paidCount || 0,
                      background: "var(--status-paid-text)",
                    }}
                  ></div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 16,
                    fontSize: 12,
                    color: "var(--text-muted)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <div
                      className="dot active"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--status-active-text)",
                      }}
                    ></div>{" "}
                    Outstanding: {totals?.activeCount || 0}
                  </span>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <div
                      className="dot partial"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--accent)",
                      }}
                    ></div>{" "}
                    Partial: {totals?.partialCount || 0}
                  </span>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <div
                      className="dot paid"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--status-paid-text)",
                      }}
                    ></div>{" "}
                    Paid: {totals?.paidCount || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
