package com.tesvg.backend.dto;

public class BuzonOficialDTO {
    private Long id;
    private String nombre;
    private String alias;
    private String descripcion;
    private String tipo;
    private int miembrosCount;

    public BuzonOficialDTO(Long id, String nombre, String alias, String descripcion, String tipo, int miembrosCount) {
        this.id = id;
        this.nombre = nombre;
        this.alias = alias;
        this.descripcion = descripcion;
        this.tipo = tipo;
        this.miembrosCount = miembrosCount;
    }

    public Long getId()             { return id; }
    public String getNombre()       { return nombre; }
    public String getAlias()        { return alias; }
    public String getDescripcion()  { return descripcion; }
    public String getTipo()         { return tipo; }
    public int getMiembrosCount()   { return miembrosCount; }
}
