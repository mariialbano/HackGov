package br.gov.taubate.vidareal.seguranca;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Injeta o usuario da sessao como parametro do controller.
 *
 * <p>O valor vem sempre do token, nunca do corpo da requisicao: assim o
 * cliente nao consegue se passar por outro perfil.</p>
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface UsuarioLogado {
}
