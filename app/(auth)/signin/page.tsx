'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const result = await signIn.email({ email, password })

            if (result.error) {
                setError(result.error.message || 'Falha ao entrar na conta');
            } else {
                router.push("/dashboard");
            }

        } catch (error) {
            setError("Ocorreu um erro ao tentar entrar na conta");
        } finally {
            setLoading(false);
        }
    }


    return (
        <div className="flex justify-center items-center h-screen max-w-6xl mx-auto">
            <div className="flex flex-col gap-4 w-full bg-zinc-100 p-10 rounded-lg shadow-lg items-center justify-center">
                <h1>Login</h1>
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-[300px]" required />
                <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-[300px]" required />
                <Link href="/forgot-password" className="text-primary text-sm hover:underline">Forgot Password?</Link>
                <Button className="w-[300px]" onClick={handleLogin}>Login</Button>
                <Button className="w-[300px]" asChild variant="outline"><Link href="/signup">Não tenho conta</Link></Button>
                {loading && <p>Loading...</p>}
                {error && <p>{error}</p>}
            </div>
        </div >
    )
}
