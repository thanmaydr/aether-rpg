import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target } from "lucide-react"

export default function Quests() {
    return (
        <div className="p-8 space-y-8">
            <h1 className="text-4xl font-mono font-bold text-primary">QUESTS</h1>
            <Card className="glass border-primary/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary font-mono">
                        <Target className="w-5 h-5" />
                        ACTIVE_MISSIONS
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="p-4 bg-black/40 border border-primary/20 rounded">
                            <div className="text-cyan-50 font-mono font-bold">DATA_RETRIEVAL</div>
                            <div className="text-sm text-cyan-200/50 font-mono">Sector 7 - High Priority</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
