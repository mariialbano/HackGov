package br.gov.taubate.vidareal;

import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.gov.taubate.vidareal.modelo.Perfil;
import br.gov.taubate.vidareal.modelo.Usuario;
import br.gov.taubate.vidareal.repositorio.Repositorio;
import br.gov.taubate.vidareal.seguranca.RecuperacaoSenhaService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Recuperacao de senha por e-mail e as regras do e-mail da conta.
 *
 * <p>O servidor SMTP e trocado por um substituto que guarda as mensagens em
 * vez de envia-las. O token nunca vem na resposta da API: os testes o leem
 * de onde o cidadao o leria, o corpo do e-mail.</p>
 *
 * <p>O envio e assincrono, entao as verificacoes esperam a mensagem chegar
 * ao substituto antes de conferi-la.</p>
 *
 * <p>As contas usadas aqui sao criadas pelos proprios testes, para nao
 * trocar a senha dos usuarios de demonstracao de que a outra suite depende.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.mail.host=smtp.teste.local",
        "vidareal.email.remetente=nao-responda@vidareal.teste"})
class RecuperacaoSenhaTest {

    private static final String CPF_CONTA = "39053344705";
    private static final String CPF_TROCA = "12345678909";
    private static final String CPF_SEM_CONTA = "98765432100";
    private static final String CPF_SEM_EMAIL = "16899535009";
    private static final String CPF_PERFIL = "86288366757";

    private static final String SENHA_INICIAL = "Inicial@123";
    private static final String SENHA_NOVA = "Nova@Senha456";

    private static final int ESPERA_MS = 3000;
    private static final Pattern TOKEN_NO_LINK =
            Pattern.compile("http://localhost:5173/redefinir-senha\\?token=([0-9a-f]{64})");

    @Autowired
    private MockMvc mvc;

    @Autowired
    private Repositorio repositorio;

    @MockitoBean
    private JavaMailSender smtp;

    private final ObjectMapper json = new ObjectMapper();

    @BeforeEach
    void prepararSmtp() {
        when(smtp.createMimeMessage()).thenAnswer(chamada -> new MimeMessage((Session) null));
    }

    // ---------- recuperacao ----------

    @Test
    @DisplayName("o e-mail vai para o endereço da conta, com assunto, link e as duas versões do texto")
    void emailDeRecuperacao() throws Exception {
        criarConta(CPF_CONTA);

        MimeMessage mensagem = solicitarEReceber(CPF_CONTA);

        assertEquals(emailDe(CPF_CONTA), ((InternetAddress) mensagem.getAllRecipients()[0]).getAddress());
        assertEquals("nao-responda@vidareal.teste", ((InternetAddress) mensagem.getFrom()[0]).getAddress());
        assertEquals("VidaReal - redefinição de senha", mensagem.getSubject());

        String texto = parte(mensagem, "text/plain");
        String html = parte(mensagem, "text/html");
        assertTrue(TOKEN_NO_LINK.matcher(texto).find(), "o texto puro deveria trazer o link");
        assertTrue(TOKEN_NO_LINK.matcher(html).find(), "o HTML deveria trazer o link");
        assertTrue(texto.contains("só pode ser usado uma vez"));
        assertTrue(texto.contains("Conta de Teste"));
    }

