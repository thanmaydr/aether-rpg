export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export interface Cell {
    value: number | null;
    isInitial: boolean;
    notes: number[];
}

export type Board = Cell[][];


export class Sudoku {
    private solution: number[][];

    constructor() {
        this.solution = [];
    }

    generate(difficulty: Difficulty): Board {
        // 1. Generate a solved board
        this.solution = this.generateSolvedBoard();

        // 2. Remove numbers based on difficulty
        const cellsToRemove = this.getCellsToRemove(difficulty);
        return this.createPuzzle(this.solution, cellsToRemove);
    }

    validateMove(board: Board, row: number, col: number, value: number): boolean {
        // Basic rules: no duplicate in row, col, or 3x3 box
        return this.isValidPlacement(board.map(r => r.map(c => c.value)), row, col, value);
    }

    checkWin(board: Board): boolean {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = board[r][c].value;
                if (val === null || val !== this.solution[r][c]) {
                    return false;
                }
            }
        }
        return true;
    }

    getSolutionAt(row: number, col: number): number {
        return this.solution[row][col];
    }

    private generateSolvedBoard(): number[][] {
        const board = Array(9).fill(null).map(() => Array(9).fill(0));
        this.solve(board);
        return board;
    }

    private solve(board: number[][]): boolean {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    const numbers = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                    for (const num of numbers) {
                        if (this.isValidPlacement(board as (number | null)[][], row, col, num)) {
                            board[row][col] = num;
                            if (this.solve(board)) return true;
                            board[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    private isValidPlacement(board: (number | null)[][], row: number, col: number, num: number): boolean {
        // Check row
        for (let x = 0; x < 9; x++) {
            if (x !== col && board[row][x] === num) return false;
        }

        // Check col
        for (let x = 0; x < 9; x++) {
            if (x !== row && board[x][col] === num) return false;
        }

        // Check 3x3 box
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if ((startRow + i !== row || startCol + j !== col) &&
                    board[startRow + i][startCol + j] === num) {
                    return false;
                }
            }
        }

        return true;
    }

    private createPuzzle(solution: number[][], attempts: number): Board {
        const puzzle = solution.map(row => [...row]);
        let count = attempts;

        while (count > 0) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);

            if (puzzle[row][col] !== 0) {
                puzzle[row][col] = 0;
                count--;
            }
        }

        return puzzle.map((row) =>
            row.map((val) => ({
                value: val === 0 ? null : val,
                isInitial: val !== 0,
                notes: []
            }))
        );
    }

    private getCellsToRemove(difficulty: Difficulty): number {
        switch (difficulty) {
            case 'EASY': return 30;
            case 'MEDIUM': return 40;
            case 'HARD': return 50;
            case 'EXPERT': return 60;
            default: return 30;
        }
    }

    private shuffle(array: number[]): number[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}
