package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "comentario_reacciones",
    uniqueConstraints = @UniqueConstraint(columnNames = {"comentario_id", "usuario_id"})
)
public class ComentarioReaccion {

    public enum TipoReaccion { ME_GUSTA, ME_ENCANTA, ME_DIVIERTE, ME_SORPRENDE, ME_ENTRISTECE, ME_ENOJA }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "comentario_id", nullable = false)
    private Long comentarioId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoReaccion tipo = TipoReaccion.ME_GUSTA;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getComentarioId() { return comentarioId; }
    public void setComentarioId(Long comentarioId) { this.comentarioId = comentarioId; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public TipoReaccion getTipo() { return tipo; }
    public void setTipo(TipoReaccion tipo) { this.tipo = tipo; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
