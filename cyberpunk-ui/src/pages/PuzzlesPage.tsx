import SudokuGame from '@/components/Puzzles/SudokuGame'
import { Card } from '@/components/ui/card'
import { Puzzle } from 'lucide-react'

export default function PuzzlesPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-3">
                    <Puzzle className="w-8 h-8 text-cyan-400" />
                    NEURAL PUZZLES
                </h1>
                <p className="text-slate-400 max-w-2xl">
                    Sharpen your cognitive subroutines with these classic logic puzzles.
                    Completing puzzles helps calibrate your neural interface.
                </p>
            </div>

            <Card className="bg-slate-900/40 border-cyan-500/20 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                    <h2 className="text-xl font-mono text-cyan-100">Active Protocol: SUDOKU</h2>
                    <span className="px-3 py-1 bg-cyan-950/50 text-cyan-400 text-xs font-mono rounded-full border border-cyan-500/20">
                        V 1.0.0
                    </span>
                </div>

                <SudokuGame />
            </Card>
        </div>
    )
}
