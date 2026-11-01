package br.gov.taubate.vidareal;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasKey;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** O endpoint de analises: acesso restrito e formato da resposta com o banco de teste. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AnalisesEndpointTest {

    private static final String ROTA = "/api/v1/protocolos/analises";

    @Autowired
    private MockMvc mvc;

    private final ObjectMapper json = new ObjectMapper();

    private String login(String cpf, String senha) throws Exception {
        String resposta = mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cpf\":\"" + cpf + "\",\"senha\":\"" + senha + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(resposta).get("token").asText();
    }

    @Test
    @DisplayName("atendente recebe as duas análises e o bloco de dados fictícios")
    void atendenteRecebeAnalises() throws Exception {
        String token = login("15350946056", "Atendente@123");

        mvc.perform(get(ROTA).header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasKey("dadosFicticios")))
                .andExpect(jsonPath("$.prioridadeXTempo.metodo", containsString("Spearman")))
                .andExpect(jsonPath("$.prioridadeXTempo.disponivel").isBoolean())
                .andExpect(jsonPath("$.tendenciaVolume.metodo", containsString("Regressão")))
                .andExpect(jsonPath("$.tendenciaVolume.disponivel").isBoolean());
    }

    @Test
    @DisplayName("com poucos dados (banco de demonstração) a resposta explica a limitação em vez de inventar número")
    void poucosDadosNaoGeramNumero() throws Exception {
        String token = login("15350946056", "Atendente@123");

        // O banco de teste tem 4 protocolos de demonstracao (2 concluidos): abaixo
        // do minimo de 10 pares para o Spearman.
        mvc.perform(get(ROTA).header("Authorization", token))
                .andExpect(jsonPath("$.prioridadeXTempo.disponivel").value(false))
                .andExpect(jsonPath("$.prioridadeXTempo.motivo", containsString("insuficiente")))
                .andExpect(jsonPath("$.prioridadeXTempo", org.hamcrest.Matchers.not(hasKey("rho"))));
    }

    @Test
    @DisplayName("cidadão recebe 403 e sem token 401")
    void acessoRestrito() throws Exception {
        String cidadao = login("52998224725", "Cidadao@123");

        mvc.perform(get(ROTA).header("Authorization", cidadao)).andExpect(status().isForbidden());
        mvc.perform(get(ROTA)).andExpect(status().isUnauthorized());
    }
}
