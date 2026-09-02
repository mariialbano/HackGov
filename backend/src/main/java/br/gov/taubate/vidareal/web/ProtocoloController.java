package br.gov.taubate.vidareal.web;

import br.gov.taubate.vidareal.erro.ApiException;
import br.gov.taubate.vidareal.erro.ErroCampo;
import br.gov.taubate.vidareal.modelo.EtapaProtocolo;
import br.gov.taubate.vidareal.modelo.Perfil;
import br.gov.taubate.vidareal.modelo.Protocolo;
import br.gov.taubate.vidareal.modelo.Usuario;
import br.gov.taubate.vidareal.repositorio.RepositorioMemoria;
import br.gov.taubate.vidareal.seguranca.Autenticado;
import br.gov.taubate.vidareal.seguranca.UsuarioLogado;
import br.gov.taubate.vidareal.util.Validadores;
import br.gov.taubate.vidareal.web.dto.Pagina;
import br.gov.taubate.vidareal.web.dto.ProtocoloRequest;
import br.gov.taubate.vidareal.web.dto.ProtocoloResposta;
import br.gov.taubate.vidareal.web.dto.StatusRequest;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recurso /api/v1/protocolos: o CRUD principal do sistema.
 *
 * <p>Regra de visibilidade (LGPD): o cidadao enxerga apenas os proprios
 * protocolos; o atendente enxerga todos. Ao pedir um protocolo de outra
 * pessoa a API responde 404 &mdash; e nao 403 &mdash; para nao confirmar
 * que aquele registro existe.</p>
 */
@RestController
@RequestMapping("/api/v1/protocolos")
@Autenticado
public class ProtocoloController {

    private static final int DESCRICAO_MINIMA = 10;
    private static final int DESCRICAO_MAXIMA = 1000;

    private final RepositorioMemoria repositorio;

    public ProtocoloController(RepositorioMemoria repositorio) {
        this.repositorio = repositorio;
    }

    // ---------- GET /protocolos ----------

    @GetMapping
    public Pagina<ProtocoloResposta> listar(
            @UsuarioLogado Usuario usuario,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String tipo,
            @RequestParam(defaultValue = "1") int pagina,
            @RequestParam(defaultValue = "20") int limite) {

        int paginaSegura = Math.max(1, pagina);
        int limiteSeguro = Math.min(Math.max(1, limite), 100);

        List<ProtocoloResposta> resultado = repositorio.listarProtocolos().stream()
                .filter(p -> podeVer(usuario, p))
                .filter(p -> status == null || p.getEtapa().getStatus().equalsIgnoreCase(status))
                .filter(p -> tipo == null || p.getTipo().toLowerCase().contains(tipo.toLowerCase()))
                .sorted(Comparator.comparing(Protocolo::getAbertoEm).reversed())
                .map(ProtocoloResposta::de)
                .toList();

        return Pagina.de(resultado, paginaSegura, limiteSeguro);
    }

    // ---------- GET /protocolos/estatisticas ----------
    // Declarado antes de /{id} para nao ser lido como um identificador.

