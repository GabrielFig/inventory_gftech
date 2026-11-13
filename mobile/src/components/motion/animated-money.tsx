import { useEffect, useRef, useState } from "react";

import { AppText, type AppTextProps } from "@/components/ui/text";
import { formatMoney } from "@/lib/format";

/**
 * Cifra que "cuenta" hasta su valor (y de un valor a otro al cambiar de periodo).
 * Solo se re-renderiza este texto, así que el costo es mínimo.
 */
export function AnimatedMoney({
  value,
  duration = 650,
  ...textProps
}: { value: number; duration?: number } & Omit<AppTextProps, "children">) {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    const from = shownRef.current;
    const startedAt = Date.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - startedAt) / duration);
      const next = from + (value - from) * (1 - Math.pow(1 - t, 3));
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  // Con centavos solo al llegar al valor final: evita que "parpadeen" durante la cuenta.
  return <AppText {...textProps}>{formatMoney(shown === value ? value : Math.round(shown))}</AppText>;
}
