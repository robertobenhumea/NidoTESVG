package com.tesvg.backend.controller;

import com.tesvg.backend.model.CorreoAdjunto;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.CorreoAdjuntoRepository;
import com.tesvg.backend.service.CorreoAccessService;
import jakarta.servlet.http.HttpServletRequest;
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
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/imagenes")
public class ImagenController {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Autowired private CorreoAdjuntoRepository adjuntoRepository;
    @Autowired private CorreoAccessService correoAccessService;

    // Subir imagen
    @PostMapping("/subir")
    public ResponseEntity<?> subirImagen(@RequestParam("archivo") MultipartFile archivo,
                                          HttpServletRequest request) {
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

    // Servir adjunto de correo
    @GetMapping("/adjuntos/{nombre}")
    public ResponseEntity<?> verAdjunto(@PathVariable String nombre, HttpServletRequest request) {
        Usuario usuario = correoAccessService.getUsuario(request);
        String archivoUrl = "/imagenes/adjuntos/" + nombre;
        CorreoAdjunto adjunto = adjuntoRepository.findByArchivoUrl(archivoUrl).orElse(null);
        if (adjunto == null) return ResponseEntity.notFound().build();
        if (!correoAccessService.puedeVerCorreo(adjunto.getCorreoId(), usuario.getId())) {
            return ResponseEntity.status(403).body("No puedes ver este adjunto");
        }
        return servirArchivo(Paths.get(uploadDir, "adjuntos").resolve(nombre), nombre);
    }

    private ResponseEntity<Resource> servirArchivo(Path ruta, String nombre) {
        try {
            Resource recurso = new UrlResource(ruta.toUri());
            if (!recurso.exists()) return ResponseEntity.notFound().build();
            String contentType = Files.probeContentType(ruta);
            if (contentType == null) contentType = "application/octet-stream";
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombre + "\"")
                    .body(recurso);
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private String obtenerExtension(String nombreOriginal) {
        if (nombreOriginal == null || !nombreOriginal.contains(".")) return "jpg";
        return nombreOriginal.substring(nombreOriginal.lastIndexOf(".") + 1).toLowerCase();
    }
}
