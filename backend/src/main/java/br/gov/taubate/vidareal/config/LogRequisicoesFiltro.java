package br.gov.taubate.vidareal.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Log tecnico: metodo, rota, status e duracao de cada requisicao.
 *
 * <p>Responde "a aplicacao esta saudavel?". E diferente da trilha de
 * auditoria, que responde "quem fez isso e quando?" e fica exposta em
 * /api/v1/auditoria.</p>
 */
@Component
public class LogRequisicoesFiltro extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(LogRequisicoesFiltro.class);

    @Override
    protected void doFilterInternal(HttpServletRequest requisicao, HttpServletResponse resposta,
                                    FilterChain cadeia) throws ServletException, IOException {
        long inicio = System.currentTimeMillis();
        try {
            cadeia.doFilter(requisicao, resposta);
        } finally {
            String rota = requisicao.getRequestURI()
                    + (requisicao.getQueryString() == null ? "" : "?" + requisicao.getQueryString());
            log.info("{} {} -> {} ({}ms)", requisicao.getMethod(), rota,
                    resposta.getStatus(), System.currentTimeMillis() - inicio);
        }
    }
}
