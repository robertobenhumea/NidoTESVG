package com.tesvg.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public class EnviarCorreoRequest {

    @NotBlank(message = "El asunto es obligatorio")
    @Size(max = 255, message = "El asunto no puede superar 255 caracteres")
    private String asunto;

    @NotBlank(message = "El cuerpo es obligatorio")
    @Size(max = 5000, message = "El cuerpo no puede superar 5000 caracteres")
    private String cuerpo;

    private String cuerpoHtml;

    @NotEmpty(message = "Debe haber al menos un destinatario")
    private List<Long> receptorIds;

    private String categoria = "GENERAL";
    private String tipo = "PERSONAL";
    private boolean notificarLectura = false;
    private Long referenciaId;
    private Long borradorId;
    private Long threadId;
    private Long parentId;
    private String tipoAccion;
    private Long reenviadoDe;

    public String getAsunto()              { return asunto; }
    public void setAsunto(String a)        { this.asunto = a; }
    public String getCuerpo()              { return cuerpo; }
    public void setCuerpo(String c)        { this.cuerpo = c; }
    public String getCuerpoHtml()          { return cuerpoHtml; }
    public void setCuerpoHtml(String h)    { this.cuerpoHtml = h; }
    public List<Long> getReceptorIds()     { return receptorIds; }
    public void setReceptorIds(List<Long> r) { this.receptorIds = r; }
    public String getCategoria()           { return categoria; }
    public void setCategoria(String c)     { this.categoria = c; }
    public String getTipo()                { return tipo; }
    public void setTipo(String t)          { this.tipo = t; }
    public boolean isNotificarLectura()    { return notificarLectura; }
    public void setNotificarLectura(boolean n) { this.notificarLectura = n; }
    public Long getReferenciaId()          { return referenciaId; }
    public void setReferenciaId(Long r)    { this.referenciaId = r; }
    public Long getBorradorId()            { return borradorId; }
    public void setBorradorId(Long b)      { this.borradorId = b; }
    public Long getThreadId()              { return threadId; }
    public void setThreadId(Long t)        { this.threadId = t; }
    public Long getParentId()              { return parentId; }
    public void setParentId(Long p)        { this.parentId = p; }
    public String getTipoAccion()          { return tipoAccion; }
    public void setTipoAccion(String t)    { this.tipoAccion = t; }
    public Long getReenviadoDe()           { return reenviadoDe; }
    public void setReenviadoDe(Long r)     { this.reenviadoDe = r; }
}
