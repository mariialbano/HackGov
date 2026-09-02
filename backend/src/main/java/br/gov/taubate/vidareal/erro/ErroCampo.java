package br.gov.taubate.vidareal.erro;

/** Detalhe de validacao: qual campo falhou e por que. */
public record ErroCampo(String campo, String mensagem) {
}
