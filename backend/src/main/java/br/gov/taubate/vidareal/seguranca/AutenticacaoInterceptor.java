package br.gov.taubate.vidareal.seguranca;

import br.gov.taubate.vidareal.erro.ApiException;
import br.gov.taubate.vidareal.modelo.Perfil;
import br.gov.taubate.vidareal.modelo.Usuario;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.Optional;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Aplica a anotacao {@link Autenticado} antes do controller executar.
 *
 * <p>Mesmo em rotas publicas o token e resolvido quando presente: o
 * assistente virtual, por exemplo, responde melhor sabendo quem pergunta.</p>
 */
@Component
public class AutenticacaoInterceptor implements HandlerInterceptor {

    /** Nome do atributo onde o usuario resolvido fica na requisicao. */
    public static final String ATRIBUTO_USUARIO = "vidareal.usuario";
    public static final String ATRIBUTO_TOKEN = "vidareal.token";

    private final SessaoService sessoes;

    public AutenticacaoInterceptor(SessaoService sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public boolean preHandle(HttpServletRequest requisicao, HttpServletResponse resposta,
                             Object handler) {
        String token = extrairToken(requisicao);
        Optional<Usuario> usuario = sessoes.resolver(token);

        usuario.ifPresent(u -> {
            requisicao.setAttribute(ATRIBUTO_USUARIO, u);
            requisicao.setAttribute(ATRIBUTO_TOKEN, token);
        });

        if (!(handler instanceof HandlerMethod metodo)) {
            return true;
        }

        Autenticado regra = metodo.getMethodAnnotation(Autenticado.class);
        if (regra == null) {
            regra = metodo.getBeanType().getAnnotation(Autenticado.class);
        }
        if (regra == null) {
            return true; // rota publica
        }

        Usuario autenticado = usuario.orElseThrow(() -> ApiException.naoAutenticado(
                "Envie o token no cabeçalho: Authorization: Bearer <token>."));

        Perfil[] permitidos = regra.perfis();
        if (permitidos.length > 0 && Arrays.stream(permitidos).noneMatch(p -> p == autenticado.getPerfil())) {
            String nomes = Arrays.stream(permitidos).map(Perfil::getValor).reduce((a, b) -> a + ", " + b).orElse("");
            throw ApiException.proibido("Esta operação é exclusiva do perfil: " + nomes + ".");
        }

        return true;
    }

    private String extrairToken(HttpServletRequest requisicao) {
        String cabecalho = requisicao.getHeader("Authorization");
        if (cabecalho == null || !cabecalho.startsWith("Bearer ")) {
            return null;
        }
        return cabecalho.substring("Bearer ".length()).trim();
    }
}
