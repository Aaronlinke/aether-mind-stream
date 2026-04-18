import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", this.props.label || "", error, info);
  }

  reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
          <div className="text-sm font-medium">Modul konnte nicht geladen werden</div>
          <div className="text-[11px] text-muted-foreground max-w-sm">
            {this.props.label ? `${this.props.label}: ` : ""}
            {this.state.message || "Unbekannter Fehler"}
          </div>
          <button
            onClick={this.reset}
            className="text-[10px] px-3 py-1 border border-border hover:bg-muted transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
