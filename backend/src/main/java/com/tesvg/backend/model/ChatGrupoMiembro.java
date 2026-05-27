package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_grupo_miembros", indexes = {
        @Index(name = "idx_chat_grupo_miembros_grupo", columnList = "grupo_id"),
        @Index(name = "idx_chat_grupo_miembros_usuario", columnList = "usuario_id"),
        @Index(name = "idx_chat_grupo_miembros_grupo_usuario", columnList = "grupo_id, usuario_id")
})
public class ChatGrupoMiembro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "grupo_id", nullable = false)
    private Long grupoId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(nullable = false, length = 20)
    private String rol = "MIEMBRO";

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(nullable = false)
    private Boolean silenciado = false;

    @Column(name = "fecha_union")
    private LocalDateTime fechaUnion;

    @Column(name = "ultima_lectura")
    private LocalDateTime ultimaLectura;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getGrupoId() { return grupoId; }
    public void setGrupoId(Long grupoId) { this.grupoId = grupoId; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    public Boolean getSilenciado() { return silenciado; }
    public void setSilenciado(Boolean silenciado) { this.silenciado = silenciado; }
    public LocalDateTime getFechaUnion() { return fechaUnion; }
    public void setFechaUnion(LocalDateTime fechaUnion) { this.fechaUnion = fechaUnion; }
    public LocalDateTime getUltimaLectura() { return ultimaLectura; }
    public void setUltimaLectura(LocalDateTime ultimaLectura) { this.ultimaLectura = ultimaLectura; }
}
