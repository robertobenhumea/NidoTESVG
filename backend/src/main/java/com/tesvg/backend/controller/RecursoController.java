package com.tesvg.backend.controller;

import com.tesvg.backend.model.Recurso;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.RecursoRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/recursos")
public class RecursoController {

    @Autowired private RecursoRepository recursoRepo;
    @Autowired private UsuarioRepository usuarioRepo;

    @Value("${app.upload.dir}")
    private String uploadDir;

    private static final Set<String> TIPOS_PERMITIDOS = Set.of(
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "application/zip",
        "image/jpeg", "image/png", "image/gif", "image/webp"
    );

    private Usuario getUsuario(HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        return usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private boolean esAdmin(Usuario u) {
        return u.getRol() == Usuario.Rol.AUTORIDAD || u.getRol() == Usuario.Rol.ADMIN;
    }

    private Map<String, Object> toMap(Recurso r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          r.getId());
        m.put("titulo",      r.getTitulo());
        m.put("descripcion", r.getDescripcion());
        m.put("archivoUrl",  r.getArchivoUrl());
        m.put("tipo",        r.getTipo());
        m.put("carrera",     r.getCarrera());
        m.put("materia",     r.getMateria());
        m.put("usuarioId",   r.getUsuarioId());
        m.put("fecha",       r.getFecha());
        m.put("descargas",   r.getDescargas() != null ? r.getDescargas() : 0);
        usuarioRepo.findById(r.getUsuarioId()).ifPresent(u ->
            m.put("autorNombre", u.getUsername() != null ? u.getUsername() : u.getCorreo())
        );
        return m;
    }

    // ── LISTAR / BUSCAR ──────────────────────────────────────────────────────
    @GetMapping
    public List<Map<String, Object>> listar(
            @RequestParam(required = false) String carrera,
            @RequestParam(required = false) String materia,
            @RequestParam(required = false) String tipo) {

        Recurso.Tipo tipoEnum = null;
        if (tipo != null && !tipo.isBlank()) {
            try { tipoEnum = Recurso.Tipo.valueOf(tipo); } catch (Exception ignored) {}
        }

        boolean sinFiltros = (carrera == null || carrera.isBlank())
                          && (materia  == null || materia.isBlank())
                          && tipoEnum == null;

        List<Recurso> lista = sinFiltros
                ? recursoRepo.findAllByOrderByFechaDesc()
                : recursoRepo.buscar(
                    (carrera != null && !carrera.isBlank()) ? carrera : null,
                    (materia  != null && !materia.isBlank())  ? materia  : null,
                    tipoEnum);

        return lista.stream().map(this::toMap).collect(Collectors.toList());
    }

    // ── RECURSOS DE UN USUARIO ──────────────────────────────────────────────
    @GetMapping("/usuario/{id}")
    public List<Map<String, Object>> porUsuario(@PathVariable Long id) {
        return recursoRepo.findByUsuarioIdOrderByFechaDesc(id)
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    // ── SUBIR ARCHIVO ────────────────────────────────────────────────────────
    @PostMapping("/subir-archivo")
    public ResponseEntity<?> subirArchivo(@RequestParam("archivo") MultipartFile archivo,
                                          HttpServletRequest req) {
        if (archivo.isEmpty())
            return ResponseEntity.badRequest().body("No se envió ningún archivo");

        String contentType = archivo.getContentType();
        if (contentType == null || !TIPOS_PERMITIDOS.contains(contentType))
            return ResponseEntity.badRequest().body("Tipo de archivo no permitido");

        if (archivo.getSize() > 10 * 1024 * 1024)
            return ResponseEntity.badRequest().body("El archivo no puede pesar más de 10 MB");

        try {
            Path carpeta = Paths.get(uploadDir);
            if (!Files.exists(carpeta)) Files.createDirectories(carpeta);

            String original  = archivo.getOriginalFilename();
            String extension = (original != null && original.contains("."))
                    ? original.substring(original.lastIndexOf(".") + 1).toLowerCase()
                    : "bin";

            String nombreArchivo = UUID.randomUUID() + "." + extension;
            Files.copy(archivo.getInputStream(), carpeta.resolve(nombreArchivo),
                       StandardCopyOption.REPLACE_EXISTING);

            return ResponseEntity.ok(Map.of("url", "/imagenes/" + nombreArchivo));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error al guardar el archivo");
        }
    }

    // ── CREAR ─────────────────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> body,
                                   HttpServletRequest req) {
        Usuario yo = getUsuario(req);

        String titulo = (String) body.get("titulo");
        if (titulo == null || titulo.isBlank())
            return ResponseEntity.badRequest().body("El título es requerido");

        Recurso r = new Recurso();
        r.setTitulo(titulo.trim());
        r.setDescripcion((String) body.get("descripcion"));
        r.setArchivoUrl((String) body.get("archivoUrl"));
        r.setCarrera((String) body.get("carrera"));
        r.setMateria((String) body.get("materia"));
        r.setUsuarioId(yo.getId());
        r.setFecha(LocalDateTime.now());
        r.setDescargas(0);

        String tipoStr = (String) body.get("tipo");
        try {
            r.setTipo(Recurso.Tipo.valueOf(tipoStr != null ? tipoStr : "apunte"));
        } catch (Exception e) {
            r.setTipo(Recurso.Tipo.apunte);
        }

        return ResponseEntity.ok(toMap(recursoRepo.save(r)));
    }

    // ── REGISTRAR DESCARGA ───────────────────────────────────────────────────
    @PostMapping("/{id}/descargar")
    public ResponseEntity<?> descargar(@PathVariable Long id) {
        return recursoRepo.findById(id).map(r -> {
            r.setDescargas((r.getDescargas() != null ? r.getDescargas() : 0) + 1);
            recursoRepo.save(r);
            return ResponseEntity.ok(Map.of("archivoUrl", r.getArchivoUrl(), "descargas", r.getDescargas()));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── ELIMINAR ─────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id, HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        Recurso r = recursoRepo.findById(id).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();
        if (!r.getUsuarioId().equals(yo.getId()) && !esAdmin(yo))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Sin permiso para eliminar este recurso");
        recursoRepo.delete(r);
        return ResponseEntity.ok().build();
    }
}
