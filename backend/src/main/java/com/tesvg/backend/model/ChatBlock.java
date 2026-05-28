package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "chat_blocks",
        uniqueConstraints = @UniqueConstraint(columnNames = {"blocker_id", "blocked_id"}),
        indexes = {
                @Index(name = "idx_chat_blocks_blocker", columnList = "blocker_id"),
                @Index(name = "idx_chat_blocks_blocked", columnList = "blocked_id")
        }
)
public class ChatBlock {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "blocker_id", nullable = false)
    private Long blockerId;

    @Column(name = "blocked_id", nullable = false)
    private Long blockedId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(length = 500)
    private String reason;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getBlockerId() { return blockerId; }
    public void setBlockerId(Long blockerId) { this.blockerId = blockerId; }
    public Long getBlockedId() { return blockedId; }
    public void setBlockedId(Long blockedId) { this.blockedId = blockedId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
