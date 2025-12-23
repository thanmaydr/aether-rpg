import { useState, useEffect, useCallback } from 'react'
import { Sudoku, type Board, type Difficulty } from '@/lib/sudoku'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RefreshCw, Trophy } from 'lucide-react'
import { toast } from 'sonner'

export default function SudokuGame() {
    const [game] = useState(() => new Sudoku())
    const [board, setBoard] = useState<Board>([])
    const [selectedCell, setSelectedCell] = useState<{ r: number, c: number } | null>(null)
    const [difficulty, setDifficulty] = useState<Difficulty>('EASY')
    const [mistakes, setMistakes] = useState(0)
    const [isComplete, setIsComplete] = useState(false)

    const startNewGame = useCallback(() => {
        const newBoard = game.generate(difficulty)
        setBoard(newBoard)
        setMistakes(0)
        setIsComplete(false)
        setSelectedCell(null)
    }, [difficulty, game])

    useEffect(() => {
        startNewGame()
    }, [startNewGame])

    const handleCellClick = (r: number, c: number) => {
        setSelectedCell({ r, c })
    }

    const handleNumberInput = (num: number) => {
        if (!selectedCell || isComplete) return

        const { r, c } = selectedCell
        const cell = board[r][c]

        if (cell.isInitial) return

        if (num === 0) {
            // Clear cell
            const newBoard = [...board.map(row => [...row])]
            newBoard[r][c] = { ...cell, value: null }
            setBoard(newBoard)
            return
        }

        // Validate move
        game.validateMove(board, r, c, num)
        const solutionVal = game.getSolutionAt(r, c)

        if (solutionVal !== num) {
            setMistakes(prev => prev + 1)
            toast.error("Incorrect number!")
            return
        }

        const newBoard = [...board.map(row => [...row])]
        newBoard[r][c] = { ...cell, value: num }
        setBoard(newBoard)

        if (game.checkWin(newBoard)) {
            setIsComplete(true)
            toast.success("Puzzle Completed! 🎉")
        }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!selectedCell) return

        if (e.key >= '1' && e.key <= '9') {
            handleNumberInput(parseInt(e.key))
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            handleNumberInput(0)
        } else if (e.key.startsWith('Arrow')) {
            // Handle navigation
            const { r, c } = selectedCell;
            if (e.key === 'ArrowUp') setSelectedCell({ r: Math.max(0, r - 1), c });
            if (e.key === 'ArrowDown') setSelectedCell({ r: Math.min(8, r + 1), c });
            if (e.key === 'ArrowLeft') setSelectedCell({ r, c: Math.max(0, c - 1) });
            if (e.key === 'ArrowRight') setSelectedCell({ r, c: Math.min(8, c + 1) });
        }
    }

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedCell, board, isComplete])

    return (
        <div className="flexflex-col items-center gap-8 max-w-4xl mx-auto p-4">

            {/* Header / Controls */}
            <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50 p-6 rounded-xl border border-cyan-500/20">
                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                        {(['EASY', 'MEDIUM', 'HARD', 'EXPERT'] as Difficulty[]).map((d) => (
                            <Button
                                key={d}
                                variant={difficulty === d ? "default" : "outline"}
                                size="sm"
                                onClick={() => setDifficulty(d)}
                                className={cn(
                                    "font-mono text-xs transition-all duration-200",
                                    difficulty === d
                                        ? "bg-cyan-600 hover:bg-cyan-500 text-white border-transparent"
                                        : "text-slate-400 border-slate-700 bg-slate-900/50 hover:text-cyan-400 hover:border-cyan-500 hover:bg-slate-800"
                                )}
                            >
                                {d}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-6 font-mono text-sm">
                    <div className="text-red-400">
                        Mistakes: <span className="font-bold text-white">{mistakes}/3</span>
                    </div>
                    <Button onClick={startNewGame} size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2">
                        <RefreshCw className="w-4 h-4" />
                        New Game
                    </Button>
                </div>
            </div>

            {/* Game Board */}
            <div className="relative aspect-square w-full max-w-[500px] bg-slate-950 p-1 rounded-lg border-2 border-slate-700 shadow-2xl">
                <div className="grid grid-cols-9 h-full w-full gap-[1px] bg-slate-700 border-2 border-slate-700">
                    {board.map((row, rIndex) => (
                        row.map((cell, cIndex) => {
                            const isSelected = selectedCell?.r === rIndex && selectedCell?.c === cIndex
                            const isBoxRight = (cIndex + 1) % 3 === 0 && cIndex !== 8
                            const isBoxBottom = (rIndex + 1) % 3 === 0 && rIndex !== 8

                            return (
                                <div
                                    key={`${rIndex}-${cIndex}`}
                                    onClick={() => handleCellClick(rIndex, cIndex)}
                                    className={cn(
                                        "flex items-center justify-center text-xl font-mono cursor-pointer transition-colors duration-200 select-none",
                                        "bg-slate-900 hover:bg-slate-800",
                                        cell.isInitial ? "text-slate-400 font-bold" : "text-cyan-400",
                                        isSelected && "bg-cyan-900/40 ring-1 ring-inset ring-cyan-500",
                                        isBoxRight && "border-r-2 border-r-slate-500",
                                        isBoxBottom && "border-b-2 border-b-slate-500",
                                        cell.value !== null && isSelected && "text-white"
                                    )}
                                >
                                    {cell.value}
                                </div>
                            )
                        })
                    ))}
                </div>

                {isComplete && (
                    <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm flex items-center justify-center flex-col gap-4 rounded-lg animate-in fade-in zoom-in duration-300">
                        <Trophy className="w-16 h-16 text-yellow-400 animate-bounce" />
                        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                            SOLVED!
                        </h2>
                        <Button onClick={startNewGame} size="lg" className="bg-cyan-600 hover:bg-cyan-500">
                            Play Again
                        </Button>
                    </div>
                )}
            </div>

            {/* Number Pad (Mobile/Convenience) */}
            <div className="grid grid-cols-9 gap-2 w-full max-w-[500px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <Button
                        key={num}
                        variant="secondary"
                        className="h-12 text-lg font-bold bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700"
                        onClick={() => handleNumberInput(num)}
                    >
                        {num}
                    </Button>
                ))}
            </div>
        </div>
    )
}
