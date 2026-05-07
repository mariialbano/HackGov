public class Usuario {
    private String nome;
    private String email;
    private String senha;
    private String zona;

    // Construtor
    public Usuario(String nome, String email, String senha, String zona) {
        this.nome = nome;
        this.email = email;
        this.senha = senha;
        this.zona = zona;
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

    public String getZona() {
        return zona;
    }

    public void setZona(String zona) {
        this.zona = zona;
    }

    public void exibirInformacoes() {
        System.out.println("Usuário criado: " + nome);
        System.out.println("Email: " + email);
        System.out.println("Zona selecionada: " + zona);
    }
}