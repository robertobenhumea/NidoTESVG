package com.tesvg.backend.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class CorreoResumenDTO {

    private Long id;
    private Long emisorId;
    private String asunto;
    private String cuerpo;       // preview text (first 200 chars) — matches CorreoItem.cuerpo on frontend
    private LocalDateTime fecha;
    private boolean leido;
    private boolean esFavorito;
    private boolean enPapelera;
    private boolean archivado;
    private boolean tieneAdjuntos;
    private int adjuntosCount;
    private String categoria;
    private String tipo;
    private String prioridad;
    private String etiqueta;
    private Map<String, Object> emisor;
    private List<Map<String, Object>> destinatarios;
    private List<String> destinatarioNombres;
    private List<AdjuntoDTO> adjuntos;
    private Long threadId;
    private int replicasCount;
    private boolean esComunicado;
    private String audiencia;
    private String audienciaCarrera;
    private String audienciaGrupo;

    public Long getId()                       { return id; }
    public void setId(Long id)                { this.id = id; }
    public Long getEmisorId()                 { return emisorId; }
    public void setEmisorId(Long e)           { this.emisorId = e; }
    public String getAsunto()                 { return asunto; }
    public void setAsunto(String a)           { this.asunto = a; }
    public String getCuerpo()                 { return cuerpo; }
    public void setCuerpo(String p)           { this.cuerpo = p; }
    public LocalDateTime getFecha()           { return fecha; }
    public void setFecha(LocalDateTime f)     { this.fecha = f; }
    public boolean isLeido()                  { return leido; }
    public void setLeido(boolean l)           { this.leido = l; }
    public boolean isEsFavorito()             { return esFavorito; }
    public void setEsFavorito(boolean f)      { this.esFavorito = f; }
    public boolean isEnPapelera()             { return enPapelera; }
    public void setEnPapelera(boolean p)      { this.enPapelera = p; }
    public boolean isArchivado()              { return archivado; }
    public void setArchivado(boolean a)       { this.archivado = a; }
    public boolean isTieneAdjuntos()          { return tieneAdjuntos; }
    public void setTieneAdjuntos(boolean t)   { this.tieneAdjuntos = t; }
    public int getAdjuntosCount()             { return adjuntosCount; }
    public void setAdjuntosCount(int c)       { this.adjuntosCount = c; }
    public String getCategoria()              { return categoria; }
    public void setCategoria(String c)        { this.categoria = c; }
    public String getTipo()                   { return tipo; }
    public void setTipo(String t)             { this.tipo = t; }
    public String getPrioridad()              { return prioridad; }
    public void setPrioridad(String p)        { this.prioridad = p; }
    public String getEtiqueta()               { return etiqueta; }
    public void setEtiqueta(String e)         { this.etiqueta = e; }
    public Map<String, Object> getEmisor()    { return emisor; }
    public void setEmisor(Map<String, Object> e) { this.emisor = e; }
    public List<Map<String, Object>> getDestinatarios() { return destinatarios; }
    public void setDestinatarios(List<Map<String, Object>> d) { this.destinatarios = d; }
    public List<String> getDestinatarioNombres() { return destinatarioNombres; }
    public void setDestinatarioNombres(List<String> n) { this.destinatarioNombres = n; }
    public List<AdjuntoDTO> getAdjuntos()     { return adjuntos; }
    public void setAdjuntos(List<AdjuntoDTO> a) { this.adjuntos = a; }
    public Long getThreadId()                 { return threadId; }
    public void setThreadId(Long t)           { this.threadId = t; }
    public int getReplicasCount()                 { return replicasCount; }
    public void setReplicasCount(int r)           { this.replicasCount = r; }
    public boolean isEsComunicado()               { return esComunicado; }
    public void setEsComunicado(boolean e)        { this.esComunicado = e; }
    public String getAudiencia()                  { return audiencia; }
    public void setAudiencia(String a)            { this.audiencia = a; }
    public String getAudienciaCarrera()           { return audienciaCarrera; }
    public void setAudienciaCarrera(String a)     { this.audienciaCarrera = a; }
    public String getAudienciaGrupo()             { return audienciaGrupo; }
    public void setAudienciaGrupo(String a)       { this.audienciaGrupo = a; }
}
