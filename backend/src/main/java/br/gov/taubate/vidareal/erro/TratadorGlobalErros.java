package br.gov.taubate.vidareal.erro;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;

/**
 * Tratamento centralizado de erros.
 *
 * <p>Toda falha responde no mesmo envelope:</p>
 * <pre>{ "error": { "code": ..., "message": ..., "details": [...] } }</pre>
 */
@RestControllerAdvice
public class TratadorGlobalErros {

    private static final Logger log = LoggerFactory.getLogger(TratadorGlobalErros.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> tratarApi(ApiException erro) {
        return montar(erro.getStatus(), erro.getCodigo(), erro.getMessage(), erro.getDetalhes());
    }

    /** Falhas das anotacoes de validacao (@NotBlank, @Size...) nos DTOs. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> tratarValidacao(MethodArgumentNotValidException erro) {
        List<ErroCampo> detalhes = erro.getBindingResult().getFieldErrors().stream()
                .map(campo -> new ErroCampo(campo.getField(), campo.getDefaultMessage()))
                .toList();
        return montar(HttpStatus.BAD_REQUEST, "BAD_REQUEST",
                "Dados inválidos na requisição.", detalhes);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> tratarJsonInvalido(HttpMessageNotReadableException erro) {
        return montar(HttpStatus.BAD_REQUEST, "INVALID_JSON",
                "O corpo da requisição não é um JSON válido.", null);
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<Map<String, Object>> tratarRotaInexistente(NoHandlerFoundException erro) {
        return montar(HttpStatus.NOT_FOUND, "NOT_FOUND",
                "Rota não encontrada: " + erro.getHttpMethod() + " " + erro.getRequestURL(), null);
    }

    /**
     * Rede de seguranca: o detalhe tecnico vai para o log do servidor, mas
     * a resposta nunca expoe stack trace nem dados internos.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> tratarInesperado(Exception erro) {
        log.error("[erro inesperado]", erro);
        return montar(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "Erro interno no servidor.", null);
    }

    private ResponseEntity<Map<String, Object>> montar(HttpStatus status, String codigo,
                                                       String mensagem, List<ErroCampo> detalhes) {
        Map<String, Object> erro = new LinkedHashMap<>();
        erro.put("code", codigo);
        erro.put("message", mensagem);
        if (detalhes != null && !detalhes.isEmpty()) {
            erro.put("details", detalhes);
        }
        return ResponseEntity.status(status).body(Map.of("error", erro));
    }
}
