/**
 * Marca do app: um cacho de açaí visto de cima (frutos agrupados num ráquis),
 * no lugar do ícone genérico de broto.
 */
export function MarcaAcai({ className }: { className?: string }) {
  const frutos = [
    [16, 9], [11, 13], [21, 13], [16, 17], [10, 20], [22, 20], [16, 24], [13, 28], [19, 28],
  ];
  return (
    <svg viewBox="0 0 32 36" className={className} aria-hidden="true">
      <path d="M16 2 C16 8 16 20 16 31" stroke="#8fd88b" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {frutos.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.6" fill={i % 3 === 0 ? '#3b2242' : '#523159'} stroke="#f1e7f2" strokeWidth="0.8" />
      ))}
      <circle cx="14.8" cy="7.8" r="0.9" fill="#f1e7f2" opacity="0.7" />
    </svg>
  );
}
