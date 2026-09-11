"use client";

import { useAdminDil } from "@/lib/admin-dil";

export default function AdminVeriHatasi() {
  const { m } = useAdminDil();
  return (
    <p role="alert" className="px-4 py-20 text-center text-danger">
      {m("veriYuklenemedi")}
    </p>
  );
}
