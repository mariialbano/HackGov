package br.gov.taubate.vidareal.repositorio;

import br.gov.taubate.vidareal.modelo.EtapaProtocolo;
import br.gov.taubate.vidareal.modelo.Feedback;
import br.gov.taubate.vidareal.modelo.Meta;
import br.gov.taubate.vidareal.modelo.Perfil;
import br.gov.taubate.vidareal.modelo.Protocolo;
import br.gov.taubate.vidareal.modelo.RegistroAuditoria;
import br.gov.taubate.vidareal.modelo.Usuario;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Repository;

/**
 * Camada de dados da plataforma, sobre um banco relacional.
 *
 * <p>Toda a API conversa apenas com esta classe, em SQL puro pelo
 * {@link JdbcTemplate}: o esquema fica visivel em {@code schema.sql} e as
 * entidades seguem objetos Java simples, sem anotacoes de ORM. Trocar o H2
 * embutido por um servidor Oracle exige mudar a URL do datasource, nao o
 * codigo.</p>
 *
 * <p>Os dados agora sobrevivem ao reinicio da API: uma conta criada pelo
 * cidadao, um protocolo aberto ou um aporte em meta continuam la depois de
 * o servidor ser desligado.</p>
 *
 * <p>A ordem de leitura reproduz o significado de cada colecao:</p>
 * <ul>
 *   <li><b>Protocolos</b> pela abertura (FIFO), porque o atendimento
 *       respeita a ordem de chegada;</li>
 *   <li><b>Auditoria</b> do mais recente para o mais antigo (LIFO), porque
 *       numa investigacao a ultima acao e a que interessa primeiro.</li>
 * </ul>
 */
@Repository
@DependsOnDatabaseInitialization
public class Repositorio {

    private static final Logger log = LoggerFactory.getLogger(Repositorio.class);

    /** Tipos aceitos ao abrir um protocolo. */
    public static final List<String> TIPOS_PROTOCOLO = List.of(
            "Análise de viabilidade de Metas Financeiras",
            "Dúvida sobre inflação",
            "Solicitação de orientação financeira",
            "Problema técnico",
            "Sugestão de melhoria");

    private final JdbcTemplate jdbc;
    private final BCryptPasswordEncoder encoder;

    /**
     * Hash comparado quando o CPF nao existe: mantem o tempo de resposta
     * igual ao de um usuario real, evitando enumeracao por timing. Nao e
     * dado de ninguem, por isso vive em memoria e nao no banco.
     */
    private String hashFalso;

    @Value("${vidareal.demo.senha-cidadao:Cidadao@123}")
    private String senhaCidadao;

    @Value("${vidareal.demo.senha-atendente:Atendente@123}")
    private String senhaAtendente;

    public Repositorio(JdbcTemplate jdbc, BCryptPasswordEncoder encoder) {
        this.jdbc = jdbc;
        this.encoder = encoder;
    }

