package com.tesvg.backend.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class CorreoDetalleDTO {

    private Long id;
    private Long emisorId;
    private String asunto;
    private String cuerpo;
    private String cuerpoHtml;
    private LocalDateTime fecha;
    private boolean esComunicado;
    private boolean esBorrador;
    private LocalDateTime programadoPara;
    private boolean tieneAdjuntos;
    private String categoria;
    private String tipo;
    private String prioridad;
    private Long referenciaId;

    private boolean leido;
    private boolean esFavorito;
    private boolean enPapelera;
    private boolean archivado;
    private String etiqueta;

    private Map<String, Object> emisor;
    private List<DestinatarioDTO> destinatarios;
    private List<String> destinatarioNombres;
    private List<AdjuntoDTO> adjuntos;
    private Map<String, Object> referencia;

    private String tipoAccion;
    private Long threadId;
    private Long parentId;
    private int replicasCount;
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
    public void setCuerpo(String c)           { this.cuerpo = c; }
    public String getCuerpoHtml()             { return cuerpoHtml; }
    public void setCuerpoHtml(String h)       { this.cuerpoHtml = h; }
    public LocalDateTime getFecha()           { return fecha; }
    public void setFecha(LocalDateTime f)     { this.fecha = f; }
    public boolean isEsComunicado()           { return esComunicado; }
    public void setEsComunicado(boolean e)    { this.esComunicado = e; }
    public boolean isEsBorrador()             { return esBorrador; }
    public void setEsBorrador(boolean b)      { this.esBorrador = b; }
    public LocalDateTime getProgramadoPara()  { return programadoPara; }
    public void setProgramadoPara(LocalDateTime p) { this.programadoPara = p; }
    public boolean isTieneAdjuntos()          { return tieneAdjuntos; }
    public void setTieneAdjuntos(boolean t)   { this.tieneAdjuntos = t; }
    public String getCategoria()              { return categoria; }
    public void setCategoria(String c)        { this.categoria = c; }
    public String getTipo()                   { return tipo; }
    public void setTipo(String t)             { this.tipo = t; }
    public String getPrioridad()              { return prioridad; }
    public void setPrioridad(String p)        { this.prioridad = p; }
    public Long getReferenciaId()             { return referenciaId; }
    public void setReferenciaId(Long r)       { this.referenciaId = r; }
    public boolean isLeido()                  { return leido; }
    public void setLeido(boolean l)           { this.leido = l; }
    public boolean isEsFavorito()             { return esFavorito; }
    public void setEsFavorito(boolean f)      { this.esFavorito = f; }
    public boolean isEnPapelera()             { return enPapelera; }
    public void setEnPapelera(boolean p)      { this.enPapelera = p; }
    public boolean isArchivado()              { return archivado; }
    public void setArchivado(boolean a)       { this.archivado = a; }
    public String getEtiqueta()               { return etiqueta; }
    public void setEtiqueta(String e)         { this.etiqueta = e; }
    public Map<String, Object> getEmisor()    { return emisor; }
    public void setEmisor(Map<String, Object> e) { this.emisor = e; }
    public List<DestinatarioDTO> getDestinatarios() { return destinatarios; }
    public void setDestinatarios(List<DestinatarioDTO> d) { this.destinatarios = d; }
    public List<String> getDestinatarioNombres() { return destinatarioNombres; }
    public void setDestinatarioNombres(List<String> n) { this.destinatarioNombres = n; }
    public List<AdjuntoDTO> getAdjuntos()     { return adjuntos; }
    public void setAdjuntos(List<AdjuntoDTO> a) { this.adjuntos = a; }
    public Map<String, Object> getReferencia() { return referencia; }
    public void setReferencia(Map<String, Object> r) { this.referencia = r; }
    public String getTipoAccion()              { return tipoAccion; }
    public void setTipoAccion(String t)        { this.tipoAccion = t; }
    public Long getThreadId()                  { return threadId; }
    public void setThreadId(Long t)            { this.threadId = t; }
    public Long getParentId()                  { return parentId; }
    public void setParentId(Long p)            { this.parentId = p; }
    public int getReplicasCount()              { return replicasCount; }
    public void setReplicasCount(int r)        { this.replicasCount = r; }
    public String getAudiencia()               { return audiencia; }
    public void setAudiencia(String a)         { this.audiencia = a; }
    public String getAudienciaCarrera()        { return audienciaCarrera; }
    public void setAudienciaCarrera(String a)  { this.audienciaCarrera = a; }
    public String getAudienciaGrupo()          { return audienciaGrupo; }
    public void setAudienciaGrupo(String a)    { this.audienciaGrupo = a; }
}
