import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
    }

    private handleReload = () => {
        window.location.reload()
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4">
                    <Card className="w-full max-w-md border-red-500/50 bg-slate-900/50 backdrop-blur">
                        <CardHeader className="flex flex-row items-center gap-2">
                            <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />
                            <CardTitle className="text-red-500 font-mono tracking-wider">
                                SYSTEM_CRITICAL_FAILURE
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-red-950/30 border border-red-900/50 rounded font-mono text-sm text-red-200">
                                <p className="mb-2">NEURAL_LINK_CORRUPTED</p>
                                <p className="text-xs opacity-70 break-all">
                                    {this.state.error?.message || 'Unknown error occurred'}
                                </p>
                            </div>
                            <Button
                                onClick={this.handleReload}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-mono group"
                            >
                                <RefreshCw className="mr-2 h-4 w-4 group-hover:animate-spin" />
                                REBOOT_SYSTEM
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )
        }

        return this.props.children
    }
}
