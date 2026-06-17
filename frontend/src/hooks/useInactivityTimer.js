import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import toast from "react-hot-toast";

const ACTIVITY_KEY = "arc_last_activity";
const TIMEOUT_KEY = "arc_session_timeout";
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

export function useInactivityTimer() {
  const { user, signOut } = useAuth();
  const timerRef = useRef(null);
  const timeoutMsRef = useRef(DEFAULT_TIMEOUT_MS);

  const recordActivity = useCallback(() => {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (document.visibilityState !== "visible") return;

      const timeoutMs = timeoutMsRef.current;
      if (!timeoutMs) return;

      const lastActivity = parseInt(
        localStorage.getItem(ACTIVITY_KEY) || "0",
        10,
      );
      const elapsed = Date.now() - lastActivity;

      if (elapsed >= timeoutMs) {
        clearInterval(timerRef.current);
        toast("Session expired. Signing you out...", { icon: "🔒" });
        signOut();
      }
    }, 30000);
  }, [signOut]);

  useEffect(() => {
    if (!user) return;

    const loadTimeout = async () => {
      try {
        const cached = localStorage.getItem(TIMEOUT_KEY);
        if (cached !== null) {
          timeoutMsRef.current = parseInt(cached, 10);
        }

        const res = await api.get("/api/settings/session_timeout");
        const saved = parseInt(res.data?.value, 10);
        if (!isNaN(saved)) {
          timeoutMsRef.current = saved;
          localStorage.setItem(TIMEOUT_KEY, String(saved));
        }
      } catch (e) {
        if (e.response?.status !== 404) {
          console.error("Failed to load session timeout setting", e);
        }
      }
    };

    loadTimeout();
    recordActivity();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        recordActivity();
      }
    };

    const handleFocus = () => {
      recordActivity();
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, recordActivity, { passive: true }),
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    startTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, recordActivity),
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, recordActivity, signOut, startTimer]);

  const updateTimeout = useCallback(
    async (ms) => {
      timeoutMsRef.current = ms;
      localStorage.setItem(TIMEOUT_KEY, String(ms));
      localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
      await api.put("/api/settings/session_timeout", { value: String(ms) });
      startTimer();
    },
    [startTimer],
  );

  return { updateTimeout, timeoutMsRef };
}
