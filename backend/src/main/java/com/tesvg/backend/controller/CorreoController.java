package com.tesvg.backend.controller;

import com.tesvg.backend.model.*;
import com.tesvg.backend.repository.*;
import com.tesvg.backend.service.CorreoAccessService;
import com.tesvg.backend.service.HtmlSanitizerService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/correos")
public class CorreoController {

    @Autowired private CorreoRepository correoRepository;
    @Autowired private CorreoDestinatarioRepository destRepository;
    @Autowired private CorreoAdjuntoRepository adjuntoRepository;
    @Autowired private CorreoEtiquetaRepository etiquetaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private HtmlSanitizerService htmlSanitizerService;
    @Autowired private CorreoAccessService correoAccessService;
    @Autowired(required = false) private SimpMessagingTemplate messagingTemplate;

    private final Map<Long, Deque<LocalDateTime>> envioRateLimit = new ConcurrentHashMap<>();
    private static final int MAX_ENVIOS_POR_MINUTO = 20;

    @Value("${app.upload.dir}")
    private String uploadDir;

    // ── BANDEJA DE ENTRADA ──
    @GetMapping("/entrada")
    public ResponseEntity<?> bandeja(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        List<Correo> correos = correoRepository.findBandejaEntrada(yo.getId());
        return ResponseEntity.ok(enriquecer(correos, yo.getId()));
    }

    // ── ENVIADOS ──
    @GetMapping("/enviados")
    public ResponseEntity<?> enviados(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        List<Correo> correos = correoRepository.findByEmisorIdOrderByFechaDesc(yo.getId());
        return ResponseEntity.ok(enriquecerEnviados(correos));
    }

    // ── BORRADORES ──
    @GetMapping("/borradores")
    public ResponseEntity<?> borradores(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        List<Correo> correos = correoRepository.findBorradores(yo.getId());
        return ResponseEntity.ok(correos.stream().map(this::correoToMap).toList());
    }

    // ── FAVORITOS ──
    @GetMapping("/favoritos")
    public ResponseEntity<?> favoritos(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        List<Correo> correos = correoRepository.findFavoritos(yo.getId());
        return ResponseEntity.ok(enriquecer(correos, yo.getId()));
    }

    // ── NO LEÍDOS ──
    @GetMapping("/no-leidos/lista")
    public ResponseEntity<?> listaNoLeidos(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        List<Correo> correos = correoRepository.findNoLeidos(yo.getId());
        return ResponseEntity.ok(enriquecer(correos, yo.getId()));
    }

    // ── ARCHIVADOS ──
    @GetMapping("/archivados")
    public ResponseEntity<?> archivados(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        List<Correo> correos = correoRepository.findArchivados(yo.getId());
        return ResponseEntity.ok(enriquecer(correos, yo.getId()));
    }

    // ── PAPELERA ──
    @GetMapping("/papelera")
    public ResponseEntity<?> papelera(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        List<Correo> correos = correoRepository.findPapelera(yo.getId());
        return ResponseEntity.ok(enriquecer(correos, yo.getId()));
    }

    // ── POR ETIQUETA ──
    @GetMapping("/etiqueta/{nombre}")
    public ResponseEntity<?> porEtiqueta(@PathVariable String nombre, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        List<Correo> correos = correoRepository.findByEtiqueta(yo.getId(), nombre);
        return ResponseEntity.ok(enriquecer(correos, yo.getId()));
    }

    // ── COMUNICADOS ──
    @GetMapping("/comunicados")
    public ResponseEntity<?> comunicados() {
        List<Correo> correos = correoRepository.findComunicados();
        return ResponseEntity.ok(enriquecerEnviados(correos));
    }

    // ── NO LEÍDOS ──
    @GetMapping("/no-leidos")
    public ResponseEntity<?> noLeidos(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        long count = destRepository.countNoLeidosBandeja(yo.getId());
        return ResponseEntity.ok(Map.of("count", count));
    }

    // ── BUSCAR ──
    @GetMapping("/buscar")
    public ResponseEntity<?> buscar(@RequestParam String q, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        String like = "%" + q.toLowerCase() + "%";
        List<Map<String, Object>> entrada = enriquecer(correoRepository.buscarEntrada(yo.getId(), like), yo.getId());
        List<Map<String, Object>> enviados = enriquecerEnviados(correoRepository.buscarEnviados(yo.getId(), like));
        return ResponseEntity.ok(Map.of("entrada", entrada, "enviados", enviados));
    }

