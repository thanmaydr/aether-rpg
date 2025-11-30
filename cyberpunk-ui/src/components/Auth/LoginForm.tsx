import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (!supabase) throw new Error('Supabase client not initialized')

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            toast.success('Access Granted', {
                description: 'Welcome back, operative.',
            })
            navigate('/dashboard')
        } catch (error: unknown) {
            const err = error as Error
            toast.error('Access Denied', {
                description: err.message || 'Invalid credentials.',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <CardHeader>
                <CardTitle className="text-2xl font-mono text-primary flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    SECURE_LOGIN
                </CardTitle>
                <CardDescription className="text-cyan-200/70 font-mono">
                    Enter your credentials to access the network.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-mono text-cyan-100">EMAIL</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-cyan-500/50" />
                            <Input
                                type="email"
                                placeholder="operative@network.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-9 bg-black/50 border-primary/30 text-cyan-50 placeholder:text-cyan-900/50 focus-visible:ring-primary/50 font-mono"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-mono text-cyan-100">PASSWORD</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-cyan-500/50" />
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-9 bg-black/50 border-primary/30 text-cyan-50 placeholder:text-cyan-900/50 focus-visible:ring-primary/50 font-mono"
                                required
                            />
                        </div>
                    </div>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-cyan-500 text-black font-bold font-mono shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all hover:shadow-[0_0_25px_rgba(34,211,238,0.7)]"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'AUTHENTICATE'}
                    </Button>
                </form>
            </CardContent>
        </>
    )
}
