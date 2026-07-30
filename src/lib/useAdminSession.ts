"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { SessionUser } from "./types";

export function useAdminSession(): { user: SessionUser | null; loading: boolean } {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me").then(async (res) => {
      if (cancelled) return;
      if (res.status === 401) {
        router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      const data: SessionUser = await res.json();
      setUser(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  return { user, loading };
}
