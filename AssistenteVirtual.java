// AssistenteVirtual.java

public class AssistenteVirtual {

    public void responderPergunta(String pergunta) {

        System.out.println("\nASSISTENTE VIRTUAL");
        System.out.println("Pergunta: " + pergunta);

        if (pergunta.equalsIgnoreCase(
                "como abrir solicitação")) {

            System.out.println(
                    "Resposta: Acesse a área de solicitações."
            );

        } else if (pergunta.equalsIgnoreCase(
                "como exportar pdf")) {

            System.out.println(
                    "Resposta: Vá até o financeiro e clique em exportar PDF."
            );

        } else {

            System.out.println(
                    "Resposta: Pergunta não encontrada."
            );
        }
    }
}