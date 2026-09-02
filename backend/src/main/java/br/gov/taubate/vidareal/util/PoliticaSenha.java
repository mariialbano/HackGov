package br.gov.taubate.vidareal.util;

import br.gov.taubate.vidareal.erro.ErroCampo;
import java.util.ArrayList;
import java.util.List;

/**
 * Politica de senha forte.
 *
 * <p>As mesmas cinco regras exibidas na checklist do formulario. Elas vivem
 * aqui, no servidor, porque a validacao do navegador e conveniencia: quem
 * chama a API direto tem que passar pelas mesmas exigencias.</p>
 */
public final class PoliticaSenha {

    public static final int TAMANHO_MINIMO = 8;
    public static final int TAMANHO_MAXIMO = 64;

    private PoliticaSenha() {
    }

    /** @return lista vazia quando a senha atende a todos os requisitos. */
    public static List<ErroCampo> avaliar(String senha, String campo) {
        List<ErroCampo> erros = new ArrayList<>();

        if (senha == null || senha.isEmpty()) {
            erros.add(new ErroCampo(campo, "Obrigatório."));
            return erros;
        }

        if (senha.length() < TAMANHO_MINIMO) {
            erros.add(new ErroCampo(campo, "Deve ter no mínimo " + TAMANHO_MINIMO + " caracteres."));
        }
        if (senha.length() > TAMANHO_MAXIMO) {
            erros.add(new ErroCampo(campo, "Deve ter no máximo " + TAMANHO_MAXIMO + " caracteres."));
        }
        if (!senha.matches(".*[A-Z].*")) {
            erros.add(new ErroCampo(campo, "Deve conter pelo menos 1 letra maiúscula."));
        }
        if (!senha.matches(".*[a-z].*")) {
            erros.add(new ErroCampo(campo, "Deve conter pelo menos 1 letra minúscula."));
        }
        if (!senha.matches(".*\\d.*")) {
            erros.add(new ErroCampo(campo, "Deve conter pelo menos 1 número."));
        }
        if (!senha.matches(".*[^A-Za-z0-9].*")) {
            erros.add(new ErroCampo(campo, "Deve conter pelo menos 1 caractere especial."));
        }

        return erros;
    }
}
