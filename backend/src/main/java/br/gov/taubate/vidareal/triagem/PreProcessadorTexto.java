package br.gov.taubate.vidareal.triagem;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Transforma a descricao de um protocolo nos termos usados pelo
 * classificador (bag-of-words com unigramas e bigramas).
 *
 * <p>Etapas: minusculas, remocao de acentos, numeros reduzidos a um termo
 * unico, descarte de stopwords e reducao simples de plural. Nenhuma etapa
 * depende de acaso ou de recurso externo: o mesmo texto gera sempre os
 * mesmos termos.</p>
 */
public final class PreProcessadorTexto {

    private PreProcessadorTexto() {
    }

    /**
     * Termo extraido do texto.
     *
     * @param chave    forma normalizada, usada na contagem
     * @param original como o cidadao escreveu, usada na explicacao
     * @param bigrama  true quando o termo junta duas palavras vizinhas
     */
    public record Termo(String chave, String original, boolean bigrama) {
    }

    /**
     * Todo numero vira este termo: "R$ 8.000 em 10 meses" passa a ser um
     * padrao reconhecivel, em vez de milhares de valores distintos. Fica em
     * maiusculas para nao colidir com a palavra "num".
     */
    static final String NUMERO = "NUM";

    private static final Pattern PALAVRA = Pattern.compile("\\p{L}+|\\d[\\d.,]*");

    /**
     * Palavras sem valor para distinguir categorias. "nao" fica de fora de
     * proposito: "nao consigo" e "nao carrega" sao sinais fortes de
     * problema tecnico.
     */
    private static final Set<String> STOPWORDS = Set.of(
            "a", "o", "as", "os", "um", "uma", "uns", "umas",
            "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
            "por", "para", "pra", "pro", "com", "e", "ou", "que", "se",
            "ao", "aos", "pelo", "pela", "pelos", "pelas", "num", "numa",
            "eu", "me", "mim", "meu", "minha", "meus", "minhas",
            "ele", "ela", "eles", "elas", "seu", "sua", "seus", "suas",
            "isso", "isto", "esse", "essa", "este", "esta", "esses", "essas",
            "foi", "ser", "sao", "estar", "estou", "tem", "ter", "tenho",
            "ha", "ja", "mais", "muito", "muita", "tambem", "so", "mas",
            "ate", "la", "lhe", "the", "r");

    /** Minusculas e sem acentos: "Não" e "nao" passam a ser a mesma palavra. */
    public static String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        return Normalizer.normalize(texto.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
    }

    /** Unigramas seguidos dos bigramas formados por palavras vizinhas. */
    public static List<Termo> extrair(String texto) {
        List<Termo> unigramas = new ArrayList<>();
        if (texto == null) {
            return unigramas;
        }

        Matcher palavras = PALAVRA.matcher(texto);
        while (palavras.find()) {
            String original = palavras.group();

            if (Character.isDigit(original.charAt(0))) {
                unigramas.add(new Termo(NUMERO, original, false));
                continue;
            }

            String normalizada = normalizar(original);
            if (normalizada.length() < 2 || STOPWORDS.contains(normalizada)) {
                continue;
            }
            unigramas.add(new Termo(singular(normalizada), original.toLowerCase(Locale.ROOT), false));
        }

        List<Termo> termos = new ArrayList<>(unigramas);
        for (int i = 0; i + 1 < unigramas.size(); i++) {
            Termo primeiro = unigramas.get(i);
            Termo segundo = unigramas.get(i + 1);
            termos.add(new Termo(primeiro.chave() + " " + segundo.chave(),
                    primeiro.original() + " " + segundo.original(), true));
        }
        return termos;
    }

    /**
     * Reducao de plural por regras de sufixo. Nao e um stemmer completo:
     * basta para "metas"/"meta", "meses"/"mes" e "valores"/"valor" contarem
     * como o mesmo termo.
     */
    static String singular(String palavra) {
        if (palavra.length() <= 3 || !palavra.endsWith("s")) {
            return palavra;
        }
        if (palavra.endsWith("oes") || palavra.endsWith("aes")) {
            return palavra.substring(0, palavra.length() - 3) + "ao";
        }
        if (palavra.endsWith("eses") || palavra.endsWith("res") || palavra.endsWith("zes")) {
            return palavra.substring(0, palavra.length() - 2);
        }
        if (palavra.endsWith("ns")) {
            return palavra.substring(0, palavra.length() - 2) + "m";
        }
        return palavra.substring(0, palavra.length() - 1);
    }
}
