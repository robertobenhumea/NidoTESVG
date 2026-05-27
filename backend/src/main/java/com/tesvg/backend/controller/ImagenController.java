package com.tesvg.backend.controller;

import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.ChatGrupoMensajeRepository;
import com.tesvg.backend.repository.ChatGrupoMiembroRepository;
import com.tesvg.backend.repository.MensajeRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import com.tesvg.backend.service.RateLimitService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/imagenes")
public class ImagenController {

    private static final Logger log = LoggerFactory.getLogger(ImagenController.class);

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Autowired private RateLimitService rateLimitService;
    @Autowired private MensajeRepository mensajeRepository;
    @Autowired private ChatGrupoMensajeRepository chatGrupoMensajeRepository;
    @Autowired private ChatGrupoMiembroRepository chatGrupoMiembroRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    // Subir imagen
    @PostMapping("/subir")
    public ResponseEntity<?> subirImagen(@RequestParam("archivo") MultipartFile archivo,
                                          HttpServletRequest request) {
        String actor = String.valueOf(request.getAttribute("correo"));
        if (!rateLimitService.allow("upload:image", actor, 30, Duration.ofMinutes(1))) {
            return ResponseEntity.status(429).body("Demasiadas subidas, intenta de nuevo en un momento");
        }
        if (archivo.isEmpty()) {
            return ResponseEntity.badRequest().body("No se envió ningún archivo");
        }

        // Validar que sea imagen
        String contentType = archivo.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body("Solo se permiten imágenes");
        }

        // Validar tamaño máximo 5MB
        if (archivo.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body("La imagen no puede pesar más de 5MB");
        }

        try {
            // Crear carpeta si no existe
            Path carpeta = Paths.get(uploadDir);
            if (!Files.exists(carpeta)) {
                Files.createDirectories(carpeta);
            }

            // Generar nombre único
            String extension = obtenerExtension(archivo.getOriginalFilename());
            String nombreArchivo = UUID.randomUUID().toString() + "." + extension;

            // Guardar archivo
            Path destino = carpeta.resolve(nombreArchivo);
            Files.copy(archivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);

            // Devolver URL de acceso
            String url = "/imagenes/" + nombreArchivo;
            return ResponseEntity.ok(Map.of("url", url));

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error al guardar la imagen");
        }
    }

    // Servir imagen
    @GetMapping("/{nombre}")
    public ResponseEntity<Resource> verImagen(@PathVariable String nombre) {
        return servirArchivo(Paths.get(uploadDir).resolve(nombre), nombre);
    }

    // Servir adjunto de mensajes
    @GetMapping("/mensajes/{nombre}")
    public ResponseEntity<?> verAdjuntoMensaje(@PathVariable String nombre, HttpServletRequest request) {
        Usuario usuario = getUsuario(request);
        String archivoUrl = "/imagenes/mensajes/" + nombre;
        var mensaje = mensajeRepository.findFirstByArchivoUrlOrFileUrl(archivoUrl, archivoUrl).orElse(null);
        if (mensaje == null) return ResponseEntity.notFound().build();
        if (!mensaje.getEmisorId().equals(usuario.getId()) && !mensaje.getReceptorId().equals(usuario.getId())) {
            return ResponseEntity.status(403).body("No puedes ver este adjunto");
        }
        return servirArchivo(Paths.get(uploadDir, "mensajes").resolve(nombre), nombre);
    }

    // Servir adjunto de grupos de chat
    @GetMapping("/grupos-chat/{nombre}")
    public ResponseEntity<?> verAdjuntoGrupoChat(@PathVariable String nombre, HttpServletRequest request) {
        Usuario usuario = getUsuario(request);
        String archivoUrl = "/imagenes/grupos-chat/" + nombre;
        var mensaje = chatGrupoMensajeRepository.findFirstByArchivoUrlOrFileUrl(archivoUrl, archivoUrl)
                .or(() -> chatGrupoMensajeRepository.findFirstByAttachmentUrlSuffix(archivoUrl))
                .orElse(null);
        if (mensaje == null) return ResponseEntity.notFound().build();
        if (!chatGrupoMiembroRepository.existsByGrupoIdAndUsuarioIdAndActivoTrue(mensaje.getGrupoId(), usuario.getId())) {
            return ResponseEntity.status(403).body("No puedes ver este adjunto");
        }
        return servirArchivo(Paths.get(uploadDir, "grupos-chat").resolve(nombre), nombre);
    }

    // Servir adjunto de correo (público — thumbnails y descarga directa con fetch+blob desde frontend)
    @GetMapping("/adjuntos/{nombre}")
    public ResponseEntity<?> verAdjunto(@PathVariable String nombre) {
        Path ruta = Paths.get(uploadDir, "adjuntos").resolve(nombre);
        log.info("[imagen/adjunto] GET nombre={} existe={}", nombre, Files.exists(ruta));
        return servirArchivo(ruta, nombre);
    }

    private ResponseEntity<Resource> servirArchivo(Path ruta, String nombre) {
        try {
            Resource recurso = new UrlResource(ruta.toUri());
            if (!recurso.exists()) return ResponseEntity.notFound().build();
            String contentType = Files.probeContentType(ruta);
            if (contentType == null) contentType = "application/octet-stream";
            String disposition = contentType.startsWith("image/") || "application/pdf".equals(contentType)
                    ? "inline"
                    : "attachment";
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + nombre + "\"")
                    .body(recurso);
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private Usuario getUsuario(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        return usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private String obtenerExtension(String nombreOriginal) {
        if (nombreOriginal == null || !nombreOriginal.contains(".")) return "jpg";
        return nombreOriginal.substring(nombreOriginal.lastIndexOf(".") + 1).toLowerCase();
    }
}
