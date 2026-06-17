import React from "react";
import { motion } from "framer-motion";

export default function Loader({ text = "Loading..." }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "40vh",
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", gap: "8px" }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              y: ["0%", "-50%", "0%"],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "var(--accent)",
              borderRadius: "50%",
            }}
          />
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        style={{
          color: "var(--text-muted)",
          fontSize: "14px",
          fontWeight: 500,
        }}
      >
        {text}
      </motion.div>
    </div>
  );
}
