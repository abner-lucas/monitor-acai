import { redirect } from 'next/navigation';

// Cada unidade piloto tem o próprio endereço (/breves, /muana); a entrada abre Breves.
export default function Inicio() {
  redirect('/breves');
}
