package com.tesvg.backend.controller;

import com.tesvg.backend.model.*;
import com.tesvg.backend.repository.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/encuestas")
public class EncuestaController {

    @Autowired private EncuestaRepository encuestaRepo;
    @Autowired private EncuestaOpcionRepository opcionRepo;
    @Autowired private EncuestaVotoRepository votoRepo;
    @Autowired private UsuarioRepository usuarioRepo;

    private Usuario getUsuario(HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        return usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    // Construye el mapa de una encuesta con opciones + conteos
    private Map<String, Object> buildEncuestaMap(Encuesta enc) {
        List<EncuestaOpcion> opciones = opcionRepo.findByEncuestaId(enc.getId());
        int total = opciones.stream().mapToInt(op -> votoRepo.countByOpcionId(op.getId())).sum();
        List<Map<String, Object>> opcionMaps = opciones.stream().map(op -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",    op.getId());
            m.put("texto", op.getTexto());
            m.put("votos", votoRepo.countByOpcionId(op.getId()));
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",           enc.getId());
        m.put("publicacionId", enc.getPublicacionId());
        m.put("pregunta",     enc.getPregunta());
        m.put("expiraEn",     enc.getExpiraEn());
        m.put("opciones",     opcionMaps);
        m.put("totalVotos",   total);
        boolean expirada = enc.getExpiraEn() != null && enc.getExpiraEn().isBefore(LocalDateTime.now());
        m.put("expirada",     expirada);
        return m;
    }

    // ── CREAR ENCUESTA ───────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> body,
                                   HttpServletRequest req) {
        getUsuario(req); // solo verificar auth

        Long pubId = body.get("publicacionId") instanceof Number n ? n.longValue() : null;
        String pregunta = (String) body.get("pregunta");
        if (pubId == null || pregunta == null || pregunta.isBlank()) {
            return ResponseEntity.badRequest().body("publicacionId y pregunta son requeridos");
        }

        @SuppressWarnings("unchecked")
        List<String> textos = (List<String>) body.get("opciones");
        if (textos == null || textos.size() < 2) {
            return ResponseEntity.badRequest().body("Se requieren al menos 2 opciones");
        }
        if (textos.size() > 4) {
            return ResponseEntity.badRequest().body("Máximo 4 opciones");
        }

        Encuesta enc = new Encuesta();
        enc.setPublicacionId(pubId);
        enc.setPregunta(pregunta.trim());
        String expStr = (String) body.get("expiraEn");
        if (expStr != null && !expStr.isBlank()) {
            try { enc.setExpiraEn(LocalDateTime.parse(expStr)); } catch (DateTimeParseException ignored) {}
        }
        Encuesta guardada = encuestaRepo.save(enc);

        textos.stream()
              .filter(t -> t != null && !t.isBlank())
              .forEach(t -> {
                  EncuestaOpcion op = new EncuestaOpcion();
                  op.setEncuestaId(guardada.getId());
                  op.setTexto(t.trim());
                  opcionRepo.save(op);
              });

        return ResponseEntity.ok(buildEncuestaMap(guardada));
    }

    // ── TODAS LAS ENCUESTAS (para el feed) ──────────────────────────────────
    // Devuelve Map<publicacionId, encuesta>
    @GetMapping("/todas")
    public Map<Long, Map<String, Object>> todas() {
        return encuestaRepo.findAll().stream()
                .collect(Collectors.toMap(
                        Encuesta::getPublicacionId,
                        this::buildEncuestaMap
                ));
    }

    // ── MIS VOTOS (para el feed) ─────────────────────────────────────────────
    // Devuelve Map<encuestaId, opcionId>
    @GetMapping("/mis-votos")
    public Map<Long, Long> misVotos(HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        return votoRepo.findByUsuarioId(yo.getId()).stream()
                .collect(Collectors.toMap(EncuestaVoto::getEncuestaId, EncuestaVoto::getOpcionId));
    }

    // ── VOTAR ────────────────────────────────────────────────────────────────
    @PostMapping("/votar/{opcionId}")
    public ResponseEntity<?> votar(@PathVariable Long opcionId,
                                   @RequestBody Map<String, Object> body,
                                   HttpServletRequest req) {
        Usuario yo = getUsuario(req);

        EncuestaOpcion opcion = opcionRepo.findById(opcionId).orElse(null);
        if (opcion == null) return ResponseEntity.notFound().build();

        Long encuestaId = opcion.getEncuestaId();
        Encuesta enc = encuestaRepo.findById(encuestaId).orElse(null);
        if (enc == null) return ResponseEntity.notFound().build();

        // Verificar expiración
        if (enc.getExpiraEn() != null && enc.getExpiraEn().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.GONE).body("La encuesta ha expirado");
        }

        // Ya votó?
        if (votoRepo.findByEncuestaIdAndUsuarioId(encuestaId, yo.getId()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Ya votaste en esta encuesta");
        }

        EncuestaVoto voto = new EncuestaVoto();
        voto.setOpcionId(opcionId);
        voto.setEncuestaId(encuestaId);
        voto.setUsuarioId(yo.getId());
        voto.setFecha(LocalDateTime.now());
        votoRepo.save(voto);

        return ResponseEntity.ok(buildEncuestaMap(enc));
    }
}
