'use client';

import React from 'react';
import { motion } from 'motion/react';

/**
 * Entrada de seção ligada à rolagem: sobe pouco e ganha opacidade.
 * Começa visível (opacidade 0.6) para nunca parecer que o conteúdo "sumiu".
 */
export function Revelar({
  children,
  className,
  atraso = 0,
}: {
  children: React.ReactNode;
  className?: string;
  atraso?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0.6, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.7, delay: atraso, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
