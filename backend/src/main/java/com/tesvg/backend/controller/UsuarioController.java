package com.tesvg.backend.controller;

import java.util.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

import com.tesvg.backend.model.CodigoRegistro;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.CodigoRegistroRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import com.tesvg.backend.dto.LoginRequest;
import com.tesvg.backend.dto.UsuarioResponse;
import com.tesvg.backend.security.JwtUtil;
import com.tesvg.backend.service.RateLimitService;
import com.tesvg.backend.service.RedisCacheService;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;

@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private CodigoRegistroRepository codigoRepository;
    @Autowired private BCryptPasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private RateLimitService rateLimitService;
    @Autowired private RedisCacheService redisCacheService;

    private Usuario getUsuarioAutenticado(HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        return usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    // ── REGISTRO ────────────────────────────────────────────────────────────────
    @PostMapping("/registro")
    public ResponseEntity<?> registrar(@RequestBody Map<String, Object> body) {
        String correo   = (String) body.get("correo");
        String password = (String) body.get("password");

        if (correo == null || password == null)
            return ResponseEntity.badRequest().body("Datos incompletos");
        if (!correo.toLowerCase().endsWith("@tesvg.edu.mx"))
            return ResponseEntity.badRequest()
                    .body("Solo se permiten correos institucionales @tesvg.edu.mx");
        if (usuarioRepository.findByCorreo(correo).isPresent())
            return ResponseEntity.badRequest().body("Correo ya registrado");

        Usuario usuario = new Usuario();
        usuario.setCorreo(correo.trim());
        usuario.setPassword(passwordEncoder.encode(password));
        usuario.setUsername((String) body.get("username"));
        usuario.setGrupo((String) body.get("grupo"));
        usuario.setCarrera((String) body.get("carrera"));
        usuario.setBio((String) body.get("bio"));
        usuario.setFotoPerfil((String) body.get("fotoPerfil"));

        String codigoAcceso = (String) body.get("codigoAcceso");
        if (codigoAcceso != null && !codigoAcceso.isBlank()) {
            Optional<CodigoRegistro> codigoOpt =
                    codigoRepository.findByCodigoAndActivoTrue(codigoAcceso.trim().toUpperCase());
            if (codigoOpt.isEmpty())
                return ResponseEntity.badRequest().body("Código incorrecto");
            CodigoRegistro codigo = codigoOpt.get();
            if (codigo.getMaxUsos() != null && codigo.getUsos() >= codigo.getMaxUsos())
                return ResponseEntity.badRequest().body("Código agotado");
            usuario.setRol(codigo.getRol());
            codigo.setUsos(codigo.getUsos() + 1);
            codigoRepository.save(codigo);
        }

        return ResponseEntity.ok(UsuarioResponse.from(usuarioRepository.save(usuario)));
    }

    // ── LOGIN ────────────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        if (request.getCorreo() == null || request.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Correo y contraseña son requeridos"));
        }
        String actor = httpRequest.getRemoteAddr() + ":" + request.getCorreo().trim().toLowerCase();
        if (!rateLimitService.allow("login", actor, 10, Duration.ofMinutes(5))) {
            return ResponseEntity.status(429).body(Map.of("error", "Demasiados intentos, intenta de nuevo en unos minutos"));
        }
        Optional<Usuario> usuarioOpt =
                usuarioRepository.findByCorreo(request.getCorreo().trim());
        if (usuarioOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Credenciales incorrectas"));
        Usuario usuario = usuarioOpt.get();
        if (!passwordEncoder.matches(request.getPassword(), usuario.getPassword()))
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Credenciales incorrectas"));
        if (!usuario.isActivo()) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Cuenta desactivada"));
        String token = jwtUtil.generarToken(usuario.getCorreo(), usuario.getTokenVersion());
        return ResponseEntity.ok(Map.of("token", token, "usuario", UsuarioResponse.from(usuario)));
    }

    // ── LISTAR USUARIOS ──────────────────────────────────────────────────────────
    @GetMapping
    public List<UsuarioResponse> listar() {
        return usuarioRepository.findAll().stream().map(UsuarioResponse::from).toList();
    }

    // ── PERFIL PROPIO ────────────────────────────────────────────────────────────
    @GetMapping("/perfil")
    public UsuarioResponse perfil(HttpServletRequest request) {
        return UsuarioResponse.from(getUsuarioAutenticado(request));
    }

    @GetMapping("/me")
    public UsuarioResponse me(HttpServletRequest request) { return perfil(request); }

    // ── ACTUALIZAR PERFIL ────────────────────────────────────────────────────────
    @PutMapping("/perfil")
    public ResponseEntity<?> actualizarPerfil(@RequestBody Map<String, String> body,
                                               HttpServletRequest request) {
        Usuario usuario = getUsuarioAutenticado(request);
        if (body.containsKey("username"))  usuario.setUsername(body.get("username"));
        if (body.containsKey("carrera"))   usuario.setCarrera(body.get("carrera"));
        if (body.containsKey("grupo"))     usuario.setGrupo(body.get("grupo"));
        if (body.containsKey("bio"))       usuario.setBio(body.get("bio"));
        if (body.containsKey("ciudad"))    usuario.setCiudad(body.get("ciudad"));
        if (body.containsKey("intereses")) usuario.setIntereses(body.get("intereses"));
        if (body.containsKey("fechaNacimiento")) {
            String fn = body.get("fechaNacimiento");
            usuario.setFechaNacimiento(fn != null && !fn.isBlank()
                ? java.time.LocalDate.parse(fn) : null);
        }
        Usuario saved = usuarioRepository.save(usuario);
        redisCacheService.deleteByPrefix("suggestions:");
        return ResponseEntity.ok(UsuarioResponse.from(saved));
    }

    // ── PERFIL PÚBLICO ───────────────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> perfilPublico(@PathVariable Long id) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return ResponseEntity.ok(UsuarioResponse.from(u));
    }

    // ── FOTO DE PERFIL ───────────────────────────────────────────────────────────
    @PutMapping("/perfil/foto")
    public ResponseEntity<?> actualizarFoto(@RequestBody Map<String, String> body,
                                             HttpServletRequest request) {
        Usuario usuario = getUsuarioAutenticado(request);
        String url = body.get("url");
        if (url == null || url.trim().isEmpty())
            return ResponseEntity.badRequest().body("URL inválida");
        usuario.setFotoPerfil(url);
        return ResponseEntity.ok(UsuarioResponse.from(usuarioRepository.save(usuario)));
    }

    // ── FOTO DE PORTADA ──────────────────────────────────────────────────────────
    @PutMapping("/perfil/portada")
    public ResponseEntity<?> actualizarPortada(@RequestBody Map<String, String> body,
                                                HttpServletRequest request) {
        Usuario usuario = getUsuarioAutenticado(request);
        String url = body.get("url");
        if (url == null || url.trim().isEmpty())
            return ResponseEntity.badRequest().body("URL inválida");
        usuario.setFotoPortada(url);
        return ResponseEntity.ok(UsuarioResponse.from(usuarioRepository.save(usuario)));
    }

    // ── PREFERENCIAS ─────────────────────────────────────────────────────────────
    @GetMapping("/preferencias")
    public ResponseEntity<String> getPreferencias(HttpServletRequest request) {
        Usuario u = getUsuarioAutenticado(request);
        String prefs = u.getPreferencias();
        return ResponseEntity.ok(prefs != null ? prefs : "{}");
    }

    @PutMapping("/preferencias")
    public ResponseEntity<?> setPreferencias(@RequestBody String body,
                                              HttpServletRequest request) {
        Usuario u = getUsuarioAutenticado(request);
        u.setPreferencias(body);
        usuarioRepository.save(u);
        return ResponseEntity.ok().build();
    }

    // ── CAMBIAR CONTRASEÑA ───────────────────────────────────────────────────────
    @PutMapping("/password")
    public ResponseEntity<?> cambiarPassword(@RequestBody Map<String, String> body,
                                              HttpServletRequest request) {
        Usuario u = getUsuarioAutenticado(request);
        String actual = body.get("actual");
        String nueva  = body.get("nueva");
        if (actual == null || nueva == null)
            return ResponseEntity.badRequest().body("Datos incompletos");
        if (!passwordEncoder.matches(actual, u.getPassword()))
            return ResponseEntity.badRequest().body("Contraseña actual incorrecta");
        if (nueva.length() < 6)
            return ResponseEntity.badRequest().body("La nueva contraseña debe tener al menos 6 caracteres");
        u.setPassword(passwordEncoder.encode(nueva));
        u.setTokenVersion(u.getTokenVersion() + 1); // invalidate all sessions
        usuarioRepository.save(u);
        String token = jwtUtil.generarToken(u.getCorreo(), u.getTokenVersion());
        return ResponseEntity.ok(Map.of("token", token, "nuevoToken", token));
    }

    // ── CERRAR SESIÓN EN TODOS LOS DISPOSITIVOS ──────────────────────────────────
    @PostMapping("/cerrar-sesiones")
    public ResponseEntity<?> cerrarSesiones(HttpServletRequest request) {
        Usuario u = getUsuarioAutenticado(request);
        u.setTokenVersion(u.getTokenVersion() + 1);
        usuarioRepository.save(u);
        String token = jwtUtil.generarToken(u.getCorreo(), u.getTokenVersion());
        return ResponseEntity.ok(Map.of("token", token, "nuevoToken", token));
    }

    // ── ELIMINAR CUENTA ──────────────────────────────────────────────────────────
    @DeleteMapping("/cuenta")
    public ResponseEntity<?> eliminarCuenta(@RequestBody Map<String, String> body,
                                             HttpServletRequest request) {
        Usuario u = getUsuarioAutenticado(request);
        String password = body.get("password");
        if (password == null || !passwordEncoder.matches(password, u.getPassword()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Contraseña incorrecta");
        // Anonymize + deactivate (preserves data integrity with foreign keys)
        u.setActivo(false);
        u.setUsername("Usuario eliminado");
        u.setFotoPerfil(null);
        u.setBio(null);
        u.setPreferencias(null);
        u.setTokenVersion(u.getTokenVersion() + 1);
        usuarioRepository.save(u);
        return ResponseEntity.ok().build();
    }
}
