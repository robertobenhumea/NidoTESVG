package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "dm_message_hidden",
        uniqueConstraints = @UniqueConstraint(columnNames = {"message_id", "usuario_id"}),
        indexes = {
                @Index(name = "idx_dm_hidden_user", columnList = "usuario_id"),
                @Index(name = "idx_dm_hidden_message", columnList = "message_id")
        }
)
public class DMMessageHidden {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id", nullable = false)
    private Long messageId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "hidden_at")
    private LocalDateTime hiddenAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getMessageId() { return messageId; }
    public void setMessageId(Long messageId) { this.messageId = messageId; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public LocalDateTime getHiddenAt() { return hiddenAt; }
    public void setHiddenAt(LocalDateTime hiddenAt) { this.hiddenAt = hiddenAt; }
}
