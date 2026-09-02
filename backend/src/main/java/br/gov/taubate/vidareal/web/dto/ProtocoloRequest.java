package br.gov.taubate.vidareal.web.dto;

/**
 * Corpo de criacao e atualizacao de protocolo.
 *
 * <p>A validacao fica no controller porque as regras dependem da operacao:
 * na criacao o progresso e definido pelo servidor; na atualizacao ele e
 * obrigatorio e restrito ao perfil atendente.</p>
 */
public record ProtocoloRequest(String tipo, String descricao, Integer progresso) {
}
