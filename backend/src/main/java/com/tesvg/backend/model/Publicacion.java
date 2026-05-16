package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "publicaciones")
public class Publicacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(columnDefinition = "TEXT")
    private String contenido;

    @Column(name = "imagen_url", columnDefinition = "TEXT")
    private String imagenUrl;

    private LocalDateTime fecha;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Tipo tipo = Tipo.texto;

    @Column(name = "video_url", columnDefinition = "TEXT")
    private String videoUrl;

    private Integer duracion;

    @Column(name = "es_anuncio", nullable = false)
    private Boolean esAnuncio = false;

    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean fijada = false;

    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean compartida = false;

    @Column(name = "publicacion_original_id")
    private Long publicacionOriginalId;

    public enum Tipo {
        texto, imagen, video
    }

    // GETTERS Y SETTERS
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getContenido() { return contenido; }
    public void setContenido(String contenido) { this.contenido = contenido; }
    public String getImagenUrl() { return imagenUrl; }
    public void setImagenUrl(String imagenUrl) { this.imagenUrl = imagenUrl; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public Tipo getTipo() { return tipo; }
    public void setTipo(Tipo tipo) { this.tipo = tipo; }
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
    public Integer getDuracion() { return duracion; }
    public void setDuracion(Integer duracion) { this.duracion = duracion; }
    public Boolean getEsAnuncio() { return esAnuncio; }
    public void setEsAnuncio(Boolean esAnuncio) { this.esAnuncio = esAnuncio; }
    public Boolean getFijada() { return fijada; }
    public void setFijada(Boolean fijada) { this.fijada = fijada; }
    public Boolean getCompartida() { return compartida; }
    public void setCompartida(Boolean compartida) { this.compartida = compartida; }
    public Long getPublicacionOriginalId() { return publicacionOriginalId; }
    public void setPublicacionOriginalId(Long publicacionOriginalId) { this.publicacionOriginalId = publicacionOriginalId; }
}