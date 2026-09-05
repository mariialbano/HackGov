import { useEffect, useState } from 'react';
import { obterPerfil } from '../api/perfilService';
import { obterEnderecoPorCep } from '../api/dadosPublicosService';

// Qual é a cidade do cidadão logado.
//
// A plataforma não gira mais em torno de um município fixo: as telas de
// dados abrem na cidade do CEP que a pessoa cadastrou. O ViaCEP devolve o
// código do IBGE junto com o endereço, então uma consulta resolve as duas
// coisas — qual é a cidade e como pedir os indicadores dela.
//
// Sem CEP cadastrado (ou com o serviço fora do ar), vale a cidade da
// prefeitura que opera a plataforma: é o padrão, não o centro do sistema.

export const CIDADE_PADRAO = { id: '3554102', nome: 'Taubaté', uf: 'SP' };

export function useCidadeDoUsuario() {
  const [cidade, setCidade] = useState(null);

  useEffect(() => {
    let ativo = true;

    obterPerfil()
      .then((perfil) => {
        if (!ativo || !perfil.cep) return null;
        return obterEnderecoPorCep(perfil.cep);
      })
      .then((endereco) => {
        if (!ativo) return;
        if (endereco?.idIbge) {
          setCidade({
            id: endereco.idIbge,
            nome: endereco.cidade,
            uf: endereco.uf,
            doCadastro: true,
          });
        } else {
          setCidade({ ...CIDADE_PADRAO, doCadastro: false });
        }
      })
      .catch(() => {
        if (ativo) setCidade({ ...CIDADE_PADRAO, doCadastro: false });
      });

    return () => {
      ativo = false;
    };
  }, []);

  return {
    cidade: cidade ?? { ...CIDADE_PADRAO, doCadastro: false },
    // Enquanto não resolveu, as telas já podem desenhar com o padrão.
    resolvida: cidade !== null,
  };
}
