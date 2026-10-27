'use client';

import { motion, useReducedMotion } from 'motion/react';

/**
 * Uma célula triangular do croqui desenhada a lápis: o limite vermelho se traça,
 * as três plantas aparecem e a haste central acende. Usada como fundo do login.
 */
export function CelulaDesenhada({ className }: { className?: string }) {
  const reduzir = useReducedMotion();
  const ease = [0.16, 1, 0.3, 1] as const;
  const vertices = [
    { x: 120, y: 330, n: '04' },
    { x: 320, y: 70, n: '10' },
    { x: 520, y: 330, n: '16' },
  ];

  return (
    <svg viewBox="0 0 640 420" className={className} aria-hidden="true">
      {/* Palmeiras de fundo */}
      {[[60, 90], [200, 40], [460, 50], [590, 140], [40, 250], [600, 330], [320, 380]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`} opacity="0.25">
          {Array.from({ length: 8 }).map((_, k) => {
            const a = (k / 8) * Math.PI * 2;
            return (
              <line key={k} x1="0" y1="0" x2={Math.cos(a) * 18} y2={Math.sin(a) * 18} stroke="#8fd88b" strokeWidth="2" strokeLinecap="round" />
            );
          })}
        </g>
      ))}

      <motion.polygon
        points={vertices.map((v) => `${v.x},${v.y}`).join(' ')}
        fill="none"
        stroke="#c2362b"
        strokeWidth="5"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={reduzir ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease, delay: 0.3 }}
      />

      <motion.circle
        cx="320"
        cy="240"
        r="16"
        fill="#523159"
        stroke="#c9a9cf"
        strokeWidth="2"
        initial={reduzir ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6, ease, delay: 1.6 }}
        style={{ transformOrigin: '320px 240px' }}
      />
      {!reduzir && (
        <motion.circle
          cx="320"
          cy="240"
          r="16"
          fill="none"
          stroke="#c9a9cf"
          strokeWidth="2"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 2.2 }}
          style={{ transformOrigin: '320px 240px' }}
        />
      )}

      {vertices.map((v, i) => (
        <motion.g
          key={v.n}
          initial={reduzir ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.9 + i * 0.18 }}
        >
          <rect x={v.x - 26} y={v.y - 26} width="52" height="52" rx="12" fill="#2a1730" stroke="#8fd88b" strokeWidth="2" />
          <text
            x={v.x}
            y={v.y + 8}
            textAnchor="middle"
            fontSize="22"
            fontWeight="600"
            fill="#e3f5e1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {v.n}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}
