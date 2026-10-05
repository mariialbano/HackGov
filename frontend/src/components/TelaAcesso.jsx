import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import VLibrasToggle from './VLibrasToggle';

// Moldura das telas de acesso fora da sessão (recuperar e redefinir senha):
// mesma composição do cadastro — marca, título, texto de apoio e o
// formulário —, para as duas telas não repetirem a estrutura.
export default function TelaAcesso({ titulo, descricao, children }) {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="absolute right-4 top-4 flex items-center gap-1">
        <VLibrasToggle />
        <ThemeToggle />
      </div>

      <main className="mx-auto flex min-h-screen max-w-[30rem] flex-col justify-center px-5 py-12 pb-40 sm:pb-12">
        <Link
          to="/"
          className="mb-8 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-600 transition-colors hover:text-brand-ink"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar para o login
        </Link>

        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand font-display text-sm font-bold text-on-brand shadow-raised">
            VR
          </span>
          <span className="font-display text-base font-bold tracking-tight text-ink-900">
            Vida<span className="text-brand-ink">Real</span>
          </span>
        </div>

        <h1 className="mt-7 text-2xl font-bold text-ink-900">{titulo}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">{descricao}</p>

        {children}
      </main>
    </div>
  );
}
