package br.gov.taubate.vidareal;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Cadeia de hashes da auditoria com o banco de verdade: a trilha gravada pela
 * API verifica como integra, e uma adulteracao direta no banco e apontada.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuditoriaIntegridadeTest {

    private static final String ROTA = "/api/v1/auditoria/integridade";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    private final ObjectMapper json = new ObjectMapper();

    private String login(String cpf, String senha) throws Exception {
        String resposta = mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cpf\":\"" + cpf + "\",\"senha\":\"" + senha + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(resposta).get("token").asText();
    }

    private String atendente() throws Exception {
        return login("15350946056", "Atendente@123");
    }

    @Test
    @DisplayName("a trilha gravada pela própria API verifica como íntegra")
    void trilhaDaApiEIntegra() throws Exception {
        String token = atendente(); // o login grava registros na trilha

        mvc.perform(get(ROTA).header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.integra", is(true)))
                .andExpect(jsonPath("$.registrosNaCadeia", greaterThan(0)))
                .andExpect(jsonPath("$.hashAtual").isNotEmpty());
    }

    @Test
    @DisplayName("cada registro novo se liga ao hash do anterior")
    void registrosSeEncadeiam() throws Exception {
        atendente();
        login("52998224725", "Cidadao@123");

        Map<String, Object> ultimo = jdbc.queryForMap(
                "SELECT hash_anterior FROM auditoria ORDER BY seq DESC FETCH FIRST 1 ROW ONLY");
        String penultimoHash = jdbc.queryForObject(
                "SELECT hash_registro FROM auditoria ORDER BY seq DESC OFFSET 1 ROW FETCH FIRST 1 ROW ONLY",
                String.class);

        assertEquals(penultimoHash, ultimo.get("HASH_ANTERIOR"));
    }

    @Test
    @DisplayName("alterar um registro direto no banco é detectado e o registro é apontado")
    void adulteracaoNoBancoEDetectada() throws Exception {
        String token = atendente();

        Map<String, Object> alvo = jdbc.queryForMap(
                "SELECT id, detalhe FROM auditoria ORDER BY seq DESC FETCH FIRST 1 ROW ONLY");
        String id = (String) alvo.get("ID");
        Object detalheOriginal = alvo.get("DETALHE");

        try {
            jdbc.update("UPDATE auditoria SET detalhe = ? WHERE id = ?", "adulterado", id);

            mvc.perform(get(ROTA).header("Authorization", token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.integra", is(false)))
                    .andExpect(jsonPath("$.primeiroRegistroInvalido", is(id)));
        } finally {
            // O banco de teste e compartilhado: desfaz a adulteracao.
            jdbc.update("UPDATE auditoria SET detalhe = ? WHERE id = ?", detalheOriginal, id);
        }

        mvc.perform(get(ROTA).header("Authorization", token))
                .andExpect(jsonPath("$.integra", is(true)));
    }

    @Test
    @DisplayName("a verificação é exclusiva do atendente: cidadão 403, sem token 401")
    void acessoRestrito() throws Exception {
        String cidadao = login("52998224725", "Cidadao@123");

        mvc.perform(get(ROTA).header("Authorization", cidadao)).andExpect(status().isForbidden());
        mvc.perform(get(ROTA)).andExpect(status().isUnauthorized());
    }
}
