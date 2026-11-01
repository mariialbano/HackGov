package br.gov.taubate.vidareal.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.http.HttpRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/** Inspeciona a requisicao montada para o Gemini, sem chamar a API real. */
class ChatControllerTest {

    private static final String CHAVE = "chave-secreta-de-teste";

    private HttpRequest chamada() {
        ChatController controller = new ChatController(null, 20);
        ReflectionTestUtils.setField(controller, "apiKey", CHAVE);
        ReflectionTestUtils.setField(controller, "modelo", "gemini-teste");
        return controller.montarChamada("{}");
    }

    @Test
    @DisplayName("a chave vai no cabeçalho x-goog-api-key")
    void chaveNoCabecalho() {
        assertEquals(CHAVE, chamada().headers().firstValue("x-goog-api-key").orElse(null));
    }

    @Test
    @DisplayName("a chave não aparece na URL, nem na query string")
    void chaveForaDaUrl() {
        String uri = chamada().uri().toString();

        assertFalse(uri.contains(CHAVE));
        assertFalse(uri.contains("key="));
        assertEquals(null, chamada().uri().getQuery());
    }

    @Test
    @DisplayName("o destino continua sendo o modelo configurado, por HTTPS, com corpo JSON")
    void destinoEFormato() {
        HttpRequest chamada = chamada();

        assertEquals("https", chamada.uri().getScheme());
        assertEquals("generativelanguage.googleapis.com", chamada.uri().getHost());
        assertTrue(chamada.uri().getPath().endsWith("/models/gemini-teste:generateContent"));
        assertEquals("POST", chamada.method());
        assertEquals("application/json", chamada.headers().firstValue("Content-Type").orElse(null));
    }
}
