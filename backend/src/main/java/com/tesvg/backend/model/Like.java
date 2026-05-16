package com.tesvg.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "likes",
       uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "publicacion_id"}))
public class Like {

    public enum TipoReaccion { like, love, haha, wow, sad, angry }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "publicacion_id", nullable = false)
    private Long publicacionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "ENUM('like','love','haha','wow','sad','angry') DEFAULT 'like'")
    private TipoReaccion tipo = TipoReaccion.like;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public Long getPublicacionId() { return publicacionId; }
    public void setPublicacionId(Long publicacionId) { this.publicacionId = publicacionId; }
    public TipoReaccion getTipo() { return tipo; }
    public void setTipo(TipoReaccion tipo) { this.tipo = tipo; }
}
