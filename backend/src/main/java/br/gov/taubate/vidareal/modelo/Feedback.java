package br.gov.taubate.vidareal.modelo;

import java.time.Instant;

/** Avaliacao da experiencia enviada pelo cidadao. */
public class Feedback {

    private final long id;
    private final int rating;
    private final String comentario;
    private final Instant registradoEm;

    public Feedback(long id, int rating, String comentario, Instant registradoEm) {
        this.id = id;
        this.rating = rating;
        this.comentario = comentario;
        this.registradoEm = registradoEm;
    }

    public long getId() {
        return id;
    }

    public int getRating() {
        return rating;
    }

    public String getComentario() {
        return comentario;
    }

    public Instant getRegistradoEm() {
        return registradoEm;
    }
}
