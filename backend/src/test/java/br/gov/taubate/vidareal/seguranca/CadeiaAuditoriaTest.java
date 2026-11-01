package br.gov.taubate.vidareal.seguranca;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.gov.taubate.vidareal.modelo.RegistroAuditoria;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Verificacao da cadeia sobre listas em memoria: cada violacao em isolamento. */
class CadeiaAuditoriaTest {

    private static final Instant T0 = Instant.parse("2026-03-01T10:00:00Z");

    /** Registro com hash correto, encadeado ao anterior. */
    private static RegistroAuditoria registro(String anterior, String id, String acao,
                                              String detalhe, long segundos) {
        Instant quando = T0.plusSeconds(segundos);
        String hash = CadeiaAuditoria.calcular(anterior, id, acao, "protocolos", "P1",
                "52998224725", "cidadao", detalhe, quando);
        return new RegistroAuditoria(id, acao, "protocolos", "P1", "52998224725", "cidadao",
                detalhe, quando, anterior, hash);
    }

    /** Copia do registro com o detalhe trocado, mantendo os hashes gravados. */
    private static RegistroAuditoria comDetalhe(RegistroAuditoria r, String detalhe) {
        return new RegistroAuditoria(r.getId(), r.getAcao(), r.getRecurso(), r.getRecursoId(),
                r.getCpfAutor(), r.getPerfilAutor(), detalhe, r.getRegistradoEm(),
                r.getHashAnterior(), r.getHashRegistro());
    }

    /** Cadeia de n registros (r1..rn), do mais antigo para o mais recente. */
    private static List<RegistroAuditoria> cadeia(int n) {
        List<RegistroAuditoria> lista = new ArrayList<>();
        String anterior = CadeiaAuditoria.GENESIS;
        for (int i = 1; i <= n; i++) {
            RegistroAuditoria r = registro(anterior, "r" + i, "ACAO_" + i, "detalhe " + i, i);
            lista.add(r);
            anterior = r.getHashRegistro();
        }
        return lista;
    }

    private static RegistroAuditoria semHash(String id) {
        return new RegistroAuditoria(id, "LOGIN", "auth", null, null, null, null, T0, null, null);
    }

    @Test
    @DisplayName("o hash é determinístico, tem 64 caracteres e depende do hash anterior")
    void hashDeterministico() {
        String a = CadeiaAuditoria.calcular(CadeiaAuditoria.GENESIS, "id", "A", "r", "1", "c", "p", "d", T0);
        String b = CadeiaAuditoria.calcular(CadeiaAuditoria.GENESIS, "id", "A", "r", "1", "c", "p", "d", T0);
        String outroAnterior = CadeiaAuditoria.calcular("1".repeat(64), "id", "A", "r", "1", "c", "p", "d", T0);

        assertEquals(a, b);
        assertEquals(64, a.length());
        assertNotEquals(a, outroAnterior);
    }

    @Test
    @DisplayName("campos nulos são aceitos no cálculo")
    void camposNulos() {
        String hash = CadeiaAuditoria.calcular(CadeiaAuditoria.GENESIS, "id", "A", "r", null, null, null, null, T0);
        assertEquals(64, hash.length());
    }

    @Test
    @DisplayName("cadeia íntegra é aprovada e informa o hash mais recente")
    void cadeiaIntegra() {
        List<RegistroAuditoria> lista = cadeia(5);

        CadeiaAuditoria.Resultado r = CadeiaAuditoria.verificar(lista);

        assertTrue(r.integra());
        assertEquals(5, r.registrosNaCadeia());
        assertNull(r.primeiroRegistroInvalido());
        assertEquals(lista.get(4).getHashRegistro(), r.hashAtual());
    }

    @Test
    @DisplayName("trilha vazia é íntegra, sem hash atual")
    void trilhaVazia() {
        CadeiaAuditoria.Resultado r = CadeiaAuditoria.verificar(List.of());

        assertTrue(r.integra());
        assertEquals(0, r.registrosNaCadeia());
        assertNull(r.hashAtual());
    }

    @Test
    @DisplayName("alterar o conteúdo de um registro aponta exatamente esse registro")
    void conteudoAlterado() {
        List<RegistroAuditoria> lista = cadeia(5);
        lista.set(2, comDetalhe(lista.get(2), "status: Em análise -> Criada"));

        CadeiaAuditoria.Resultado r = CadeiaAuditoria.verificar(lista);

        assertFalse(r.integra());
        assertEquals("r3", r.primeiroRegistroInvalido());
        assertTrue(r.motivo().contains("alterado"));
    }

