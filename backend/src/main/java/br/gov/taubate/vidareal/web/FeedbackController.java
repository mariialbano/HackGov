package br.gov.taubate.vidareal.web;

import br.gov.taubate.vidareal.erro.ApiException;
import br.gov.taubate.vidareal.erro.ErroCampo;
import br.gov.taubate.vidareal.modelo.Feedback;
import br.gov.taubate.vidareal.modelo.Perfil;
import br.gov.taubate.vidareal.repositorio.Repositorio;
import br.gov.taubate.vidareal.seguranca.Autenticado;
import br.gov.taubate.vidareal.util.Validadores;
import java.net.URI;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recurso /api/v1/feedbacks.
 *
 * <p>O envio e publico de proposito: avaliar um servico publico nao deve
 * exigir login. A leitura consolidada e restrita ao atendente.</p>
 */
@RestController
@RequestMapping("/api/v1/feedbacks")
public class FeedbackController {

    private final Repositorio repositorio;

    public FeedbackController(Repositorio repositorio) {
        this.repositorio = repositorio;
    }

    /** Corpo da avaliacao enviada pelo cidadao. */
    public record FeedbackRequest(Integer rating, String comentario) {
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> enviar(@RequestBody FeedbackRequest corpo) {
        Integer rating = corpo.rating();

        if (rating == null || rating < 1 || rating > 5) {
            throw ApiException.requisicaoInvalida("Não foi possível registrar o feedback.",
                    List.of(new ErroCampo("rating", "Deve ser um número inteiro de 1 a 5.")));
        }

        Feedback novo = new Feedback(
                repositorio.proximoIdFeedback(),
                rating,
                Validadores.sanitizar(corpo.comentario(), 500),
                Instant.now());

        repositorio.adicionarFeedback(novo);
        repositorio.registrarAuditoria("CRIAR_FEEDBACK", "feedbacks",
                String.valueOf(novo.getId()), null, null, "nota " + rating);

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("success", true);
        resposta.put("message", "Obrigado pelo feedback! Nota: " + rating
                + (rating > 1 ? " estrelas." : " estrela."));
        resposta.put("feedback", novo);

        return ResponseEntity
                .created(URI.create("/api/v1/feedbacks/" + novo.getId()))
                .body(resposta);
    }

    @GetMapping
    @Autenticado(perfis = Perfil.ATENDENTE)
    public Map<String, Object> consolidado() {
        List<Feedback> todos = repositorio.listarFeedbacks();

        double media = todos.stream().mapToInt(Feedback::getRating).average().orElse(0);

        Map<Integer, Long> distribuicao = new LinkedHashMap<>();
        for (int nota = 1; nota <= 5; nota++) {
            final int atual = nota;
            distribuicao.put(nota, todos.stream().filter(f -> f.getRating() == atual).count());
        }

        Map<String, Object> resumo = new LinkedHashMap<>();
        resumo.put("total", todos.size());
        resumo.put("media", Math.round(media * 100) / 100.0);
        resumo.put("distribuicao", distribuicao);

        return Map.of("dados", todos, "resumo", resumo);
    }
}
