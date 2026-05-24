// Main.java

public class Main {

    public static void main(String[] args) {

        Usuario usuario = new Usuario(
                "João",
                "joao@email.com",
                "123456",
                "Zona Norte",
                true
        );

        usuario.exibirInformacoes();

        Solicitacao solicitacao =
                new Solicitacao(
                        "Problema no sistema",
                        "Erro ao acessar dados.",
                        usuario,
                        "Zona Norte",
                        "Em andamento",
                        "10/05/2026"
                );

        solicitacao.exibirInformacoes();

        Financeiro financeiro =
                new Financeiro(
                        1500.00,
                        "Investimento em tecnologia",
                        usuario,
                        "Tecnologia",
                        "Zona Norte"
                );

        financeiro.exibirInformacoes();

        financeiro.exportarPDF();

        Feedback feedback =
                new Feedback(
                        "Sistema muito intuitivo.",
                        usuario,
                        "10/05/2026"
                );

        feedback.exibirFeedback();

        AssistenteVirtual assistente =
                new AssistenteVirtual();

        assistente.responderPergunta(
                "como exportar pdf"
        );
    }
}

