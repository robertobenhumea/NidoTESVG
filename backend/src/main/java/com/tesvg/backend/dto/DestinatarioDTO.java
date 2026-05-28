package com.tesvg.backend.dto;

import java.time.LocalDateTime;
import java.util.Map;

public class DestinatarioDTO {

    private Long receptorId;
    private Map<String, Object> usuario;
    private boolean leido;
    private LocalDateTime fechaLectura;
    private boolean esFavorito;
    private String etiqueta;
    private boolean archivado;

    public DestinatarioDTO() {}

    public Long getReceptorId()            { return receptorId; }
    public void setReceptorId(Long id)     { this.receptorId = id; }
    public Map<String, Object> getUsuario() { return usuario; }
    public void setUsuario(Map<String, Object> u) { this.usuario = u; }
    public boolean isLeido()               { return leido; }
    public void setLeido(boolean l)        { this.leido = l; }
    public LocalDateTime getFechaLectura() { return fechaLectura; }
    public void setFechaLectura(LocalDateTime f) { this.fechaLectura = f; }
    public boolean isEsFavorito()          { return esFavorito; }
    public void setEsFavorito(boolean f)   { this.esFavorito = f; }
    public String getEtiqueta()            { return etiqueta; }
    public void setEtiqueta(String e)      { this.etiqueta = e; }
    public boolean isArchivado()           { return archivado; }
    public void setArchivado(boolean a)    { this.archivado = a; }
}
