"use client";

import { useAdminDil } from "@/lib/admin-dil";

export default function AdminIcerigeAtla() {
  const { m } = useAdminDil();
  return (
    <a href="#admin-ana-icerik" className="icerige-atla">
      {m("icerigeAtla")}
    </a>
  );
}
