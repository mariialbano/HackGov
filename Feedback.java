// Feedback.java

public class Feedback {

    private String mensagem;
    private Usuario usuario;
    private String data;

    // Construtor
    public Feedback(String mensagem,
                    Usuario usuario,
                    String data) {

        this.mensagem = mensagem;
        this.usuario = usuario;
        this.data = data;
    }

    // Getters e Setters

    public String getMensagem() {
        return mensagem;
    }

    public void setMensagem(String mensagem) {
        this.mensagem = mensagem;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    public void exibirFeedback() {

        System.out.println("\nFEEDBACK");
        System.out.println("Usuário: "
                + usuario.getNome());
        System.out.println("Mensagem: "
                + mensagem);
        System.out.println("Data: " + data);
    }
}
