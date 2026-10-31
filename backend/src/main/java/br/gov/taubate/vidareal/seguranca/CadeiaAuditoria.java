package br.gov.taubate.vidareal.seguranca;

import br.gov.taubate.vidareal.modelo.RegistroAuditoria;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;

/**
 * Cadeia de hashes da trilha de auditoria.
 *
 * <p>Cada registro guarda o SHA-256 de seus campos junto com o hash do
 * registro anterior. Mudar qualquer campo de um registro, ou remover um do
 * meio, faz o hash recalculado deixar de bater com o gravado, e a verificacao
 * aponta o primeiro registro afetado.</p>
 *
 * <p><b>O que a cadeia nao protege:</b> quem controla o banco inteiro pode
 * recalcular todos os hashes, ou apagar os registros mais recentes (o fim da
 * cadeia continua consistente). Ela detecta alteracao isolada; para resistir
 * a esse adversario, o hash mais recente precisaria ser guardado fora do
 * banco (por exemplo, ancorado em uma blockchain &mdash; ver docs).</p>
 */
public final class CadeiaAuditoria {

    /** "Hash anterior" do primeiro registro da cadeia. */
    public static final String GENESIS = "0".repeat(64);

    /** Separador de campos: caractere de controle, que nao aparece nos textos. */
    private static final char SEPARADOR = '\u001F';

    private CadeiaAuditoria() {
    }

    /** Resultado da verificacao. */
    public record Resultado(boolean integra, int totalRegistros, int registrosNaCadeia,
                            String primeiroRegistroInvalido, String motivo, String hashAtual) {
    }

    /** SHA-256, em hexadecimal, dos campos do registro e do hash anterior. */
    public static String calcular(String hashAnterior, String id, String acao, String recurso,
                                  String recursoId, String cpfAutor, String perfilAutor,
                                  String detalhe, Instant registradoEm) {
        StringBuilder texto = new StringBuilder();
        for (Object campo : new Object[] {hashAnterior, id, acao, recurso, recursoId,
                cpfAutor, perfilAutor, detalhe, registradoEm}) {
            texto.append(campo == null ? "" : campo).append(SEPARADOR);
        }
        try {
            byte[] resumo = MessageDigest.getInstance("SHA-256")
                    .digest(texto.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(resumo);
        } catch (NoSuchAlgorithmException erro) {
            throw new IllegalStateException("SHA-256 indisponivel na JVM.", erro);
        }
    }

    /**
     * Confere a cadeia.
     *
     * @param registros do mais antigo para o mais recente. Registros sem hash
     *                  no inicio (anteriores a cadeia) sao ignorados; depois
     *                  que a cadeia comeca, todo registro precisa ter hash.
     */
    public static Resultado verificar(List<RegistroAuditoria> registros) {
        String esperadoAnterior = GENESIS;
        int naCadeia = 0;

        for (RegistroAuditoria r : registros) {
            if (r.getHashRegistro() == null) {
                if (naCadeia == 0) {
                    continue; // registro antigo, de antes da cadeia existir
                }
                return invalido(registros.size(), naCadeia, r, "Registro sem hash dentro da cadeia.");
            }

            if (!esperadoAnterior.equals(r.getHashAnterior())) {
                return invalido(registros.size(), naCadeia, r,
                        "O elo anterior não confere: há um registro removido ou reordenado antes deste.");
            }

            String recalculado = calcular(r.getHashAnterior(), r.getId(), r.getAcao(), r.getRecurso(),
                    r.getRecursoId(), r.getCpfAutor(), r.getPerfilAutor(), r.getDetalhe(),
                    r.getRegistradoEm());
            if (!recalculado.equals(r.getHashRegistro())) {
                return invalido(registros.size(), naCadeia, r,
                        "O conteúdo do registro foi alterado depois de gravado.");
            }

            esperadoAnterior = r.getHashRegistro();
            naCadeia++;
        }

        return new Resultado(true, registros.size(), naCadeia, null, null,
                naCadeia == 0 ? null : esperadoAnterior);
    }

    private static Resultado invalido(int total, int naCadeia, RegistroAuditoria r, String motivo) {
        return new Resultado(false, total, naCadeia, r.getId(), motivo, null);
    }
}