    /**
     * Popula o banco recem-criado com as contas e os registros de
     * demonstracao.
     *
     * <p>Roda apenas quando nao existe nenhum usuario: em um banco que
     * persiste, repetir a carga a cada subida duplicaria os protocolos e
     * quebraria o cadastro pelo CPF ja existente.</p>
     */
    @PostConstruct
    void carregarDadosIniciais() {
        hashFalso = encoder.encode("senha-inexistente-para-tempo-constante");

        Long usuarios = jdbc.queryForObject("SELECT COUNT(*) FROM usuario", Long.class);
        if (usuarios != null && usuarios > 0) {
            log.info("Banco ja povoado ({} usuario(s)): carga de demonstracao ignorada.", usuarios);
            return;
        }

        log.info("Banco vazio: gravando os dados de demonstracao.");

        // As senhas de demonstracao sao convertidas em hash na inicializacao:
        // em nenhum momento uma senha em texto puro fica armazenada.
        adicionarUsuario(new Usuario("52998224725", encoder.encode(senhaCidadao),
                "Maria da Silva", Perfil.CIDADAO));
        adicionarUsuario(new Usuario("15350946056", encoder.encode(senhaAtendente),
                "João Santos", Perfil.ATENDENTE));

        adicionarProtocolo(new Protocolo("2026050712345", "52998224725",
                "Análise de viabilidade de Metas Financeiras",
                "Solicitação de análise para meta de reserva de emergência de R$ 10.000 em 12 meses.",
                EtapaProtocolo.EM_ANALISE, Instant.parse("2026-05-07T09:12:00Z"), null));

        adicionarProtocolo(new Protocolo("2026042098765", "52998224725",
                "Solicitação de orientação financeira",
                "Inscrição no curso de educação financeira oferecido pela prefeitura de Taubaté.",
                EtapaProtocolo.CONCLUIDO, Instant.parse("2026-04-20T14:30:00Z"),
                Instant.parse("2026-04-28T16:05:00Z")));

        adicionarProtocolo(new Protocolo("2026031554321", "52998224725",
                "Análise de viabilidade de Metas Financeiras",
                "Consulta sobre viabilidade de meta para viagem internacional no prazo de 18 meses.",
                EtapaProtocolo.CRIADA, Instant.parse("2026-03-15T08:45:00Z"), null));

        adicionarProtocolo(new Protocolo("2026022611223", "15350946056",
                "Dúvida sobre inflação",
                "Pedido de esclarecimento sobre o índice utilizado nas projeções do simulador.",
                EtapaProtocolo.CONCLUIDO, Instant.parse("2026-02-26T10:00:00Z"),
                Instant.parse("2026-03-10T11:20:00Z")));

        adicionarMeta(new Meta(proximoIdMeta(), "52998224725", "Reserva de Emergência",
                new BigDecimal("3000"), new BigDecimal("10000"), "12 meses"));
        adicionarMeta(new Meta(proximoIdMeta(), "52998224725", "Viagem",
                new BigDecimal("1500"), new BigDecimal("5000"), "6 meses"));
    }

    // ---------- Usuarios ----------

    private static final String COLUNAS_USUARIO =
            "cpf, senha_hash, nome, email, cep, cidade, perfil";

    private static final RowMapper<Usuario> MAPA_USUARIO = (rs, linha) -> {
        Usuario usuario = new Usuario(
                rs.getString("cpf"),
                rs.getString("senha_hash"),
                rs.getString("nome"),
                rs.getString("email"),
                Perfil.de(rs.getString("perfil")));
        usuario.setCep(rs.getString("cep"));
        usuario.setCidade(rs.getString("cidade"));
        return usuario;
    };

    public Optional<Usuario> buscarUsuarioPorCpf(String cpf) {
        return jdbc.query("SELECT " + COLUNAS_USUARIO + " FROM usuario WHERE cpf = ?",
                        MAPA_USUARIO, cpf)
                .stream().findFirst();
    }

    public String getHashFalso() {
        return hashFalso;
    }

