package br.gov.taubate.vidareal.web.dto;

/** Resposta de um login bem-sucedido. */
public record LoginResposta(boolean success, String token, UsuarioResposta user) {
}
