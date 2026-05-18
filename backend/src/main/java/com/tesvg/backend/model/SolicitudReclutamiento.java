package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "solicitud_reclutamiento",
    uniqueConstraints = @UniqueConstraint(columnNames = {"reclutamiento_id", "usuario_id"})
)
public class SolicitudReclutamiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reclutamiento_id", nullable = false)
    private Long reclutamientoId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(columnDefinition = "TEXT")
    private String mensaje;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoSolicitud estado = EstadoSolicitud.PENDIENTE;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @PrePersist
    protected void onCreate() {
        if (fecha == null) fecha = LocalDateTime.now();
    }

    public enum EstadoSolicitud {
        PENDIENTE, ACEPTADA, RECHAZADA
    }

    // ── Getters / Setters ──
    public Long getId()                           { return id; }
    public void setId(Long id)                    { this.id = id; }
    public Long getReclutamientoId()              { return reclutamientoId; }
    public void setReclutamientoId(Long v)        { this.reclutamientoId = v; }
    public Long getUsuarioId()                    { return usuarioId; }
    public void setUsuarioId(Long v)              { this.usuarioId = v; }
    public String getMensaje()                    { return mensaje; }
    public void setMensaje(String v)              { this.mensaje = v; }
    public EstadoSolicitud getEstado()            { return estado; }
    public void setEstado(EstadoSolicitud v)      { this.estado = v; }
    public LocalDateTime getFecha()               { return fecha; }
    public void setFecha(LocalDateTime v)         { this.fecha = v; }
}
