package br.gov.taubate.vidareal.seguranca;

import br.gov.taubate.vidareal.modelo.Perfil;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marca um endpoint como protegido.
 *
 * <p>Sem token valido a resposta e 401 ("nao sei quem voce e"); com token
 * valido mas perfil fora da lista, 403 ("sei quem voce e, mas voce nao
 * pode"). Deixar {@code perfis} vazio exige apenas autenticacao.</p>
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface Autenticado {

    Perfil[] perfis() default {};
}
