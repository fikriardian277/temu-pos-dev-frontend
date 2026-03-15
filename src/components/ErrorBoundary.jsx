import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state biar render berikutnya nampilin UI Error
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Lu juga bisa nge-log error ini ke service kayak Sentry kalau mau
    console.error("💥 ERROR KETANGKAP BOUNDARY:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // UI Pengganti kalau layar mau blank putih
      return (
        <div
          style={{
            padding: "20px",
            fontFamily: "monospace",
            backgroundColor: "#fef2f2",
            color: "#991b1b",
            minHeight: "100vh",
            width: "100vw",
            boxSizing: "border-box",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              borderBottom: "2px solid #991b1b",
              paddingBottom: "10px",
            }}
          >
            🚨 APLIKASI CRASH BRE!
          </h2>

          <p style={{ fontWeight: "bold", marginTop: "20px" }}>Pesan Error:</p>
          <div
            style={{
              backgroundColor: "#fee2e2",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #f87171",
              overflowX: "auto",
            }}
          >
            {this.state.error && this.state.error.toString()}
          </div>

          <p style={{ fontWeight: "bold", marginTop: "20px" }}>
            Lokasi Error (Stack Trace):
          </p>
          <div
            style={{
              backgroundColor: "#fee2e2",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #f87171",
              overflowX: "auto",
              fontSize: "12px",
              whiteSpace: "pre-wrap",
            }}
          >
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </div>

          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "5px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Muat Ulang Halaman
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
