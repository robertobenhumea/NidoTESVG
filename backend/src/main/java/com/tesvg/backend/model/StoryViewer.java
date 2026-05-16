package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "story_viewers",
       uniqueConstraints = @UniqueConstraint(columnNames = {"story_id", "usuario_id"}))
public class StoryViewer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "story_id", nullable = false)
    private Long storyId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "visto_en")
    private LocalDateTime vistoEn;

    public Long getId() { return id; }
    public Long getStoryId() { return storyId; }
    public void setStoryId(Long storyId) { this.storyId = storyId; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public LocalDateTime getVistoEn() { return vistoEn; }
    public void setVistoEn(LocalDateTime vistoEn) { this.vistoEn = vistoEn; }
}
