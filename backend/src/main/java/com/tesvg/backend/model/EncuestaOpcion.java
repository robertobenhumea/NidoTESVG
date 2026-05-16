package com.tesvg.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "encuesta_opciones")
public class EncuestaOpcion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "encuesta_id", nullable = false)
    private Long encuestaId;

    @Column(nullable = false, length = 100)
    private String texto;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getEncuestaId() { return encuestaId; }
    public void setEncuestaId(Long encuestaId) { this.encuestaId = encuestaId; }
    public String getTexto() { return texto; }
    public void setTexto(String texto) { this.texto = texto; }
}
