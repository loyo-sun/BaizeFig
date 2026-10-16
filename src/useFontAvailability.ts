import { useEffect, useMemo, useState } from "react";
import type { Document } from "./core";
import {
  documentFonts,
  fontAvailability,
  type FontAvailability,
} from "./fonts";
export function useFontAvailability(doc: Document) {
  const names = useMemo(() => documentFonts(doc), [doc]);
  const signature = JSON.stringify(names);
  const [result, setResult] = useState<{
    signature: string;
    status: Record<string, FontAvailability>;
  }>({ signature: "", status: {} });
  useEffect(() => {
    let active = true;
    const inspect = () => {
      if (!active) return;
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;
      const status = fontAvailability(
        JSON.parse(signature),
        (family, sample) => {
          ctx.font = `72px ${family}`;
          return ctx.measureText(sample).width;
        },
      );
      setResult({ signature, status });
    };
    void document.fonts.ready.then(inspect);
    document.fonts.addEventListener("loadingdone", inspect);
    window.addEventListener("focus", inspect);
    return () => {
      active = false;
      document.fonts.removeEventListener("loadingdone", inspect);
      window.removeEventListener("focus", inspect);
    };
  }, [signature]);
  return { names, status: result.signature === signature ? result.status : {} };
}
