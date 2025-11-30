import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
    variant?: 'default' | 'cyan' | 'red' | 'neon'
}

export function Spinner({ size = 'md', className, variant = 'cyan' }: SpinnerProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    }

    const colorClasses = {
        default: 'text-slate-200',
        cyan: 'text-cyan-400',
        red: 'text-red-500',
        neon: 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]'
    }

    return (
        <div className="flex items-center justify-center">
            <Loader2
                className={cn(
                    "animate-spin",
                    sizeClasses[size],
                    colorClasses[variant],
                    className
                )}
            />
        </div>
    )
}