    // ── VER CORREO (marca leído) ──
    @GetMapping("/{id}")
    public ResponseEntity<?> ver(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Correo correo = correoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Correo no encontrado"));

        boolean esEmisor = correo.getEmisorId().equals(yo.getId());
        Optional<CorreoDestinatario> dest = destRepository.findByCorreoIdAndReceptorId(id, yo.getId());

        if (!esEmisor && dest.isEmpty()) {
            return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado"));
        }

        if (dest.isPresent() && !dest.get().getLeido()) {
            destRepository.marcarLeido(id, yo.getId());
        }

        List<CorreoDestinatario> destinatarios = destRepository.findByCorreoId(id);
        Map<String, Object> resultado = correoToMap(correo);
        resultado.put("destinatarios", destinatarios.stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("receptorId", d.getReceptorId());
            usuarioRepository.findById(d.getReceptorId()).ifPresent(u -> {
                m.put("nombre", u.getUsername());
                m.put("fotoPerfil", u.getFotoPerfil());
            });
            m.put("leido", d.getLeido());
            m.put("fechaLectura", d.getFechaLectura());
            m.put("esFavorito", d.getEsFavorito());
            m.put("etiqueta", d.getEtiqueta());
            m.put("archivado", d.getArchivado());
            return m;
        }).toList());

        usuarioRepository.findById(correo.getEmisorId()).ifPresent(e -> {
            resultado.put("emisorNombre", e.getUsername());
            resultado.put("emisorFoto", e.getFotoPerfil());
            resultado.put("emisorRol", e.getRol());
        });

        dest.ifPresent(d -> {
            resultado.put("esFavorito", d.getEsFavorito());
            resultado.put("etiqueta", d.getEtiqueta());
            resultado.put("enPapelera", d.getEnPapelera());
            resultado.put("archivado", d.getArchivado());
        });

        List<Map<String, Object>> adjuntos = adjuntoRepository.findByCorreoId(id).stream()
                .map(a -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", a.getId());
                    m.put("nombreArchivo", a.getNombreArchivo());
                    m.put("archivoUrl", a.getArchivoUrl());
                    m.put("tipoArchivo", a.getTipoArchivo());
                    m.put("tamanio", a.getTamanio());
                    return m;
                }).toList();
        resultado.put("adjuntos", adjuntos);

        if (correo.getReferenciaId() != null) {
            correoRepository.findById(correo.getReferenciaId()).ifPresent(ref -> {
                Map<String, Object> refMap = new LinkedHashMap<>();
                refMap.put("id", ref.getId());
                refMap.put("asunto", ref.getAsunto());
                refMap.put("cuerpo", ref.getCuerpo());
                refMap.put("fecha", ref.getFecha());
                usuarioRepository.findById(ref.getEmisorId())
                        .ifPresent(e -> refMap.put("emisorNombre", e.getUsername()));
                resultado.put("referencia", refMap);
            });
        }

        return ResponseEntity.ok(resultado);
    }

    // ── ENVIAR ──
    @PostMapping("/enviar")
    public ResponseEntity<?> enviar(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (!permitirEnvio(yo.getId())) {
            return ResponseEntity.status(429).body(Map.of("error", "Demasiados mensajes. Intenta de nuevo en un minuto."));
        }

        String asunto = (String) body.get("asunto");
        String cuerpo = (String) body.get("cuerpo");
        String cuerpoHtml = htmlSanitizerService.sanitize((String) body.getOrDefault("cuerpoHtml", null));

        if (asunto == null || asunto.isBlank() || cuerpo == null || cuerpo.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Asunto y cuerpo son obligatorios"));
        }
        if (asunto.length() > 255 || cuerpo.length() > 5000) {
            return ResponseEntity.badRequest().body(Map.of("error", "El asunto o mensaje excede el tamaño permitido"));
        }

        @SuppressWarnings("unchecked")
        List<Long> receptorIds = ((List<Object>) body.getOrDefault("receptorIds", List.of()))
                .stream()
                .map(o -> Long.valueOf(o.toString()))
                .filter(id -> !id.equals(yo.getId()))
                .distinct()
                .toList();

        if (receptorIds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Debe haber al menos un destinatario"));
        }

        boolean notificarLectura = Boolean.TRUE.equals(body.get("notificarLectura"));
        Object refIdObj = body.get("referenciaId");
        Long referenciaId = refIdObj != null ? Long.valueOf(refIdObj.toString()) : null;

        Correo correo = new Correo();
        correo.setEmisorId(yo.getId());
        correo.setAsunto(asunto.trim());
        correo.setCuerpo(cuerpo.trim());
        correo.setCuerpoHtml(cuerpoHtml);
        correo.setFecha(LocalDateTime.now());
        correo.setEsComunicado(false);
        correo.setEsBorrador(false);
        correo.setReferenciaId(referenciaId);
        correoRepository.save(correo);

        List<Long> entregados = new ArrayList<>();
        for (Long rid : receptorIds) {
            Optional<Usuario> receptor = usuarioRepository.findById(rid);
            if (receptor.isPresent() && receptor.get().isActivo()) {
                CorreoDestinatario d = new CorreoDestinatario();
                d.setCorreoId(correo.getId());
                d.setReceptorId(rid);
                d.setNotificarLectura(notificarLectura);
                destRepository.save(d);
                entregados.add(rid);
            }
        }

        if (entregados.isEmpty()) {
            correoRepository.deleteById(correo.getId());
            return ResponseEntity.badRequest().body(Map.of("error", "No se encontraron destinatarios válidos"));
        }

        /* Eliminar borrador si se indicó */
        Object borradorIdObj = body.get("borradorId");
        if (borradorIdObj != null) {
            Long borradorId = Long.valueOf(borradorIdObj.toString());
            correoRepository.findById(borradorId).ifPresent(b -> {
                if (b.getEmisorId().equals(yo.getId())) {
                    destRepository.deleteByCorreoId(borradorId);
                    adjuntoRepository.deleteByCorreoId(borradorId);
                    correoRepository.deleteById(borradorId);
                }
            });
        }

        notificarNuevoCorreo(correo, yo, entregados);
        return ResponseEntity.ok(Map.of("id", correo.getId(), "mensaje", "Correo enviado"));
    }

    // ── GUARDAR BORRADOR ──
    @PostMapping("/borrador")
    public ResponseEntity<?> guardarBorrador(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Usuario yo = getUsuario(request);

        Object idObj = body.get("id");
        Correo correo;
        if (idObj != null) {
            Long id = Long.valueOf(idObj.toString());
            correo = correoRepository.findById(id).orElse(new Correo());
            if (!correo.getEmisorId().equals(yo.getId())) {
                return ResponseEntity.status(403).build();
            }
        } else {
            correo = new Correo();
            correo.setEmisorId(yo.getId());
        }

        String asunto = (String) body.getOrDefault("asunto", "");
        String cuerpo = (String) body.getOrDefault("cuerpo", "");
        correo.setAsunto(asunto.isBlank() ? "(Sin asunto)" : asunto.trim());
        correo.setCuerpo(cuerpo.trim());
        correo.setCuerpoHtml(htmlSanitizerService.sanitize((String) body.getOrDefault("cuerpoHtml", null)));
        correo.setFecha(LocalDateTime.now());
        correo.setEsComunicado(false);
        correo.setEsBorrador(true);
        correoRepository.save(correo);

        return ResponseEntity.ok(Map.of("id", correo.getId(), "mensaje", "Borrador guardado"));
    }

    // ── PROGRAMAR ENVÍO ──
    @PostMapping("/programar")
    public ResponseEntity<?> programar(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Usuario yo = getUsuario(request);

        String asunto = (String) body.get("asunto");
        String cuerpo = (String) body.get("cuerpo");
        String fechaStr = (String) body.get("programadoPara");

        if (asunto == null || asunto.isBlank() || cuerpo == null || cuerpo.isBlank() || fechaStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Asunto, cuerpo y fecha son obligatorios"));
        }

        @SuppressWarnings("unchecked")
        List<Long> receptorIds = ((List<Object>) body.getOrDefault("receptorIds", List.of()))
                .stream().map(o -> Long.valueOf(o.toString())).toList();

        if (receptorIds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Debe haber al menos un destinatario"));
        }

        LocalDateTime programadoPara = LocalDateTime.parse(fechaStr.replace("Z", "").replace("T", "T"));

        Correo correo = new Correo();
        correo.setEmisorId(yo.getId());
        correo.setAsunto(asunto.trim());
        correo.setCuerpo(cuerpo.trim());
        correo.setCuerpoHtml(htmlSanitizerService.sanitize((String) body.getOrDefault("cuerpoHtml", null)));
        correo.setFecha(LocalDateTime.now());
        correo.setEsBorrador(true);
        correo.setProgramadoPara(programadoPara);
        correo.setEsComunicado(false);
        correoRepository.save(correo);

        for (Long rid : receptorIds) {
            if (usuarioRepository.existsById(rid)) {
                CorreoDestinatario d = new CorreoDestinatario();
                d.setCorreoId(correo.getId());
                d.setReceptorId(rid);
                destRepository.save(d);
            }
        }

        return ResponseEntity.ok(Map.of("id", correo.getId(), "mensaje", "Correo programado"));
    }

    // ── SUBIR ADJUNTO ──
    @PostMapping("/{id}/adjunto")
    public ResponseEntity<?> subirAdjunto(@PathVariable Long id,
                                           @RequestParam("archivo") MultipartFile archivo,
                                           HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Correo correo = correoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Correo no encontrado"));

        if (!correo.getEmisorId().equals(yo.getId())) {
            return ResponseEntity.status(403).build();
        }

        try {
            Path carpeta = Paths.get(uploadDir, "adjuntos");
            if (!Files.exists(carpeta)) Files.createDirectories(carpeta);

            String ext = obtenerExtension(archivo.getOriginalFilename());
            String nombre = UUID.randomUUID() + "." + ext;
            Path destino = carpeta.resolve(nombre);
            Files.copy(archivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);

            CorreoAdjunto adj = new CorreoAdjunto();
            adj.setCorreoId(id);
            adj.setNombreArchivo(archivo.getOriginalFilename());
            adj.setArchivoUrl("/imagenes/adjuntos/" + nombre);
            adj.setTipoArchivo(archivo.getContentType());
            adj.setTamanio(archivo.getSize());
            adjuntoRepository.save(adj);

            correo.setTieneAdjuntos(true);
            correoRepository.save(correo);

            return ResponseEntity.ok(Map.of(
                    "id", adj.getId(),
                    "nombreArchivo", adj.getNombreArchivo(),
                    "archivoUrl", adj.getArchivoUrl(),
                    "tipoArchivo", adj.getTipoArchivo(),
                    "tamanio", adj.getTamanio()
            ));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Error al guardar el adjunto"));
        }
    }

    // ── COMUNICADO MASIVO ──
    @PostMapping("/comunicado")
    public ResponseEntity<?> comunicado(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (yo.getRol() == Usuario.Rol.ESTUDIANTE) {
            return ResponseEntity.status(403).body(Map.of("error", "Sin permiso para enviar comunicados"));
        }

        String asunto = (String) body.get("asunto");
        String cuerpo = (String) body.get("cuerpo");
        if (asunto == null || asunto.isBlank() || cuerpo == null || cuerpo.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Asunto y cuerpo son obligatorios"));
        }

        Correo correo = new Correo();
        correo.setEmisorId(yo.getId());
        correo.setAsunto(asunto.trim());
        correo.setCuerpo(cuerpo.trim());
        correo.setCuerpoHtml(htmlSanitizerService.sanitize((String) body.getOrDefault("cuerpoHtml", null)));
        correo.setFecha(LocalDateTime.now());
        correo.setEsComunicado(true);
        correo.setEsBorrador(false);
        correoRepository.save(correo);

        List<Usuario> todos = usuarioRepository.findAll();
        for (Usuario u : todos) {
            if (!u.getId().equals(yo.getId())) {
                CorreoDestinatario d = new CorreoDestinatario();
                d.setCorreoId(correo.getId());
                d.setReceptorId(u.getId());
                destRepository.save(d);
            }
        }

        return ResponseEntity.ok(Map.of("id", correo.getId(), "mensaje", "Comunicado enviado a todos los usuarios"));
    }

    // ── MARCAR LEÍDO ──
    @PutMapping("/{id}/leer")
    public ResponseEntity<?> marcarLeido(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        destRepository.marcarLeido(id, yo.getId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── FAVORITO ──
    @PutMapping("/{id}/favorito")
    public ResponseEntity<?> toggleFavorito(@PathVariable Long id,
                                             @RequestBody(required = false) Map<String, Object> body,
                                             HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Optional<CorreoDestinatario> dest = destRepository.findByCorreoIdAndReceptorId(id, yo.getId());
        if (dest.isEmpty()) return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado"));
        boolean valor = body != null && body.containsKey("favorito")
                ? Boolean.TRUE.equals(body.get("favorito"))
                : !Boolean.TRUE.equals(dest.get().getEsFavorito());
        destRepository.setFavorito(id, yo.getId(), valor);
        return ResponseEntity.ok(Map.of("ok", true, "favorito", valor));
    }

    // ── ARCHIVAR ──
    @PutMapping("/{id}/archivar")
    public ResponseEntity<?> archivar(@PathVariable Long id,
                                      @RequestBody(required = false) Map<String, Object> body,
                                      HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Optional<CorreoDestinatario> dest = destRepository.findByCorreoIdAndReceptorId(id, yo.getId());
        if (dest.isEmpty()) return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado"));
        boolean valor = body != null && body.containsKey("archivado")
                ? Boolean.TRUE.equals(body.get("archivado"))
                : !Boolean.TRUE.equals(dest.get().getArchivado());
        destRepository.setArchivado(id, yo.getId(), valor);
        return ResponseEntity.ok(Map.of("ok", true, "archivado", valor));
    }

    // ── PAPELERA ──
    @PutMapping("/{id}/papelera")
    public ResponseEntity<?> moverPapelera(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        destRepository.moverPapelera(id, yo.getId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── RESTAURAR ──
    @PutMapping("/{id}/restaurar")
    public ResponseEntity<?> restaurar(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        destRepository.restaurarDePapelera(id, yo.getId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── VACIAR PAPELERA ──
    @DeleteMapping("/papelera/vaciar")
    public ResponseEntity<?> vaciarPapelera(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        LocalDateTime limite = LocalDateTime.now().minusDays(30);
        destRepository.vaciarPapeleraAntigua(yo.getId(), limite);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── ETIQUETA ──
    @PutMapping("/{id}/etiqueta")
    public ResponseEntity<?> setEtiqueta(@PathVariable Long id,
                                          @RequestBody Map<String, Object> body,
                                          HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        String etiqueta = (String) body.get("etiqueta");
        destRepository.setEtiqueta(id, yo.getId(), etiqueta);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── ELIMINAR BORRADOR ──
    @DeleteMapping("/borrador/{id}")
    public ResponseEntity<?> eliminarBorrador(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        correoRepository.findById(id).ifPresent(c -> {
            if (c.getEmisorId().equals(yo.getId()) && c.getEsBorrador()) {
                destRepository.deleteByCorreoId(id);
                adjuntoRepository.deleteByCorreoId(id);
                correoRepository.deleteById(id);
            }
        });
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── MIS ETIQUETAS ──
    @GetMapping("/etiquetas")
    public ResponseEntity<?> misEtiquetas(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        return ResponseEntity.ok(etiquetaRepository.findByUsuarioId(yo.getId()));
    }

    @PostMapping("/etiquetas")
    public ResponseEntity<?> crearEtiqueta(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        String nombre = ((String) body.getOrDefault("nombre", "")).trim();
        String color  = (String) body.getOrDefault("color", "#F5A623");
        if (nombre.isBlank()) return ResponseEntity.badRequest().body("Nombre requerido");

        CorreoEtiqueta et = new CorreoEtiqueta();
        et.setUsuarioId(yo.getId());
        et.setNombre(nombre);
        et.setColor(color);
        etiquetaRepository.save(et);
        return ResponseEntity.ok(et);
    }

    @DeleteMapping("/etiquetas/{id}")
    public ResponseEntity<?> eliminarEtiqueta(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        etiquetaRepository.findById(id).ifPresent(et -> {
            if (et.getUsuarioId().equals(yo.getId())) etiquetaRepository.deleteById(id);
        });
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── HELPERS ──
    private List<Map<String, Object>> enriquecer(List<Correo> correos, Long receptorId) {
        return correos.stream().map(c -> {
            Map<String, Object> m = correoToMap(c);
            usuarioRepository.findById(c.getEmisorId()).ifPresent(e -> {
                m.put("emisorNombre", e.getUsername());
                m.put("emisorFoto", e.getFotoPerfil());
            });
            destRepository.findByCorreoIdAndReceptorId(c.getId(), receptorId).ifPresent(d -> {
                m.put("leido", d.getLeido());
                m.put("esFavorito", d.getEsFavorito());
                m.put("etiqueta", d.getEtiqueta());
                m.put("enPapelera", d.getEnPapelera());
                m.put("archivado", d.getArchivado());
            });
            return m;
        }).toList();
    }

    private List<Map<String, Object>> enriquecerEnviados(List<Correo> correos) {
        return correos.stream().map(c -> {
            Map<String, Object> m = correoToMap(c);
            usuarioRepository.findById(c.getEmisorId()).ifPresent(e -> {
                m.put("emisorNombre", e.getUsername());
                m.put("emisorFoto", e.getFotoPerfil());
            });
            List<CorreoDestinatario> dests = destRepository.findByCorreoId(c.getId());
            List<String> nombres = dests.stream()
                    .map(d -> usuarioRepository.findById(d.getReceptorId())
                            .map(Usuario::getUsername).orElse("?"))
                    .toList();
            boolean todosLeidos = !dests.isEmpty() && dests.stream().allMatch(CorreoDestinatario::getLeido);
            m.put("destinatarioNombres", nombres);
            m.put("leido", todosLeidos);
            return m;
        }).toList();
    }

    private Map<String, Object> correoToMap(Correo c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("emisorId", c.getEmisorId());
        m.put("asunto", c.getAsunto());
        m.put("cuerpo", c.getCuerpo());
        m.put("cuerpoHtml", htmlSanitizerService.sanitize(c.getCuerpoHtml()));
        m.put("fecha", c.getFecha());
        m.put("esComunicado", c.getEsComunicado());
        m.put("esBorrador", c.getEsBorrador());
        m.put("programadoPara", c.getProgramadoPara());
        m.put("tieneAdjuntos", c.getTieneAdjuntos());
        m.put("referenciaId", c.getReferenciaId());
        m.put("prioridad", Boolean.TRUE.equals(c.getEsComunicado()) ? "ALTA" : "NORMAL");
        return m;
    }

    private Usuario getUsuario(HttpServletRequest request) {
        return correoAccessService.getUsuario(request);
    }

    private boolean permitirEnvio(Long usuarioId) {
        LocalDateTime ahora = LocalDateTime.now();
        LocalDateTime ventana = ahora.minusMinutes(1);
        Deque<LocalDateTime> eventos = envioRateLimit.computeIfAbsent(usuarioId, ignored -> new ArrayDeque<>());
        synchronized (eventos) {
            while (!eventos.isEmpty() && eventos.peekFirst().isBefore(ventana)) {
                eventos.removeFirst();
            }
            if (eventos.size() >= MAX_ENVIOS_POR_MINUTO) return false;
            eventos.addLast(ahora);
            return true;
        }
    }

    private void notificarNuevoCorreo(Correo correo, Usuario emisor, List<Long> receptorIds) {
        if (messagingTemplate == null) return;
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("event", "mail:new");
        payload.put("id", correo.getId());
        payload.put("asunto", correo.getAsunto());
        payload.put("preview", correo.getCuerpo());
        payload.put("fecha", correo.getFecha());
        payload.put("emisorId", emisor.getId());
        payload.put("emisorNombre", emisor.getUsername());
        payload.put("emisorFoto", emisor.getFotoPerfil());
        for (Long receptorId : receptorIds) {
            usuarioRepository.findById(receptorId)
                    .ifPresent(u -> messagingTemplate.convertAndSendToUser(
                            u.getCorreo(), "/queue/correos", payload));
        }
    }

    private String obtenerExtension(String nombreOriginal) {
        if (nombreOriginal == null || !nombreOriginal.contains(".")) return "bin";
        return nombreOriginal.substring(nombreOriginal.lastIndexOf(".") + 1).toLowerCase();
    }
}
