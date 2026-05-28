package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "dm_conversation_preferences",
        uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "partner_id"}),
        indexes = @Index(name = "idx_dm_pref_user", columnList = "usuario_id")
)
public class DMConversationPreference {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @Column(name = "archived", nullable = false)
    private Boolean archived = false;

    @Column(name = "muted", nullable = false)
    private Boolean muted = false;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public Long getPartnerId() { return partnerId; }
    public void setPartnerId(Long partnerId) { this.partnerId = partnerId; }
    public Boolean getArchived() { return archived; }
    public void setArchived(Boolean archived) { this.archived = archived; }
    public Boolean getMuted() { return muted; }
    public void setMuted(Boolean muted) { this.muted = muted; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
