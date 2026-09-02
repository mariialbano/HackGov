package br.gov.taubate.vidareal.modelo;

/**
 * Perfis de acesso do sistema, alinhados aos atores do diagrama UML.
 *
 * <p>CIDADAO acessa os proprios dados; ATENDENTE enxerga todos os
 * protocolos e pode tramita-los no fluxo de atendimento.</p>
 */
public enum Perfil {

    CIDADAO("cidadao"),
    ATENDENTE("atendente");

    private final String valor;

    Perfil(String valor) {
        this.valor = valor;
    }

    /** Nome usado na API e no front-end (minusculo, sem acento). */
    public String getValor() {
        return valor;
    }

    public static Perfil de(String valor) {
        for (Perfil perfil : values()) {
            if (perfil.valor.equalsIgnoreCase(valor)) {
                return perfil;
            }
        }
        throw new IllegalArgumentException("Perfil desconhecido: " + valor);
    }
}
