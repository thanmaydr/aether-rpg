import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { LoginForm } from '@/components/Auth/LoginForm'
import { SignupForm } from '@/components/Auth/SignupForm'
import { Button } from '@/components/ui/button'

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true)

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 -z-10" />

            <div className="w-full max-w-md space-y-4">
                <Card className={`glass transition-all duration-500 ${isLogin ? 'border-primary/50 shadow-[0_0_30px_rgba(34,211,238,0.2)]' : 'border-secondary/50 shadow-[0_0_30px_rgba(217,70,239,0.2)]'}`}>
                    {isLogin ? <LoginForm /> : <SignupForm />}
                </Card>

                <div className="text-center">
                    <Button
                        variant="ghost"
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-muted-foreground hover:text-primary font-mono text-xs"
                    >
                        {isLogin ? "NO_IDENTITY? REGISTER_NEW_USER >" : "HAS_IDENTITY? ACCESS_LOGIN >"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
