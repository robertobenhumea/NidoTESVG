package com.tesvg.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "grupo_publicaciones",
       uniqueConstraints = @UniqueConstraint(columnNames = {"grupo_id", "publicacion_id"}))
public class GrupoPublicacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "grupo_id", nullable = false)
    private Long grupoId;

    @Column(name = "publicacion_id", nullable = false)
    private Long publicacionId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getGrupoId() { return grupoId; }
    public void setGrupoId(Long grupoId) { this.grupoId = grupoId; }
    public Long getPublicacionId() { return publicacionId; }
    public void setPublicacionId(Long publicacionId) { this.publicacionId = publicacionId; }
}
