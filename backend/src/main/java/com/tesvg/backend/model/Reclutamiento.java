package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "reclutamiento")
public class Reclutamiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "nombre_equipo", length = 120)
    private String nombreEquipo;

    @Column(name = "nombre_proyecto", nullable = false, length = 220)
    private String nombreProyecto;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(columnDefinition = "TEXT")
    private String objetivo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoReclutamiento tipo = TipoReclutamiento.PROYECTO;

    /** Habilidades/roles buscados — stored as comma-separated values. */
    @Column(columnDefinition = "TEXT")
    private String habilidades;

    @Column(name = "integrantes_faltantes", nullable = false)
    private Integer integrantesFaltantes = 1;

    @Column(name = "fecha_limite")
    private LocalDate fechaLimite;

    @Column(name = "imagen_url", columnDefinition = "TEXT")
    private String imagenUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoReclutamiento estado = EstadoReclutamiento.ABIERTO;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @PrePersist
    protected void onCreate() {
        if (fecha == null) fecha = LocalDateTime.now();
    }

    public enum TipoReclutamiento {
        PROYECTO, HACKATHON, INNOVATEC, TORNEO, INVESTIGACION, STARTUP, OTRO
    }

    public enum EstadoReclutamiento {
        ABIERTO, COMPLETO, CERRADO
    }

    // ── Getters / Setters ──
    public Long getId()                            { return id; }
    public void setId(Long id)                     { this.id = id; }
    public Long getUsuarioId()                     { return usuarioId; }
    public void setUsuarioId(Long usuarioId)       { this.usuarioId = usuarioId; }
    public String getNombreEquipo()                { return nombreEquipo; }
    public void setNombreEquipo(String v)          { this.nombreEquipo = v; }
    public String getNombreProyecto()              { return nombreProyecto; }
    public void setNombreProyecto(String v)        { this.nombreProyecto = v; }
    public String getDescripcion()                 { return descripcion; }
    public void setDescripcion(String v)           { this.descripcion = v; }
    public String getObjetivo()                    { return objetivo; }
    public void setObjetivo(String v)              { this.objetivo = v; }
    public TipoReclutamiento getTipo()             { return tipo; }
    public void setTipo(TipoReclutamiento v)       { this.tipo = v; }
    public String getHabilidades()                 { return habilidades; }
    public void setHabilidades(String v)           { this.habilidades = v; }
    public Integer getIntegrantesFaltantes()        { return integrantesFaltantes; }
    public void setIntegrantesFaltantes(Integer v) { this.integrantesFaltantes = v; }
    public LocalDate getFechaLimite()              { return fechaLimite; }
    public void setFechaLimite(LocalDate v)        { this.fechaLimite = v; }
    public String getImagenUrl()                   { return imagenUrl; }
    public void setImagenUrl(String v)             { this.imagenUrl = v; }
    public EstadoReclutamiento getEstado()         { return estado; }
    public void setEstado(EstadoReclutamiento v)   { this.estado = v; }
    public LocalDateTime getFecha()                { return fecha; }
    public void setFecha(LocalDateTime v)          { this.fecha = v; }
}
