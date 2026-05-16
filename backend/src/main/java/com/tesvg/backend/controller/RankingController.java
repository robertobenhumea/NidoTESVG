package com.tesvg.backend.controller;

import com.tesvg.backend.model.Publicacion;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/ranking")
public class RankingController {

    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private SeguidorRepository seguidorRepo;
    @Autowired private PublicacionRepository publicacionRepo;
    @Autowired private LikeRepository likeRepo;
    @Autowired private UsuarioInsigniaRepository usuarioInsigniaRepo;

    @GetMapping
    public ResponseEntity<?> ranking(
            @RequestParam(defaultValue = "seguidores") String tipo,
            @RequestParam(defaultValue = "20") int limit,
            HttpServletRequest req) {

        String correo = (String) req.getAttribute("correo");
        Usuario yo = usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Set<Long> siguiendoIds = seguidorRepo.findBySeguidorId(yo.getId())
                .stream().map(s -> s.getSeguidoId()).collect(Collectors.toSet());

        List<Map<String, Object>> result = usuarioRepo.findAll().stream()
                .filter(Usuario::isActivo)
                .map(u -> buildEntry(u, tipo, yo.getId(), siguiendoIds))
                .sorted((a, b) -> Long.compare((long) b.get("valor"), (long) a.get("valor")))
                .limit(limit)
                .collect(Collectors.toList());

        for (int i = 0; i < result.size(); i++) {
            result.get(i).put("rank", i + 1);
        }

        return ResponseEntity.ok(result);
    }

    private Map<String, Object> buildEntry(Usuario u, String tipo,
                                            Long miId, Set<Long> siguiendoIds) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",         u.getId());
        m.put("username",   u.getUsername() != null ? u.getUsername() : u.getCorreo().split("@")[0]);
        m.put("carrera",    u.getCarrera());
        m.put("grupo",      u.getGrupo());
        m.put("fotoPerfil", u.getFotoPerfil());
        m.put("rol",        u.getRol());
        m.put("esMioCuenta", u.getId().equals(miId));
        m.put("siguiendo",  siguiendoIds.contains(u.getId()));

        long valor = switch (tipo) {
            case "publicaciones" -> publicacionRepo.countByUsuarioId(u.getId());
            case "likes" -> {
                List<Publicacion> pubs = publicacionRepo.findByUsuarioId(u.getId());
                yield pubs.stream().mapToLong(p -> likeRepo.countByPublicacionId(p.getId())).sum();
            }
            case "insignias" -> usuarioInsigniaRepo.findByUsuarioId(u.getId()).size();
            default -> seguidorRepo.countBySeguidoId(u.getId());
        };

        m.put("valor", valor);
        return m;
    }
}
