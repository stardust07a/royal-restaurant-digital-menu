"use client";

import { useEffect } from "react";
import { useAdminDil } from "@/lib/admin-dil";

export default function AdminHata({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { m } = useAdminDil();
  useEffect(() => console.error("Admin sayfasi yuklenemedi:", error), [error]);

  return (
    <main
      id="admin-ana-icerik"
      className="flex min-h-dvh items-center justify-center px-6 text-center"
    >
      <div role="alert" className="w-full max-w-sm border border-danger/40 bg-danger/10 p-6">
        <h1 className="break-words text-xl font-bold">{m("beklenmeyenHata")}</h1>
        <button
          type="button"
          onClick={reset}
          className="mt-6 min-h-13 w-full bg-brand px-5 font-bold text-bg transition-colors duration-200 hover:bg-brand-dark"
        >
          {m("tekrarDene")}
        </button>
      </div>
    </main>
  );
}
