"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional custom fallback UI */
  fallback?: React.ReactNode;
  /** Section label for error message (e.g. "Practice Panel") */
  section?: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Structured error logging — in production connect to Sentry / Cloud Logging
    console.error("[ErrorBoundary]", {
      section: this.props.section ?? "unknown",
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <DefaultErrorFallback
          section={this.props.section}
          error={this.state.error}
          onReset={this.reset}
        />
      );
    }
    return this.props.children;
  }
}

function DefaultErrorFallback({
  section,
  error,
  onReset,
}: {
  section?: string;
  error: Error | null;
  onReset: () => void;
}) {
  return (
    <Card className="border-red-500/30 bg-red-500/5">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <AlertTriangle className="h-10 w-10 text-red-400" />
        <div>
          <p className="font-semibold text-red-300">
            {section ? `${section} failed to load` : "Something went wrong"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error?.message ?? "An unexpected error occurred"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onReset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

/** Lightweight functional wrapper for common use */
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  options?: { section?: string; fallback?: React.ReactNode }
) {
  const Wrapped = (props: T) => (
    <ErrorBoundary section={options?.section} fallback={options?.fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${Component.displayName ?? Component.name})`;
  return Wrapped;
}
