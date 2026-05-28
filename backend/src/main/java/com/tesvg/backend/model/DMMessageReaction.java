package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "dm_message_reactions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"message_id", "usuario_id"}),
        indexes = {
                @Index(name = "idx_dm_reactions_message", columnList = "message_id"),
                @Index(name = "idx_dm_reactions_user", columnList = "usuario_id")
        }
)
public class DMMessageReaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id", nullable = false)
    private Long messageId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "reaction_type", nullable = false, length = 20)
    private String reactionType;

    @Column(name = "fecha")
    private LocalDateTime fecha;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getMessageId() { return messageId; }
    public void setMessageId(Long messageId) { this.messageId = messageId; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getReactionType() { return reactionType; }
    public void setReactionType(String reactionType) { this.reactionType = reactionType; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
}
