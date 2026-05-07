public class Feedback {
    private String mensagem;
    private Usuario usuario;

    // Construtor
    public Feedback(String mensagem, Usuario usuario) {
        this.mensagem = mensagem;
        this.usuario = usuario;
    }

    // Getters
    public String getMensagem() {
        return mensagem;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void exibirFeedback() {
        System.out.println("Feedback enviado por: " + usuario.getNome());
        System.out.println("Mensagem: " + mensagem);
    }
}
