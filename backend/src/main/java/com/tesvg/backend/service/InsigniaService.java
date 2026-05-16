package com.tesvg.backend.service;

import com.tesvg.backend.model.Insignia;
import com.tesvg.backend.model.Publicacion;
import com.tesvg.backend.model.UsuarioInsignia;
import com.tesvg.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class InsigniaService {

    @Autowired private InsigniaRepository insigniaRepo;
    @Autowired private UsuarioInsigniaRepository usuarioInsigniaRepo;
    @Autowired private PublicacionRepository publicacionRepo;
    @Autowired private SeguidorRepository seguidorRepo;
    @Autowired private LikeRepository likeRepo;
    @Autowired private ComentarioRepository comentarioRepo;

    // ── SEED default badge catalog if empty ─────────────────────────────────
    public void seedIfEmpty() {
        if (insigniaRepo.count() > 0) return;

        List<Object[]> defaults = new ArrayList<>();
        // {nombre, descripcion, icono, tipo, umbral}
        defaults.add(new Object[]{"Primer Paso",       "Publicaste por primera vez",         "🌱", Insignia.Tipo.publicaciones,  1});
        defaults.add(new Object[]{"Escritor",          "Alcanzaste 5 publicaciones",          "✍️", Insignia.Tipo.publicaciones,  5});
        defaults.add(new Object[]{"Bloguero",          "Alcanzaste 10 publicaciones",         "📝", Insignia.Tipo.publicaciones, 10});
        defaults.add(new Object[]{"Creador Activo",    "Alcanzaste 25 publicaciones",         "🏆", Insignia.Tipo.publicaciones, 25});
        defaults.add(new Object[]{"Influencer",        "Alcanzaste 50 publicaciones",         "🌟", Insignia.Tipo.publicaciones, 50});

        defaults.add(new Object[]{"Primera Conexión",  "Alguien comenzó a seguirte",          "🤝", Insignia.Tipo.seguidores,     1});
        defaults.add(new Object[]{"Popular",           "Tienes 10 seguidores",                "👥", Insignia.Tipo.seguidores,    10});
        defaults.add(new Object[]{"Estrella Campus",   "Tienes 25 seguidores",                "⭐", Insignia.Tipo.seguidores,    25});
        defaults.add(new Object[]{"Celebridad TESVG",  "Tienes 50 seguidores",                "💫", Insignia.Tipo.seguidores,    50});

        defaults.add(new Object[]{"Querido",           "Tus publicaciones recibieron 10 likes",  "❤️",  Insignia.Tipo.likes,    10});
        defaults.add(new Object[]{"En Tendencia",      "Tus publicaciones recibieron 50 likes",  "🔥",  Insignia.Tipo.likes,    50});
        defaults.add(new Object[]{"Rey del Feed",      "Tus publicaciones recibieron 100 likes", "👑",  Insignia.Tipo.likes,   100});

        defaults.add(new Object[]{"Conversador",       "Recibiste 5 comentarios en tus posts",   "💬",  Insignia.Tipo.comentarios,  5});
        defaults.add(new Object[]{"Debatiente",        "Recibiste 25 comentarios en tus posts",  "🗣️", Insignia.Tipo.comentarios, 25});
        defaults.add(new Object[]{"Vocero",            "Recibiste 50 comentarios en tus posts",  "📣",  Insignia.Tipo.comentarios, 50});

        for (Object[] d : defaults) {
            Insignia i = new Insignia();
            i.setNombre((String)  d[0]);
            i.setDescripcion((String) d[1]);
            i.setIcono((String)   d[2]);
            i.setTipo((Insignia.Tipo) d[3]);
            i.setUmbral((Integer) d[4]);
            insigniaRepo.save(i);
        }
    }

    // ── STATS for a user ─────────────────────────────────────────────────────
    public Map<String, Integer> getEstadisticas(Long userId) {
        int posts      = publicacionRepo.countByUsuarioId(userId);
        int seguidores = seguidorRepo.countBySeguidoId(userId);
        int likes      = likesRecibidos(userId);
        int comentarios = comentariosRecibidos(userId);
        return Map.of(
            "publicaciones", posts,
            "seguidores",    seguidores,
            "likes",         likes,
            "comentarios",   comentarios
        );
    }

    private int likesRecibidos(Long userId) {
        return publicacionRepo.findByUsuarioId(userId).stream()
                .mapToInt(p -> likeRepo.countByPublicacionId(p.getId()))
                .sum();
    }

    private int comentariosRecibidos(Long userId) {
        return publicacionRepo.findByUsuarioId(userId).stream()
                .mapToInt(p -> comentarioRepo.findByPublicacionIdOrderByFechaAsc(p.getId()).size())
                .sum();
    }

    // ── EVALUATE & award badges ──────────────────────────────────────────────
    public List<Insignia> evaluar(Long userId) {
        seedIfEmpty();

        Map<String, Integer> stats = getEstadisticas(userId);
        List<Insignia> todasInsignias = insigniaRepo.findAll();
        List<Insignia> nuevas = new ArrayList<>();

        for (Insignia ins : todasInsignias) {
            if (ins.getUmbral() == null) continue;
            if (usuarioInsigniaRepo.existsByUsuarioIdAndInsigniaId(userId, ins.getId())) continue;

            int stat = switch (ins.getTipo()) {
                case publicaciones -> stats.get("publicaciones");
                case seguidores    -> stats.get("seguidores");
                case likes         -> stats.get("likes");
                case comentarios   -> stats.get("comentarios");
                default            -> 0;
            };

            if (stat >= ins.getUmbral()) {
                UsuarioInsignia ui = new UsuarioInsignia();
                ui.setUsuarioId(userId);
                ui.setInsigniaId(ins.getId());
                ui.setFecha(LocalDateTime.now());
                usuarioInsigniaRepo.save(ui);
                nuevas.add(ins);
            }
        }
        return nuevas;
    }
}
