import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Clock, Globe, User } from 'lucide-react';
import { ZIP_LEVELS } from '@/lib/zip-levels';

interface ScoreEntry {
    rank?: number;
    username: string;
    timeMs: number;
    date: string;
}

export default function ZipLeaderboard() {
    const [localScores, setLocalScores] = useState<Record<string, number>>({});
    const [globalScores, setGlobalScores] = useState<Record<string, ScoreEntry[]>>({});

    useEffect(() => {
        // Load local scores
        const stored = localStorage.getItem('zip_personal_bests');
        if (stored) {
            setLocalScores(JSON.parse(stored));
        }

        // Mock global scores
        // In a real app, this would fetch from Supabase
        const mockGlobal: Record<string, ScoreEntry[]> = {};
        ZIP_LEVELS.forEach(level => {
            mockGlobal[level.id] = [
                { username: 'NeonRunner', timeMs: 45000 + Math.random() * 10000, date: '2025-12-20' },
                { username: 'VoidWalker', timeMs: 52000 + Math.random() * 10000, date: '2025-12-21' },
                { username: 'ByteSmasher', timeMs: 58000 + Math.random() * 10000, date: '2025-12-22' },
            ].sort((a, b) => a.timeMs - b.timeMs);
        });
        setGlobalScores(mockGlobal);

        // Listen for new scores
        const handleScoreUpdate = () => {
            const updated = localStorage.getItem('zip_personal_bests');
            if (updated) {
                setLocalScores(JSON.parse(updated));
            }
        };

        window.addEventListener('zip-score-updated', handleScoreUpdate);
        return () => window.removeEventListener('zip-score-updated', handleScoreUpdate);
    }, []);

    const formatTime = (ms: number) => {
        const secs = (ms / 1000).toFixed(1);
        return `${secs}s`;
    };

    return (
        <Card className="h-full bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-mono flex items-center gap-2 text-cyan-100">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    Neural Rankings
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-950/50">
                        <TabsTrigger value="personal" className="data-[state=active]:bg-cyan-950/40 data-[state=active]:text-cyan-400">
                            <User className="w-4 h-4 mr-2" /> My Best
                        </TabsTrigger>
                        <TabsTrigger value="global" className="data-[state=active]:bg-purple-950/40 data-[state=active]:text-purple-400">
                            <Globe className="w-4 h-4 mr-2" /> Global
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal" className="mt-4 space-y-3">
                        {ZIP_LEVELS.map(level => (
                            <div key={level.id} className="flex items-center justify-between p-3 rounded bg-slate-950/30 border border-slate-800">
                                <span className="text-sm font-mono text-slate-400">{level.name}</span>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    <span className={`font-mono font-bold ${localScores[level.id] ? 'text-cyan-400' : 'text-slate-600'}`}>
                                        {localScores[level.id] ? formatTime(localScores[level.id]) : '--'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </TabsContent>

                    <TabsContent value="global" className="mt-4 space-y-4">
                        {ZIP_LEVELS.map(level => (
                            <div key={level.id} className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{level.name}</h4>
                                <div className="space-y-1">
                                    {globalScores[level.id]?.map((score, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-950/30 border border-slate-800/50 text-sm">
                                            <div className="flex items-center gap-3">
                                                <span className={`font-mono font-bold ${idx === 0 ? 'text-yellow-400' :
                                                        idx === 1 ? 'text-slate-300' :
                                                            'text-amber-700'
                                                    }`}>#{idx + 1}</span>
                                                <span className="text-slate-300">{score.username}</span>
                                            </div>
                                            <span className="font-mono text-cyan-400">{formatTime(score.timeMs)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
