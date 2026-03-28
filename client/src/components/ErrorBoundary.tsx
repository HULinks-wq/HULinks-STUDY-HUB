import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-center px-6 py-12 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              This section encountered an unexpected error. Your other data is safe.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-muted-foreground/60 font-mono mt-2 break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
          <Button
            onClick={this.reset}
            variant="outline"
            className="gap-2 rounded-xl mt-2"
            data-testid="button-error-retry"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
