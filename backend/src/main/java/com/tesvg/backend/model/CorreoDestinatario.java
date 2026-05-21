package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "correo_destinatarios")
public class CorreoDestinatario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "correo_id", nullable = false)
    private Long correoId;

    @Column(name = "receptor_id", nullable = false)
    private Long receptorId;

    @Column(nullable = false)
    private Boolean leido = false;

    @Column(name = "fecha_lectura")
    private LocalDateTime fechaLectura;

    @Column(name = "es_favorito", nullable = false)
    private Boolean esFavorito = false;

    @Column(name = "etiqueta", length = 50)
    private String etiqueta;

    @Column(name = "en_papelera", nullable = false)
    private Boolean enPapelera = false;

    @Column(name = "archivado", nullable = false, columnDefinition = "boolean default false")
    private Boolean archivado = false;

    @Column(name = "fecha_papelera")
    private LocalDateTime fechaPapelera;

    @Column(name = "leido_en")
    private LocalDateTime leidoEn;

    @Column(name = "notificar_lectura", nullable = false)
    private Boolean notificarLectura = false;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getCorreoId() { return correoId; }
    public void setCorreoId(Long correoId) { this.correoId = correoId; }
    public Long getReceptorId() { return receptorId; }
    public void setReceptorId(Long receptorId) { this.receptorId = receptorId; }
    public Boolean getLeido() { return leido; }
    public void setLeido(Boolean leido) { this.leido = leido; }
    public LocalDateTime getFechaLectura() { return fechaLectura; }
    public void setFechaLectura(LocalDateTime fechaLectura) { this.fechaLectura = fechaLectura; }
    public Boolean getEsFavorito() { return esFavorito; }
    public void setEsFavorito(Boolean esFavorito) { this.esFavorito = esFavorito; }
    public String getEtiqueta() { return etiqueta; }
    public void setEtiqueta(String etiqueta) { this.etiqueta = etiqueta; }
    public Boolean getEnPapelera() { return enPapelera; }
    public void setEnPapelera(Boolean enPapelera) { this.enPapelera = enPapelera; }
    public Boolean getArchivado() { return archivado; }
    public void setArchivado(Boolean archivado) { this.archivado = archivado; }
    public LocalDateTime getFechaPapelera() { return fechaPapelera; }
    public void setFechaPapelera(LocalDateTime fechaPapelera) { this.fechaPapelera = fechaPapelera; }
    public LocalDateTime getLeidoEn() { return leidoEn; }
    public void setLeidoEn(LocalDateTime leidoEn) { this.leidoEn = leidoEn; }
    public Boolean getNotificarLectura() { return notificarLectura; }
    public void setNotificarLectura(Boolean notificarLectura) { this.notificarLectura = notificarLectura; }
}
