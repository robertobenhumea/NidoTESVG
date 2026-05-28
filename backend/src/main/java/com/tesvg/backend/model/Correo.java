package com.tesvg.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "correos")
public class Correo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "emisor_id", nullable = false)
    private Long emisorId;

    @Column(nullable = false, length = 255)
    private String asunto;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String cuerpo;

    @Column(name = "cuerpo_html", columnDefinition = "TEXT")
    private String cuerpoHtml;

    private LocalDateTime fecha;

    @Column(name = "es_comunicado", nullable = false)
    private Boolean esComunicado = false;

    @Column(name = "es_borrador", nullable = false)
    private Boolean esBorrador = false;

    @Column(name = "programado_para")
    private LocalDateTime programadoPara;

    @Column(name = "tiene_adjuntos", nullable = false)
    private Boolean tieneAdjuntos = false;

    @Column(nullable = false, length = 40, columnDefinition = "varchar(40) default 'GENERAL'")
    private String categoria = "GENERAL";

    @Column(nullable = false, length = 40, columnDefinition = "varchar(40) default 'PERSONAL'")
    private String tipo = "PERSONAL";

    @Column(name = "referencia_id")
    private Long referenciaId;

    // INDIVIDUAL, CARRERA, GRUPO, TODOS_ACTIVOS, DOCENTES_CARRERA, BUZON
    @Column(length = 30)
    private String audiencia = "INDIVIDUAL";

    @Column(name = "audiencia_carrera", length = 200)
    private String audienciaCarrera;

    @Column(name = "audiencia_grupo", length = 100)
    private String audienciaGrupo;

    @Column(name = "thread_id")
    private Long threadId;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "tipo_accion", length = 20)
    private String tipoAccion;

    @Column(name = "reenviado_de")
    private Long reenviadoDe;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getEmisorId() { return emisorId; }
    public void setEmisorId(Long emisorId) { this.emisorId = emisorId; }
    public String getAsunto() { return asunto; }
    public void setAsunto(String asunto) { this.asunto = asunto; }
    public String getCuerpo() { return cuerpo; }
    public void setCuerpo(String cuerpo) { this.cuerpo = cuerpo; }
    public String getCuerpoHtml() { return cuerpoHtml; }
    public void setCuerpoHtml(String cuerpoHtml) { this.cuerpoHtml = cuerpoHtml; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public Boolean getEsComunicado() { return esComunicado; }
    public void setEsComunicado(Boolean esComunicado) { this.esComunicado = esComunicado; }
    public Boolean getEsBorrador() { return esBorrador; }
    public void setEsBorrador(Boolean esBorrador) { this.esBorrador = esBorrador; }
    public LocalDateTime getProgramadoPara() { return programadoPara; }
    public void setProgramadoPara(LocalDateTime programadoPara) { this.programadoPara = programadoPara; }
    public Boolean getTieneAdjuntos() { return tieneAdjuntos; }
    public void setTieneAdjuntos(Boolean tieneAdjuntos) { this.tieneAdjuntos = tieneAdjuntos; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public Long getReferenciaId() { return referenciaId; }
    public void setReferenciaId(Long referenciaId) { this.referenciaId = referenciaId; }
    public String getAudiencia() { return audiencia; }
    public void setAudiencia(String a) { this.audiencia = a; }
    public String getAudienciaCarrera() { return audienciaCarrera; }
    public void setAudienciaCarrera(String a) { this.audienciaCarrera = a; }
    public String getAudienciaGrupo() { return audienciaGrupo; }
    public void setAudienciaGrupo(String a) { this.audienciaGrupo = a; }
    public Long getThreadId() { return threadId; }
    public void setThreadId(Long threadId) { this.threadId = threadId; }
    public Long getParentId() { return parentId; }
    public void setParentId(Long parentId) { this.parentId = parentId; }
    public String getTipoAccion() { return tipoAccion; }
    public void setTipoAccion(String tipoAccion) { this.tipoAccion = tipoAccion; }
    public Long getReenviadoDe() { return reenviadoDe; }
    public void setReenviadoDe(Long reenviadoDe) { this.reenviadoDe = reenviadoDe; }
}
