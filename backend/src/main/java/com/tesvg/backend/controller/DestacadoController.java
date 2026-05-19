package com.tesvg.backend.controller;

import com.tesvg.backend.dto.CreateDestacadoRequest;
import com.tesvg.backend.dto.DestacadoDTO;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.UsuarioRepository;
import com.tesvg.backend.service.DestacadoService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/destacados")
public class DestacadoController {

    @Autowired private DestacadoService destacadoService;
    @Autowired private UsuarioRepository usuarioRepository;

    private Usuario getAuthUser(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        return usuarioRepository.findByCorreo(correo)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    /** Ver destacados de alguien. Si es el propio perfil o admin → todos; si no → solo públicos. */
    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<List<DestacadoDTO>> getByUsuario(
        @PathVariable Long usuarioId,
        HttpServletRequest request
    ) {
        Usuario authUser = getAuthUser(request);
        boolean soloPublicos = !authUser.getId().equals(usuarioId);
        return ResponseEntity.ok(destacadoService.getDestacados(usuarioId, soloPublicos));
    }

    /** Mis destacados (todos, incluyendo privados). */
    @GetMapping("/me")
    public ResponseEntity<List<DestacadoDTO>> getMios(HttpServletRequest request) {
        Usuario authUser = getAuthUser(request);
        return ResponseEntity.ok(destacadoService.getDestacados(authUser.getId(), false));
    }

    /** Crear nuevo destacado. */
    @PostMapping
    public ResponseEntity<?> crear(
        @RequestBody CreateDestacadoRequest body,
        HttpServletRequest request
    ) {
        try {
            Usuario authUser = getAuthUser(request);
            return ResponseEntity.ok(destacadoService.createDestacado(authUser.getId(), body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("mensaje", "Error al crear el destacado: " + e.getMessage()));
        }
    }

    /** Editar destacado existente. */
    @PutMapping("/{id}")
    public ResponseEntity<DestacadoDTO> editar(
        @PathVariable Long id,
        @RequestBody CreateDestacadoRequest body,
        HttpServletRequest request
    ) {
        Usuario authUser = getAuthUser(request);
        try {
            return ResponseEntity.ok(destacadoService.updateDestacado(id, authUser.getId(), body));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        }
    }

    /** Eliminar destacado. */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(
        @PathVariable Long id,
        HttpServletRequest request
    ) {
        Usuario authUser = getAuthUser(request);
        try {
            destacadoService.deleteDestacado(id, authUser.getId());
            return ResponseEntity.ok(Map.of("mensaje", "Destacado eliminado"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        }
    }

    /** Agregar historia a un destacado. */
    @PostMapping("/{id}/historias/{historiaId}")
    public ResponseEntity<DestacadoDTO> addHistoria(
        @PathVariable Long id,
        @PathVariable Long historiaId,
        HttpServletRequest request
    ) {
        Usuario authUser = getAuthUser(request);
        try {
            return ResponseEntity.ok(destacadoService.addHistoria(id, historiaId, authUser.getId()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        }
    }

    /** Quitar historia de un destacado. */
    @DeleteMapping("/{id}/historias/{historiaId}")
    public ResponseEntity<DestacadoDTO> removeHistoria(
        @PathVariable Long id,
        @PathVariable Long historiaId,
        HttpServletRequest request
    ) {
        Usuario authUser = getAuthUser(request);
        try {
            return ResponseEntity.ok(destacadoService.removeHistoria(id, historiaId, authUser.getId()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        }
    }

    /** Reordenar destacados. Body: lista de IDs en nuevo orden. */
    @PutMapping("/reorder")
    public ResponseEntity<?> reorder(
        @RequestBody List<Long> ordenIds,
        HttpServletRequest request
    ) {
        Usuario authUser = getAuthUser(request);
        destacadoService.reorderDestacados(authUser.getId(), ordenIds);
        return ResponseEntity.ok(Map.of("mensaje", "Orden actualizado"));
    }
}
