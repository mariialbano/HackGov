package br.gov.taubate.vidareal.analise;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.gov.taubate.vidareal.modelo.EtapaProtocolo;
import br.gov.taubate.vidareal.modelo.Protocolo;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** A montagem das duas analises, com dados pequenos e conhecidos. */
class AnaliseProtocolosTest {

    /** Segunda-feira, base das semanas dos testes. */
    private static final LocalDate SEGUNDA = LocalDate.of(2026, 3, 2);

    private int contador = 0;

    private static Instant meioDia(LocalDate dia) {
        return dia.atTime(LocalTime.NOON).atZone(AnaliseProtocolos.FUSO).toInstant();
    }

    /** Protocolo concluido com triagem: demora {@code dias} dias e tem {@code pontos} de prioridade. */
    private Protocolo concluido(int pontos, int dias) {
        Instant abertura = meioDia(SEGUNDA.plusDays(contador % 5));
        Protocolo p = new Protocolo("P" + (++contador), "52998224725", "Problema técnico",
                "descrição qualquer", EtapaProtocolo.CONCLUIDO, abertura, abertura.plusSeconds(dias * 86400L));
        p.registrarTriagem(pontos, null, null, null);
        return p;
    }

    /** Protocolo aberto em um dia especifico (so para contar volume). */
    private Protocolo abertoEm(String idPrefixo, LocalDate dia) {
        return new Protocolo(idPrefixo + (++contador), "52998224725", "Problema técnico",
                "descrição qualquer", EtapaProtocolo.CRIADA, meioDia(dia), null);
    }

    /** Cria {@code quantidade} protocolos na semana {@code indiceSemana} (0 = SEGUNDA). */
    private void naSemana(List<Protocolo> lista, int indiceSemana, int quantidade) {
        for (int i = 0; i < quantidade; i++) {
            lista.add(abertoEm("P", SEGUNDA.plusWeeks(indiceSemana).plusDays(i % 5)));
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> secao(Map<String, Object> analise, String chave) {
        return (Map<String, Object>) analise.get(chave);
    }

    // ---------- Spearman: prioridade x tempo ----------

    @Test
    @DisplayName("Spearman: prioridade alta resolvendo mais rápido dá correlação negativa forte")
    void prioridadeXTempoNegativa() {
        // pontos 0,0,1,1,...,5,5  e dias 12,11,...,1 (decrescentes)
        // Sxy = -140, Sxx = 140, Syy = 143  =>  rho = -140 / raiz(140*143)
        List<Protocolo> lista = new ArrayList<>();
        int[] pontos = {0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5};
        for (int i = 0; i < pontos.length; i++) {
            lista.add(concluido(pontos[i], 12 - i));
        }

        Map<String, Object> s = secao(AnaliseProtocolos.montar(lista), "prioridadeXTempo");

        assertEquals(true, s.get("disponivel"));
        assertEquals(12, s.get("amostra"));
        assertEquals(-140.0 / Math.sqrt(140.0 * 143.0), (double) s.get("rho"), 0.001);
        assertEquals("Correlação negativa muito forte", s.get("forca"));
        assertTrue(((String) s.get("interpretacao")).contains("menos tempo"));
        assertTrue(((String) s.get("interpretacao")).contains("p-valor"));
    }

    @Test
    @DisplayName("Spearman: prioridade alta demorando mais dá correlação positiva")
    void prioridadeXTempoPositiva() {
        List<Protocolo> lista = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            lista.add(concluido(i, i + 1)); // pontos e dias crescem juntos
        }

        Map<String, Object> s = secao(AnaliseProtocolos.montar(lista), "prioridadeXTempo");

        assertEquals(1.0, (double) s.get("rho"), 0.0001);
        assertTrue(((String) s.get("interpretacao")).contains("demorar mais"));
    }

    @Test
    @DisplayName("Spearman: amostra pequena não gera número, e explica o motivo")
    void amostraInsuficiente() {
        List<Protocolo> lista = new ArrayList<>();
        for (int i = 0; i < 9; i++) { // um a menos que o minimo (10)
            lista.add(concluido(i, i + 1));
        }

        Map<String, Object> s = secao(AnaliseProtocolos.montar(lista), "prioridadeXTempo");

        assertEquals(false, s.get("disponivel"));
        assertFalse(s.containsKey("rho"));
        assertTrue(((String) s.get("motivo")).contains("insuficiente"));
    }

    @Test
    @DisplayName("Spearman: só entram protocolos concluídos e com triagem")
    void soConcluidosComTriagem() {
        List<Protocolo> lista = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            lista.add(concluido(i, i + 1));
        }
        lista.add(abertoEm("P", SEGUNDA));                 // nao concluido
        Protocolo semTriagem = concluido(0, 3);            // concluido, mas sem pontos
        semTriagem.registrarTriagem(null, null, null, null);
        lista.add(semTriagem);

        Map<String, Object> s = secao(AnaliseProtocolos.montar(lista), "prioridadeXTempo");

        assertEquals(10, s.get("amostra"));
    }

