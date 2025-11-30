import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Network } from "lucide-react"

export default function Nexus() {
    return (
        <div className="p-8 space-y-8">
            <h1 className="text-4xl font-mono font-bold text-secondary">NEXUS</h1>
            <Card className="glass border-secondary/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-secondary font-mono">
                        <Network className="w-5 h-5" />
                        NETWORK_HUB
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-magenta-50 font-mono">
                        Connection established to global neural network.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
