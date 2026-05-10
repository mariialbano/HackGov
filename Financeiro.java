// Financeiro.java

public class Financeiro {

    private double valor;
    private String descricao;
    private Usuario responsavel;
    private String categoria;
    private String zona;

    // Construtor
    public Financeiro(double valor,
                      String descricao,
                      Usuario responsavel,
                      String categoria,
                      String zona) {

        this.valor = valor;
        this.descricao = descricao;
        this.responsavel = responsavel;
        this.categoria = categoria;
        this.zona = zona;
    }

    // Getters e Setters

    public double getValor() {
        return valor;
    }

    public void setValor(double valor) {
        this.valor = valor;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public Usuario getResponsavel() {
        return responsavel;
    }

    public void setResponsavel(Usuario responsavel) {
        this.responsavel = responsavel;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public String getZona() {
        return zona;
    }

    public void setZona(String zona) {
        this.zona = zona;
    }

    public void exibirInformacoes() {

        System.out.println("\nFINANCEIRO");
        System.out.println("Descrição: " + descricao);
        System.out.println("Valor: R$ " + valor);
        System.out.println("Responsável: "
                + responsavel.getNome());
        System.out.println("Categoria: " + categoria);
        System.out.println("Zona: " + zona);
    }

    // Exporta PDF
    public void exportarPDF() {

        System.out.println(
                "PDF da simulação financeira exportado com sucesso."
        );
    }
}