    @Test
    @DisplayName("Spearman: prioridade igual em todos (sem variação) vira 'indisponível', não erro")
    void prioridadeSemVariacao() {
        List<Protocolo> lista = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            lista.add(concluido(2, i + 1));
        }

        Map<String, Object> s = secao(AnaliseProtocolos.montar(lista), "prioridadeXTempo");

        assertEquals(false, s.get("disponivel"));
        assertTrue(((String) s.get("motivo")).contains("não varia"));
    }

    @Test
    @DisplayName("forca(): faixas de interpretação e sentido")
    void faixasDeForca() {
        assertEquals("Correlação desprezível", AnaliseProtocolos.forca(0.05));
        assertEquals("Correlação positiva fraca", AnaliseProtocolos.forca(0.2));
        assertEquals("Correlação negativa moderada", AnaliseProtocolos.forca(-0.4));
        assertEquals("Correlação positiva forte", AnaliseProtocolos.forca(0.6));
        assertEquals("Correlação negativa muito forte", AnaliseProtocolos.forca(-0.9));
    }

    // ---------- regressao: volume semanal ----------

    @Test
    @DisplayName("Tendência: 1,2,3,4,5,6 por semana dá inclinação 1, R² 1 e descarta as semanas de borda")
    void tendenciaCrescente() {
        List<Protocolo> lista = new ArrayList<>();
        naSemana(lista, 0, 1);   // borda: descartada
        for (int semana = 1; semana <= 6; semana++) {
            naSemana(lista, semana, semana);
        }
        naSemana(lista, 7, 20);  // borda: descartada (se contasse, mudaria a reta)

        Map<String, Object> s = secao(AnaliseProtocolos.montar(lista), "tendenciaVolume");

        assertEquals(true, s.get("disponivel"));
        assertEquals(6, s.get("semanas"));
        assertEquals(1.0, (double) s.get("inclinacao"), 1e-9);
        assertEquals(1.0, (double) s.get("intercepto"), 1e-9);
        assertEquals(1.0, (double) s.get("r2"), 1e-9);
        assertTrue(((String) s.get("interpretacao")).contains("sobe"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> serie = (List<Map<String, Object>>) s.get("serie");
        assertEquals(6, serie.size());
        assertEquals(SEGUNDA.plusWeeks(1).toString(), serie.get(0).get("semana"));
        assertEquals(1, serie.get(0).get("protocolos"));
        assertEquals(6, serie.get(5).get("protocolos"));
    }

    @Test
    @DisplayName("Tendência: semanas sem protocolo contam como zero")
    void semanasVaziasContamComoZero() {
        List<Protocolo> lista = new ArrayList<>();
        naSemana(lista, 0, 1);   // borda
        naSemana(lista, 1, 2);
        // semanas 2 e 3 vazias
        naSemana(lista, 4, 2);
        naSemana(lista, 5, 1);   // borda

        Map<String, Object> s = secao(AnaliseProtocolos.montar(lista), "tendenciaVolume");

        // serie 2,0,0,2 em x = 0..3: Sxy = (-1,5)(1)+(-0,5)(-1)+(0,5)(-1)+(1,5)(1) = 0  =>  inclinacao 0, R2 0
        assertEquals(true, s.get("disponivel"));
        assertEquals(4, s.get("semanas"));
        assertEquals(0.0, (double) s.get("inclinacao"), 1e-9);
        assertEquals(0.0, (double) s.get("r2"), 1e-9);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> serie = (List<Map<String, Object>>) s.get("serie");
        assertEquals(List.of(2, 0, 0, 2), serie.stream().map(p -> p.get("protocolos")).toList());
        assertTrue(((String) s.get("interpretacao")).contains("estável"));
    }

    @Test
    @DisplayName("Tendência: volume caindo dá inclinação negativa")
    void tendenciaDecrescente() {
        List<Protocolo> lista = new ArrayList<>();
        naSemana(lista, 0, 1);
        for (int semana = 1; semana <= 5; semana++) {
            naSemana(lista, semana, 7 - semana); // 6,5,4,3,2
        }
        naSemana(lista, 6, 1);

        Map<String, Object> s = secao(AnaliseProtocolos.montar(lista), "tendenciaVolume");

        assertEquals(-1.0, (double) s.get("inclinacao"), 1e-9);
        assertTrue(((String) s.get("interpretacao")).contains("cai"));
    }

    @Test
    @DisplayName("Tendência: série curta (menos de 4 semanas completas) não gera reta")
    void serieCurta() {
        List<Protocolo> lista = new ArrayList<>();
        naSemana(lista, 0, 1);
        naSemana(lista, 1, 2);
        naSemana(lista, 2, 2);
        naSemana(lista, 3, 2);   // 2 semanas completas (1 e 2) apos descartar as bordas
        naSemana(lista, 3, 1);

        Map<String, Object> s = secao(AnaliseProtocolos.montar(lista), "tendenciaVolume");

        assertEquals(false, s.get("disponivel"));
        assertTrue(((String) s.get("motivo")).contains("Série curta"));
    }

    @Test
    @DisplayName("Sem protocolos nenhuma análise é inventada")
    void semProtocolos() {
        Map<String, Object> analise = AnaliseProtocolos.montar(List.of());

        assertEquals(false, secao(analise, "prioridadeXTempo").get("disponivel"));
        assertEquals(false, secao(analise, "tendenciaVolume").get("disponivel"));
        assertEquals(0L, secao(analise, "dadosFicticios").get("quantidade"));
    }

    // ---------- aviso de dados ficticios ----------

    @Test
    @DisplayName("Protocolos com id EX- são contados como fictícios e geram o aviso")
    void avisoDeDadosFicticios() {
        List<Protocolo> lista = new ArrayList<>();
        lista.add(abertoEm("EX-", SEGUNDA));
        lista.add(abertoEm("EX-", SEGUNDA));
        lista.add(abertoEm("P", SEGUNDA));

        Map<String, Object> f = secao(AnaliseProtocolos.montar(lista), "dadosFicticios");

        assertEquals(2L, f.get("quantidade"));
        assertEquals(3, f.get("total"));
        assertTrue(((String) f.get("aviso")).contains("FICTÍCIOS"));
        assertTrue(((String) f.get("aviso")).contains("2 de 3"));
    }

    @Test
    @DisplayName("Sem protocolos de exemplo não há aviso")
    void semAviso() {
        List<Protocolo> lista = List.of(abertoEm("P", SEGUNDA));

        assertNull(secao(AnaliseProtocolos.montar(lista), "dadosFicticios").get("aviso"));
    }
}
