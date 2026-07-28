"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { ApiClientError } from "@/lib/api-client";

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace("/");
  }, [isLoading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, color-mix(in oklch, var(--primary) 35%, transparent) 0%, transparent 45%), radial-gradient(circle at 85% 75%, color-mix(in oklch, oklch(0.522 0.225 286.5) 30%, transparent) 0%, transparent 50%)",
          }}
        />
        <div
          className="pointer-events-none absolute -right-24 top-1/3 h-[520px] w-[420px] rotate-12 rounded-[3rem] border border-white/10 bg-white/[0.03] backdrop-blur-sm"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-8 top-1/4 h-[460px] w-[360px] rotate-6 rounded-[2.5rem] border border-white/10 bg-white/[0.04]"
          aria-hidden
        />

        <div className="relative z-10">
          <Image
            src="/logo/gftech-dark-bg.svg"
            alt="GF Tech — Tecnología que conecta"
            width={241}
            height={50}
            priority
            unoptimized
            className="h-10 w-auto"
          />
        </div>

        <div className="relative z-10 max-w-md">
          <p className="font-display text-4xl font-semibold leading-[1.15] text-sidebar-foreground">
            Cada modelo, su pieza exacta.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/70">
            Inventario, ventas y compatibilidad de fundas, micas, cables y cargadores para tu mostrador en Los
            Mochis, Sinaloa.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/50">
            <ShieldCheck className="h-4 w-4" />
            Acceso restringido al equipo de GF-Tech LM
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-sidebar-foreground/30">
            <Image src="/logo/gftech-icon.svg" alt="" width={12} height={12} unoptimized className="h-3 w-3" />
            Diseñado por GF Tech
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Image
              src="/logo/gftech.svg"
              alt="GF Tech — Tecnología que conecta"
              width={193}
              height={40}
              priority
              unoptimized
              className="h-8 w-auto dark:hidden"
            />
            <Image
              src="/logo/gftech-dark-bg.svg"
              alt="GF Tech — Tecnología que conecta"
              width={193}
              height={40}
              priority
              unoptimized
              className="hidden h-8 w-auto dark:block"
            />
          </div>

          <h1 className="font-display text-2xl font-semibold">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entra con tu correo y contraseña de GF-Tech LM.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@gftech.mx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full cursor-pointer" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
