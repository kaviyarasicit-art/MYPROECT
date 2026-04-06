"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = (await res.json()) as { user: { id: string } | null };
      if (cancelled) return;
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setOk(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (ok === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }
  if (!ok) return null;
  return <>{children}</>;
}
