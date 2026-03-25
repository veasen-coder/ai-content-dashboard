"use client";
import { Component, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; name?: string; }
interface State { hasError: boolean; error?: Error; }

export class TabErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center", color: "#9a9a9a" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h3 style={{ color: "#f5f0e6", fontSize: 16, marginBottom: 8 }}>
            {this.props.name ?? "This section"} encountered an error
          </h3>
          <p style={{ fontSize: 13, marginBottom: 16, maxWidth: 400, margin: "0 auto 16px" }}>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}
            style={{ background: "#bbf088", color: "#0a0a0a", border: "none", padding: "8px 20px", borderRadius: 5, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
