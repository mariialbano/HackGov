package br.gov.taubate.vidareal.web.dto;

import br.gov.taubate.vidareal.modelo.Protocolo;
import br.gov.taubate.vidareal.triagem.CalculadoraPrioridade;
import java.time.Instant;
import java.util.List;

/** Representacao publica de um protocolo. */
public record ProtocoloResposta(
        String id,
        String tipo,
        String descricao,
        String status,
        int progresso,
        String prazo,
        String corPrazo,
        Instant abertoEm,
        Instant concluidoEm,
        String cpfSolicitante,
        Triagem triagem) {

    /**
     * Triagem do protocolo: informacao interna do atendimento.
     *
     * @param confiancaSugestao confianca relativa do classificador entre as
     *                          categorias; nao e probabilidade de acerto
     * @param sugestaoAceita    se o cidadao ficou com a categoria sugerida;
     *                          nulo quando nao houve sugestao
     */
    public record Triagem(
            String prioridade,
            Integer pontos,
            List<String> motivos,
            String tipoSugerido,
            Double confiancaSugestao,
            Boolean sugestaoAceita) {
    }

    /**
     * @param incluirTriagem true apenas para o atendente: o cidadao nao
     *                       recebe a prioridade nem os motivos do proprio
     *                       pedido, entao o campo vai nulo
     */
    public static ProtocoloResposta de(Protocolo protocolo, boolean incluirTriagem) {
        return new ProtocoloResposta(
                protocolo.getId(),
                protocolo.getTipo(),
                protocolo.getDescricao(),
                protocolo.getEtapa().getStatus(),
                protocolo.getEtapa().getProgresso(),
                protocolo.getEtapa().getPrazo(),
                protocolo.getEtapa().getCorPrazo(),
                protocolo.getAbertoEm(),
                protocolo.getConcluidoEm(),
                protocolo.getCpfSolicitante(),
                incluirTriagem ? triagemDe(protocolo) : null);
    }

    private static Triagem triagemDe(Protocolo protocolo) {
        String motivos = protocolo.getPrioridadeMotivos();
        String sugerido = protocolo.getTipoSugerido();
        Integer pontos = protocolo.getPrioridadePontos();
        return new Triagem(
                // O nivel nao esta no banco: deriva dos pontos, sempre pela mesma regra.
                pontos == null ? null : CalculadoraPrioridade.nivel(pontos),
                pontos,
                motivos == null || motivos.isBlank() ? List.of() : List.of(motivos.split(" \\| ")),
                sugerido,
                protocolo.getConfiancaSugestao(),
                sugerido == null ? null : sugerido.equals(protocolo.getTipo()));
    }
}
