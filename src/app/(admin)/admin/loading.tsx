"use client";

import { useAdminDil } from "@/lib/admin-dil";
import { UrunListesiIskeleti } from "@/components/Iskelet";

export default function AdminYukleniyor() {
  const { m } = useAdminDil();
  return (
    <main
      id="admin-ana-icerik"
      className="mx-auto min-h-dvh max-w-lg px-4 py-8"
      aria-busy="true"
    >
      <p role="status" aria-live="polite" className="mb-6 text-sm text-muted">
        {m("yukleniyor")}
      </p>
      <UrunListesiIskeleti />
    </main>
  );
}
