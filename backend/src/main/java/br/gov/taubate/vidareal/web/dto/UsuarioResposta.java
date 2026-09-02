package br.gov.taubate.vidareal.web.dto;

import br.gov.taubate.vidareal.modelo.Usuario;

/** Dados publicos do usuario: nunca inclui a senha nem o hash. */
public record UsuarioResposta(String nome, String cpf, String perfil) {

    public static UsuarioResposta de(Usuario usuario) {
        return new UsuarioResposta(usuario.getNome(), usuario.getCpf(),
                usuario.getPerfil().getValor());
    }
}
