package com.tesvg.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "buzon_miembros", uniqueConstraints = @UniqueConstraint(columnNames = {"buzon_id", "usuario_id"}))
public class BuzonMiembro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "buzon_id", nullable = false)
    private Long buzonId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "es_admin", nullable = false)
    private boolean esAdmin = false;

    public Long getId()               { return id; }
    public void setId(Long id)        { this.id = id; }
    public Long getBuzonId()          { return buzonId; }
    public void setBuzonId(Long b)    { this.buzonId = b; }
    public Long getUsuarioId()        { return usuarioId; }
    public void setUsuarioId(Long u)  { this.usuarioId = u; }
    public boolean isEsAdmin()        { return esAdmin; }
    public void setEsAdmin(boolean e) { this.esAdmin = e; }
}
