import { useState } from 'react'
import SudokuGame from '@/components/Puzzles/SudokuGame'
import ZipGame from '@/components/Puzzles/ZipGame'
import ZipLeaderboard from '@/components/Puzzles/ZipLeaderboard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Puzzle, Grid3X3, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

type PuzzleType = 'sudoku' | 'zip';

export default function PuzzlesPage() {
    const [activePuzzle, setActivePuzzle] = useState<PuzzleType>('zip');

    const handleZipComplete = (score: { levelId: string; timeMs: number }) => {
        // Save to local storage
        const currentBests = JSON.parse(localStorage.getItem('zip_personal_bests') || '{}');
        const previousBest = currentBests[score.levelId];

        if (!previousBest || score.timeMs < previousBest) {
            currentBests[score.levelId] = score.timeMs;
            localStorage.setItem('zip_personal_bests', JSON.stringify(currentBests));
            // Trigger storage event for leaderboard to update (since it's in same window, we need custom event)
            window.dispatchEvent(new Event('zip-score-updated'));
        }
    };

    return (
        <div className="space-y-6 h-full overflow-y-auto pr-2">
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

            <div className="flex gap-4">
                <Button
                    onClick={() => setActivePuzzle('sudoku')}
                    className={cn(
                        "font-mono transition-all",
                        activePuzzle === 'sudoku'
                            ? "bg-cyan-600 text-white shadow-[0_0_15px_rgba(8,145,178,0.5)]"
                            : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                    )}
                >
                    <Grid3X3 className="mr-2 w-4 h-4" /> SUDOKU
                </Button>
                <Button
                    onClick={() => setActivePuzzle('zip')}
                    className={cn(
                        "font-mono transition-all",
                        activePuzzle === 'zip'
                            ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]"
                            : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                    )}
                >
                    <Zap className="mr-2 w-4 h-4" /> ZIP LINK
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className="bg-slate-900/40 border-cyan-500/20 p-6 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Puzzle className="w-64 h-64" />
                        </div>

                        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4 relative z-10">
                            <h2 className="text-xl font-mono text-cyan-100 uppercase">
                                Active Protocol: {activePuzzle}
                            </h2>
                            <span className="px-3 py-1 bg-cyan-950/50 text-cyan-400 text-xs font-mono rounded-full border border-cyan-500/20">
                                V 2.4.0
                            </span>
                        </div>

                        <div className="flex justify-center relative z-10">
                            {activePuzzle === 'sudoku' ? (
                                <SudokuGame />
                            ) : (
                                <ZipGame onComplete={handleZipComplete} />
                            )}
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    {activePuzzle === 'zip' && <ZipLeaderboard />}
                    {activePuzzle === 'sudoku' && (
                        <Card className="h-full bg-slate-900/20 border-slate-800/50 flex items-center justify-center p-8">
                            <div className="text-center text-slate-500">
                                <Grid3X3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="font-mono text-sm">Sudoku Leaderboard<br />Offline</p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
