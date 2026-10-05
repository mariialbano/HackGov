package br.gov.taubate.vidareal.web;

import br.gov.taubate.vidareal.erro.ApiException;
import br.gov.taubate.vidareal.erro.ErroCampo;
import br.gov.taubate.vidareal.modelo.Perfil;
import br.gov.taubate.vidareal.modelo.Usuario;
import br.gov.taubate.vidareal.repositorio.Repositorio;
import br.gov.taubate.vidareal.seguranca.Autenticado;
import br.gov.taubate.vidareal.seguranca.AutenticacaoInterceptor;
import br.gov.taubate.vidareal.seguranca.LimitadorRequisicoes;
import br.gov.taubate.vidareal.seguranca.RecuperacaoSenhaService;
import br.gov.taubate.vidareal.seguranca.SessaoService;
import br.gov.taubate.vidareal.seguranca.UsuarioLogado;
import br.gov.taubate.vidareal.util.PoliticaSenha;
import br.gov.taubate.vidareal.util.Validadores;
import br.gov.taubate.vidareal.web.dto.LoginRequest;
import br.gov.taubate.vidareal.web.dto.LoginResposta;
import br.gov.taubate.vidareal.web.dto.UsuarioResposta;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recurso /api/v1/auth.
 *
 * <pre>
 *   POST /login                  autentica e devolve o token de sessao
 *   POST /cadastro               cria a conta de um cidadao
 *   POST /recuperacao            inicia o "esqueci minha senha"
 *   POST /recuperacao/confirmar  redefine a senha com o token recebido
 *   GET  /me      dados do usuario autenticado
 *   POST /logout  invalida o token
 * </pre>
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final Repositorio repositorio;
    private final SessaoService sessoes;
    private final BCryptPasswordEncoder encoder;

    /**
     * Limita tentativas de login por IP, mitigando forca bruta.
     * Os valores sao configuraveis: o padrao de producao (5 tentativas a
     * cada 15 minutos) e restritivo demais para a suite de testes.
     */
    private final LimitadorRequisicoes limitador;

    private final RecuperacaoSenhaService recuperacao;

    /**
     * Limite proprio para a recuperacao de senha, contado a parte do login:
     * quem errou a senha algumas vezes ainda precisa conseguir recupera-la.
     */
    private final LimitadorRequisicoes limitadorRecuperacao;

    public AuthController(Repositorio repositorio, SessaoService sessoes,
                          BCryptPasswordEncoder encoder,
                          RecuperacaoSenhaService recuperacao,
                          @Value("${vidareal.seguranca.login.limite:5}") int limite,
                          @Value("${vidareal.seguranca.login.janela-minutos:15}") int janelaMinutos,
                          @Value("${vidareal.seguranca.recuperacao.limite:10}") int limiteRecuperacao) {
        this.repositorio = repositorio;
        this.sessoes = sessoes;
        this.encoder = encoder;
        this.recuperacao = recuperacao;
        this.limitador = new LimitadorRequisicoes(limite, Duration.ofMinutes(janelaMinutos));
        this.limitadorRecuperacao =
                new LimitadorRequisicoes(limiteRecuperacao, Duration.ofMinutes(janelaMinutos));
    }

    @PostMapping("/login")
    public LoginResposta login(@Valid @RequestBody LoginRequest corpo,
                               HttpServletRequest requisicao,
                               HttpServletResponse resposta) {
        String ip = requisicao.getRemoteAddr();
        if (!limitador.permitir(ip)) {
            resposta.setHeader("Retry-After", String.valueOf(limitador.segundosParaLiberar(ip)));
            throw ApiException.muitasRequisicoes(
                    "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.");
        }

        String cpf = Validadores.apenasDigitos(corpo.cpf());

        // Mensagem generica de proposito: nao revelar se o CPF existe no
        // sistema (evita enumeracao de usuarios).
        ApiException credenciaisInvalidas = ApiException.naoAutenticado("CPF ou senha incorretos.");

        if (!Validadores.cpfValido(cpf) || corpo.senha().length() < 8 || corpo.senha().length() > 64) {
            throw credenciaisInvalidas;
        }

        Optional<Usuario> encontrado = repositorio.buscarUsuarioPorCpf(cpf);

        // Compara sempre, mesmo sem usuario: o tempo de resposta fica igual
        // ao de um CPF valido, fechando a enumeracao por timing.
        String hashAlvo = encontrado.map(Usuario::getSenhaHash).orElse(repositorio.getHashFalso());
        boolean senhaConfere = encoder.matches(corpo.senha(), hashAlvo);

        if (encontrado.isEmpty() || !senhaConfere) {
            repositorio.registrarAuditoria("LOGIN_FALHOU", "auth", null, null, null,
                    "Tentativa de autenticação recusada");
            throw credenciaisInvalidas;
        }

        Usuario usuario = encontrado.get();
        String token = sessoes.abrir(usuario);

        repositorio.registrarAuditoria("LOGIN", "auth", null, usuario.getCpf(),
                usuario.getPerfil().getValor(), null);

        return new LoginResposta(true, token, UsuarioResposta.de(usuario));
    }

    /** Corpo do cadastro de um novo cidadao. */
    public record CadastroRequest(String nome, String cpf, String email, String senha,
                                  String cep, String cidade) {
    }

    /**
     * Cadastro publico de cidadao.
     *
     * <p>O perfil e sempre CIDADAO: o de atendente e concedido pela gestao,
     * nunca escolhido por quem se cadastra &mdash; caso contrario qualquer
     * pessoa viraria atendente e leria os protocolos de todos.</p>
     */
    @PostMapping("/cadastro")
    public ResponseEntity<Map<String, Object>> cadastrar(@RequestBody CadastroRequest corpo) {
        String nome = Validadores.sanitizar(corpo.nome(), 120);
        String cpf = Validadores.apenasDigitos(corpo.cpf());
        String email = Validadores.normalizarEmail(corpo.email());

        List<ErroCampo> erros = new ArrayList<>();

        if (nome.length() < 3) {
            erros.add(new ErroCampo("nome", "Deve ter no mínimo 3 caracteres."));
        }
        if (!Validadores.cpfValido(cpf)) {
            erros.add(new ErroCampo("cpf", "CPF inválido. Confira os dígitos informados."));
        }
        // Obrigatorio: e para o e-mail que vai o link de recuperacao de senha.
        if (email.isEmpty()) {
            erros.add(new ErroCampo("email", "Obrigatório. É por ele que você recupera a senha."));
        } else if (!Validadores.emailValido(email)) {
            erros.add(new ErroCampo("email", "Informe um e-mail válido."));
        }
        erros.addAll(PoliticaSenha.avaliar(corpo.senha(), "senha"));

        if (!erros.isEmpty()) {
            throw ApiException.requisicaoInvalida("Dados inválidos na requisição.", erros);
        }

        if (repositorio.cpfJaCadastrado(cpf)) {
            throw ApiException.conflito("Já existe uma conta com este CPF.");
        }
        // Dois usuarios com o mesmo e-mail receberiam o link um do outro.
        if (repositorio.emailEmUso(email, null)) {
            throw new ApiException(HttpStatus.CONFLICT, "CONFLICT",
                    "Já existe uma conta com este e-mail.",
                    List.of(new ErroCampo("email", "Este e-mail já está em uso por outra conta.")));
        }

        Usuario novo = new Usuario(cpf, encoder.encode(corpo.senha()), nome, email, Perfil.CIDADAO);

        // Endereco vem do ViaCEP e e opcional: quem nao preencher se cadastra igual.
        String cep = Validadores.apenasDigitos(corpo.cep());
        if (cep.length() == 8) {
            novo.setCep(cep);
            novo.setCidade(Validadores.sanitizar(corpo.cidade(), 120));
        }

        repositorio.adicionarUsuario(novo);

        repositorio.registrarAuditoria("CRIAR_CONTA", "auth", cpf, cpf,
                Perfil.CIDADAO.getValor(), null);

        // Ja devolve a sessao aberta: o cidadao entra direto apos cadastrar.
        String token = sessoes.abrir(novo);

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("success", true);
        resposta.put("token", token);
        resposta.put("user", UsuarioResposta.de(novo));

        return ResponseEntity.created(URI.create("/api/v1/perfil")).body(resposta);
    }

    // ---------- recuperacao de senha ----------

    /** Corpo do pedido de recuperacao. */
    public record RecuperacaoRequest(String cpf) {
    }

    /** Corpo da redefinicao: o token recebido e a nova senha, digitada duas vezes. */
    public record RedefinicaoRequest(String token, String senhaNova, String confirmacao) {
    }

    /**
     * Passo 1 de "esqueci minha senha".
     *
     * <p>A resposta e identica para CPF cadastrado e nao cadastrado: revelar
     * a diferenca transformaria esta rota em um consultor de CPFs.</p>
     */
    @PostMapping("/recuperacao")
    public ResponseEntity<Map<String, String>> solicitarRecuperacao(
            @RequestBody RecuperacaoRequest corpo,
            HttpServletRequest requisicao,
            HttpServletResponse resposta) {
        limitarRecuperacao(requisicao, resposta);

        // Conferido antes de olhar o CPF: a resposta e a mesma para qualquer
        // pessoa e nao diz nada sobre contas.
        if (!recuperacao.estaDisponivel()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_INDISPONIVEL",
                    "A recuperação de senha está indisponível: o envio de e-mail não está "
                            + "configurado no servidor.");
        }

        String cpf = Validadores.apenasDigitos(corpo.cpf());
        // O formato do CPF nao e segredo: recusa-lo nao revela nada sobre contas.
        if (!Validadores.cpfValido(cpf)) {
            throw ApiException.requisicaoInvalida("Dados inválidos na requisição.",
                    List.of(new ErroCampo("cpf", "CPF inválido. Confira os dígitos informados.")));
        }

        recuperacao.solicitar(cpf);

        return ResponseEntity.accepted().body(Map.of("message",
                "Se houver uma conta com este CPF, enviamos um e-mail com o link para redefinir "
                        + "a senha. O link vale por " + recuperacao.getValidade().toMinutes() + " minutos."));
    }

    /** Passo 2: troca a senha de quem apresentar um token valido. */
    @PostMapping("/recuperacao/confirmar")
    public ResponseEntity<Void> redefinirSenha(@RequestBody RedefinicaoRequest corpo,
                                               HttpServletRequest requisicao,
                                               HttpServletResponse resposta) {
        limitarRecuperacao(requisicao, resposta);

        // A senha e validada ANTES de o token ser consumido: uma senha fraca
        // nao pode custar ao cidadao o link que ele acabou de receber.
        List<ErroCampo> erros = new ArrayList<>(PoliticaSenha.avaliar(corpo.senhaNova(), "senhaNova"));
        if (corpo.senhaNova() != null && !corpo.senhaNova().equals(corpo.confirmacao())) {
            erros.add(new ErroCampo("confirmacao", "A confirmação não confere com a nova senha."));
        }
        if (!erros.isEmpty()) {
            throw ApiException.requisicaoInvalida("A nova senha não atende à política.", erros);
        }

        // Inexistente, usado e vencido recebem a mesma resposta.
        if (!recuperacao.redefinir(corpo.token(), corpo.senhaNova())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TOKEN_INVALIDO",
                    "Link inválido ou expirado. Solicite uma nova recuperação de senha.");
        }

        return ResponseEntity.noContent().build();
    }

    private void limitarRecuperacao(HttpServletRequest requisicao, HttpServletResponse resposta) {
        String ip = requisicao.getRemoteAddr();
        if (!limitadorRecuperacao.permitir(ip)) {
            resposta.setHeader("Retry-After",
                    String.valueOf(limitadorRecuperacao.segundosParaLiberar(ip)));
            throw ApiException.muitasRequisicoes(
                    "Muitas tentativas de recuperação. Aguarde alguns minutos e tente novamente.");
        }
    }

    @GetMapping("/me")
    @Autenticado
    public Map<String, UsuarioResposta> eu(@UsuarioLogado Usuario usuario) {
        return Map.of("user", UsuarioResposta.de(usuario));
    }

    @PostMapping("/logout")
    @Autenticado
    public ResponseEntity<Void> logout(@UsuarioLogado Usuario usuario, HttpServletRequest requisicao) {
        String token = (String) requisicao.getAttribute(AutenticacaoInterceptor.ATRIBUTO_TOKEN);
        sessoes.encerrar(token);

        repositorio.registrarAuditoria("LOGOUT", "auth", null, usuario.getCpf(),
                usuario.getPerfil().getValor(), null);

        return ResponseEntity.noContent().build();
    }
}
