package com.tesvg.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = true)
    private String username;

    @Column(unique = true, nullable = false)
    private String correo;

    @Column(nullable = false)
    private String password;

    @Column(nullable = true)
    private String grupo;

    @Column(nullable = true)
    private String carrera;

    @Column(nullable = true, length = 500)
    private String bio;

    @Column(name = "foto_perfil", nullable = true)
    private String fotoPerfil;

    @Column(name = "foto_portada")
    private String fotoPortada;

    @Column(length = 100)
    private String ciudad;

    @Column(columnDefinition = "TEXT")
    private String intereses;

    @Column(name = "fecha_nacimiento")
    private java.time.LocalDate fechaNacimiento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Rol rol = Rol.ESTUDIANTE;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(columnDefinition = "TEXT")
    private String preferencias;

    @Column(name = "token_version", nullable = false)
    private int tokenVersion = 0;

    @Column(name = "numero_control", length = 20)
    private String numeroControl;

    @Column(name = "last_seen")
    private java.time.LocalDateTime lastSeen;

    public enum Rol {
        ESTUDIANTE, DOCENTE, AUTORIDAD, ADMINISTRATIVO, PERSONAL, ADMIN, DIRECCION
    }

    // GETTERS Y SETTERS
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getGrupo() { return grupo; }
    public void setGrupo(String grupo) { this.grupo = grupo; }
    public String getCarrera() { return carrera; }
    public void setCarrera(String carrera) { this.carrera = carrera; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getFotoPerfil() { return fotoPerfil; }
    public void setFotoPerfil(String fotoPerfil) { this.fotoPerfil = fotoPerfil; }
    public String getFotoPortada() { return fotoPortada; }
    public void setFotoPortada(String fotoPortada) { this.fotoPortada = fotoPortada; }
    public String getCiudad() { return ciudad; }
    public void setCiudad(String ciudad) { this.ciudad = ciudad; }
    public String getIntereses() { return intereses; }
    public void setIntereses(String intereses) { this.intereses = intereses; }
    public java.time.LocalDate getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(java.time.LocalDate fechaNacimiento) { this.fechaNacimiento = fechaNacimiento; }
    public Rol getRol() { return rol; }
    public void setRol(Rol rol) { this.rol = rol; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
    public String getPreferencias() { return preferencias; }
    public void setPreferencias(String preferencias) { this.preferencias = preferencias; }
    public int getTokenVersion() { return tokenVersion; }
    public void setTokenVersion(int tokenVersion) { this.tokenVersion = tokenVersion; }
    public String getNumeroControl() { return numeroControl; }
    public void setNumeroControl(String numeroControl) { this.numeroControl = numeroControl; }
    public java.time.LocalDateTime getLastSeen() { return lastSeen; }
    public void setLastSeen(java.time.LocalDateTime lastSeen) { this.lastSeen = lastSeen; }
}
