export type CellValue = number | null;

export interface Wall {
    type: 'horizontal' | 'vertical';
    r: number;
    c: number;
}

export interface ZipLevel {
    id: string;
    name: string;
    rows: number;
    cols: number;
    initialGrid: Record<string, number>;
    maxNumber: number;
    difficulty: 'Beginner' | 'Easy' | 'Medium' | 'Hard';
    walls?: Wall[];
}

export const ZIP_LEVELS: ZipLevel[] = [
    // LEVELS 1-2: Beginner (5x5)
    // 5x5 = 25 cells (Odd). Start/End SAME Color.
    {
        id: 'level-1',
        name: 'Initiate',
        rows: 5,
        cols: 5,
        maxNumber: 25,
        difficulty: 'Beginner',
        initialGrid: {
            '0,0': 1,   // White
            '2,2': 13,  // White (Midpoint)
            '4,4': 25   // White
        }
        // No walls
    },
    {
        id: 'level-2',
        name: 'Uplink',
        rows: 5,
        cols: 5,
        maxNumber: 25,
        difficulty: 'Beginner',
        initialGrid: {
            '0,4': 1,   // White
            '4,0': 25   // White
        },
        walls: [
            { type: 'vertical', r: 2, c: 2 }, // Wall right of (2,2)
            { type: 'horizontal', r: 2, c: 2 } // Wall below (2,2)
        ]
    },

    // LEVELS 3-4: Easy (5x5)
    {
        id: 'level-3',
        name: 'Core Logic',
        rows: 5,
        cols: 5,
        maxNumber: 25,
        difficulty: 'Easy',
        initialGrid: {
            '0,0': 1,  // White
            '2,2': 25  // White (Center end)
        },
        walls: [
            { type: 'horizontal', r: 0, c: 2 },
            { type: 'horizontal', r: 1, c: 2 },
            { type: 'vertical', r: 3, c: 1 }
        ]
    },
    {
        id: 'level-4',
        name: 'Circuit Breaker',
        rows: 5,
        cols: 5,
        maxNumber: 25,
        difficulty: 'Easy',
        initialGrid: {
            '2,0': 1,  // White
            '0,2': 25  // White
        },
        walls: [
            { type: 'vertical', r: 1, c: 0 },
            { type: 'vertical', r: 2, c: 0 },
            { type: 'vertical', r: 3, c: 0 },
            { type: 'horizontal', r: 2, c: 2 },
            { type: 'horizontal', r: 2, c: 3 }
        ]
    },

    // LEVELS 5-6: Medium (6x6)
    // 6x6 = 36 cells (Even). Start/End OPPOSITE Color.
    {
        id: 'level-5',
        name: 'Matrix Expansion',
        rows: 6,
        cols: 6,
        maxNumber: 36,
        difficulty: 'Medium',
        initialGrid: {
            '0,0': 1,  // White (Even)
            '5,0': 36  // Black (Odd)
        },
        walls: [
            { type: 'horizontal', r: 2, c: 0 },
            { type: 'horizontal', r: 2, c: 1 },
            { type: 'horizontal', r: 2, c: 2 },
            { type: 'horizontal', r: 2, c: 3 },
            { type: 'horizontal', r: 2, c: 4 }
        ]
    },
    {
        id: 'level-6',
        name: 'Sector 6',
        rows: 6,
        cols: 6,
        maxNumber: 36,
        difficulty: 'Medium',
        initialGrid: {
            '0,0': 1, // White
            '0,1': 36 // Black
        },
        walls: [
            { type: 'vertical', r: 0, c: 0 },
            { type: 'vertical', r: 1, c: 0 },
            { type: 'vertical', r: 2, c: 0 },
            { type: 'vertical', r: 3, c: 0 },
            { type: 'vertical', r: 4, c: 0 }, // Force path down left col
            { type: 'horizontal', r: 4, c: 2 },
            { type: 'horizontal', r: 4, c: 3 }
        ]
    },

    // LEVELS 7-8: Hard (6x6)
    {
        id: 'level-7',
        name: 'Neural Weave',
        rows: 6,
        cols: 6,
        maxNumber: 36,
        difficulty: 'Hard',
        initialGrid: {
            '0,0': 1,  // White
            '3,3': 36  // Black
        },
        walls: [
            // Spiral walls
            { type: 'vertical', r: 1, c: 1 },
            { type: 'vertical', r: 2, c: 1 },
            { type: 'vertical', r: 3, c: 1 },
            { type: 'horizontal', r: 3, c: 2 },
            { type: 'horizontal', r: 3, c: 3 },
            { type: 'vertical', r: 2, c: 3 },
            { type: 'vertical', r: 1, c: 3 }
        ]
    },
    {
        id: 'level-8',
        name: 'Firewall',
        rows: 6,
        cols: 6,
        maxNumber: 36,
        difficulty: 'Hard',
        initialGrid: {
            '0,2': 1,  // White
            '3,0': 36  // Black
        },
        walls: [
            { type: 'horizontal', r: 2, c: 0 },
            { type: 'horizontal', r: 2, c: 1 },
            { type: 'horizontal', r: 2, c: 4 },
            { type: 'horizontal', r: 2, c: 5 },
            { type: 'vertical', r: 2, c: 2 },
            { type: 'vertical', r: 3, c: 2 }
        ]
    },

    // LEVELS 9-10: Expert (7x7)
    // 7x7 = 49 (Odd). Start/End SAME Color.
    {
        id: 'level-9',
        name: 'Cortex Core',
        rows: 7,
        cols: 7,
        maxNumber: 49,
        difficulty: 'Hard',
        initialGrid: {
            '3,3': 1,  // White (Center)
            '0,0': 49  // White
        },
        walls: [
            // Example of strict guiding
            { type: 'horizontal', r: 3, c: 3 },
            { type: 'vertical', r: 3, c: 3 },
            { type: 'horizontal', r: 2, c: 3 },
            { type: 'vertical', r: 3, c: 2 },
            // Outer ring restrictions
            { type: 'horizontal', r: 1, c: 1 },
            { type: 'horizontal', r: 1, c: 2 },
            { type: 'horizontal', r: 1, c: 3 },
            { type: 'horizontal', r: 1, c: 4 },
            { type: 'horizontal', r: 1, c: 5 }
        ]
    },
    {
        id: 'level-10',
        name: 'Singularity',
        rows: 7,
        cols: 7,
        maxNumber: 49,
        difficulty: 'Hard',
        initialGrid: {
            '0,0': 1, // White
            '0,6': 49 // White
        },
        walls: [
            // Checkerboard-ish walls
            { type: 'vertical', r: 0, c: 0 }, { type: 'vertical', r: 0, c: 2 }, { type: 'vertical', r: 0, c: 4 },
            { type: 'vertical', r: 1, c: 1 }, { type: 'vertical', r: 1, c: 3 }, { type: 'vertical', r: 1, c: 5 },
            { type: 'horizontal', r: 3, c: 0 }, { type: 'horizontal', r: 3, c: 1 }, { type: 'horizontal', r: 3, c: 5 }, { type: 'horizontal', r: 3, c: 6 }
        ]
    }
];
