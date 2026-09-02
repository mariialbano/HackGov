package br.gov.taubate.vidareal.web.dto;

import java.util.List;

/** Envelope padrao das listagens: os itens e o bloco de paginacao. */
public record Pagina<T>(List<T> dados, Paginacao paginacao) {

    public record Paginacao(int pagina, int limite, int total, int totalPaginas) {
    }

    public static <T> Pagina<T> de(List<T> todos, int pagina, int limite) {
        int total = todos.size();
        int inicio = Math.min((pagina - 1) * limite, total);
        int fim = Math.min(inicio + limite, total);
        int totalPaginas = Math.max(1, (int) Math.ceil((double) total / limite));
        return new Pagina<>(todos.subList(inicio, fim),
                new Paginacao(pagina, limite, total, totalPaginas));
    }
}
