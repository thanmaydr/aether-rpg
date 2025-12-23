import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Play } from 'lucide-react';
import { ZIP_LEVELS } from '@/lib/zip-levels';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ZipGameProps {
    onComplete?: (score: { levelId: string; timeMs: number }) => void;
}

export default function ZipGame({ onComplete }: ZipGameProps) {
    const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
    const [grid, setGrid] = useState<(number | null)[][]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [path, setPath] = useState<{ r: number; c: number }[]>([]);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const timerRef = useRef<number | null>(null);

    const currentLevel = ZIP_LEVELS[currentLevelIndex];

    // Initialize level
    useEffect(() => {
        resetLevel();
    }, [currentLevelIndex]);

    // Timer logic
    useEffect(() => {
        if (startTime && !isComplete) {
            timerRef.current = window.setInterval(() => {
                setElapsed(Date.now() - startTime);
            }, 100);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [startTime, isComplete]);

    const resetLevel = () => {
        const rows = currentLevel.rows;
        const cols = currentLevel.cols;
        const newGrid = Array(rows).fill(null).map(() => Array(cols).fill(null));

        // Fill initial numbers
        Object.entries(currentLevel.initialGrid).forEach(([key, value]) => {
            const [r, c] = key.split(',').map(Number);
            newGrid[r][c] = value;
        });

        setGrid(newGrid);
        setPath([]);
        setIsComplete(false);
        setStartTime(null);
        setElapsed(0);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const isFixed = (r: number, c: number) => {
        return `${r},${c}` in currentLevel.initialGrid;
    };

    const isWallBlocked = (r1: number, c1: number, r2: number, c2: number) => {
        if (!currentLevel.walls) return false;

        // Find if there is a wall between cell 1 and cell 2
        // Case 1: Horizontal move
        if (r1 === r2) {
            const cMin = Math.min(c1, c2);
            // Blocked if wall is 'vertical' at r1, cMin
            return currentLevel.walls.some(w => w.type === 'vertical' && w.r === r1 && w.c === cMin);
        }
        // Case 2: Vertical move
        if (c1 === c2) {
            const rMin = Math.min(r1, r2);
            // Blocked if wall is 'horizontal' at rMin, c1
            return currentLevel.walls.some(w => w.type === 'horizontal' && w.r === rMin && w.c === c1);
        }
        return false;
    };

    const handleMouseDown = (r: number, c: number) => {
        if (isComplete) return;

        const cellValue = grid[r][c];

        if (cellValue === 1) {
            setStartTime(Date.now());
            setIsDrawing(true);
            setPath([{ r, c }]);
            // Clear any user-filled cells, keep fixed ones
            const newGrid = grid.map((row, rIdx) =>
                row.map((val, cIdx) => isFixed(rIdx, cIdx) ? val : null)
            );
            newGrid[r][c] = 1; // Should be fixed already but ensuring
            setGrid(newGrid);
        }
    };

    const handleMouseEnter = (r: number, c: number) => {
        if (!isDrawing || isComplete) return;

        const lastPos = path[path.length - 1];
        if (!lastPos) return;

        // Check adjacency
        const dr = Math.abs(r - lastPos.r);
        const dc = Math.abs(c - lastPos.c);
        if (dr + dc !== 1) return; // Not adjacent

        // Check Wall Barrier
        if (isWallBlocked(lastPos.r, lastPos.c, r, c)) return;

        // Check if we are backtracking (moving to previous cell)
        if (path.length > 1) {
            const prevPos = path[path.length - 2];
            if (prevPos.r === r && prevPos.c === c) {
                // Backtrack: Remove last step
                const newPath = path.slice(0, -1);
                setPath(newPath);

                // Clear the cell we just left (if it wasn't fixed)
                if (!isFixed(lastPos.r, lastPos.c)) {
                    const newGrid = [...grid];
                    newGrid[lastPos.r] = [...newGrid[lastPos.r]];
                    newGrid[lastPos.r][lastPos.c] = null;
                    setGrid(newGrid);
                }
                return;
            }
        }

        // Check overlap (cannot visit visited cell unless backtracking)
        if (grid[r][c] !== null && !isFixed(r, c)) return;

        // If it's a fixed cell, it MUST be the NEXT number in sequence
        const currentNum = grid[lastPos.r][lastPos.c]!;
        const nextNum = currentNum + 1;

        if (isFixed(r, c)) {
            if (grid[r][c] !== nextNum) return; // Wrong target
        }

        // Valid move
        const newPath = [...path, { r, c }];
        setPath(newPath);

        const newGrid = [...grid];
        newGrid[r] = [...newGrid[r]];
        newGrid[r][c] = nextNum;
        setGrid(newGrid);

        // Check win condition immediately if we hit max number
        if (nextNum === currentLevel.maxNumber) {
            const totalCells = currentLevel.rows * currentLevel.cols;
            if (newPath.length === totalCells) {
                handleWin();
            }
        }
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
    };

    const handleWin = () => {
        setIsComplete(true);
        if (timerRef.current) clearInterval(timerRef.current);
        const finalTime = Date.now() - (startTime || Date.now());
        toast.success("System Synchronized!", {
            description: `Protocol complete in ${(finalTime / 1000).toFixed(1)}s`
        });
        if (onComplete) {
            onComplete({
                levelId: currentLevel.id,
                timeMs: finalTime
            });
        }
    };

    const formatTime = (ms: number) => {
        const secs = Math.floor(ms / 1000);
        const mins = Math.floor(secs / 60);
        const remSecs = secs % 60;
        return `${mins}:${remSecs.toString().padStart(2, '0')}`;
    };

    // Calculate Grid Style to accommodate gaps for walls if needed (or just overlay)
    // We'll stick to Gap-1 (4px) and place absolute walls in those gaps.
    // Cell size 3rem (48px). Gap 0.25rem (4px).
    // Start of Cell(r,c) top-left relative to grid:
    // Left = c * (48 + 4) px
    // Top = r * (48 + 4) px

    // Wall Vertical at (r,c) (Right of cell):
    // Left = (c+1) * 48 + c * 4 = 48c + 48 + 4c = 52c + 48.
    // Actually, just overlay absolute position.
    // Let's rely on standard grid and just CSS border classes for simplicity? 
    // Wait, grid gap makes shared borders impossible.
    // We must use absolute divs for the walls.

    const cellSize = 48; // px (w-12)
    const gapSize = 4;   // px (gap-1)

    return (
        <div className="flex flex-col items-center select-none" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <div className="flex justify-between w-full max-w-sm mb-4 items-center">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-400 font-bold">{currentLevel.name}</span>
                    <span className="text-xs text-slate-500 font-mono">({currentLevel.rows}x{currentLevel.cols})</span>
                </div>
                <div className="font-mono text-xl text-yellow-400 font-bold">
                    {formatTime(elapsed)}
                </div>
            </div>

            <div className="relative bg-slate-800 p-2 rounded-lg border border-slate-700 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                {/* Walls Overlay */}
                {currentLevel.walls?.map((wall, idx) => {
                    const top = wall.r * (cellSize + gapSize) + 8; // +8 for p-2 (padding)
                    const left = wall.c * (cellSize + gapSize) + 8;

                    if (wall.type === 'horizontal') {
                        // Wall BELOW cell (r,c)
                        return (
                            <div
                                key={`wall-h-${idx}`}
                                className="absolute bg-slate-300 h-1 z-10 rounded-full shadow-[0_0_2px_rgba(255,255,255,0.8)]"
                                style={{
                                    top: top + cellSize + gapSize / 2 - 2, // Centered in gap below
                                    left: left - 2,
                                    width: cellSize + 4,
                                }}
                            />
                        );
                    } else {
                        // Wall RIGHT of cell (r,c)
                        return (
                            <div
                                key={`wall-v-${idx}`}
                                className="absolute bg-slate-300 w-1 z-10 rounded-full shadow-[0_0_2px_rgba(255,255,255,0.8)]"
                                style={{
                                    top: top - 2,
                                    left: left + cellSize + gapSize / 2 - 2, // Centered in gap right
                                    height: cellSize + 4,
                                }}
                            />
                        );
                    }
                })}

                <div
                    className="grid gap-1"
                    style={{
                        gridTemplateColumns: `repeat(${currentLevel.cols}, minmax(0, 1fr))`
                    }}
                >
                    {grid.map((row, r) => (
                        row.map((val, c) => {
                            const fixed = isFixed(r, c);
                            const isStart = val === 1;
                            const isEnd = val === currentLevel.maxNumber;
                            const inPath = val !== null;

                            return (
                                <div
                                    key={`${r}-${c}`}
                                    onMouseDown={() => handleMouseDown(r, c)}
                                    onMouseEnter={() => handleMouseEnter(r, c)}
                                    className={cn(
                                        "w-12 h-12 flex items-center justify-center font-mono font-bold text-lg rounded cursor-pointer transition-all duration-200 z-0",
                                        fixed ? "bg-slate-900 border-2 border-slate-600" : "bg-slate-900/50 border border-slate-700",
                                        inPath && !fixed && "bg-cyan-900/40 text-cyan-50 border-cyan-500/50",
                                        isStart && "bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(8,145,178,0.5)]",
                                        isEnd && "bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(147,51,234,0.5)]",
                                        fixed && !isStart && !isEnd && "text-slate-400",
                                        val && !fixed && "text-cyan-200"
                                    )}
                                >
                                    {val}
                                </div>
                            );
                        })
                    ))}
                </div>
            </div>

            <div className="flex gap-4 mt-6">
                <Button
                    variant="outline"
                    onClick={resetLevel}
                    className="border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                    <RefreshCw className="mr-2 h-4 w-4" /> Reset
                </Button>

                {currentLevelIndex < ZIP_LEVELS.length - 1 && (
                    <Button
                        disabled={!isComplete}
                        onClick={() => setCurrentLevelIndex(prev => prev + 1)}
                        className={cn(
                            "bg-cyan-600 hover:bg-cyan-500 text-white border-none",
                            !isComplete && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        Next Level <Play className="ml-2 h-4 w-4 fill-current" />
                    </Button>
                )}
            </div>

            <div className="mt-4 text-xs font-mono text-slate-500 max-w-xs text-center">
                Connect numbers in order (1 -&gt; {currentLevel.maxNumber}). Fill every cell. Avoid walls. Drag from '1' to start.
            </div>
        </div>
    );
}