    @Test
    @DisplayName("apagar um registro do meio aponta o registro seguinte")
    void registroRemovido() {
        List<RegistroAuditoria> lista = cadeia(5);
        lista.remove(2); // some o r3

        CadeiaAuditoria.Resultado r = CadeiaAuditoria.verificar(lista);

        assertFalse(r.integra());
        assertEquals("r4", r.primeiroRegistroInvalido());
        assertTrue(r.motivo().contains("removido"));
    }

    @Test
    @DisplayName("apagar o primeiro registro da cadeia também é detectado")
    void primeiroRemovido() {
        List<RegistroAuditoria> lista = cadeia(3);
        lista.remove(0);

        CadeiaAuditoria.Resultado r = CadeiaAuditoria.verificar(lista);

        assertFalse(r.integra());
        assertEquals("r2", r.primeiroRegistroInvalido());
    }

    @Test
    @DisplayName("registros reordenados quebram a cadeia")
    void reordenados() {
        List<RegistroAuditoria> lista = cadeia(4);
        RegistroAuditoria r2 = lista.get(1);
        lista.set(1, lista.get(2));
        lista.set(2, r2);

        assertFalse(CadeiaAuditoria.verificar(lista).integra());
    }

    @Test
    @DisplayName("recalcular só o hash do registro adulterado não basta: o elo seguinte denuncia")
    void hashRecalculadoSoNoRegistro() {
        List<RegistroAuditoria> lista = cadeia(4);
        RegistroAuditoria original = lista.get(1);
        String novoDetalhe = "adulterado";
        String novoHash = CadeiaAuditoria.calcular(original.getHashAnterior(), original.getId(),
                original.getAcao(), original.getRecurso(), original.getRecursoId(),
                original.getCpfAutor(), original.getPerfilAutor(), novoDetalhe,
                original.getRegistradoEm());
        lista.set(1, new RegistroAuditoria(original.getId(), original.getAcao(),
                original.getRecurso(), original.getRecursoId(), original.getCpfAutor(),
                original.getPerfilAutor(), novoDetalhe, original.getRegistradoEm(),
                original.getHashAnterior(), novoHash));

        CadeiaAuditoria.Resultado r = CadeiaAuditoria.verificar(lista);

        assertFalse(r.integra());
        assertEquals("r3", r.primeiroRegistroInvalido());
    }

    @Test
    @DisplayName("registros antigos, sem hash, no início da trilha são ignorados")
    void registrosAntigosIgnorados() {
        List<RegistroAuditoria> lista = new ArrayList<>();
        lista.add(semHash("antigo1"));
        lista.add(semHash("antigo2"));
        lista.addAll(cadeia(3));

        CadeiaAuditoria.Resultado r = CadeiaAuditoria.verificar(lista);

        assertTrue(r.integra());
        assertEquals(5, r.totalRegistros());
        assertEquals(3, r.registrosNaCadeia());
    }

    @Test
    @DisplayName("registro sem hash depois de a cadeia começar é violação")
    void semHashDentroDaCadeia() {
        List<RegistroAuditoria> lista = cadeia(3);
        lista.add(semHash("intruso"));

        CadeiaAuditoria.Resultado r = CadeiaAuditoria.verificar(lista);

        assertFalse(r.integra());
        assertEquals("intruso", r.primeiroRegistroInvalido());
    }

    /**
     * LIMITE CONHECIDO, registrado em teste para nao virar surpresa: apagar os
     * registros MAIS RECENTES deixa o inicio da cadeia consistente. Detectar
     * isso exige guardar o hash atual fora do banco (ancoragem externa).
     */
    @Test
    @DisplayName("limite conhecido: apagar os registros mais recentes não é detectado")
    void truncamentoDoFimNaoEDetectado() {
        List<RegistroAuditoria> lista = cadeia(5);
        List<RegistroAuditoria> truncada = new ArrayList<>(lista.subList(0, 3));

        CadeiaAuditoria.Resultado r = CadeiaAuditoria.verificar(truncada);

        assertTrue(r.integra());
        assertNotEquals(lista.get(4).getHashRegistro(), r.hashAtual()); // so o hash atual denuncia
    }
}
