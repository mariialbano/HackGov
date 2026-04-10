public class Usuario {
    private String nome;
    private String email;
    private String senha;

    // Construtor
    public Usuario(String nome, String email, String senha) {
        this.nome = nome;
        this.email = email;
        this.senha = senha;
    }

    // Getters e Setters
    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getSenha() {
        return senha;
    }

    public void setSenha(String senha) {
        this.senha = senha;
    }

    public void exibirInformacoes() {
        System.out.println("Usuario criado: " + nome);
        System.out.println("Email: " + email);
        System.out.println("Senha: " + senha);
    }
}