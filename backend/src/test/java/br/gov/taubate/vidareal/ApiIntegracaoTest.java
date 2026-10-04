package br.gov.taubate.vidareal;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Testes de integracao da API.
 *
 * <p>Cobrem o caminho de sucesso e, principalmente, os cenarios de erro:
 * e neles que as regras de seguranca aparecem.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiIntegracaoTest {

    private static final String CPF_CIDADAO = "52998224725";
    private static final String CPF_ATENDENTE = "15350946056";

    @Autowired
    private MockMvc mvc;

    private final ObjectMapper json = new ObjectMapper();

    // ---------- autenticacao ----------

    @Test
    @DisplayName("login com credenciais válidas devolve token e perfil")
    void loginValido() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoLogin(CPF_CIDADAO, "Cidadao@123")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.perfil", is("cidadao")))
                .andExpect(jsonPath("$.user.nome", is("Maria da Silva")));
    }

    @Test
    @DisplayName("senha errada devolve 401 com mensagem genérica")
    void senhaIncorreta() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoLogin(CPF_CIDADAO, "SenhaErrada@1")))
                .andExpect(status().isUnauthorized())
                // A mensagem nao revela se o CPF existe: evita enumeracao
                .andExpect(jsonPath("$.error.message", is("CPF ou senha incorretos.")));
    }

    @Test
    @DisplayName("CPF inexistente devolve a mesma mensagem do CPF existente")
    void cpfInexistenteNaoVazaInformacao() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoLogin("11144477735", "Qualquer@123")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.message", is("CPF ou senha incorretos.")));
    }

    @Test
    @DisplayName("rota protegida sem token devolve 401")
    void semTokenNaoAcessa() throws Exception {
        mvc.perform(get("/api/v1/protocolos"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code", is("UNAUTHORIZED")));
    }

    // ---------- protocolos ----------

    @Test
    @DisplayName("criação devolve 201 com Location e status inicial definido pelo servidor")
    void criarProtocolo() throws Exception {
        String token = autenticar(CPF_CIDADAO, "Cidadao@123");

        mvc.perform(post("/api/v1/protocolos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"tipo":"Problema técnico",
                                 "descricao":"A tela de metas não carrega no celular."}
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/v1/protocolos/")))
                .andExpect(jsonPath("$.status", is("Solicitação Criada")))
                .andExpect(jsonPath("$.progresso", is(33)));
    }

    @Test
    @DisplayName("descrição curta e tipo inválido devolvem 400 com os dois campos")
    void validacaoAcumulaErros() throws Exception {
        String token = autenticar(CPF_CIDADAO, "Cidadao@123");

        mvc.perform(post("/api/v1/protocolos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\":\"Inventado\",\"descricao\":\"curta\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("BAD_REQUEST")))
                .andExpect(jsonPath("$.error.details.length()", is(2)));
    }

    @Test
    @DisplayName("cidadão não pode tramitar protocolo: 403")
    void cidadaoNaoTramita() throws Exception {
        String token = autenticar(CPF_CIDADAO, "Cidadao@123");

        mvc.perform(patch("/api/v1/protocolos/2026031554321/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"progresso\":66}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code", is("FORBIDDEN")));
    }

    @Test
    @DisplayName("cidadão não enxerga protocolo de outro usuário: 404, não 403")
    void isolamentoEntreUsuarios() throws Exception {
        String token = autenticar(CPF_CIDADAO, "Cidadao@123");

        // 2026022611223 pertence ao atendente. Responder 404 evita confirmar
        // que o registro existe (LGPD).
        mvc.perform(get("/api/v1/protocolos/2026022611223")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("atendente enxerga mais protocolos que o cidadão")
    void atendenteVeTudo() throws Exception {
        String tokenCidadao = autenticar(CPF_CIDADAO, "Cidadao@123");
        String tokenAtendente = autenticar(CPF_ATENDENTE, "Atendente@123");

        int doCidadao = totalDe(tokenCidadao);
        int doAtendente = totalDe(tokenAtendente);

        org.junit.jupiter.api.Assertions.assertTrue(doAtendente > doCidadao,
                "o atendente deveria enxergar mais protocolos que o cidadão");
    }

    @Test
    @DisplayName("tramitar para o mesmo status devolve 409")
    void tramitacaoRepetidaConflita() throws Exception {
        String token = autenticar(CPF_ATENDENTE, "Atendente@123");

        // 2026050712345 ja esta em "Em análise" (progresso 66)
        mvc.perform(patch("/api/v1/protocolos/2026050712345/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"progresso\":66}"))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("exclusão devolve 204 e o recurso deixa de existir")
    void excluirProtocolo() throws Exception {
        String token = autenticar(CPF_CIDADAO, "Cidadao@123");

        String resposta = mvc.perform(post("/api/v1/protocolos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"tipo":"Sugestão de melhoria",
                                 "descricao":"Sugiro incluir exportação das metas em CSV."}
                                """))
                .andReturn().getResponse().getContentAsString();

        String id = json.readTree(resposta).path("id").asText();

        mvc.perform(delete("/api/v1/protocolos/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/protocolos/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // ---------- triagem inteligente ----------

    @Test
    @DisplayName("descrição de problema técnico recebe a sugestão correspondente, com confiança e termos")
    void sugestaoProblemaTecnico() throws Exception {
        String token = autenticar(CPF_CIDADAO, "Cidadao@123");

        sugerir(token, "Não consigo abrir a tela de protocolos, aparece erro e a página trava no celular.")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sugestao.tipo", is("Problema técnico")))
                .andExpect(jsonPath("$.sugestao.confianca", greaterThan(0.45)))
                .andExpect(jsonPath("$.sugestao.termos.length()", greaterThan(0)))
                .andExpect(jsonPath("$.alternativas.length()", is(5)))
                .andExpect(jsonPath("$.aviso", containsString("Não é uma probabilidade")));
    }

    @Test
    @DisplayName("descrição de dúvida sobre inflação recebe a sugestão correspondente")
    void sugestaoInflacao() throws Exception {
        String token = autenticar(CPF_CIDADAO, "Cidadao@123");

        sugerir(token, "Tenho dúvida sobre como o IPCA é usado no simulador para projetar a inflação dos preços.")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sugestao.tipo", is("Dúvida sobre inflação")));
    }

    @Test
    @DisplayName("descrição de orientação financeira recebe a sugestão correspondente")
    void sugestaoOrientacaoFinanceira() throws Exception {
        String token = autenticar(CPF_CIDADAO, "Cidadao@123");

        sugerir(token, "Estou endividado no cartão de crédito e preciso de orientação para renegociar as dívidas.")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sugestao.tipo", is("Solicitação de orientação financeira")));
    }

    @Test
    @DisplayName("descrição curta ou vaga não recebe sugestão, e a resposta explica o motivo")
    void semSugestaoQuandoAmbiguo() throws Exception {
        String token = autenticar(CPF_CIDADAO, "Cidadao@123");

        for (String vaga : new String[] {"Oi", "Preciso de ajuda.", "Olá, bom dia, tudo bem?"}) {
            sugerir(token, vaga)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.sugestao").value(nullValue()))
                    .andExpect(jsonPath("$.motivo").isNotEmpty());
        }
    }

    @Test
    @DisplayName("sugestão exige login e um corpo com descrição")
    void sugestaoValidaEntrada() throws Exception {
        mvc.perform(post("/api/v1/protocolos/sugestao")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"descricao\":\"O site não abre no celular.\"}"))
                .andExpect(status().isUnauthorized());

        String token = autenticar(CPF_CIDADAO, "Cidadao@123");
        mvc.perform(post("/api/v1/protocolos/sugestao")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[0].campo", is("descricao")));
    }

    @Test
    @DisplayName("criação calcula e persiste prioridade e sugestão; a categoria gravada é a do cidadão")
    void criacaoPersisteTriagem() throws Exception {
        String tokenCidadao = autenticar(CPF_CIDADAO, "Cidadao@123");

        // O cidadao contraria a IA de proposito: descreve um problema
        // tecnico, mas escolhe "Sugestão de melhoria".
        String resposta = mvc.perform(post("/api/v1/protocolos")
                        .header("Authorization", "Bearer " + tokenCidadao)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"tipo":"Sugestão de melhoria",
                                 "descricao":"Não consigo abrir a tela de protocolos, aparece erro e a página trava no celular."}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipo", is("Sugestão de melhoria")))
                // O proprio autor, sendo cidadao, nao recebe a triagem
                .andExpect(jsonPath("$.triagem").value(nullValue()))
                .andReturn().getResponse().getContentAsString();

        String id = json.readTree(resposta).path("id").asText();

        // Lido de novo do banco, pelo atendente: a triagem foi persistida
        String tokenAtendente = autenticar(CPF_ATENDENTE, "Atendente@123");
        mvc.perform(get("/api/v1/protocolos/" + id)
                        .header("Authorization", "Bearer " + tokenAtendente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipo", is("Sugestão de melhoria")))
                .andExpect(jsonPath("$.triagem.prioridade", is("Média")))
                .andExpect(jsonPath("$.triagem.pontos", is(2)))
                .andExpect(jsonPath("$.triagem.motivos[0]", containsString("impedimento")))
                .andExpect(jsonPath("$.triagem.tipoSugerido", is("Problema técnico")))
                .andExpect(jsonPath("$.triagem.confiancaSugestao", greaterThan(0.45)))
                .andExpect(jsonPath("$.triagem.sugestaoAceita", is(false)));
    }

    @Test
    @DisplayName("atendente vê a prioridade e ordena a fila: pendentes primeiro, maior pontuação antes")
    void atendenteOrdenaPorPrioridade() throws Exception {
        String tokenCidadao = autenticar(CPF_CIDADAO, "Cidadao@123");
        mvc.perform(post("/api/v1/protocolos")
                        .header("Authorization", "Bearer " + tokenCidadao)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"tipo":"Problema técnico",
                                 "descricao":"Urgente: não consigo entrar no sistema e estou com dívidas para negociar hoje."}
                                """))
                .andExpect(status().isCreated());

        String tokenAtendente = autenticar(CPF_ATENDENTE, "Atendente@123");
        String resposta = mvc.perform(get("/api/v1/protocolos?ordem=prioridade&limite=100")
                        .header("Authorization", "Bearer " + tokenAtendente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dados[0].triagem.prioridade", is("Alta")))
                .andReturn().getResponse().getContentAsString();

        int pontosAnterior = Integer.MAX_VALUE;
        boolean chegouNosConcluidos = false;
        for (JsonNode protocolo : json.readTree(resposta).path("dados")) {
            boolean concluido = protocolo.path("progresso").asInt() == 100;
            org.junit.jupiter.api.Assertions.assertFalse(chegouNosConcluidos && !concluido,
                    "protocolo pendente apareceu depois de um concluído");
            if (concluido && !chegouNosConcluidos) {
                chegouNosConcluidos = true;
                pontosAnterior = Integer.MAX_VALUE; // a contagem recomeça no bloco dos concluídos
            }
            int pontos = protocolo.path("triagem").path("pontos").asInt();
            org.junit.jupiter.api.Assertions.assertTrue(pontos <= pontosAnterior,
                    "fila fora de ordem de prioridade");
            pontosAnterior = pontos;
        }
    }

    @Test
    @DisplayName("cidadão não acessa prioridade, ordenação por prioridade nem a ficha do modelo")
    void cidadaoNaoAcessaTriagemInterna() throws Exception {
        String token = autenticar(CPF_CIDADAO, "Cidadao@123");

        String lista = mvc.perform(get("/api/v1/protocolos?limite=100")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        for (JsonNode protocolo : json.readTree(lista).path("dados")) {
            org.junit.jupiter.api.Assertions.assertTrue(protocolo.path("triagem").isNull(),
                    "a listagem do cidadão expôs a triagem");
        }

        mvc.perform(get("/api/v1/protocolos/2026050712345")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.triagem").value(nullValue()));

        mvc.perform(get("/api/v1/protocolos?ordem=prioridade")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/v1/protocolos/triagem/modelo")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ficha do modelo informa versão, categorias e exemplos por categoria ao atendente")
    void fichaDoModelo() throws Exception {
        String token = autenticar(CPF_ATENDENTE, "Atendente@123");

        mvc.perform(get("/api/v1/protocolos/triagem/modelo")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categorias.length()", is(5)))
                .andExpect(jsonPath("$.dataset.versao").isNotEmpty())
                .andExpect(jsonPath("$.dataset.origem", containsString("sintético")))
                .andExpect(jsonPath("$.dataset.exemplosPorCategoria['Problema técnico']", greaterThan(0)))
                .andExpect(jsonPath("$.exemplos.length()", greaterThan(0)));
    }

    @Test
    @DisplayName("protocolos de demonstração recebem triagem na subida da API")
    void protocolosAntigosSaoTriados() throws Exception {
        String token = autenticar(CPF_ATENDENTE, "Atendente@123");

        mvc.perform(get("/api/v1/protocolos/2026031554321")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.triagem.prioridade").isNotEmpty())
                .andExpect(jsonPath("$.triagem.tipoSugerido",
                        is("Análise de viabilidade de Metas Financeiras")));
    }

    // ---------- feedbacks e auditoria ----------

    @Test
    @DisplayName("envio de feedback é público; a leitura é restrita ao atendente")
    void feedbackPublicoLeituraRestrita() throws Exception {
        mvc.perform(post("/api/v1/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"comentario\":\"Muito útil!\"}"))
                .andExpect(status().isCreated());

        String tokenCidadao = autenticar(CPF_CIDADAO, "Cidadao@123");
        mvc.perform(get("/api/v1/feedbacks").header("Authorization", "Bearer " + tokenCidadao))
                .andExpect(status().isForbidden());

        String tokenAtendente = autenticar(CPF_ATENDENTE, "Atendente@123");
        mvc.perform(get("/api/v1/feedbacks").header("Authorization", "Bearer " + tokenAtendente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resumo.total", greaterThan(0)));
    }

    @Test
    @DisplayName("trilha de auditoria registra as ações e é exclusiva do atendente")
    void auditoriaRestrita() throws Exception {
        String tokenAtendente = autenticar(CPF_ATENDENTE, "Atendente@123");

        mvc.perform(get("/api/v1/auditoria").header("Authorization", "Bearer " + tokenAtendente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paginacao.total", greaterThan(0)));
    }

    @Test
    @DisplayName("rota inexistente devolve 404 no envelope padrão")
    void rotaInexistente() throws Exception {
        mvc.perform(get("/api/v1/naoexiste"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));
    }

    // ---------- apoio ----------

    private String corpoLogin(String cpf, String senha) {
        return "{\"cpf\":\"" + cpf + "\",\"senha\":\"" + senha + "\"}";
    }

    private org.springframework.test.web.servlet.ResultActions sugerir(String token, String descricao)
            throws Exception {
        return mvc.perform(post("/api/v1/protocolos/sugestao")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(java.util.Map.of("descricao", descricao))));
    }

    private String autenticar(String cpf, String senha) throws Exception {
        String resposta = mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoLogin(cpf, senha)))
                .andReturn().getResponse().getContentAsString();
        return json.readTree(resposta).path("token").asText();
    }

    private int totalDe(String token) throws Exception {
        String resposta = mvc.perform(get("/api/v1/protocolos?limite=100")
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        JsonNode corpo = json.readTree(resposta);
        return corpo.path("paginacao").path("total").asInt();
    }
}
