"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { nextGorselUrlDogrula } from "@/lib/guvenli-url";

/** Iletisim logosu bozuksa simgeye doner; yeni URL geldiginde yeniden dener. */
export default function IletisimGorseli({
  url,
  simge,
}: {
  url: string | null;
  simge: string;
}) {
  const guvenliUrl = nextGorselUrlDogrula(url);
  const [gorselHatali, setGorselHatali] = useState(false);

  useEffect(() => {
    setGorselHatali(false);
  }, [guvenliUrl]);

  if (!guvenliUrl || gorselHatali) return <>{simge}</>;

  return (
    <Image
      src={guvenliUrl}
      alt=""
      fill
      sizes="44px"
      className="object-contain p-2"
      onError={() => setGorselHatali(true)}
    />
  );
}
