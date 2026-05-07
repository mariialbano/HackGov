public class AssistenteVirtual {
    public void responderPergunta(String pergunta) {

        System.out.println("Pergunta recebida: " + pergunta);

        if (pergunta.equalsIgnoreCase("Como fazer a solicitação")) {
            System.out.println("Resposta: Vá até a área de solicitações.");
        } else {
            System.out.println("Resposta: Pergunta não encontrada.");
        }
    }
}
