package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "chat_grupo_mensajes_ocultos",
        uniqueConstraints = @UniqueConstraint(columnNames = {"mensaje_id", "usuario_id"}),
        indexes = {
                @Index(name = "idx_chat_mensajes_ocultos_usuario", columnList = "usuario_id"),
                @Index(name = "idx_chat_mensajes_ocultos_mensaje", columnList = "mensaje_id")
        }
)
public class ChatGrupoMensajeOculto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mensaje_id", nullable = false)
    private Long mensajeId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "fecha")
    private LocalDateTime fecha;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getMensajeId() { return mensajeId; }
    public void setMensajeId(Long mensajeId) { this.mensajeId = mensajeId; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
}
