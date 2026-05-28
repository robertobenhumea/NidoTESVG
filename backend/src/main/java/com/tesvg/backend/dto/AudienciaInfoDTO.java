package com.tesvg.backend.dto;

import java.util.List;

public class AudienciaInfoDTO {

    private List<CarreraInfo> carreras;

    public List<CarreraInfo> getCarreras() { return carreras; }
    public void setCarreras(List<CarreraInfo> c) { this.carreras = c; }

    public static class CarreraInfo {
        private String nombre;
        private int totalEstudiantes;
        private int totalDocentes;
        private List<GrupoInfo> grupos;

        public CarreraInfo(String nombre, int totalEstudiantes, int totalDocentes, List<GrupoInfo> grupos) {
            this.nombre = nombre;
            this.totalEstudiantes = totalEstudiantes;
            this.totalDocentes = totalDocentes;
            this.grupos = grupos;
        }

        public String getNombre()            { return nombre; }
        public int getTotalEstudiantes()     { return totalEstudiantes; }
        public int getTotalDocentes()        { return totalDocentes; }
        public List<GrupoInfo> getGrupos()   { return grupos; }
    }

    public static class GrupoInfo {
        private String nombre;
        private int totalEstudiantes;

        public GrupoInfo(String nombre, int totalEstudiantes) {
            this.nombre = nombre;
            this.totalEstudiantes = totalEstudiantes;
        }

        public String getNombre()        { return nombre; }
        public int getTotalEstudiantes() { return totalEstudiantes; }
    }
}
