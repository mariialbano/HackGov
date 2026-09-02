package br.gov.taubate.vidareal.erro;

import java.util.List;
import org.springframework.http.HttpStatus;

/**
 * Falha de negocio que vira resposta HTTP.
 *
 * <p>Os controllers apenas lancam esta excecao; quem monta a resposta e o
 * {@link TratadorGlobalErros}, evitando try/catch repetido em cada rota.</p>
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String codigo;
    private final transient List<ErroCampo> detalhes;

    public ApiException(HttpStatus status, String codigo, String mensagem, List<ErroCampo> detalhes) {
        super(mensagem);
        this.status = status;
        this.codigo = codigo;
        this.detalhes = detalhes;
    }

    public ApiException(HttpStatus status, String codigo, String mensagem) {
        this(status, codigo, mensagem, null);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCodigo() {
        return codigo;
    }

    public List<ErroCampo> getDetalhes() {
        return detalhes;
    }

    public static ApiException requisicaoInvalida(String mensagem, List<ErroCampo> detalhes) {
        return new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", mensagem, detalhes);
    }

    public static ApiException naoAutenticado(String mensagem) {
        return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", mensagem);
    }

    public static ApiException proibido(String mensagem) {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", mensagem);
    }

    public static ApiException naoEncontrado(String mensagem) {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", mensagem);
    }

    public static ApiException conflito(String mensagem) {
        return new ApiException(HttpStatus.CONFLICT, "CONFLICT", mensagem);
    }

    public static ApiException muitasRequisicoes(String mensagem) {
        return new ApiException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_REQUESTS", mensagem);
    }
}
