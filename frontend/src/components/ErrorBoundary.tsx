import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to error reporting service (e.g., Sentry)
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({
            error,
            errorInfo,
        });

        // You can also log the error to an error reporting service here
        // logErrorToService(error, errorInfo);
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                    <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12">
                        <div className="flex flex-col items-center text-center">
                            {/* Error Icon */}
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <AlertTriangle className="w-10 h-10 text-red-600" />
                            </div>

                            {/* Error Title */}
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                Oops! Something went wrong
                            </h1>

                            {/* Error Message */}
                            <p className="text-gray-600 text-lg mb-8 max-w-md">
                                We encountered an unexpected error. Don't worry, we're on it!
                            </p>

                            {/* Error Details (only in development) */}
                            {import.meta.env.DEV && this.state.error && (
                                <div className="w-full bg-gray-50 rounded-lg p-6 mb-8 text-left">
                                    <h3 className="font-semibold text-gray-900 mb-2">Error Details:</h3>
                                    <p className="text-sm text-red-600 font-mono mb-4">
                                        {this.state.error.toString()}
                                    </p>
                                    {this.state.errorInfo && (
                                        <div className="max-h-48 overflow-auto">
                                            <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                                <button
                                    onClick={this.handleReset}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                    Try Again
                                </button>
                                <button
                                    onClick={this.handleGoHome}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 transform hover:scale-105"
                                >
                                    <Home className="w-5 h-5" />
                                    Go Home
                                </button>
                            </div>

                            {/* Support Message */}
                            <p className="text-sm text-gray-500 mt-8">
                                If this problem persists, please{' '}
                                <a href="/contact" className="text-blue-600 hover:underline">
                                    contact support
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
