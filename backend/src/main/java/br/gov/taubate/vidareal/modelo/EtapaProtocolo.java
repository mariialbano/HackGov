package br.gov.taubate.vidareal.modelo;

/**
 * Etapas do fluxo de atendimento de um protocolo.
 *
 * <p>O progresso numerico (33/66/100) e mantido por compatibilidade com o
 * front-end, que desenha a trilha de acompanhamento a partir dele.</p>
 */
public enum EtapaProtocolo {

    CRIADA(33, "Solicitação Criada", "Prazo: 20 dias úteis", "bg-info"),
    EM_ANALISE(66, "Em análise", "Prazo: 15 dias úteis", "bg-brand"),
    CONCLUIDO(100, "Concluído", "Prazo: Concluído", "bg-positive");

    private final int progresso;
    private final String status;
    private final String prazo;
    private final String corPrazo;

    EtapaProtocolo(int progresso, String status, String prazo, String corPrazo) {
        this.progresso = progresso;
        this.status = status;
        this.prazo = prazo;
        this.corPrazo = corPrazo;
    }

    public int getProgresso() {
        return progresso;
    }

    public String getStatus() {
        return status;
    }

    public String getPrazo() {
        return prazo;
    }

    public String getCorPrazo() {
        return corPrazo;
    }

    /** Converte o progresso vindo da requisicao na etapa correspondente. */
    public static EtapaProtocolo porProgresso(int progresso) {
        for (EtapaProtocolo etapa : values()) {
            if (etapa.progresso == progresso) {
                return etapa;
            }
        }
        return null;
    }
}
