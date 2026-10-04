import { useState, useEffect } from 'react';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { sugerirTipo } from '../api/protocoloService';

// Sugestão de categoria pela IA (classificador Naive Bayes do servidor).
//
// É assistência, não decisão: o painel só propõe. A categoria do formulário
// muda apenas quando o cidadão clica em "Usar esta categoria", e ele pode
// trocá-la de novo depois.
//
// Se a consulta falhar, o painel some e o formulário segue funcionando —
// abrir um protocolo nunca depende da sugestão.

const MINIMO_CARACTERES = 10;
const ESPERA_DIGITACAO_MS = 600;

export default function SugestaoTriagem({ descricao, tipoAtual, onUsar }) {
  const texto = descricao.trim();
  const [analise, setAnalise] = useState(null);
  const [consultando, setConsultando] = useState(false);

  useEffect(() => {
    if (texto.length < MINIMO_CARACTERES) return undefined;

    // Espera a pausa na digitação para não consultar a cada tecla; `ativo`
    // descarta a resposta de um texto que já foi alterado.
    let ativo = true;
    const espera = setTimeout(async () => {
      setConsultando(true);
      try {
        const dados = await sugerirTipo(texto);
        if (ativo) setAnalise(dados);
      } catch {
        if (ativo) setAnalise(null);
      } finally {
        if (ativo) setConsultando(false);
      }
    }, ESPERA_DIGITACAO_MS);

    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [texto]);

  if (texto.length < MINIMO_CARACTERES) return null;

  if (!analise) {
    return consultando ? (
      <p className="flex items-center gap-2 text-xs text-ink-500" role="status">
        <Loader2 size={13} className="animate-spin" aria-hidden="true" />
        Analisando a descrição...
      </p>
    ) : null;
  }

  const { sugestao, motivo } = analise;

  if (!sugestao) {
    return (
      <p
        className="flex items-start gap-2 rounded-[var(--radius-field)] border border-ink-200 bg-ink-050 px-3.5 py-3 text-xs leading-relaxed text-ink-600"
        role="status"
      >
        <Sparkles size={14} className="mt-0.5 shrink-0 text-ink-500" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-ink-800">Sem sugestão de categoria.</strong> {motivo}
        </span>
      </p>
    );
  }

  const jaEscolhida = sugestao.tipo === tipoAtual;
  const percentual = Math.round(sugestao.confianca * 100);

  return (
    <div
      className="rounded-[var(--radius-field)] border border-brand-line bg-brand-soft px-3.5 py-3"
      role="status"
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-ink">
        <Sparkles size={13} aria-hidden="true" />
        Sugestão da IA
        {consultando && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
      </p>

      <p className="mt-1.5 text-sm font-semibold text-ink-900">{sugestao.tipo}</p>

      <p className="mt-1 text-xs text-ink-600">
        Confiança {sugestao.nivel === 'alta' ? 'alta' : 'média'} ({percentual}%)
        {sugestao.termos.length > 0 && (
          <>
            {' · '}termos que pesaram:{' '}
            {sugestao.termos.map((termo, indice) => (
              <span key={termo}>
                {indice > 0 && ', '}
                <strong className="font-semibold text-ink-800">{termo}</strong>
              </span>
            ))}
          </>
        )}
      </p>

      <div className="mt-2.5">
        {jaEscolhida ? (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-positive-ink">
            <Check size={13} strokeWidth={3} aria-hidden="true" />
            É a categoria selecionada
          </p>
        ) : (
          <button
            type="button"
            onClick={() => onUsar(sugestao.tipo)}
            className="rounded-lg border border-brand bg-surface px-3 py-1.5 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand hover:text-on-brand"
          >
            Usar esta categoria
          </button>
        )}
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-ink-500">
        A confiança compara as cinco categorias entre si; não é uma probabilidade de acerto.
        A escolha final é sua.
      </p>
    </div>
  );
}
