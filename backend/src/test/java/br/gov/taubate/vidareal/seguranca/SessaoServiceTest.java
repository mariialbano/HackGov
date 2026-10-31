package br.gov.taubate.vidareal.seguranca;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.gov.taubate.vidareal.modelo.Perfil;
import br.gov.taubate.vidareal.modelo.Usuario;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Expiracao por inatividade, com relogio controlado: o teste nao espera minutos. */
class SessaoServiceTest {

    /** Relogio que so anda quando o teste manda. */
    private static class RelogioManual extends Clock {
        private Instant agora = Instant.parse("2026-01-01T12:00:00Z");

        void avancar(Duration tempo) {
            agora = agora.plus(tempo);
        }

        @Override
        public Instant instant() {
            return agora;
        }

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zona) {
            return this;
        }
    }

    private RelogioManual relogio;
    private SessaoService sessoes;
    private final Usuario maria = new Usuario("52998224725", "hash", "Maria", Perfil.CIDADAO);

    @BeforeEach
    void preparar() {
        relogio = new RelogioManual();
        sessoes = new SessaoService(Duration.ofMinutes(15), relogio);
    }

    @Test
    @DisplayName("sessão recém-aberta vale")
    void sessaoNovaVale() {
        String token = sessoes.abrir(maria);
        assertTrue(sessoes.resolver(token).isPresent());
    }

    @Test
    @DisplayName("sessão parada além de 15 minutos deixa de valer")
    void sessaoInativaExpira() {
        String token = sessoes.abrir(maria);

        relogio.avancar(Duration.ofMinutes(15).plusSeconds(1));

        assertTrue(sessoes.resolver(token).isEmpty());
    }

    @Test
    @DisplayName("sessão expirada não volta a valer, mesmo que o relógio não ande mais")
    void expiracaoEDefinitiva() {
        String token = sessoes.abrir(maria);
        relogio.avancar(Duration.ofMinutes(16));
        sessoes.resolver(token);

        assertTrue(sessoes.resolver(token).isEmpty());
    }

    @Test
    @DisplayName("exatamente no limite ainda vale; o prazo é de inatividade")
    void noLimiteAindaVale() {
        String token = sessoes.abrir(maria);
        relogio.avancar(Duration.ofMinutes(15));
        assertTrue(sessoes.resolver(token).isPresent());
    }

    @Test
    @DisplayName("cada uso renova o prazo: uso a cada 10 minutos mantém a sessão por mais de 15")
    void usoRenovaOPrazo() {
        String token = sessoes.abrir(maria);

        for (int i = 0; i < 4; i++) { // 40 minutos no total
            relogio.avancar(Duration.ofMinutes(10));
            assertTrue(sessoes.resolver(token).isPresent(), "uso " + (i + 1));
        }

        relogio.avancar(Duration.ofMinutes(16));
        assertTrue(sessoes.resolver(token).isEmpty());
    }

    @Test
    @DisplayName("token inexistente ou vazio não resolve")
    void tokenInvalido() {
        assertTrue(sessoes.resolver("inexistente").isEmpty());
        assertTrue(sessoes.resolver(null).isEmpty());
        assertTrue(sessoes.resolver("  ").isEmpty());
    }

    @Test
    @DisplayName("encerrar e encerrarTodasDe continuam funcionando")
    void encerramento() {
        String a = sessoes.abrir(maria);
        String b = sessoes.abrir(maria);

        sessoes.encerrar(a);
        assertTrue(sessoes.resolver(a).isEmpty());
        assertEquals(maria, sessoes.resolver(b).orElseThrow());

        sessoes.encerrarTodasDe(maria.getCpf());
        assertTrue(sessoes.resolver(b).isEmpty());
    }
}
