package br.gov.taubate.vidareal.seguranca;

import br.gov.taubate.vidareal.modelo.Usuario;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * Entrega o usuario da sessao aos metodos anotados com
 * {@link UsuarioLogado}, evitando que cada controller leia o cabecalho.
 */
@Component
public class UsuarioLogadoResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parametro) {
        return parametro.hasParameterAnnotation(UsuarioLogado.class)
                && Usuario.class.isAssignableFrom(parametro.getParameterType());
    }

    @Override
    public Object resolveArgument(MethodParameter parametro, ModelAndViewContainer mav,
                                  NativeWebRequest requisicao, WebDataBinderFactory binder) {
        return requisicao.getAttribute(AutenticacaoInterceptor.ATRIBUTO_USUARIO,
                RequestAttributes.SCOPE_REQUEST);
    }
}
