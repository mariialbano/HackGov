package br.gov.taubate.vidareal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Ponto de entrada da API VidaReal.
 *
 * <p>Plataforma GovTech de educacao financeira e transparencia publica
 * do cidadao de Taubate/SP.</p>
 */
@SpringBootApplication
public class VidaRealApplication {

    public static void main(String[] args) {
        SpringApplication.run(VidaRealApplication.class, args);
    }
}
