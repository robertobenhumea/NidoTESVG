package com.tesvg.backend.dto;

import java.util.List;

public class CreateDestacadoRequest {
    private String nombre;
    private String emoji;
    private String coverImageUrl;
    private String coverColor;
    private boolean publico = true;
    private List<Long> historiaIds;

    public CreateDestacadoRequest() {}

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getEmoji() { return emoji; }
    public void setEmoji(String emoji) { this.emoji = emoji; }

    public String getCoverImageUrl() { return coverImageUrl; }
    public void setCoverImageUrl(String coverImageUrl) { this.coverImageUrl = coverImageUrl; }

    public String getCoverColor() { return coverColor; }
    public void setCoverColor(String coverColor) { this.coverColor = coverColor; }

    public boolean isPublico() { return publico; }
    public void setPublico(boolean publico) { this.publico = publico; }

    public List<Long> getHistoriaIds() { return historiaIds; }
    public void setHistoriaIds(List<Long> historiaIds) { this.historiaIds = historiaIds; }
}
