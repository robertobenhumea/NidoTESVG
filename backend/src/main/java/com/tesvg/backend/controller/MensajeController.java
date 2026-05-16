package com.tesvg.backend.controller;

import com.tesvg.backend.model.Mensaje;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.MensajeRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/mensajes")
public class MensajeController {

    @Autowired
    private MensajeRepository mensajeRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @PostMapping("/enviar/{receptorId}")
    public ResponseEntity<?> enviar(@PathVariable Long receptorId,
                                    @RequestBody Map<String, String> body,
                                    HttpServletRequest request) {
        Usuario emisor = getUsuario(request);
        String contenido = body.get("contenido");
        if (contenido == null || contenido.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El mensaje no puede estar vacío"));
        }

        Mensaje m = new Mensaje();
        m.setEmisorId(emisor.getId());
        m.setReceptorId(receptorId);
        m.setContenido(contenido.trim());
        m.setFecha(LocalDateTime.now());
        m.setLeido(false);
        mensajeRepository.save(m);

        return ResponseEntity.ok(m);
    }

    @GetMapping("/conversacion/{otroId}")
    public ResponseEntity<?> conversacion(@PathVariable Long otroId, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        mensajeRepository.marcarLeidos(otroId, yo.getId());
        List<Mensaje> mensajes = mensajeRepository.findConversacion(yo.getId(), otroId);
        return ResponseEntity.ok(mensajes);
    }

    @GetMapping("/conversaciones")
    public ResponseEntity<?> conversaciones(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        List<Mensaje> todos = mensajeRepository.findAllByUsuario(yo.getId());

        // Por cada conversación (unique partner), tomar el mensaje más reciente
        Map<Long, Mensaje> ultimoMensajePorPartner = new LinkedHashMap<>();
        for (Mensaje m : todos) {
            Long partnerId = m.getEmisorId().equals(yo.getId()) ? m.getReceptorId() : m.getEmisorId();
            ultimoMensajePorPartner.putIfAbsent(partnerId, m);
        }

        List<Map<String, Object>> resultado = new ArrayList<>();
        for (Map.Entry<Long, Mensaje> entry : ultimoMensajePorPartner.entrySet()) {
            Long partnerId = entry.getKey();
            Mensaje ultimo = entry.getValue();
            Optional<Usuario> partnerOpt = usuarioRepository.findById(partnerId);
            if (partnerOpt.isEmpty()) continue;
            Usuario partner = partnerOpt.get();

            long noLeidos = mensajeRepository.countByReceptorIdAndEmisorIdAndLeidoFalse(yo.getId(), partnerId);

            Map<String, Object> conv = new LinkedHashMap<>();
            conv.put("partnerId", partner.getId());
            conv.put("partnerNombre", partner.getUsername());
            conv.put("partnerFoto", partner.getFotoPerfil());
            conv.put("ultimoMensaje", ultimo.getContenido());
            conv.put("fecha", ultimo.getFecha());
            conv.put("noLeidos", noLeidos);
            resultado.add(conv);
        }

        return ResponseEntity.ok(resultado);
    }

    @GetMapping("/no-leidos")
    public ResponseEntity<?> noLeidos(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        long total = mensajeRepository.countByReceptorIdAndLeidoFalse(yo.getId());
        return ResponseEntity.ok(Map.of("count", total));
    }

    @PutMapping("/leer/{emisorId}")
    public ResponseEntity<?> marcarLeidos(@PathVariable Long emisorId, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        mensajeRepository.marcarLeidos(emisorId, yo.getId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private Usuario getUsuario(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        return usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }
}
