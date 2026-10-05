package br.gov.taubate.vidareal.triagem;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.gov.taubate.vidareal.triagem.CalculadoraPrioridade.Prioridade;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Regras de prioridade: cada fator isolado, a soma e os limites dos niveis. */
class CalculadoraPrioridadeTest {

    private static final String TECNICO = "Problema técnico";
    private static final String ORIENTACAO = "Solicitação de orientação financeira";
    private static final String SUGESTAO = "Sugestão de melhoria";

    @Test
    @DisplayName("sem nenhum fator a prioridade é baixa, com motivo explícito")
    void semFatores() {
        Prioridade prioridade = CalculadoraPrioridade.calcular(SUGESTAO,
                "Seria bom ter um glossário de termos financeiros.");

        assertEquals(CalculadoraPrioridade.BAIXA, prioridade.nivel());
        assertEquals(0, prioridade.pontos());
        assertEquals(1, prioridade.motivos().size());
    }

    @Test
    @DisplayName("a categoria sozinha já pontua")
    void pesoDaCategoria() {
        assertEquals(2, CalculadoraPrioridade.calcular(TECNICO, "O gráfico ficou desalinhado.").pontos());
        assertEquals(1, CalculadoraPrioridade.calcular(ORIENTACAO, "Quero montar um orçamento.").pontos());
    }

    @Test
    @DisplayName("impedimento de uso em problema técnico resulta em prioridade alta")
    void impedimentoDeUso() {
        Prioridade prioridade = CalculadoraPrioridade.calcular(TECNICO,
                "Não consigo entrar no sistema desde ontem.");

        assertEquals(CalculadoraPrioridade.ALTA, prioridade.nivel());
        assertEquals(4, prioridade.pontos());
        assertTrue(prioridade.motivos().stream().anyMatch(m -> m.contains("impedimento")));
    }

    @Test
    @DisplayName("vulnerabilidade financeira eleva a orientação para prioridade média")
    void vulnerabilidadeFinanceira() {
        Prioridade prioridade = CalculadoraPrioridade.calcular(ORIENTACAO,
                "Estou negativado e preciso de ajuda.");

        assertEquals(CalculadoraPrioridade.MEDIA, prioridade.nivel());
        assertEquals(3, prioridade.pontos());
    }

    @Test
    @DisplayName("repetir a mesma palavra não acumula pontos")
    void repeticaoNaoAcumula() {
        int uma = CalculadoraPrioridade.calcular(SUGESTAO, "É urgente.").pontos();
        int varias = CalculadoraPrioridade.calcular(SUGESTAO,
                "Urgente, urgente, URGENTE! Preciso disso hoje, imediatamente.").pontos();

        assertEquals(1, uma);
        assertEquals(uma, varias);
    }

    @Test
    @DisplayName("fatores diferentes se somam")
    void fatoresSeSomam() {
        Prioridade prioridade = CalculadoraPrioridade.calcular(ORIENTACAO,
                "Estou com dívidas, não consigo pagar e é urgente.");

        // categoria 1 + impedimento 2 + vulnerabilidade 2 + urgência 1
        assertEquals(6, prioridade.pontos());
        assertEquals(4, prioridade.motivos().size());
    }

    @Test
    @DisplayName("\"reserva de emergência\" não conta como urgência")
    void reservaDeEmergenciaNaoEUrgencia() {
        Prioridade prioridade = CalculadoraPrioridade.calcular(
                "Análise de viabilidade de Metas Financeiras",
                "Quero avaliar minha meta de reserva de emergência.");

        assertEquals(1, prioridade.pontos());
    }

    @Test
    @DisplayName("só palavras inteiras contam: \"terror\" não é \"erro\"")
    void palavraInteira() {
        assertEquals(0, CalculadoraPrioridade.calcular(SUGESTAO, "Filme de terror é bom.").pontos());
    }

    // ---------- falsos positivos: a palavra aparece, o fator não se aplica ----------

    @Test
    @DisplayName("\"hoje\" e \"amanhã\" descrevendo o momento não contam como urgência")
    void hojeSemPrazoNaoEUrgencia() {
        for (String descricao : new String[] {
                "A plataforma está muito lenta hoje.",
                "Hoje vi que o gráfico mudou de cor.",
                "Amanhã vou testar de novo no computador do trabalho.",
                "O valor de hoje é diferente do de ontem."}) {
            assertEquals(0, CalculadoraPrioridade.calcular(SUGESTAO, descricao).pontos(), descricao);
        }
    }

    @Test
    @DisplayName("\"erro\" citado como assunto não conta como impedimento de uso")
    void erroComoAssuntoNaoEImpedimento() {
        for (String descricao : new String[] {
                "Sugiro melhorar o texto da mensagem de erro.",
                "Seria bom explicar o que cada código de erro significa.",
                "Encontrei um erro de português no rodapé."}) {
            assertEquals(0, CalculadoraPrioridade.calcular(SUGESTAO, descricao).pontos(), descricao);
        }
    }

    // ---------- positivos: as expressões contextualizadas continuam valendo ----------

    @Test
    @DisplayName("prazo declarado conta como urgência")
    void prazoDeclaradoEUrgencia() {
        for (String descricao : new String[] {
                "Preciso da resposta para hoje.",
                "Tenho que resolver isso até amanhã.",
                "O boleto vence amanhã.",
                "Pra hoje, se possível.",
                "Preciso disso o quanto antes.",
                "É urgente."}) {
            Prioridade prioridade = CalculadoraPrioridade.calcular(SUGESTAO, descricao);
            assertEquals(1, prioridade.pontos(), descricao);
            assertTrue(prioridade.motivos().get(0).startsWith("Urgência declarada"), descricao);
        }
    }

    @Test
    @DisplayName("erro que impede o uso conta como impedimento")
    void erroQueImpedeOUso() {
        for (String descricao : new String[] {
                "Erro ao salvar a meta.",
                "Aparece erro quando clico em enviar.",
                "Dá erro toda vez que tento entrar.",
                "O sistema retornou erro inesperado.",
                "Não consegui concluir o cadastro."}) {
            Prioridade prioridade = CalculadoraPrioridade.calcular(SUGESTAO, descricao);
            assertEquals(2, prioridade.pontos(), descricao);
            assertTrue(prioridade.motivos().get(0).startsWith("Relato de impedimento"), descricao);
        }
    }

    @Test
    @DisplayName("o nível é derivado só dos pontos: 0-1 Baixa, 2-3 Média, 4+ Alta")
    void nivelDerivadoDosPontos() {
        assertEquals(CalculadoraPrioridade.BAIXA, CalculadoraPrioridade.nivel(0));
        assertEquals(CalculadoraPrioridade.BAIXA, CalculadoraPrioridade.nivel(1));
        assertEquals(CalculadoraPrioridade.MEDIA, CalculadoraPrioridade.nivel(2));
        assertEquals(CalculadoraPrioridade.MEDIA, CalculadoraPrioridade.nivel(3));
        assertEquals(CalculadoraPrioridade.ALTA, CalculadoraPrioridade.nivel(4));
        assertEquals(CalculadoraPrioridade.ALTA, CalculadoraPrioridade.nivel(7));
    }
}
