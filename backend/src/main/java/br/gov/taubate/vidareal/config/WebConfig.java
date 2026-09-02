package br.gov.taubate.vidareal.config;

import br.gov.taubate.vidareal.seguranca.AutenticacaoInterceptor;
import br.gov.taubate.vidareal.seguranca.UsuarioLogadoResolver;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Configuracao do MVC: CORS, interceptors e resolvers de argumento. */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AutenticacaoInterceptor autenticacao;
    private final UsuarioLogadoResolver usuarioLogado;

    /** Em producao, restringe quem pode chamar a API. */
    @Value("${vidareal.origens-permitidas:http://localhost:5173,http://127.0.0.1:5173}")
    private String[] origensPermitidas;

    public WebConfig(AutenticacaoInterceptor autenticacao, UsuarioLogadoResolver usuarioLogado) {
        this.autenticacao = autenticacao;
        this.usuarioLogado = usuarioLogado;
    }

    /** Custo 10: equilibra resistencia a forca bruta e tempo de resposta. */
    @Bean
    public BCryptPasswordEncoder bCryptPasswordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registro) {
        registro.addInterceptor(autenticacao).addPathPatterns("/api/**");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(usuarioLogado);
    }

    @Override
    public void addCorsMappings(CorsRegistry registro) {
        registro.addMapping("/api/**")
                .allowedOrigins(origensPermitidas)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type");
    }
}
