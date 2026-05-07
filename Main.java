public class Main {

    public static void main(String[] args) {

        Usuario user = new Usuario(
                "Joao",
                "joao@email.com",
                "123456",
                "Zona Norte"
        );

        user.exibirInformacoes();

        Solicitacao solicitacao = new Solicitacao(
                "Solicitação de Suporte",
                "Preciso de ajuda com meu computador.",
                user,
                "Zona Norte"
        );

        solicitacao.exibirInformacoes();

        Financeiro financeiro = new Financeiro(
                150.0,
                "Pagamento de Software",
                user
        );

        financeiro.exibirInformacoes();

        Feedback feedback = new Feedback(
                "O sistema está muito intuitivo.",
                user
        );

        feedback.exibirFeedback();

        AssistenteVirtual assistente = new AssistenteVirtual();

        assistente.responderPergunta("como fazer solicitação");
    }
}

