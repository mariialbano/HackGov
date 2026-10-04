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
}
