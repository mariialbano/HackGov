public class Financeiro {
    private double valor;
    private String descricao;
    private Usuario responsavel;

    // Construtor
    public Financeiro(double valor, String descricao, Usuario responsavel) {
        this.valor = valor;
        this.descricao = descricao;
        this.responsavel = responsavel;
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

    public void exibirInformacoes() {
        System.out.println("Financeiro: " + descricao);
        System.out.println("Valor: " + valor);
        System.out.println("Responsável: " + responsavel.getNome());
    }
}