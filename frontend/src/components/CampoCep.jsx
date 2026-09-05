import { useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import FormField from './FormField';
import { controlClass, fieldBorder } from '../utils/formStyles';
import { obterEnderecoPorCep } from '../api/dadosPublicosService';

// Campo de CEP que descobre a cidade sozinho.
//
// Assim que os 8 dígitos são digitados, a consulta sai — o cidadão não
// precisa clicar em nada nem saber o nome oficial do município. A busca
// passa pela nossa API, que fala com o ViaCEP e guarda a resposta em cache.
//
// A cidade é mostrada como confirmação, não como campo editável: quem
// manda é o CEP. Se a consulta falhar, o cadastro continua — o endereço
// é opcional e não pode bloquear ninguém.

const formatarCep = (valor) => {
  const digitos = String(valor).replace(/\D/g, '').slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
};

export default function CampoCep({ cep, cidade, aoMudar, erro, id = 'cep' }) {
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const alterar = async (bruto) => {
    const formatado = formatarCep(bruto);
    const digitos = formatado.replace(/\D/g, '');

    // Mexeu no CEP: a cidade antiga não vale mais.
    aoMudar({ cep: formatado, cidade: '' });
    setAviso(null);

    if (digitos.length !== 8) return;

    setBuscando(true);
    try {
      const endereco = await obterEnderecoPorCep(digitos);
      aoMudar({ cep: formatado, cidade: `${endereco.cidade}/${endereco.uf}` });
    } catch (falha) {
      setAviso(
        falha.status === 404
          ? 'CEP não encontrado. Confira os números.'
          : 'Não foi possível consultar o CEP agora. Você pode continuar sem ele.'
      );
    } finally {
      setBuscando(false);
    }
  };

  return (
    <FormField
      label="CEP"
      hint="Opcional. Preenchemos sua cidade automaticamente."
      error={erro}
      htmlFor={id}
    >
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={cep}
          onChange={(e) => alterar(e.target.value)}
          maxLength={9}
          className={`${controlClass} ${fieldBorder(erro)} tabular pr-11`}
        />
        {buscando && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            <span className="sr-only">Consultando o CEP</span>
          </span>
        )}
      </div>

      {/* aria-live: quem usa leitor de tela ouve a cidade aparecer */}
      <p className="mt-2 min-h-[1.25rem] text-xs" aria-live="polite">
        {cidade && (
          <span className="inline-flex items-center gap-1.5 font-medium text-positive-ink">
            <MapPin size={13} aria-hidden="true" />
            {cidade}
          </span>
        )}
        {aviso && <span className="text-ink-600">{aviso}</span>}
      </p>
    </FormField>
  );
}
