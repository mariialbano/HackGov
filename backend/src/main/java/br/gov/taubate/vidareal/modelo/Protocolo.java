package br.gov.taubate.vidareal.modelo;

import java.time.Instant;

/** Solicitacao aberta por um cidadao junto a prefeitura. */
public class Protocolo {

    private final String id;
    private final String cpfSolicitante;
    private String tipo;
    private String descricao;
    private EtapaProtocolo etapa;
    private final Instant abertoEm;
    private Instant concluidoEm;

    public Protocolo(String id, String cpfSolicitante, String tipo, String descricao,
                     EtapaProtocolo etapa, Instant abertoEm, Instant concluidoEm) {
        this.id = id;
        this.cpfSolicitante = cpfSolicitante;
        this.tipo = tipo;
        this.descricao = descricao;
        this.etapa = etapa;
        this.abertoEm = abertoEm;
        this.concluidoEm = concluidoEm;
    }

    public String getId() {
        return id;
    }

    public String getCpfSolicitante() {
        return cpfSolicitante;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public EtapaProtocolo getEtapa() {
        return etapa;
    }

    public Instant getAbertoEm() {
        return abertoEm;
    }

    public Instant getConcluidoEm() {
        return concluidoEm;
    }

    /**
     * Move o protocolo no fluxo, registrando a data de conclusao quando a
     * etapa final e alcancada e limpando-a caso o protocolo seja reaberto.
     */
    public void moverPara(EtapaProtocolo novaEtapa) {
        this.etapa = novaEtapa;
        if (novaEtapa == EtapaProtocolo.CONCLUIDO) {
            if (this.concluidoEm == null) {
                this.concluidoEm = Instant.now();
            }
        } else {
            this.concluidoEm = null;
        }
    }
}
