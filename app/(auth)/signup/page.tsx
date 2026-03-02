'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
    const router = useRouter();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        if (password !== passwordConfirm) {
            setError("As senhas devem ser iguais!")
            return;
        }

        if (password.length < 8) {
            setError("A senha precisa ter mais de 8 Caracteres!")
            return;
        }

        try {
            const result = await signUp.email({ email, name, password })

            if (result.error) {
                setError(result.error.message || 'Falha ao criar conta');
            } else {
                router.push("/dashboard");
            }

        } catch (error) {
            setError("Erro ao criar uma conta");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex justify-center items-center h-screen max-w-6xl mx-auto">
            <div className="flex flex-col gap-4 w-full bg-zinc-100 p-10 rounded-lg shadow-lg items-center justify-center">
                <h1>Register</h1>
                <Input type="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="w-[300px] required" />
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-[300px]" required />
                <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-[300px]" required />
                <Input type="password" placeholder="Confirm Password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className="w-[300px]" required />

                <Button className="w-[300px]" onClick={handleRegister}>Registrar</Button>
                <Button className="w-[300px]" asChild variant="outline"><Link href="/signin">Já tenho conta</Link></Button>
                {loading && <p>Loading...</p>}
                {error && <p>{error}</p>}
            </div>
        </div >
    )
}
