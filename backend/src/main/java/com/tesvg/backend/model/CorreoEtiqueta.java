package com.tesvg.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "correo_etiquetas",
       uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "nombre"}))
public class CorreoEtiqueta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(nullable = false, length = 50)
    private String nombre;

    @Column(length = 20)
    private String color = "#F5A623";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
}
