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
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Repository;

/**
 * Camada de dados em memoria.
 *
 * <p>Simula o banco Oracle modelado na Fase 3. Toda a API conversa apenas
 * com esta classe, entao a troca por um banco real (Spring Data JPA) exige
 * alterar somente este arquivo: controllers e front-end seguem intactos.</p>
 *
 * <p>Estruturas escolhidas por proposito:</p>
 * <ul>
 *   <li><b>Lista</b> para protocolos, metas e feedbacks: colecoes
 *       ordenaveis e filtraveis;</li>
 *   <li><b>Fila (FIFO)</b> na ordem de chegada dos protocolos, porque o
 *       atendimento respeita a ordem de abertura;</li>
 *   <li><b>Pilha (LIFO)</b> na auditoria: numa investigacao, a acao mais
 *       recente e a que interessa primeiro.</li>
 * </ul>
 */
@Repository
public class RepositorioMemoria {

    /** Tipos aceitos ao abrir um protocolo. */
    public static final List<String> TIPOS_PROTOCOLO = List.of(
            "Análise de viabilidade de Metas Financeiras",
            "Dúvida sobre inflação",
            "Solicitação de orientação financeira",
            "Problema técnico",
            "Sugestão de melhoria");

    private final List<Usuario> usuarios = new CopyOnWriteArrayList<>();
    private final List<Protocolo> protocolos = new CopyOnWriteArrayList<>();
    private final List<Meta> metas = new CopyOnWriteArrayList<>();
    private final List<Feedback> feedbacks = new CopyOnWriteArrayList<>();
    private final Deque<RegistroAuditoria> auditoria = new ConcurrentLinkedDeque<>();

    private final AtomicLong proximoIdMeta = new AtomicLong(3);
    private final AtomicLong proximoIdFeedback = new AtomicLong(1);

    /**
     * Hash comparado quando o CPF nao existe: mantem o tempo de resposta
     * igual ao de um usuario real, evitando enumeracao por timing.
     */
    private String hashFalso;

    private final BCryptPasswordEncoder encoder;

    @Value("${vidareal.demo.senha-cidadao:Cidadao@123}")
    private String senhaCidadao;

    @Value("${vidareal.demo.senha-atendente:Atendente@123}")
    private String senhaAtendente;

    public RepositorioMemoria(BCryptPasswordEncoder encoder) {
        this.encoder = encoder;
    }

    @PostConstruct
    void carregarDadosIniciais() {
        // As senhas de demonstracao sao convertidas em hash na inicializacao:
        // em nenhum momento uma senha em texto puro fica armazenada.
        usuarios.add(new Usuario("52998224725", encoder.encode(senhaCidadao),
                "Maria da Silva", Perfil.CIDADAO));
        usuarios.add(new Usuario("15350946056", encoder.encode(senhaAtendente),
                "João Santos", Perfil.ATENDENTE));

        hashFalso = encoder.encode("senha-inexistente-para-tempo-constante");

        protocolos.add(new Protocolo("2026050712345", "52998224725",
                "Análise de viabilidade de Metas Financeiras",
                "Solicitação de análise para meta de reserva de emergência de R$ 10.000 em 12 meses.",
                EtapaProtocolo.EM_ANALISE, Instant.parse("2026-05-07T09:12:00Z"), null));

        protocolos.add(new Protocolo("2026042098765", "52998224725",
                "Solicitação de orientação financeira",
                "Inscrição no curso de educação financeira oferecido pela prefeitura de Taubaté.",
                EtapaProtocolo.CONCLUIDO, Instant.parse("2026-04-20T14:30:00Z"),
                Instant.parse("2026-04-28T16:05:00Z")));

        protocolos.add(new Protocolo("2026031554321", "52998224725",
                "Análise de viabilidade de Metas Financeiras",
                "Consulta sobre viabilidade de meta para viagem internacional no prazo de 18 meses.",
                EtapaProtocolo.CRIADA, Instant.parse("2026-03-15T08:45:00Z"), null));

        protocolos.add(new Protocolo("2026022611223", "15350946056",
                "Dúvida sobre inflação",
                "Pedido de esclarecimento sobre o índice utilizado nas projeções do simulador.",
                EtapaProtocolo.CONCLUIDO, Instant.parse("2026-02-26T10:00:00Z"),
                Instant.parse("2026-03-10T11:20:00Z")));

        metas.add(new Meta(1, "52998224725", "Reserva de Emergência",
                new BigDecimal("3000"), new BigDecimal("10000"), "12 meses"));
        metas.add(new Meta(2, "52998224725", "Viagem",
                new BigDecimal("1500"), new BigDecimal("5000"), "6 meses"));
    }

    // ---------- Usuarios ----------

    public Optional<Usuario> buscarUsuarioPorCpf(String cpf) {
        return usuarios.stream().filter(u -> u.getCpf().equals(cpf)).findFirst();
    }

    public String getHashFalso() {
        return hashFalso;
    }

    public boolean cpfJaCadastrado(String cpf) {
        return usuarios.stream().anyMatch(u -> u.getCpf().equals(cpf));
    }

    public void adicionarUsuario(Usuario usuario) {
        usuarios.add(usuario);
    }

    // ---------- Protocolos ----------

    /** Ordem de chegada preservada (FIFO). */
    public List<Protocolo> listarProtocolos() {
        return new ArrayList<>(protocolos);
    }

    public Optional<Protocolo> buscarProtocolo(String id) {
        return protocolos.stream().filter(p -> p.getId().equals(id)).findFirst();
    }

    public void adicionarProtocolo(Protocolo protocolo) {
        protocolos.add(protocolo);
    }

    public void removerProtocolo(Protocolo protocolo) {
        protocolos.remove(protocolo);
    }

    /** Numero no formato aaaaMMdd seguido de 5 digitos aleatorios. */
    public String gerarIdProtocolo() {
        String data = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        int aleatorio = ThreadLocalRandom.current().nextInt(10000, 100000);
        return data + aleatorio;
    }

    // ---------- Metas ----------

    public List<Meta> listarMetasDoUsuario(String cpf) {
        return metas.stream().filter(m -> m.getCpfUsuario().equals(cpf)).toList();
    }

    public Optional<Meta> buscarMeta(long id, String cpf) {
        return metas.stream()
                .filter(m -> m.getId() == id && m.getCpfUsuario().equals(cpf))
                .findFirst();
    }

    public void adicionarMeta(Meta meta) {
        metas.add(meta);
    }

    public void removerMeta(Meta meta) {
        metas.remove(meta);
    }

    public long proximoIdMeta() {
        return proximoIdMeta.getAndIncrement();
    }

    // ---------- Feedbacks ----------

    public List<Feedback> listarFeedbacks() {
        return new ArrayList<>(feedbacks);
    }

    public void adicionarFeedback(Feedback feedback) {
        feedbacks.add(feedback);
    }

    public long proximoIdFeedback() {
        return proximoIdFeedback.getAndIncrement();
    }

    // ---------- Auditoria ----------

    public void registrarAuditoria(String acao, String recurso, String recursoId,
                                   String cpfAutor, String perfilAutor, String detalhe) {
        auditoria.push(new RegistroAuditoria(UUID.randomUUID().toString(), acao, recurso,
                recursoId, cpfAutor, perfilAutor, detalhe, Instant.now()));
    }

    /** Devolve do topo da pilha: acoes mais recentes primeiro. */
    public List<RegistroAuditoria> listarAuditoria() {
        return new ArrayList<>(auditoria);
    }
}
