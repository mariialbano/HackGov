package br.gov.taubate.vidareal.web;

import br.gov.taubate.vidareal.erro.ApiException;
import br.gov.taubate.vidareal.erro.ErroCampo;
import br.gov.taubate.vidareal.modelo.Meta;
import br.gov.taubate.vidareal.modelo.Usuario;
import br.gov.taubate.vidareal.repositorio.RepositorioMemoria;
import br.gov.taubate.vidareal.seguranca.Autenticado;
import br.gov.taubate.vidareal.seguranca.UsuarioLogado;
import br.gov.taubate.vidareal.util.Validadores;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.util.ArrayList;
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
import org.springframework.web.bind.annotation.RestController;

/**
 * Recurso /api/v1/metas: metas financeiras do cidadao.
 *
 * <p>Sao dados financeiros pessoais: cada usuario acessa apenas as suas,
 * inclusive o atendente (principio da minimizacao &mdash; LGPD).</p>
 */
@RestController
@RequestMapping("/api/v1/metas")
@Autenticado
public class MetaController {

    private final RepositorioMemoria repositorio;

    public MetaController(RepositorioMemoria repositorio) {
        this.repositorio = repositorio;
    }

    /** Corpo de criacao e atualizacao de meta. */
    public record MetaRequest(String tipo, BigDecimal objetivo, String prazo, BigDecimal atual) {
    }

    /** Corpo do aporte. */
    public record AporteRequest(BigDecimal valor) {
    }

    @GetMapping
    public Map<String, Object> listar(@UsuarioLogado Usuario usuario) {
        List<Map<String, Object>> minhas = repositorio.listarMetasDoUsuario(usuario.getCpf())
                .stream().map(this::apresentar).toList();

        return Map.of("dados", minhas, "paginacao", Map.of("total", minhas.size()));
    }

    @GetMapping("/{id}")
    public Map<String, Object> detalhar(@UsuarioLogado Usuario usuario, @PathVariable long id) {
        return apresentar(buscarOuFalhar(usuario, id));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> criar(@UsuarioLogado Usuario usuario,
                                                     @RequestBody MetaRequest corpo) {
        String tipo = Validadores.sanitizar(corpo.tipo(), 60);
        String prazo = Validadores.sanitizar(corpo.prazo(), 30);
        validar(tipo, corpo.objetivo(), prazo);

        BigDecimal inicial = corpo.atual() != null && corpo.atual().signum() > 0
                ? corpo.atual()
                : BigDecimal.ZERO;

        Meta nova = new Meta(repositorio.proximoIdMeta(), usuario.getCpf(),
                tipo, inicial, corpo.objetivo(), prazo);
        repositorio.adicionarMeta(nova);

        repositorio.registrarAuditoria("CRIAR_META", "metas", String.valueOf(nova.getId()),
                usuario.getCpf(), usuario.getPerfil().getValor(), null);

        return ResponseEntity
                .created(URI.create("/api/v1/metas/" + nova.getId()))
                .body(apresentar(nova));
    }

    @PutMapping("/{id}")
    public Map<String, Object> atualizar(@UsuarioLogado Usuario usuario,
                                         @PathVariable long id,
                                         @RequestBody MetaRequest corpo) {
        Meta meta = buscarOuFalhar(usuario, id);

        String tipo = Validadores.sanitizar(corpo.tipo(), 60);
        String prazo = Validadores.sanitizar(corpo.prazo(), 30);
        validar(tipo, corpo.objetivo(), prazo);

        meta.setTipo(tipo);
        meta.setObjetivo(corpo.objetivo());
        meta.setPrazo(prazo);

        repositorio.registrarAuditoria("ATUALIZAR_META", "metas", String.valueOf(meta.getId()),
                usuario.getCpf(), usuario.getPerfil().getValor(), null);

        return apresentar(meta);
    }

    @PatchMapping("/{id}/aporte")
    public Map<String, Object> aportar(@UsuarioLogado Usuario usuario,
                                       @PathVariable long id,
                                       @RequestBody AporteRequest corpo) {
        Meta meta = buscarOuFalhar(usuario, id);

        if (corpo.valor() == null || corpo.valor().signum() <= 0) {
            throw ApiException.requisicaoInvalida("Dados inválidos na requisição.",
                    List.of(new ErroCampo("valor", "Deve ser um número maior que zero.")));
        }

        meta.aportar(corpo.valor());

        repositorio.registrarAuditoria("APORTE_META", "metas", String.valueOf(meta.getId()),
                usuario.getCpf(), usuario.getPerfil().getValor(),
                "aporte de R$ " + corpo.valor().setScale(2, RoundingMode.HALF_UP));

        return apresentar(meta);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@UsuarioLogado Usuario usuario, @PathVariable long id) {
        Meta meta = buscarOuFalhar(usuario, id);
        repositorio.removerMeta(meta);

        repositorio.registrarAuditoria("EXCLUIR_META", "metas", String.valueOf(meta.getId()),
                usuario.getCpf(), usuario.getPerfil().getValor(), null);

        return ResponseEntity.noContent().build();
    }

    // ---------- apoio ----------

    private Meta buscarOuFalhar(Usuario usuario, long id) {
        return repositorio.buscarMeta(id, usuario.getCpf())
                .orElseThrow(() -> ApiException.naoEncontrado("Meta " + id + " não encontrada."));
    }

    private void validar(String tipo, BigDecimal objetivo, String prazo) {
        List<ErroCampo> erros = new ArrayList<>();

        if (tipo.length() < 2) {
            erros.add(new ErroCampo("tipo", "Deve ter no mínimo 2 caracteres."));
        }
        if (objetivo == null || objetivo.signum() <= 0) {
            erros.add(new ErroCampo("objetivo", "Deve ser um número maior que zero."));
        }
        if (prazo.isEmpty()) {
            erros.add(new ErroCampo("prazo", "Obrigatório (ex.: \"12 meses\")."));
        }

        if (!erros.isEmpty()) {
            throw ApiException.requisicaoInvalida("Dados inválidos na requisição.", erros);
        }
    }

    /** Acrescenta os campos derivados calculados no servidor. */
    private Map<String, Object> apresentar(Meta meta) {
        BigDecimal percentual = meta.getObjetivo().signum() > 0
                ? meta.getAtual()
                        .multiply(BigDecimal.valueOf(100))
                        .divide(meta.getObjetivo(), 1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal restante = meta.getObjetivo().subtract(meta.getAtual()).max(BigDecimal.ZERO);

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("id", meta.getId());
        resposta.put("tipo", meta.getTipo());
        resposta.put("atual", meta.getAtual());
        resposta.put("objetivo", meta.getObjetivo());
        resposta.put("prazo", meta.getPrazo());
        resposta.put("percentual", percentual);
        resposta.put("restante", restante);
        resposta.put("concluida", meta.getAtual().compareTo(meta.getObjetivo()) >= 0);
        return resposta;
    }
}
