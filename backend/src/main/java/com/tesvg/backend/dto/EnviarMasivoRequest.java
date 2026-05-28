package com.tesvg.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class EnviarMasivoRequest {

    @NotBlank(message = "El asunto es obligatorio")
    @Size(max = 255)
    private String asunto;

    @NotBlank(message = "El cuerpo es obligatorio")
    @Size(max = 5000)
    private String cuerpo;

    private String cuerpoHtml;

    // CARRERA | GRUPO | DOCENTES_CARRERA | TODOS_ACTIVOS
    @NotBlank(message = "La audiencia es obligatoria")
    private String audiencia;

    private String carrera;
    private String grupo;

    private String categoria = "GENERAL";
    private String tipo      = "PERSONAL";
    private boolean esComunicado = false;
    private String prioridad = "NORMAL";

    public String getAsunto()              { return asunto; }
    public void setAsunto(String a)        { this.asunto = a; }
    public String getCuerpo()              { return cuerpo; }
    public void setCuerpo(String c)        { this.cuerpo = c; }
    public String getCuerpoHtml()          { return cuerpoHtml; }
    public void setCuerpoHtml(String h)    { this.cuerpoHtml = h; }
    public String getAudiencia()           { return audiencia; }
    public void setAudiencia(String a)     { this.audiencia = a; }
    public String getCarrera()             { return carrera; }
    public void setCarrera(String c)       { this.carrera = c; }
    public String getGrupo()               { return grupo; }
    public void setGrupo(String g)         { this.grupo = g; }
    public String getCategoria()           { return categoria; }
    public void setCategoria(String c)     { this.categoria = c; }
    public String getTipo()                { return tipo; }
    public void setTipo(String t)          { this.tipo = t; }
    public boolean isEsComunicado()        { return esComunicado; }
    public void setEsComunicado(boolean e) { this.esComunicado = e; }
    public String getPrioridad()           { return prioridad; }
    public void setPrioridad(String p)     { this.prioridad = p; }
}
