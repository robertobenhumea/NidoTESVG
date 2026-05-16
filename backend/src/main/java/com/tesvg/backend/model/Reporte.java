package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reportes")
public class Reporte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long publicacionId;

    @Column(nullable = false)
    private Long reportanteId;

    @Column(nullable = true, length = 500)
    private String razon;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @Column(nullable = false)
    private boolean atendido = false;

    public Long getId()                  { return id; }
    public Long getPublicacionId()       { return publicacionId; }
    public void setPublicacionId(Long v) { this.publicacionId = v; }
    public Long getReportanteId()        { return reportanteId; }
    public void setReportanteId(Long v)  { this.reportanteId = v; }
    public String getRazon()             { return razon; }
    public void setRazon(String v)       { this.razon = v; }
    public LocalDateTime getFecha()      { return fecha; }
    public void setFecha(LocalDateTime v){ this.fecha = v; }
    public boolean isAtendido()          { return atendido; }
    public void setAtendido(boolean v)   { this.atendido = v; }
}
