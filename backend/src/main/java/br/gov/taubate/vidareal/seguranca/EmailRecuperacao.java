package br.gov.taubate.vidareal.seguranca;

import jakarta.annotation.PreDestroy;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

/**
 * Envio do e-mail de recuperacao de senha, por SMTP.
 *
 * <p>O servidor SMTP e configurado por variaveis de ambiente (SMTP_HOST,
 * SMTP_USER, SMTP_PASSWORD...), lidas do {@code backend/.env}. Funciona com
 * qualquer provedor que aceite SMTP com usuario e senha, como o Gmail com
 * senha de app. O destinatario pode estar em qualquer provedor.</p>
 *
 * <p>O envio acontece em uma fila propria, fora da requisicao. Conversar com
 * o servidor de e-mail leva de um a tres segundos; feito dentro da
 * requisicao, esse tempo denunciaria que o CPF informado tem conta, porque
 * so nesse caso ha e-mail a enviar.</p>
 *
 * <p>Nem o link nem o destinatario vao para o log.</p>
 */
@Component
public class EmailRecuperacao {

    private static final Logger log = LoggerFactory.getLogger(EmailRecuperacao.class);

    private static final String ASSUNTO = "VidaReal - redefinição de senha";
    private static final String NOME_REMETENTE = "VidaReal";

    private static final DateTimeFormatter HORARIO = DateTimeFormatter
            .ofPattern("dd/MM/yyyy 'às' HH:mm")
            .withZone(ZoneId.of("America/Sao_Paulo"));

    private final ObjectProvider<JavaMailSender> smtp;
    private final String host;
    private final String remetente;

    /** Uma thread basta: o volume e baixo e a ordem de envio fica previsivel. */
    private final ExecutorService fila = Executors.newSingleThreadExecutor(tarefa -> {
        Thread thread = new Thread(tarefa, "email-recuperacao");
        thread.setDaemon(true);
        return thread;
    });

    public EmailRecuperacao(ObjectProvider<JavaMailSender> smtp,
                            @Value("${spring.mail.host:}") String host,
                            @Value("${vidareal.email.remetente:}") String remetente) {
        this.smtp = smtp;
        this.host = host;
        this.remetente = remetente;

        if (!estaConfigurado()) {
            log.warn("E-mail nao configurado (SMTP_HOST e SMTP_USER/SMTP_FROM em backend/.env): "
                    + "a recuperacao de senha ficara indisponivel.");
        }
    }

    /** @return false enquanto o servidor nao tiver SMTP configurado. */
    public boolean estaConfigurado() {
        return !host.isBlank() && !remetente.isBlank() && smtp.getIfAvailable() != null;
    }

    /** Coloca o e-mail de recuperacao na fila de envio e volta na hora. */
    public void enviarRecuperacao(String para, String nome, String link, Instant expiraEm) {
        fila.execute(() -> {
            try {
                JavaMailSender servidor = smtp.getObject();
                MimeMessage mensagem = servidor.createMimeMessage();

                // Duas versoes do mesmo conteudo: texto puro e HTML. O programa
                // de e-mail do cidadao mostra a que souber exibir.
                MimeMessageHelper montagem =
                        new MimeMessageHelper(mensagem, true, StandardCharsets.UTF_8.name());
                montagem.setFrom(remetente, NOME_REMETENTE);
                montagem.setTo(para);
                montagem.setSubject(ASSUNTO);
                montagem.setText(texto(nome, link, expiraEm), html(nome, link, expiraEm));

                servidor.send(mensagem);
                log.info("[recuperacao] e-mail entregue ao servidor SMTP");
            } catch (Exception erro) {
                // A requisicao ja respondeu; a falha so pode ficar registrada aqui.
                log.error("[recuperacao] falha ao enviar o e-mail: {}", erro.getMessage());
            }
        });
    }

    @PreDestroy
    void encerrar() {
        fila.shutdown();
    }

    private static String texto(String nome, String link, Instant expiraEm) {
        return """
                Olá, %s.

                Recebemos um pedido para redefinir a senha da sua conta no VidaReal.
                Abra o link abaixo para escolher uma nova senha:

                %s

                O link vale até %s (horário de Brasília) e só pode ser usado uma vez.

                Se você não fez este pedido, ignore este e-mail: sua senha continua a mesma.
                Nunca compartilhe este link com outra pessoa.

                VidaReal - plataforma de educação financeira e transparência
                """.formatted(nome, link, HORARIO.format(expiraEm));
    }

    private static String html(String nome, String link, Instant expiraEm) {
        // O nome foi digitado pelo usuario: vai escapado, para nao virar HTML.
        return """
                <!doctype html>
                <html lang="pt-BR">
                <body style="margin:0;padding:24px;background:#f7f5f2;font-family:Arial,Helvetica,sans-serif;color:#16130f;">
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
                    <tr><td align="center">
                      <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                             style="max-width:520px;background:#ffffff;border:1px solid #e7e2da;border-radius:12px;">
                        <tr><td style="padding:28px 28px 8px 28px;font-size:18px;font-weight:bold;">
                          Vida<span style="color:#e56f00;">Real</span>
                        </td></tr>
                        <tr><td style="padding:8px 28px;font-size:15px;line-height:1.6;">
                          <p style="margin:0 0 12px 0;">Olá, %s.</p>
                          <p style="margin:0 0 20px 0;">Recebemos um pedido para redefinir a senha da sua
                          conta no VidaReal. Clique no botão para escolher uma nova senha.</p>
                          <p style="margin:0 0 20px 0;">
                            <a href="%s" style="display:inline-block;padding:12px 22px;background:#ff8101;
                               color:#16130f;font-weight:bold;text-decoration:none;border-radius:8px;">
                              Redefinir minha senha
                            </a>
                          </p>
                          <p style="margin:0 0 12px 0;font-size:13px;color:#5c554c;">O link vale até %s
                          (horário de Brasília) e só pode ser usado uma vez.</p>
                          <p style="margin:0 0 12px 0;font-size:13px;color:#5c554c;">Se o botão não funcionar,
                          copie este endereço e cole no navegador:<br>
                          <span style="word-break:break-all;">%s</span></p>
                        </td></tr>
                        <tr><td style="padding:16px 28px 24px 28px;border-top:1px solid #e7e2da;font-size:12px;
                                       line-height:1.5;color:#5c554c;">
                          Se você não fez este pedido, ignore este e-mail: sua senha continua a mesma.
                          Nunca compartilhe este link com outra pessoa.
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(HtmlUtils.htmlEscape(nome), link, HORARIO.format(expiraEm), link);
    }
}
