package com.tesvg.backend.dto;

import com.tesvg.backend.model.Usuario;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class UsuarioResponse {
    private Long id;
    private String username;
    private String correo;
    private String grupo;
    private String carrera;
    private String bio;
    private String fotoPerfil;
    private String fotoPortada;
    private String ciudad;
    private String intereses;
    private LocalDate fechaNacimiento;
    private Usuario.Rol rol;
    private boolean activo;
    private LocalDateTime lastSeen;

    public static UsuarioResponse from(Usuario u) {
        UsuarioResponse r = new UsuarioResponse();
        r.id = u.getId();
        r.username = u.getUsername();
        r.correo = u.getCorreo();
        r.grupo = u.getGrupo();
        r.carrera = u.getCarrera();
        r.bio = u.getBio();
        r.fotoPerfil = u.getFotoPerfil();
        r.fotoPortada = u.getFotoPortada();
        r.ciudad = u.getCiudad();
        r.intereses = u.getIntereses();
        r.fechaNacimiento = u.getFechaNacimiento();
        r.rol = u.getRol();
        r.activo = u.isActivo();
        r.lastSeen = u.getLastSeen();
        return r;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getCorreo() { return correo; }
    public String getGrupo() { return grupo; }
    public String getCarrera() { return carrera; }
    public String getBio() { return bio; }
    public String getFotoPerfil() { return fotoPerfil; }
    public String getFotoPortada() { return fotoPortada; }
    public String getCiudad() { return ciudad; }
    public String getIntereses() { return intereses; }
    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    public Usuario.Rol getRol() { return rol; }
    public boolean isActivo() { return activo; }
    public LocalDateTime getLastSeen() { return lastSeen; }
}
