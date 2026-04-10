public class Solicitacao {
    private String titulo;
    private String descricao;
    private Usuario solicitante;

    // Construtor
    public Solicitacao(String titulo, String descricao, Usuario solicitante) {
        this.titulo = titulo;
        this.descricao = descricao;
        this.solicitante = solicitante;
    }

    // Getters e Setters
    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public Usuario getSolicitante() {
        return solicitante;
    }

    public void setSolicitante(Usuario solicitante) {
        this.solicitante = solicitante;
    }

    public void exibirInformacoes() {
        System.out.println("Solicitação: " + titulo);
        System.out.println("Descrição: " + descricao);
        System.out.println("Solicitante: " + solicitante.getNome());
    }
}