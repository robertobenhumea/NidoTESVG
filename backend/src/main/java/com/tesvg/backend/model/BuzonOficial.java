package com.tesvg.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "buzones_oficiales")
public class BuzonOficial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, length = 60, unique = true)
    private String alias;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    // COORDINACION, DIRECCION, SERVICIOS, ACADEMICO, ADMINISTRATIVO
    @Column(nullable = false, length = 30)
    private String tipo = "COORDINACION";

    // Fallback rol when no explicit members: AUTORIDAD, DIRECCION, ADMINISTRATIVO, DOCENTE
    @Column(name = "receptor_rol", length = 30)
    private String receptorRol = "AUTORIDAD";

    @Column(nullable = false)
    private boolean activo = true;

    public Long getId()                  { return id; }
    public void setId(Long id)           { this.id = id; }
    public String getNombre()            { return nombre; }
    public void setNombre(String n)      { this.nombre = n; }
    public String getAlias()             { return alias; }
    public void setAlias(String a)       { this.alias = a; }
    public String getDescripcion()       { return descripcion; }
    public void setDescripcion(String d) { this.descripcion = d; }
    public String getTipo()              { return tipo; }
    public void setTipo(String t)        { this.tipo = t; }
    public String getReceptorRol()       { return receptorRol; }
    public void setReceptorRol(String r) { this.receptorRol = r; }
    public boolean isActivo()            { return activo; }
    public void setActivo(boolean a)     { this.activo = a; }
}
