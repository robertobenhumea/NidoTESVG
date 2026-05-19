package com.tesvg.backend.dto;

import java.util.List;

public class DestacadoDTO {
    private Long id;
    private String nombre;
    private String emoji;
    private String coverImageUrl;
    private String coverColor;
    private Integer orden;
    private boolean publico;
    private int historiaCount;
    private List<StoryDTO> historias;

    public DestacadoDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getEmoji() { return emoji; }
    public void setEmoji(String emoji) { this.emoji = emoji; }

    public String getCoverImageUrl() { return coverImageUrl; }
    public void setCoverImageUrl(String coverImageUrl) { this.coverImageUrl = coverImageUrl; }

    public String getCoverColor() { return coverColor; }
    public void setCoverColor(String coverColor) { this.coverColor = coverColor; }

    public Integer getOrden() { return orden; }
    public void setOrden(Integer orden) { this.orden = orden; }

    public boolean isPublico() { return publico; }
    public void setPublico(boolean publico) { this.publico = publico; }

    public int getHistoriaCount() { return historiaCount; }
    public void setHistoriaCount(int historiaCount) { this.historiaCount = historiaCount; }

    public List<StoryDTO> getHistorias() { return historias; }
    public void setHistorias(List<StoryDTO> historias) { this.historias = historias; }
}
