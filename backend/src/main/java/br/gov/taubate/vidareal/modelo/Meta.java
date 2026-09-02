package br.gov.taubate.vidareal.modelo;

import java.math.BigDecimal;

/**
 * Meta financeira pessoal do cidadao.
 *
 * <p>Valores monetarios usam BigDecimal: dinheiro nunca deve ser
 * representado em ponto flutuante.</p>
 */
public class Meta {

    private final long id;
    private final String cpfUsuario;
    private String tipo;
    private BigDecimal atual;
    private BigDecimal objetivo;
    private String prazo;

    public Meta(long id, String cpfUsuario, String tipo, BigDecimal atual,
                BigDecimal objetivo, String prazo) {
        this.id = id;
        this.cpfUsuario = cpfUsuario;
        this.tipo = tipo;
        this.atual = atual;
        this.objetivo = objetivo;
        this.prazo = prazo;
    }

    public long getId() {
        return id;
    }

    public String getCpfUsuario() {
        return cpfUsuario;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public BigDecimal getAtual() {
        return atual;
    }

    public BigDecimal getObjetivo() {
        return objetivo;
    }

    public void setObjetivo(BigDecimal objetivo) {
        this.objetivo = objetivo;
    }

    public String getPrazo() {
        return prazo;
    }

    public void setPrazo(String prazo) {
        this.prazo = prazo;
    }

    /** Registra um deposito na meta. */
    public void aportar(BigDecimal valor) {
        this.atual = this.atual.add(valor);
    }
}