    public boolean cpfJaCadastrado(String cpf) {
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM usuario WHERE cpf = ?",
                Long.class, cpf);
        return total != null && total > 0;
    }

    public void adicionarUsuario(Usuario usuario) {
        jdbc.update("INSERT INTO usuario (" + COLUNAS_USUARIO + ") VALUES (?, ?, ?, ?, ?, ?, ?)",
                usuario.getCpf(), usuario.getSenhaHash(), usuario.getNome(), usuario.getEmail(),
                usuario.getCep(), usuario.getCidade(), usuario.getPerfil().getValor());
    }

    /**
     * Grava as alteracoes de uma conta.
     *
     * <p>CPF e perfil ficam fora do UPDATE: identificam o usuario e seu
     * papel, e nao mudam depois do cadastro.</p>
     */
    public void salvarUsuario(Usuario usuario) {
        jdbc.update("""
                UPDATE usuario
                   SET senha_hash = ?, nome = ?, email = ?, cep = ?, cidade = ?
                 WHERE cpf = ?
                """,
                usuario.getSenhaHash(), usuario.getNome(), usuario.getEmail(),
                usuario.getCep(), usuario.getCidade(), usuario.getCpf());
    }

    // ---------- Protocolos ----------

    private static final String COLUNAS_PROTOCOLO =
            "id, cpf_solicitante, tipo, descricao, etapa, aberto_em, concluido_em";

    private static final RowMapper<Protocolo> MAPA_PROTOCOLO = (rs, linha) -> new Protocolo(
            rs.getString("id"),
            rs.getString("cpf_solicitante"),
            rs.getString("tipo"),
            rs.getString("descricao"),
            EtapaProtocolo.valueOf(rs.getString("etapa")),
            lerInstante(rs, "aberto_em"),
            lerInstante(rs, "concluido_em"));

    /** Ordem de chegada preservada (FIFO). */
    public List<Protocolo> listarProtocolos() {
        return jdbc.query("SELECT " + COLUNAS_PROTOCOLO
                + " FROM protocolo ORDER BY aberto_em, id", MAPA_PROTOCOLO);
    }

    public Optional<Protocolo> buscarProtocolo(String id) {
        return jdbc.query("SELECT " + COLUNAS_PROTOCOLO + " FROM protocolo WHERE id = ?",
                        MAPA_PROTOCOLO, id)
                .stream().findFirst();
    }

    public void adicionarProtocolo(Protocolo protocolo) {
        jdbc.update("INSERT INTO protocolo (" + COLUNAS_PROTOCOLO + ") VALUES (?, ?, ?, ?, ?, ?, ?)",
                protocolo.getId(), protocolo.getCpfSolicitante(), protocolo.getTipo(),
                protocolo.getDescricao(), protocolo.getEtapa().name(),
                paraBanco(protocolo.getAbertoEm()), paraBanco(protocolo.getConcluidoEm()));
    }

    /** Grava a tramitacao e a edicao de um protocolo. */
    public void salvarProtocolo(Protocolo protocolo) {
        jdbc.update("""
                UPDATE protocolo
                   SET tipo = ?, descricao = ?, etapa = ?, concluido_em = ?
                 WHERE id = ?
                """,
                protocolo.getTipo(), protocolo.getDescricao(), protocolo.getEtapa().name(),
                paraBanco(protocolo.getConcluidoEm()), protocolo.getId());
    }

    public void removerProtocolo(Protocolo protocolo) {
        jdbc.update("DELETE FROM protocolo WHERE id = ?", protocolo.getId());
    }

    /**
     * Numero no formato aaaaMMdd seguido de 5 digitos aleatorios.
     *
     * <p>O identificador e a chave primaria da tabela, entao o sorteio e
     * conferido antes de ser usado: repetir um numero ja existente faria a
     * abertura falhar na cara do cidadao.</p>
     */
    public String gerarIdProtocolo() {
        String data = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        for (int tentativa = 0; tentativa < 25; tentativa++) {
            String candidato = data + ThreadLocalRandom.current().nextInt(10000, 100000);
            Long existe = jdbc.queryForObject("SELECT COUNT(*) FROM protocolo WHERE id = ?",
                    Long.class, candidato);
            if (existe == null || existe == 0) {
                return candidato;
            }
        }
        throw new IllegalStateException(
                "Nao foi possivel gerar um numero de protocolo livre para " + data + ".");
    }

    // ---------- Metas ----------

    private static final String COLUNAS_META = "id, cpf_usuario, tipo, atual, objetivo, prazo";

    private static final RowMapper<Meta> MAPA_META = (rs, linha) -> new Meta(
            rs.getLong("id"),
            rs.getString("cpf_usuario"),
            rs.getString("tipo"),
            rs.getBigDecimal("atual"),
            rs.getBigDecimal("objetivo"),
            rs.getString("prazo"));

    public List<Meta> listarMetasDoUsuario(String cpf) {
        return jdbc.query("SELECT " + COLUNAS_META
                + " FROM meta WHERE cpf_usuario = ? ORDER BY id", MAPA_META, cpf);
    }

    public Optional<Meta> buscarMeta(long id, String cpf) {
        return jdbc.query("SELECT " + COLUNAS_META + " FROM meta WHERE id = ? AND cpf_usuario = ?",
                        MAPA_META, id, cpf)
                .stream().findFirst();
    }

    public void adicionarMeta(Meta meta) {
        jdbc.update("INSERT INTO meta (" + COLUNAS_META + ") VALUES (?, ?, ?, ?, ?, ?)",
                meta.getId(), meta.getCpfUsuario(), meta.getTipo(),
                meta.getAtual(), meta.getObjetivo(), meta.getPrazo());
    }

    /** Grava a edicao da meta e os aportes. */
    public void salvarMeta(Meta meta) {
        jdbc.update("""
                UPDATE meta
                   SET tipo = ?, atual = ?, objetivo = ?, prazo = ?
                 WHERE id = ?
                """,
                meta.getTipo(), meta.getAtual(), meta.getObjetivo(), meta.getPrazo(), meta.getId());
    }

    public void removerMeta(Meta meta) {
        jdbc.update("DELETE FROM meta WHERE id = ?", meta.getId());
    }

    /** Proximo identificador de meta, entregue pela sequencia do banco. */
    public long proximoIdMeta() {
        Long proximo = jdbc.queryForObject("SELECT NEXT VALUE FOR seq_meta", Long.class);
        if (proximo == null) {
            throw new IllegalStateException("A sequencia de metas nao devolveu um valor.");
        }
        return proximo;
    }

    // ---------- Feedbacks ----------

    private static final RowMapper<Feedback> MAPA_FEEDBACK = (rs, linha) -> new Feedback(
            rs.getLong("id"),
            rs.getInt("rating"),
            rs.getString("comentario"),
            lerInstante(rs, "registrado_em"));

    public List<Feedback> listarFeedbacks() {
        return jdbc.query(
                "SELECT id, rating, comentario, registrado_em FROM feedback ORDER BY id",
                MAPA_FEEDBACK);
    }

    public void adicionarFeedback(Feedback feedback) {
        jdbc.update("INSERT INTO feedback (id, rating, comentario, registrado_em) VALUES (?, ?, ?, ?)",
                feedback.getId(), feedback.getRating(), feedback.getComentario(),
                paraBanco(feedback.getRegistradoEm()));
    }

    /** Proximo identificador de feedback, entregue pela sequencia do banco. */
    public long proximoIdFeedback() {
        Long proximo = jdbc.queryForObject("SELECT NEXT VALUE FOR seq_feedback", Long.class);
        if (proximo == null) {
            throw new IllegalStateException("A sequencia de feedbacks nao devolveu um valor.");
        }
        return proximo;
    }

    // ---------- Auditoria ----------

    private static final RowMapper<RegistroAuditoria> MAPA_AUDITORIA =
            (rs, linha) -> new RegistroAuditoria(
                    rs.getString("id"),
                    rs.getString("acao"),
                    rs.getString("recurso"),
                    rs.getString("recurso_id"),
                    rs.getString("cpf_autor"),
                    rs.getString("perfil_autor"),
                    rs.getString("detalhe"),
                    lerInstante(rs, "registrado_em"));

    public void registrarAuditoria(String acao, String recurso, String recursoId,
                                   String cpfAutor, String perfilAutor, String detalhe) {
        jdbc.update("""
                INSERT INTO auditoria
                       (id, acao, recurso, recurso_id, cpf_autor, perfil_autor, detalhe, registrado_em)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID().toString(), acao, recurso, recursoId,
                cpfAutor, perfilAutor, detalhe, paraBanco(Instant.now()));
    }

    /** Acoes mais recentes primeiro (LIFO). */
    public List<RegistroAuditoria> listarAuditoria() {
        return jdbc.query("""
                SELECT id, acao, recurso, recurso_id, cpf_autor, perfil_autor, detalhe, registrado_em
                  FROM auditoria
                 ORDER BY seq DESC
                """, MAPA_AUDITORIA);
    }

    // ---------- Conversao de datas ----------

    /**
     * O banco guarda o instante com fuso (UTC) em vez de data local: assim
     * o registro continua correto se o servidor mudar de fuso ou de horario
     * de verao.
     */
    private static OffsetDateTime paraBanco(Instant instante) {
        return instante == null ? null : instante.atOffset(ZoneOffset.UTC);
    }

    private static Instant lerInstante(ResultSet rs, String coluna) throws SQLException {
        OffsetDateTime valor = rs.getObject(coluna, OffsetDateTime.class);
        return valor == null ? null : valor.toInstant();
    }
}
