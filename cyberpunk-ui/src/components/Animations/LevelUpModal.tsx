import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { Zap } from 'lucide-react'

interface LevelUpModalProps {
    newLevel: number
    onClose: () => void
}

export default function LevelUpModal({ newLevel, onClose }: LevelUpModalProps) {
    useEffect(() => {
        // Trigger confetti
        const duration = 3000
        const end = Date.now() + duration

        const frame = () => {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#22d3ee', '#d946ef', '#facc15']
            })
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#22d3ee', '#d946ef', '#facc15']
            })

            if (Date.now() < end) {
                requestAnimationFrame(frame)
            }
        }

        frame()
    }, [])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative flex flex-col items-center justify-center p-12 max-w-md w-full text-center space-y-8">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full pointer-events-none animate-pulse" />

                <div className="relative z-10 space-y-2">
                    <h2 className="text-6xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-600 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-bounce">
                        LEVEL UP!
                    </h2>
                    <div className="text-2xl font-mono text-cyan-400 tracking-widest uppercase">
                        System Upgrade Complete
                    </div>
                </div>

                <div className="relative z-10 flex items-center justify-center w-32 h-32 bg-slate-900 rounded-full border-4 border-cyan-500 shadow-[0_0_30px_rgba(34,211,238,0.5)]">
                    <Zap className="w-16 h-16 text-yellow-400 fill-current animate-pulse" />
                    <div className="absolute -bottom-4 bg-slate-900 px-4 py-1 rounded-full border border-cyan-500 text-xl font-bold text-white font-mono">
                        LVL {newLevel}
                    </div>
                </div>

                <div className="relative z-10 pt-4">
                    <Button
                        size="lg"
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono px-8 py-6 text-lg shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                        onClick={onClose}
                    >
                        ACKNOWLEDGE_UPGRADE
                    </Button>
                </div>
            </div>
        </div>
    )
}
