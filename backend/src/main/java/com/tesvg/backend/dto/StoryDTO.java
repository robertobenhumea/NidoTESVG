package com.tesvg.backend.dto;

public class StoryDTO {
    private Long id;
    private String imagenUrl;
    private String texto;
    private String colorFondo;
    private String fecha;

    public StoryDTO(Long id, String imagenUrl, String texto, String colorFondo, String fecha) {
        this.id = id;
        this.imagenUrl = imagenUrl;
        this.texto = texto;
        this.colorFondo = colorFondo;
        this.fecha = fecha;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getImagenUrl() { return imagenUrl; }
    public void setImagenUrl(String imagenUrl) { this.imagenUrl = imagenUrl; }

    public String getTexto() { return texto; }
    public void setTexto(String texto) { this.texto = texto; }

    public String getColorFondo() { return colorFondo; }
    public void setColorFondo(String colorFondo) { this.colorFondo = colorFondo; }

    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }
}