    @GetMapping("/estatisticas")
    public Map<String, Object> estatisticas(@UsuarioLogado Usuario usuario) {
        List<Protocolo> visiveis = repositorio.listarProtocolos().stream()
                .filter(p -> podeVer(usuario, p))
                .toList();

        Map<String, Long> porStatus = new LinkedHashMap<>();
        for (EtapaProtocolo etapa : EtapaProtocolo.values()) {
            porStatus.put(etapa.getStatus(),
                    visiveis.stream().filter(p -> p.getEtapa() == etapa).count());
        }

        Map<String, Long> porTipo = new LinkedHashMap<>();
        for (String tipo : RepositorioMemoria.TIPOS_PROTOCOLO) {
            long quantidade = visiveis.stream().filter(p -> p.getTipo().equals(tipo)).count();
            if (quantidade > 0) {
                porTipo.put(tipo, quantidade);
            }
        }

        // Tempo de resolucao, em dias, dos protocolos ja concluidos
        List<Double> tempos = new ArrayList<>(visiveis.stream()
                .filter(p -> p.getConcluidoEm() != null)
                .map(p -> Duration.between(p.getAbertoEm(), p.getConcluidoEm()).toMillis()
                        / (1000.0 * 60 * 60 * 24))
                .toList());
        tempos.sort(Comparator.naturalOrder());

        double media = tempos.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        double variancia = tempos.stream()
                .mapToDouble(t -> Math.pow(t - media, 2))
                .average().orElse(0);

        double mediana = 0;
        if (!tempos.isEmpty()) {
            int meio = tempos.size() / 2;
            mediana = tempos.size() % 2 == 1
                    ? tempos.get(meio)
                    : (tempos.get(meio - 1) + tempos.get(meio)) / 2;
        }

        Map<String, Object> tempoResolucao = new LinkedHashMap<>();
        tempoResolucao.put("amostra", tempos.size());
        tempoResolucao.put("media", arredondar(media));
        tempoResolucao.put("mediana", arredondar(mediana));
        tempoResolucao.put("desvioPadrao", arredondar(Math.sqrt(variancia)));
        tempoResolucao.put("minimo", tempos.isEmpty() ? 0 : arredondar(tempos.get(0)));
        tempoResolucao.put("maximo", tempos.isEmpty() ? 0 : arredondar(tempos.get(tempos.size() - 1)));

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("total", visiveis.size());
        resposta.put("porStatus", porStatus);
        resposta.put("porTipo", porTipo);
        resposta.put("tempoResolucaoDias", tempoResolucao);
        return resposta;
    }

    // ---------- GET /protocolos/{id} ----------

    @GetMapping("/{id}")
    public ProtocoloResposta detalhar(@UsuarioLogado Usuario usuario, @PathVariable String id) {
        return ProtocoloResposta.de(buscarOuFalhar(usuario, id));
    }

    // ---------- POST /protocolos ----------

    @PostMapping
    public ResponseEntity<ProtocoloResposta> criar(@UsuarioLogado Usuario usuario,
                                                   @RequestBody ProtocoloRequest corpo) {
        String tipo = corpo.tipo() == null ? "" : corpo.tipo().trim();
        String descricao = Validadores.sanitizar(corpo.descricao(), DESCRICAO_MAXIMA);
        validarCampos(tipo, descricao, null, false);

        Protocolo novo = new Protocolo(
                repositorio.gerarIdProtocolo(),
                usuario.getCpf(),
                tipo,
                descricao,
                EtapaProtocolo.CRIADA, // o status inicial e decidido pelo servidor
                Instant.now(),
                null);

        repositorio.adicionarProtocolo(novo);
        repositorio.registrarAuditoria("CRIAR_PROTOCOLO", "protocolos", novo.getId(),
                usuario.getCpf(), usuario.getPerfil().getValor(), null);

        return ResponseEntity
                .created(URI.create("/api/v1/protocolos/" + novo.getId()))
                .body(ProtocoloResposta.de(novo));
    }

    // ---------- PUT /protocolos/{id} ----------

    @PutMapping("/{id}")
    public ProtocoloResposta atualizar(@UsuarioLogado Usuario usuario,
                                       @PathVariable String id,
                                       @RequestBody ProtocoloRequest corpo) {
        Protocolo protocolo = buscarOuFalhar(usuario, id);

        String tipo = corpo.tipo() == null ? "" : corpo.tipo().trim();
        String descricao = Validadores.sanitizar(corpo.descricao(), DESCRICAO_MAXIMA);
        validarCampos(tipo, descricao, corpo.progresso(), true);

        EtapaProtocolo novaEtapa = EtapaProtocolo.porProgresso(corpo.progresso());

        // Somente o atendente move o protocolo no fluxo de atendimento.
        if (novaEtapa != protocolo.getEtapa() && usuario.getPerfil() != Perfil.ATENDENTE) {
            throw ApiException.proibido(
                    "Apenas o atendente público pode alterar o status do protocolo.");
        }

        String anterior = protocolo.getEtapa().getStatus();
        protocolo.setTipo(tipo);
        protocolo.setDescricao(descricao);
        protocolo.moverPara(novaEtapa);

        repositorio.registrarAuditoria("ATUALIZAR_PROTOCOLO", "protocolos", protocolo.getId(),
                usuario.getCpf(), usuario.getPerfil().getValor(),
                "status: " + anterior + " -> " + novaEtapa.getStatus());

        return ProtocoloResposta.de(protocolo);
    }

