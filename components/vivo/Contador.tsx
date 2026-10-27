'use client';

import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'motion/react';

/** Número que conta até o valor real quando muda (respeita "reduzir movimento"). */
export function Contador({ valor, className }: { valor: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const anterior = useRef(0);
  const reduzir = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduzir) {
      el.textContent = String(valor);
      anterior.current = valor;
      return;
    }
    const controles = animate(anterior.current, valor, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = String(Math.round(v));
      },
    });
    anterior.current = valor;
    return () => controles.stop();
  }, [valor, reduzir]);

  return (
    <span ref={ref} className={className}>
      {valor}
    </span>
  );
}
