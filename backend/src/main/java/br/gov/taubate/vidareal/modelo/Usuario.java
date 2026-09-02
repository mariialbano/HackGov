package br.gov.taubate.vidareal.modelo;

/**
 * Usuario do sistema.
 *
 * <p>A senha existe apenas como hash BCrypt: mesmo em caso de vazamento
 * da base, a senha original nao pode ser recuperada.</p>
 */
public class Usuario {

    private final String cpf;
    private String senhaHash;
    private String nome;
    private String email;
    private final Perfil perfil;

    public Usuario(String cpf, String senhaHash, String nome, Perfil perfil) {
        this(cpf, senhaHash, nome, null, perfil);
    }

    public Usuario(String cpf, String senhaHash, String nome, String email, Perfil perfil) {
        this.cpf = cpf;
        this.senhaHash = senhaHash;
        this.nome = nome;
        this.email = email;
        this.perfil = perfil;
    }

    public String getCpf() {
        return cpf;
    }

    public String getSenhaHash() {
        return senhaHash;
    }

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

    /** O CPF e o perfil nao mudam: identificam o usuario e seu papel. */
    public void setSenhaHash(String senhaHash) {
        this.senhaHash = senhaHash;
    }

    public Perfil getPerfil() {
        return perfil;
    }
}
