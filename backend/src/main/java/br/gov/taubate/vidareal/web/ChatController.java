package br.gov.taubate.vidareal.web;

import br.gov.taubate.vidareal.erro.ApiException;
import br.gov.taubate.vidareal.erro.ErroCampo;
import br.gov.taubate.vidareal.modelo.Perfil;
import br.gov.taubate.vidareal.modelo.Usuario;
import br.gov.taubate.vidareal.repositorio.Repositorio;
import br.gov.taubate.vidareal.seguranca.LimitadorRequisicoes;
import br.gov.taubate.vidareal.seguranca.UsuarioLogado;
import br.gov.taubate.vidareal.util.Validadores;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recurso /api/v1/chat: assistente virtual com IA.
 *
 * <p>A mensagem e validada e sanitizada ANTES de chegar ao modelo, e vem
 * delimitada por marcadores com instrucao explicita para ignorar comandos
 * embutidos &mdash; mitigando prompt injection.</p>
 */
@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    private static final int TAMANHO_MAXIMO = 1000;
    private static final Duration TIMEOUT = Duration.ofSeconds(20);

    private final Repositorio repositorio;
    private final ObjectMapper json = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /** Protege a cota da API de IA. Configuravel por propriedade. */
    private final LimitadorRequisicoes limitador;

    @Value("${vidareal.ia.api-key:${IA_API_KEY:}}")
    private String apiKey;

    @Value("${vidareal.ia.modelo:gemini-3-flash-preview}")
    private String modelo;

    public ChatController(Repositorio repositorio,
                          @Value("${vidareal.seguranca.chat.limite:20}") int limite) {
        this.repositorio = repositorio;
        this.limitador = new LimitadorRequisicoes(limite, Duration.ofMinutes(1));
    }

    public record ChatRequest(String message, String pagina) {
    }

    /** Telas conhecidas: o valor informado e validado contra esta lista. */
    private static final Map<String, String> PAGINAS = Map.of(
            "/dashboard", "Início (painel de serviços)",
            "/protocolos", "Protocolos (abrir e acompanhar solicitações)",
            "/inflacao", "Simulação de Inflação",
            "/metas", "Metas Financeiras",
            "/indicadores", "Indicadores Locais",
            "/comparativos", "Comparativo Regional e Nacional",
            "/", "Tela de login");

    @PostMapping
    public Map<String, String> conversar(@RequestBody ChatRequest corpo,
                                         @UsuarioLogado Usuario usuario,
                                         HttpServletRequest requisicao,
                                         HttpServletResponse resposta) {
        String ip = requisicao.getRemoteAddr();
        if (!limitador.permitir(ip)) {
            resposta.setHeader("Retry-After", String.valueOf(limitador.segundosParaLiberar(ip)));
            throw ApiException.muitasRequisicoes(
                    "Muitas mensagens em pouco tempo. Aguarde um instante.");
        }

        validarMensagem(corpo.message());
        String mensagem = Validadores.sanitizar(corpo.message(), TAMANHO_MAXIMO);

        if (apiKey == null || apiKey.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "IA_INDISPONIVEL",
                    "O assistente virtual está indisponível: chave da API não configurada no servidor.");
        }

        try {
            String prompt = montarContexto(corpo.pagina(), usuario)
                    + "\n\n<mensagem>" + mensagem + "</mensagem>";

            String payload = json.writeValueAsString(Map.of(
                    "systemInstruction", Map.of("parts", List.of(Map.of("text", InstrucaoIA.SISTEMA))),
                    "contents", List.of(Map.of(
                            "role", "user",
                            "parts", List.of(Map.of("text", prompt)))),
                    "generationConfig", Map.of("temperature", 0.3, "maxOutputTokens", 800)));

            HttpRequest chamada = HttpRequest.newBuilder()
                    .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/"
                            + modelo + ":generateContent?key=" + apiKey))
                    .header("Content-Type", "application/json")
                    .timeout(TIMEOUT)
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> retorno = http.send(chamada, HttpResponse.BodyHandlers.ofString());

            // Cota gratuita esgotada: condicao temporaria e esperada,
            // merece mensagem propria em vez de "erro tecnico".
            if (retorno.statusCode() == 429) {
                throw ApiException.muitasRequisicoes(
                        "O assistente atingiu o limite de perguntas por minuto. "
                                + "Aguarde cerca de um minuto e tente novamente.");
            }

            JsonNode corpoResposta = json.readTree(retorno.body());
            if (corpoResposta.has("error")) {
                throw new IllegalStateException(corpoResposta.path("error").path("message").asText());
            }

            String texto = corpoResposta
                    .path("candidates").path(0)
                    .path("content").path("parts").path(0)
                    .path("text").asText();

            return Map.of("reply", texto);

        } catch (ApiException erro) {
            throw erro;
        } catch (java.net.http.HttpTimeoutException erro) {
            log.warn("[chat] a IA excedeu o tempo limite");
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "IA_INDISPONIVEL",
                    "O assistente está demorando mais que o normal para responder. "
                            + "Tente novamente em instantes.");
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            throw falhaGenerica(erro);
        } catch (Exception erro) {
            throw falhaGenerica(erro);
        }
    }

    private ApiException falhaGenerica(Exception erro) {
        // O detalhe tecnico fica no log; o cliente recebe apenas uma
        // mensagem amigavel, sem expor o provedor nem a chave.
        log.error("[chat] falha ao consultar a IA: {}", erro.getMessage());
        return new ApiException(HttpStatus.BAD_GATEWAY, "IA_INDISPONIVEL",
                "Desculpe, estou com problemas técnicos agora. Tente novamente mais tarde.");
    }

    private void validarMensagem(String mensagem) {
        if (mensagem == null) {
            throw erroCampo("Obrigatório (texto).");
        }
        if (mensagem.trim().isEmpty()) {
            throw erroCampo("A mensagem não pode estar vazia.");
        }
        if (mensagem.trim().length() > TAMANHO_MAXIMO) {
            throw erroCampo("Deve ter no máximo " + TAMANHO_MAXIMO + " caracteres.");
        }
    }

    private ApiException erroCampo(String mensagem) {
        return ApiException.requisicaoInvalida("Dados inválidos na requisição.",
                List.of(new ErroCampo("message", mensagem)));
    }

    /**
     * Monta o contexto da conversa. O perfil vem da SESSAO, nunca do corpo
     * da requisicao: assim o cliente nao se passa por outro perfil.
     */
    private String montarContexto(String paginaInformada, Usuario usuario) {
        StringBuilder contexto = new StringBuilder("CONTEXTO ATUAL:");

        String pagina = PAGINAS.get(paginaInformada);
        if (pagina != null) {
            contexto.append(" O cidadão está agora na tela: ").append(pagina).append('.');
        }

        if (usuario != null) {
            contexto.append(" Ele está autenticado como ").append(usuario.getNome())
                    .append(", perfil ").append(usuario.getPerfil().getValor()).append('.');
            if (usuario.getPerfil() == Perfil.CIDADAO) {
                contexto.append(" Ele NÃO tem acesso à tela Comparativo — não a sugira.");
            }
        } else {
            contexto.append(" Ele ainda não fez login.");
        }

        return contexto.toString();
    }
}