    @Test
    @DisplayName("token válido troca a senha: a nova entra, a antiga não, e a sessão aberta cai")
    void tokenValidoTrocaASenha() throws Exception {
        String sessaoAntiga = criarConta(CPF_TROCA);
        String token = solicitarELerToken(CPF_TROCA);

        confirmar(token, SENHA_NOVA, SENHA_NOVA).andExpect(status().isNoContent());

        login(CPF_TROCA, SENHA_NOVA).andExpect(status().isOk());
        login(CPF_TROCA, SENHA_INICIAL).andExpect(status().isUnauthorized());

        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + sessaoAntiga))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("token inexistente é recusado")
    void tokenInvalido() throws Exception {
        confirmar("f".repeat(64), SENHA_NOVA, SENHA_NOVA)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("TOKEN_INVALIDO")));

        confirmar("", SENHA_NOVA, SENHA_NOVA)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("TOKEN_INVALIDO")));
    }

    @Test
    @DisplayName("token expirado é recusado com a mesma resposta do inexistente, e a senha não muda")
    void tokenExpirado() throws Exception {
        criarConta(CPF_CONTA);
        String senhaAtual = definirSenhaConhecida(CPF_CONTA);

        String vencido = "a".repeat(64);
        repositorio.criarTokenRecuperacao(RecuperacaoSenhaService.hash(vencido), CPF_CONTA,
                Instant.now().minusSeconds(1));

        confirmar(vencido, "Outra@Senha789", "Outra@Senha789")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("TOKEN_INVALIDO")))
                .andExpect(jsonPath("$.error.message",
                        is("Link inválido ou expirado. Solicite uma nova recuperação de senha.")));

        login(CPF_CONTA, senhaAtual).andExpect(status().isOk());
        login(CPF_CONTA, "Outra@Senha789").andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("token já usado não vale uma segunda vez")
    void tokenReutilizado() throws Exception {
        criarConta(CPF_CONTA);
        String token = solicitarELerToken(CPF_CONTA);

        confirmar(token, "Primeira@Troca1", "Primeira@Troca1").andExpect(status().isNoContent());

        confirmar(token, "Segunda@Troca2", "Segunda@Troca2")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("TOKEN_INVALIDO")));

        login(CPF_CONTA, "Primeira@Troca1").andExpect(status().isOk());
        login(CPF_CONTA, "Segunda@Troca2").andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("pedir um novo link invalida o anterior")
    void novoPedidoInvalidaOAnterior() throws Exception {
        criarConta(CPF_CONTA);
        String primeiro = solicitarELerToken(CPF_CONTA);
        String segundo = solicitarELerToken(CPF_CONTA);

        confirmar(primeiro, SENHA_NOVA, SENHA_NOVA).andExpect(status().isBadRequest());
        confirmar(segundo, SENHA_NOVA, SENHA_NOVA).andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("senha fraca ou confirmação diferente devolvem 400 por campo e não gastam o token")
    void senhaInvalidaNaoConsomeToken() throws Exception {
        criarConta(CPF_CONTA);
        String token = solicitarELerToken(CPF_CONTA);

        confirmar(token, "fraca", "fraca")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("BAD_REQUEST")))
                .andExpect(jsonPath("$.error.details[0].campo", is("senhaNova")));

        confirmar(token, SENHA_NOVA, "Diferente@999")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[0].campo", is("confirmacao")));

        // O link continua valendo depois dos dois erros de digitacao
        confirmar(token, SENHA_NOVA, SENHA_NOVA).andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("a resposta não revela se o CPF tem conta, nunca traz o token, e CPF sem conta não gera e-mail")
    void naoRevelaSeOCpfExiste() throws Exception {
        criarConta(CPF_CONTA);

        clearInvocations(smtp);
        String comConta = solicitar(CPF_CONTA).andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        verify(smtp, timeout(ESPERA_MS)).send(any(MimeMessage.class));

        clearInvocations(smtp);
        String semConta = solicitar(CPF_SEM_CONTA).andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        verify(smtp, after(400).never()).send(any(MimeMessage.class));

        assertEquals(comConta, semConta, "as duas respostas precisam ser idênticas");
        assertFalse(Pattern.compile("[0-9a-f]{64}").matcher(comConta).find(),
                "a resposta da API não pode conter o token");
        assertFalse(comConta.contains("@"), "a resposta não pode revelar o e-mail da conta");
    }

    @Test
    @DisplayName("conta antiga, sem e-mail, recebe a mesma resposta e nenhum e-mail é enviado")
    void contaSemEmail() throws Exception {
        if (repositorio.buscarUsuarioPorCpf(CPF_SEM_EMAIL).isEmpty()) {
            // Contas assim so existem em bancos anteriores a obrigatoriedade
            // do e-mail; o cadastro pela API ja nao permite cria-las.
            repositorio.adicionarUsuario(
                    new Usuario(CPF_SEM_EMAIL, "hash-irrelevante", "Conta Antiga", Perfil.CIDADAO));
        }

        clearInvocations(smtp);
        solicitar(CPF_SEM_EMAIL).andExpect(status().isAccepted());
        verify(smtp, after(400).never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("CPF com dígitos inválidos é recusado antes de qualquer consulta")
    void cpfMalformado() throws Exception {
        solicitar("11111111111")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[0].campo", is("cpf")));
    }

    @Test
    @DisplayName("o banco guarda o hash do token, não o token")
    void bancoGuardaApenasOHash() throws Exception {
        criarConta(CPF_CONTA);
        String token = solicitarELerToken(CPF_CONTA);

        // O proprio token, usado como se fosse o hash, nao encontra nada...
        assertTrue(repositorio.consumirTokenRecuperacao(token).isEmpty());
        // ...e o hash dele, sim.
        assertEquals(CPF_CONTA,
                repositorio.consumirTokenRecuperacao(RecuperacaoSenhaService.hash(token)).orElse(null));
    }

    // ---------- e-mail da conta ----------

    @Test
    @DisplayName("cadastro exige e-mail válido")
    void cadastroExigeEmail() throws Exception {
        cadastrar("71428793860", null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[0].campo", is("email")));

        cadastrar("71428793860", "sem-arroba.com")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[0].campo", is("email")));
    }

    @Test
    @DisplayName("cadastro recusa e-mail já usado por outra conta, sem diferenciar maiúsculas")
    void cadastroRecusaEmailRepetido() throws Exception {
        criarConta(CPF_CONTA);

        cadastrar("71428793860", emailDe(CPF_CONTA).toUpperCase())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.details[0].campo", is("email")));
    }

    @Test
    @DisplayName("trocar o e-mail no perfil exige a senha atual; o resto do perfil não")
    void trocarEmailExigeSenha() throws Exception {
        criarConta(CPF_PERFIL);
        String senha = definirSenhaConhecida(CPF_PERFIL);
        String sessao = json.readTree(login(CPF_PERFIL, senha).andReturn()
                .getResponse().getContentAsString()).path("token").asText();
        String atual = repositorio.buscarUsuarioPorCpf(CPF_PERFIL).orElseThrow().getEmail();

        // Mesmo e-mail, outro nome: nao pede senha
        atualizarPerfil(sessao, "Nome Alterado", atual, null).andExpect(status().isOk());

        // E-mail novo sem senha, e com senha errada: recusado
        atualizarPerfil(sessao, "Nome Alterado", "novo.endereco@teste.local", null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[0].campo", is("senhaAtual")));
        atualizarPerfil(sessao, "Nome Alterado", "novo.endereco@teste.local", "Errada@999")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[0].campo", is("senhaAtual")));
        assertEquals(atual, repositorio.buscarUsuarioPorCpf(CPF_PERFIL).orElseThrow().getEmail());

        // E-mail de outra conta: recusado mesmo com a senha certa
        criarConta(CPF_CONTA);
        atualizarPerfil(sessao, "Nome Alterado", emailDe(CPF_CONTA), senha)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[0].campo", is("email")));

        // E-mail em branco: recusado
        atualizarPerfil(sessao, "Nome Alterado", "", senha)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[0].campo", is("email")));

        // Com a senha certa, troca; e volta ao original para o teste poder repetir
        atualizarPerfil(sessao, "Nome Alterado", "Novo.Endereco@Teste.Local", senha)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("novo.endereco@teste.local")));
        atualizarPerfil(sessao, "Conta de Teste", atual, senha).andExpect(status().isOk());
    }

    // ---------- apoio ----------

    private static String emailDe(String cpf) {
        return "conta." + cpf + "@teste.local";
    }

    private ResultActions cadastrar(String cpf, String email) throws Exception {
        Map<String, String> corpo = new HashMap<>();
        corpo.put("nome", "Conta de Teste");
        corpo.put("cpf", cpf);
        corpo.put("senha", SENHA_INICIAL);
        if (email != null) {
            corpo.put("email", email);
        }
        return mvc.perform(post("/api/v1/auth/cadastro")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(corpo)));
    }

    /** Cria a conta se ainda nao existir. Devolve o token de sessao quando cria. */
    private String criarConta(String cpf) throws Exception {
        String resposta = cadastrar(cpf, emailDe(cpf)).andReturn().getResponse().getContentAsString();
        return json.readTree(resposta).path("token").asText();
    }

    /** Outros testes ja podem ter trocado a senha desta conta: fixa uma conhecida. */
    private String definirSenhaConhecida(String cpf) throws Exception {
        String senha = "Conhecida@321";
        confirmar(solicitarELerToken(cpf), senha, senha).andExpect(status().isNoContent());
        return senha;
    }

    private ResultActions solicitar(String cpf) throws Exception {
        return mvc.perform(post("/api/v1/auth/recuperacao")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("cpf", cpf))));
    }

    private ResultActions confirmar(String token, String senhaNova, String confirmacao) throws Exception {
        return mvc.perform(post("/api/v1/auth/recuperacao/confirmar")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "token", token, "senhaNova", senhaNova, "confirmacao", confirmacao))));
    }

    private ResultActions login(String cpf, String senha) throws Exception {
        return mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("cpf", cpf, "senha", senha))));
    }

    private ResultActions atualizarPerfil(String sessao, String nome, String email, String senhaAtual)
            throws Exception {
        Map<String, String> corpo = new HashMap<>();
        corpo.put("nome", nome);
        corpo.put("email", email);
        if (senhaAtual != null) {
            corpo.put("senhaAtual", senhaAtual);
        }
        return mvc.perform(put("/api/v1/perfil")
                .header("Authorization", "Bearer " + sessao)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(corpo)));
    }

    /** Pede a recuperacao e espera o e-mail chegar ao servidor SMTP substituto. */
    private MimeMessage solicitarEReceber(String cpf) throws Exception {
        clearInvocations(smtp);
        solicitar(cpf).andExpect(status().isAccepted());

        ArgumentCaptor<MimeMessage> enviada = ArgumentCaptor.forClass(MimeMessage.class);
        verify(smtp, timeout(ESPERA_MS)).send(enviada.capture());

        // Um servidor de verdade finaliza a mensagem ao transmiti-la; o
        // substituto nao, e sem isso as partes ficam sem o cabecalho de tipo.
        MimeMessage mensagem = enviada.getValue();
        mensagem.saveChanges();
        return mensagem;
    }

    private String solicitarELerToken(String cpf) throws Exception {
        Matcher link = TOKEN_NO_LINK.matcher(parte(solicitarEReceber(cpf), "text/plain"));
        assertTrue(link.find(), "o e-mail deveria trazer o link com o token");
        return link.group(1);
    }

    /** Procura, dentro da mensagem, a parte com o tipo pedido (texto puro ou HTML). */
    private static String parte(Part mensagem, String tipo) throws Exception {
        Object conteudo = mensagem.getContent();
        if (conteudo instanceof Multipart partes) {
            for (int i = 0; i < partes.getCount(); i++) {
                String achada = parte(partes.getBodyPart(i), tipo);
                if (achada != null) {
                    return achada;
                }
            }
            return null;
        }
        return mensagem.isMimeType(tipo) ? (String) conteudo : null;
    }
}
