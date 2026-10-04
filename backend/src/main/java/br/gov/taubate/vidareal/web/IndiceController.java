package br.gov.taubate.vidareal.web;

import br.gov.taubate.vidareal.modelo.Perfil;
import br.gov.taubate.vidareal.modelo.RegistroAuditoria;
import br.gov.taubate.vidareal.repositorio.Repositorio;
import br.gov.taubate.vidareal.seguranca.Autenticado;
import br.gov.taubate.vidareal.web.dto.Pagina;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Rotas utilitarias da API: verificacao de saude, catalogo de endpoints e
 * a trilha de auditoria.
 */
@RestController
@RequestMapping("/api/v1")
public class IndiceController {

    private final Repositorio repositorio;

    public IndiceController(Repositorio repositorio) {
        this.repositorio = repositorio;
    }

    /** Usado por monitoramento e pelo front para detectar se a API subiu. */
    @GetMapping("/health")
    public Map<String, String> saude() {
        return Map.of("status", "ok", "servico", "VidaReal API", "versao", "1.0.0");
    }

    /** Catalogo dos endpoints: documentacao viva da API. */
    @GetMapping
    public Map<String, Object> catalogo() {
        Map<String, String> recursos = new LinkedHashMap<>();
        recursos.put("auth",
                "POST /api/v1/auth/login · POST /api/v1/auth/cadastro · "
                        + "GET /api/v1/auth/me · POST /api/v1/auth/logout");
        recursos.put("perfil",
                "GET|PUT /api/v1/perfil · PATCH /api/v1/perfil/senha");
        recursos.put("protocolos",
                "GET|POST /api/v1/protocolos · GET|PUT|DELETE /api/v1/protocolos/{id} · "
                        + "PATCH /api/v1/protocolos/{id}/status · GET /api/v1/protocolos/estatisticas · "
                        + "POST /api/v1/protocolos/sugestao (IA) · "
                        + "GET /api/v1/protocolos/triagem/modelo (atendente)");
        recursos.put("metas",
                "GET|POST /api/v1/metas · GET|PUT|DELETE /api/v1/metas/{id} · "
                        + "PATCH /api/v1/metas/{id}/aporte");
        recursos.put("feedbacks", "POST /api/v1/feedbacks · GET /api/v1/feedbacks (atendente)");
        recursos.put("chat", "POST /api/v1/chat");
        recursos.put("auditoria", "GET /api/v1/auditoria (atendente)");
        recursos.put("dados",
                "GET /api/v1/dados/ipca · GET /api/v1/dados/selic · "
                        + "GET /api/v1/dados/feriados · GET /api/v1/dados/prazo · "
                        + "GET /api/v1/dados/estados · GET /api/v1/dados/municipios · "
                        + "GET /api/v1/dados/municipios/{id} · GET /api/v1/dados/municipios/{id}/malha · "
                        + "GET /api/v1/dados/cep/{cep}");

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("servico", "VidaReal API");
        resposta.put("versao", "1.0.0");
        resposta.put("recursos", recursos);
        return resposta;
    }

    /**
     * Trilha de auditoria: registra QUEM fez O QUE e QUANDO.
     * Exclusiva do atendente, e lida do topo da pilha (mais recentes antes).
     */
    @GetMapping("/auditoria")
    @Autenticado(perfis = Perfil.ATENDENTE)
    public Pagina<RegistroAuditoria> auditoria(
            @RequestParam(defaultValue = "1") int pagina,
            @RequestParam(defaultValue = "50") int limite) {

        int paginaSegura = Math.max(1, pagina);
        int limiteSeguro = Math.min(Math.max(1, limite), 100);

        List<RegistroAuditoria> registros = repositorio.listarAuditoria();
        return Pagina.de(registros, paginaSegura, limiteSeguro);
    }
}
