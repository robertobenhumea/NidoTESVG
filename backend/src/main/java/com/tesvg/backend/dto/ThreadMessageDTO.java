package com.tesvg.backend.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class ThreadMessageDTO {

    private Long id;
    private Long emisorId;
    private String asunto;
    private String cuerpo;
    private String cuerpoHtml;
    private LocalDateTime fecha;
    private String tipoAccion;
    private Long threadId;
    private Long parentId;
    private Map<String, Object> emisor;
    private List<AdjuntoDTO> adjuntos;

    public Long getId()                          { return id; }
    public void setId(Long id)                   { this.id = id; }
    public Long getEmisorId()                    { return emisorId; }
    public void setEmisorId(Long e)              { this.emisorId = e; }
    public String getAsunto()                    { return asunto; }
    public void setAsunto(String a)              { this.asunto = a; }
    public String getCuerpo()                    { return cuerpo; }
    public void setCuerpo(String c)              { this.cuerpo = c; }
    public String getCuerpoHtml()                { return cuerpoHtml; }
    public void setCuerpoHtml(String h)          { this.cuerpoHtml = h; }
    public LocalDateTime getFecha()              { return fecha; }
    public void setFecha(LocalDateTime f)        { this.fecha = f; }
    public String getTipoAccion()                { return tipoAccion; }
    public void setTipoAccion(String t)          { this.tipoAccion = t; }
    public Long getThreadId()                    { return threadId; }
    public void setThreadId(Long t)              { this.threadId = t; }
    public Long getParentId()                    { return parentId; }
    public void setParentId(Long p)              { this.parentId = p; }
    public Map<String, Object> getEmisor()       { return emisor; }
    public void setEmisor(Map<String, Object> e) { this.emisor = e; }
    public List<AdjuntoDTO> getAdjuntos()        { return adjuntos; }
    public void setAdjuntos(List<AdjuntoDTO> a)  { this.adjuntos = a; }
}
