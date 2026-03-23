"use client";

import { useState, useEffect } from "react";
import { Zap } from "lucide-react";

const PASSWORD = "2004";
const STORAGE_KEY = "flogen_auth_ts";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ts = parseInt(stored, 10);
        if (!isNaN(ts) && Date.now() - ts < THIRTY_DAYS_MS) {
          setUnlocked(true);
        }
      }
    } catch {
      // localStorage not available
    }
  }, []);

  function attempt(value: string) {
    if (value === PASSWORD) {
      try {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      } catch {
        // ignore
      }
      setError("");
      setUnlocked(true);
    } else if (value.length === 4) {
      setError("Incorrect password");
      setPin("");
    }
  }

  function handlePadPress(digit: string) {
    if (error) setError("");
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      attempt(next);
    }
  }

  function handleBackspace() {
    setError("");
    setPin(p => p.slice(0, -1));
  }

  function handleTextEnter() {
    attempt(pin);
  }

  if (!mounted) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#0a0a0a",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: 320 }}>
        {/* Logo */}
        <div style={{
          width: 60, height: 60, background: "#bbf088",
          borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20,
        }}>
          <Zap size={28} color="#0a0a0a" strokeWidth={2.5} />
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f5f0e6", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
          Flogen AI
        </h1>
        <p style={{ fontSize: 13, color: "#9a9a9a", margin: "0 0 40px", letterSpacing: "0.01em" }}>
          Content OS — Private Dashboard
        </p>

        {/* PIN dots */}
        <div style={{ display: "flex", gap: 14, marginBottom: 32 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: "50%",
              background: i < pin.length ? "#bbf088" : "transparent",
              border: `2px solid ${i < pin.length ? "#bbf088" : "rgba(255,255,255,0.2)"}`,
              transition: "all 0.15s",
            }} />
          ))}
        </div>

        {/* Error */}
        <div style={{ height: 20, marginBottom: 16 }}>
          {error && (
            <p style={{ fontSize: 12.5, color: "#f87171", margin: 0, textAlign: "center" }}>{error}</p>
          )}
        </div>

        {/* PIN pad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: "100%" }}>
          {["1","2","3","4","5","6","7","8","9"].map(d => (
            <button key={d} onClick={() => handlePadPress(d)} style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#f5f0e6", fontSize: 20, fontWeight: 500,
              padding: "16px 0", borderRadius: 10, cursor: "pointer",
              transition: "all 0.1s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(187,240,136,0.1)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(187,240,136,0.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              {d}
            </button>
          ))}
          {/* Bottom row: backspace, 0, confirm */}
          <button onClick={handleBackspace} style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            color: "#9a9a9a", fontSize: 18, padding: "16px 0", borderRadius: 10, cursor: "pointer",
            transition: "all 0.1s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
          >
            ⌫
          </button>
          <button onClick={() => handlePadPress("0")} style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#f5f0e6", fontSize: 20, fontWeight: 500,
            padding: "16px 0", borderRadius: 10, cursor: "pointer",
            transition: "all 0.1s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(187,240,136,0.1)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(187,240,136,0.3)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
          >
            0
          </button>
          <button onClick={handleTextEnter} disabled={pin.length !== 4} style={{
            background: pin.length === 4 ? "#bbf088" : "rgba(187,240,136,0.08)",
            border: `1px solid ${pin.length === 4 ? "#bbf088" : "rgba(187,240,136,0.15)"}`,
            color: pin.length === 4 ? "#0a0a0a" : "#4a4a4a",
            fontSize: 16, fontWeight: 700,
            padding: "16px 0", borderRadius: 10, cursor: pin.length === 4 ? "pointer" : "default",
            transition: "all 0.15s",
          }}>
            ↵
          </button>
        </div>

        {/* Fallback text input */}
        <div style={{ marginTop: 32, width: "100%", display: "flex", gap: 8 }}>
          <input
            type="password"
            value={pin}
            onChange={e => {
              if (error) setError("");
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setPin(v);
              if (v.length === 4) attempt(v);
            }}
            placeholder="or type PIN…"
            style={{
              flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#f5f0e6", fontSize: 14, padding: "10px 14px", borderRadius: 8, outline: "none",
              fontFamily: "inherit",
            }}
            onKeyDown={e => { if (e.key === "Enter") handleTextEnter(); }}
          />
        </div>
      </div>
    </div>
  );
}
