import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Terminal, Zap } from "lucide-react"

export default function Home() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background -z-10" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 -z-10" />

            <Card className="w-full max-w-md glass border-primary/50 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary font-mono text-2xl">
                        <Terminal className="w-6 h-6" />
                        SYSTEM_ACCESS
                    </CardTitle>
                    <CardDescription className="text-cyan-200/70 font-mono">
                        Enter credentials to access the mainframe.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-mono text-cyan-100">USER_ID</label>
                        <Input
                            placeholder="CYBER_GHOST"
                            className="bg-black/50 border-primary/30 text-cyan-50 placeholder:text-cyan-900/50 focus-visible:ring-primary/50 font-mono"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-mono text-cyan-100">ACCESS_KEY</label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            className="bg-black/50 border-primary/30 text-cyan-50 placeholder:text-cyan-900/50 focus-visible:ring-primary/50 font-mono"
                        />
                    </div>
                    <Button className="w-full bg-primary hover:bg-cyan-500 text-black font-bold font-mono shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all hover:shadow-[0_0_25px_rgba(34,211,238,0.7)]">
                        <Zap className="w-4 h-4 mr-2" />
                        INITIATE_SEQUENCE
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