    // ---------- PATCH /protocolos/{id}/status ----------

    @PatchMapping("/{id}/status")
    @Autenticado(perfis = Perfil.ATENDENTE)
    public ProtocoloResposta tramitar(@UsuarioLogado Usuario usuario,
                                      @PathVariable String id,
                                      @RequestBody StatusRequest corpo) {
        Protocolo protocolo = buscarOuFalhar(usuario, id);

        EtapaProtocolo novaEtapa = corpo.progresso() == null
                ? null
                : EtapaProtocolo.porProgresso(corpo.progresso());

        if (novaEtapa == null) {
            throw ApiException.requisicaoInvalida("Dados inválidos na requisição.",
                    List.of(new ErroCampo("progresso",
                            "Deve ser 33 (Criada), 66 (Em análise) ou 100 (Concluído).")));
        }

        if (novaEtapa == protocolo.getEtapa()) {
            throw ApiException.conflito("O protocolo já está neste status.");
        }

        String anterior = protocolo.getEtapa().getStatus();
        protocolo.moverPara(novaEtapa);

        repositorio.registrarAuditoria("ALTERAR_STATUS", "protocolos", protocolo.getId(),
                usuario.getCpf(), usuario.getPerfil().getValor(),
                anterior + " -> " + novaEtapa.getStatus());

        return ProtocoloResposta.de(protocolo);
    }

    // ---------- DELETE /protocolos/{id} ----------

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@UsuarioLogado Usuario usuario, @PathVariable String id) {
        Protocolo protocolo = buscarOuFalhar(usuario, id);
        repositorio.removerProtocolo(protocolo);

        repositorio.registrarAuditoria("EXCLUIR_PROTOCOLO", "protocolos", protocolo.getId(),
                usuario.getCpf(), usuario.getPerfil().getValor(), null);

        return ResponseEntity.noContent().build();
    }

    // ---------- apoio ----------

    private boolean podeVer(Usuario usuario, Protocolo protocolo) {
        return usuario.getPerfil() == Perfil.ATENDENTE
                || protocolo.getCpfSolicitante().equals(usuario.getCpf());
    }

    private Protocolo buscarOuFalhar(Usuario usuario, String id) {
        return repositorio.buscarProtocolo(id)
                .filter(p -> podeVer(usuario, p))
                .orElseThrow(() -> ApiException.naoEncontrado(
                        "Protocolo " + id + " não encontrado."));
    }

    private void validarCampos(String tipo, String descricao, Integer progresso,
                               boolean exigirProgresso) {
        List<ErroCampo> erros = new ArrayList<>();

        if (!RepositorioMemoria.TIPOS_PROTOCOLO.contains(tipo)) {
            erros.add(new ErroCampo("tipo", "Deve ser um dos tipos: "
                    + String.join(" | ", RepositorioMemoria.TIPOS_PROTOCOLO) + "."));
        }
        if (descricao.length() < DESCRICAO_MINIMA) {
            erros.add(new ErroCampo("descricao", "Deve ter no mínimo "
                    + DESCRICAO_MINIMA + " caracteres."));
        }
        if (exigirProgresso
                && (progresso == null || EtapaProtocolo.porProgresso(progresso) == null)) {
            erros.add(new ErroCampo("progresso",
                    "Deve ser 33 (Criada), 66 (Em análise) ou 100 (Concluído)."));
        }

        if (!erros.isEmpty()) {
            throw ApiException.requisicaoInvalida("Dados inválidos na requisição.", erros);
        }
    }

    private double arredondar(double valor) {
        return Math.round(valor * 100) / 100.0;
    }
}
