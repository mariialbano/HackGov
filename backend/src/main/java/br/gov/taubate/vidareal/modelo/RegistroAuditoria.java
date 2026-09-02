package br.gov.taubate.vidareal.modelo;

import java.time.Instant;

/**
 * Entrada da trilha de auditoria: registra QUEM fez O QUE e QUANDO.
 *
 * <p>Diferente do log tecnico, que responde "a aplicacao esta saudavel?",
 * a auditoria responde "quem alterou este registro?".</p>
 */
public class RegistroAuditoria {

    private final String id;
    private final String acao;
    private final String recurso;
    private final String recursoId;
    private final String cpfAutor;
    private final String perfilAutor;
    private final String detalhe;
    private final Instant registradoEm;

    public RegistroAuditoria(String id, String acao, String recurso, String recursoId,
                             String cpfAutor, String perfilAutor, String detalhe,
                             Instant registradoEm) {
        this.id = id;
        this.acao = acao;
        this.recurso = recurso;
        this.recursoId = recursoId;
        this.cpfAutor = cpfAutor;
        this.perfilAutor = perfilAutor;
        this.detalhe = detalhe;
        this.registradoEm = registradoEm;
    }

    public String getId() {
        return id;
    }

    public String getAcao() {
        return acao;
    }

    public String getRecurso() {
        return recurso;
    }

    public String getRecursoId() {
        return recursoId;
    }

    public String getCpfAutor() {
        return cpfAutor;
    }

    public String getPerfilAutor() {
        return perfilAutor;
    }

    public String getDetalhe() {
        return detalhe;
    }

    public Instant getRegistradoEm() {
        return registradoEm;
    }
}
