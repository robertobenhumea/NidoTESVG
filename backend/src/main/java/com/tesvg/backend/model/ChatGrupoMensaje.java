package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_grupo_mensajes", indexes = {
        @Index(name = "idx_chat_grupo_mensajes_grupo_fecha", columnList = "grupo_id, fecha"),
        @Index(name = "idx_chat_grupo_mensajes_grupo_id", columnList = "grupo_id, id"),
        @Index(name = "idx_chat_grupo_mensajes_emisor", columnList = "emisor_id")
})
public class ChatGrupoMensaje {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "grupo_id", nullable = false)
    private Long grupoId;

    @Column(name = "emisor_id", nullable = false)
    private Long emisorId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String contenido;

    @Column(nullable = false, length = 20)
    private String tipo = "TEXT";

    @Column(name = "message_type", length = 20)
    private String messageType = "TEXT";

    @Column(name = "archivo_url", columnDefinition = "TEXT")
    private String archivoUrl;

    @Column(name = "nombre_archivo", length = 255)
    private String nombreArchivo;

    @Column(name = "file_url", columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_type", length = 120)
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "waveform_data", columnDefinition = "TEXT")
    private String waveformData;

    @Column(nullable = false)
    private Boolean eliminado = false;

    @Column(name = "referencia_id")
    private Long referenciaId;

    @Column(name = "es_sistema", nullable = false)
    private Boolean esSistema = false;

    @Column(name = "editado", nullable = false)
    private Boolean editado = false;

    @Column(name = "reenviado", nullable = false)
    private Boolean reenviado = false;

    @Column(name = "mensaje_original_id")
    private Long mensajeOriginalId;

    private LocalDateTime fecha;

    @Column(name = "actualizado_en")
    private LocalDateTime actualizadoEn;

    @PrePersist
    public void prePersist() {
        if (fecha == null) fecha = LocalDateTime.now();
        if (contenido == null) contenido = "";
        if (tipo == null || tipo.isBlank()) tipo = "TEXT";
        if (messageType == null || messageType.isBlank()) messageType = tipo;
        if (eliminado == null) eliminado = false;
        if (esSistema == null) esSistema = false;
        if (editado == null) editado = false;
        if (reenviado == null) reenviado = false;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getGrupoId() { return grupoId; }
    public void setGrupoId(Long grupoId) { this.grupoId = grupoId; }
    public Long getEmisorId() { return emisorId; }
    public void setEmisorId(Long emisorId) { this.emisorId = emisorId; }
    public String getContenido() { return contenido; }
    public void setContenido(String contenido) { this.contenido = contenido; }
    public String getTipo() { return messageType != null ? messageType : tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; this.messageType = tipo; }
    public String getMessageType() { return getTipo(); }
    public void setMessageType(String messageType) { this.messageType = messageType; this.tipo = messageType; }
    public String getArchivoUrl() { return fileUrl != null ? fileUrl : archivoUrl; }
    public void setArchivoUrl(String archivoUrl) { this.archivoUrl = archivoUrl; this.fileUrl = archivoUrl; }
    public String getNombreArchivo() { return fileName != null ? fileName : nombreArchivo; }
    public void setNombreArchivo(String nombreArchivo) { this.nombreArchivo = nombreArchivo; this.fileName = nombreArchivo; }
    public String getFileUrl() { return getArchivoUrl(); }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; this.archivoUrl = fileUrl; }
    public String getFileName() { return getNombreArchivo(); }
    public void setFileName(String fileName) { this.fileName = fileName; this.nombreArchivo = fileName; }
    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }
    public String getWaveformData() { return waveformData; }
    public void setWaveformData(String waveformData) { this.waveformData = waveformData; }
    public Boolean getEliminado() { return eliminado; }
    public void setEliminado(Boolean eliminado) { this.eliminado = eliminado; }
    public Long getReferenciaId() { return referenciaId; }
    public void setReferenciaId(Long referenciaId) { this.referenciaId = referenciaId; }
    public Boolean getEsSistema() { return esSistema; }
    public void setEsSistema(Boolean esSistema) { this.esSistema = esSistema; }
    public Boolean getEditado() { return editado; }
    public void setEditado(Boolean editado) { this.editado = editado; }
    public Boolean getReenviado() { return reenviado; }
    public void setReenviado(Boolean reenviado) { this.reenviado = reenviado; }
    public Long getMensajeOriginalId() { return mensajeOriginalId; }
    public void setMensajeOriginalId(Long mensajeOriginalId) { this.mensajeOriginalId = mensajeOriginalId; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public LocalDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(LocalDateTime actualizadoEn) { this.actualizadoEn = actualizadoEn; }
}
