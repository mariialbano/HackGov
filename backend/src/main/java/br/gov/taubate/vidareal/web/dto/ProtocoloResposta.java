package br.gov.taubate.vidareal.web.dto;

import br.gov.taubate.vidareal.modelo.Protocolo;
import java.time.Instant;

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
        String cpfSolicitante) {

    public static ProtocoloResposta de(Protocolo protocolo) {
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
                protocolo.getCpfSolicitante());
    }
}
