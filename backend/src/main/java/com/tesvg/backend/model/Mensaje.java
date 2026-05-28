package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mensajes")
public class Mensaje {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "emisor_id", nullable = false)
    private Long emisorId;

    @Column(name = "receptor_id", nullable = false)
    private Long receptorId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String contenido;

    private LocalDateTime fecha;

    private Boolean leido = false;

    @Column(name = "tipo", nullable = false, length = 20)
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

    @Column(name = "eliminado", nullable = false)
    private Boolean eliminado = false;

    @Column(name = "referencia_id")
    private Long referenciaId;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "status", length = 20)
    private String status = "SENT";

    @Column(name = "editado", nullable = false)
    private Boolean editado = false;

    @Column(name = "actualizado_en")
    private LocalDateTime actualizadoEn;

    @Column(name = "reenviado", nullable = false)
    private Boolean reenviado = false;

    @Column(name = "mensaje_original_id")
    private Long mensajeOriginalId;

    @Column(name = "pinned", nullable = false)
    private Boolean pinned = false;

    @Column(name = "pinned_by")
    private Long pinnedBy;

    @Column(name = "pinned_at")
    private LocalDateTime pinnedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getEmisorId() { return emisorId; }
    public void setEmisorId(Long emisorId) { this.emisorId = emisorId; }
    public Long getReceptorId() { return receptorId; }
    public void setReceptorId(Long receptorId) { this.receptorId = receptorId; }
    public String getContenido() { return contenido; }
    public void setContenido(String contenido) { this.contenido = contenido; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public Boolean getLeido() { return leido; }
    public void setLeido(Boolean leido) { this.leido = leido; }
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
    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }
    public LocalDateTime getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(LocalDateTime deliveredAt) { this.deliveredAt = deliveredAt; }
    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Boolean getEditado() { return editado; }
    public void setEditado(Boolean editado) { this.editado = editado; }
    public LocalDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(LocalDateTime actualizadoEn) { this.actualizadoEn = actualizadoEn; }
    public Boolean getReenviado() { return reenviado; }
    public void setReenviado(Boolean reenviado) { this.reenviado = reenviado; }
    public Long getMensajeOriginalId() { return mensajeOriginalId; }
    public void setMensajeOriginalId(Long mensajeOriginalId) { this.mensajeOriginalId = mensajeOriginalId; }
    public Boolean getPinned() { return pinned; }
    public void setPinned(Boolean pinned) { this.pinned = pinned; }
    public Long getPinnedBy() { return pinnedBy; }
    public void setPinnedBy(Long pinnedBy) { this.pinnedBy = pinnedBy; }
    public LocalDateTime getPinnedAt() { return pinnedAt; }
    public void setPinnedAt(LocalDateTime pinnedAt) { this.pinnedAt = pinnedAt; }
}
