package br.gov.taubate.vidareal.web.dto;

import jakarta.validation.constraints.NotBlank;

/** Credenciais enviadas na tentativa de login. */
public record LoginRequest(
        @NotBlank(message = "Obrigatório (texto).") String cpf,
        @NotBlank(message = "Obrigatório (texto).") String senha) {
}
