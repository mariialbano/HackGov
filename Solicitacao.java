public class Solicitacao {
    private String titulo;
    private String descricao;
    private Usuario solicitante;
    private String zona;

    // Construtor
    public Solicitacao(String titulo, String descricao, Usuario solicitante, String zona) {
        this.titulo = titulo;
        this.descricao = descricao;
        this.solicitante = solicitante;
        this.zona = zona;
    }

    // Getters e Setters
    public String getTitulo() {
        return titulo;
    }

    public String getDescricao() {
        return descricao;
    }

    public Usuario getSolicitante() {
        return solicitante;
    }

    public String getZona() {
        return zona;
    }

    public void exibirInformacoes() {
        System.out.println("Solicitação: " + titulo);
        System.out.println("Descrição: " + descricao);
        System.out.println("Solicitante: " + solicitante.getNome());
        System.out.println("Zona: " + zona);
    }
}