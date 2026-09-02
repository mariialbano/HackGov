import { Check } from 'lucide-react';
import { REQUISITOS_SENHA } from '../utils/validators';

// Política de senha forte: cada requisito confirma em tempo real.
// Componente único usado no login, no cadastro e na troca de senha —
// as três telas mostram exatamente as mesmas regras.
export default function ChecklistSenha({ senha }) {
  return (
    <ul className="mt-2.5 grid gap-x-4 gap-y-1.5 sm:grid-cols-2" aria-label="Requisitos da senha">
      {REQUISITOS_SENHA.map((req) => {
        const ok = req.test(senha);
        return (
          <li
            key={req.id}
            className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${
              ok ? 'text-positive-ink' : 'text-ink-500'
            }`}
          >
            <span
              className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full transition-colors duration-200 ${
                ok ? 'bg-positive text-on-fill' : 'bg-ink-200'
              }`}
              aria-hidden="true"
            >
              {ok && <Check size={9} strokeWidth={3.5} />}
            </span>
            {req.label}
          </li>
        );
      })}
    </ul>
  );
}
