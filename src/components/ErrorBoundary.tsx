import { Component, type ReactNode } from "react"

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: "red", fontFamily: "monospace" }}>
          <h1 style={{ fontSize: 24 }}>Application Error</h1>
          <pre style={{ 
            whiteSpace: "pre-wrap", 
            background: "#fff0f0", 
            padding: 16, 
            borderRadius: 8,
            marginTop: 16,
            fontSize: 14,
          }}>
            {this.state.error.message}
          </pre>
          <pre style={{
            whiteSpace: "pre-wrap",
            background: "#f5f5f5",
            padding: 16,
            borderRadius: 8,
            marginTop: 8,
            fontSize: 12,
            maxHeight: 400,
            overflow: "auto",
          }}>
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}