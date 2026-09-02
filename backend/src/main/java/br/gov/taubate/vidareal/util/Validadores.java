package br.gov.taubate.vidareal.util;

/**
 * Validacao e sanitizacao de entradas.
 *
 * <p>Regra de ouro: o servidor nunca confia no cliente. Qualquer pessoa
 * pode chamar a API por curl ou Postman, ignorando as validacoes do
 * front-end.</p>
 */
public final class Validadores {

    private Validadores() {
    }

    /** Remove tags HTML e caracteres de controle, e limita o tamanho. */
    public static String sanitizar(String valor, int tamanhoMaximo) {
        if (valor == null) {
            return "";
        }
        String limpo = valor
                .replaceAll("<[^>]*>", "")
                .replaceAll("\\p{Cntrl}", " ")
                .trim();
        return limpo.length() > tamanhoMaximo ? limpo.substring(0, tamanhoMaximo) : limpo;
    }

    public static String apenasDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }

    /** Valida o CPF pelos digitos verificadores. */
    public static boolean cpfValido(String cpf) {
        String digitos = apenasDigitos(cpf);

        if (digitos.length() != 11 || digitos.chars().distinct().count() == 1) {
            return false;
        }

        int primeiro = calcularDigito(digitos.substring(0, 9), 10);
        int segundo = calcularDigito(digitos.substring(0, 10), 11);

        return primeiro == Character.getNumericValue(digitos.charAt(9))
                && segundo == Character.getNumericValue(digitos.charAt(10));
    }

    private static int calcularDigito(String base, int pesoInicial) {
        int soma = 0;
        for (int i = 0; i < base.length(); i++) {
            soma += Character.getNumericValue(base.charAt(i)) * (pesoInicial - i);
        }
        int resto = (soma * 10) % 11;
        return resto == 10 ? 0 : resto;
    }
}
