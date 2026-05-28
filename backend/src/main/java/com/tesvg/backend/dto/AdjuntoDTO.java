package com.tesvg.backend.dto;

import java.time.LocalDateTime;

public class AdjuntoDTO {

    private Long id;
    private String nombreArchivo;
    private String downloadUrl;
    private String tipoArchivo;
    private Long tamanio;
    private LocalDateTime fecha;

    public AdjuntoDTO() {}

    public AdjuntoDTO(Long id, String nombreArchivo, String downloadUrl,
                      String tipoArchivo, Long tamanio, LocalDateTime fecha) {
        this.id            = id;
        this.nombreArchivo = nombreArchivo;
        this.downloadUrl   = downloadUrl;
        this.tipoArchivo   = tipoArchivo;
        this.tamanio       = tamanio;
        this.fecha         = fecha;
    }

    public Long getId()                  { return id; }
    public String getNombreArchivo()     { return nombreArchivo; }
    public String getDownloadUrl()       { return downloadUrl; }
    public String getTipoArchivo()       { return tipoArchivo; }
    public Long getTamanio()             { return tamanio; }
    public LocalDateTime getFecha()      { return fecha; }
}
