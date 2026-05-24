// Solicitacao.java

public class Solicitacao {

    private String titulo;
    private String descricao;
    private Usuario solicitante;
    private String zona;
    private String status;
    private String data;

    // Construtor
    public Solicitacao(String titulo,
                       String descricao,
                       Usuario solicitante,
                       String zona,
                       String status,
                       String data) {

        this.titulo = titulo;
        this.descricao = descricao;
        this.solicitante = solicitante;
        this.zona = zona;
        this.status = status;
        this.data = data;
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

    public String getZona() {
        return zona;
    }

    public void setZona(String zona) {
        this.zona = zona;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    public void exibirInformacoes() {

        System.out.println("\nSOLICITAÇÃO");
        System.out.println("Título: " + titulo);
        System.out.println("Descrição: " + descricao);
        System.out.println("Solicitante: "
                + solicitante.getNome());
        System.out.println("Zona: " + zona);
        System.out.println("Status: " + status);
        System.out.println("Data: " + data);
    }
}