"use client";

import Link from "next/link";
import { useAdminDil } from "@/lib/admin-dil";

export default function AdminBulunamadi() {
  const { m } = useAdminDil();
  return (
    <main
      id="admin-ana-icerik"
      className="flex min-h-dvh items-center justify-center px-6 text-center"
    >
      <div className="w-full max-w-sm">
        <h1 className="break-words text-2xl font-bold">{m("sayfaBulunamadi")}</h1>
        <Link
          href="/admin"
          className="mt-6 flex min-h-13 items-center justify-center bg-brand px-5 font-bold text-bg transition-colors duration-200 hover:bg-brand-dark"
        >
          {m("anaSayfayaDon")}
        </Link>
      </div>
    </main>
  );
}
