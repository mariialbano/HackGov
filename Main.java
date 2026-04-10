public class Main {
    public static void main(String[] args) {
        Usuario user = new Usuario("Joao", "joao@email.com", "123456");
        user.exibirInformacoes();
        Solicitacao solicitacao = new Solicitacao("Solicitação de Suporte", "Preciso de ajuda com meu computador.", user);
        solicitacao.exibirInformacoes();
        Financeiro financeiro = new Financeiro(150.0, "Pagamento de Software", user);
        financeiro.exibirInformacoes();
    }

}

