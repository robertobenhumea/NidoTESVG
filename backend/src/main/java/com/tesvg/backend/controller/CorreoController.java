package com.tesvg.backend.controller;

import com.tesvg.backend.dto.*;
import com.tesvg.backend.model.*;
import com.tesvg.backend.model.Usuario.Rol;
import com.tesvg.backend.repository.*;
import com.tesvg.backend.service.CorreoAccessService;
import com.tesvg.backend.service.HtmlSanitizerService;
import com.tesvg.backend.service.WebPushService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/correos")
public class CorreoController {

    private static final Logger log = LoggerFactory.getLogger(CorreoController.class);

    // Attachment limits
    private static final int    MAX_ADJUNTOS_POR_CORREO    = 6;
    private static final long   MAX_TOTAL_SIZE_BYTES        = 100L * 1024 * 1024; // 100 MB total per correo
    private static final int    MAX_ENVIOS_POR_MINUTO       = 20;
    private static final int    DEFAULT_PAGE_SIZE           = 20;
    private static final int    MAX_PAGE_SIZE               = 50;

    // Dangerous extensions always blocked regardless of whitelist
    private static final Set<String> DANGEROUS_EXTS = Set.of(
            "exe", "bat", "cmd", "com", "msi", "vbs", "js", "jar",
            "sh", "ps1", "dll", "scr", "pif", "reg", "hta", "cpl"
    );

    private static final Set<String> ALLOWED_EXTS = Set.of(
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
            "txt", "png", "jpg", "jpeg", "gif", "webp", "zip",
            "mp4", "mov", "webm"
    );

    private static final Pattern SAFE_NAME_PATTERN = Pattern.compile("[^a-zA-Z0-9._\\-áéíóúÁÉÍÓÚüÜñÑ ]");

    // Catálogo oficial TESVG — siempre visible aunque no haya usuarios en esa carrera todavía
    private static final List<String> TESVG_CARRERAS = List.of(
            "Ingeniería en Sistemas Computacionales",
            "Ingeniería Industrial",
            "Ingeniería Civil",
            "Arquitectura",
            "Administración",
            "Contador Público",
            "Turismo",
            "Gastronomía",
            "Ingeniería en Gestión Empresarial"
    );

    @Autowired private CorreoRepository           correoRepository;
    @Autowired private CorreoDestinatarioRepository destRepository;
    @Autowired private CorreoAdjuntoRepository    adjuntoRepository;
    @Autowired private CorreoEtiquetaRepository   etiquetaRepository;
    @Autowired private UsuarioRepository          usuarioRepository;
    @Autowired private BuzonOficialRepository     buzonRepository;
    @Autowired private BuzonMiembroRepository     buzonMiembroRepository;
    @Autowired private HtmlSanitizerService       htmlSanitizerService;
    @Autowired private CorreoAccessService        correoAccessService;
    @Autowired(required = false) private SimpMessagingTemplate messagingTemplate;
    @Autowired(required = false) private WebPushService        webPushService;

    private final Map<Long, Deque<LocalDateTime>> envioRateLimit = new ConcurrentHashMap<>();

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Value("${app.mail.attachment.max-size-bytes:26214400}")
    private long maxAttachmentSizeBytes;

    // ─────────────────────────────────────────────
    //  BANDEJA DE ENTRADA (paginada)
    // ─────────────────────────────────────────────
    @GetMapping("/entrada")
    public ResponseEntity<?> bandeja(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Pageable pageable = pageOf(page, size);
        Page<Correo> pg = correoRepository.findBandejaEntradaPaged(yo.getId(), pageable);
        return ResponseEntity.ok(toPage(enriquecer(pg.getContent(), yo.getId()), pg));
    }

    // ─────────────────────────────────────────────
    //  ENVIADOS (paginados)
    // ─────────────────────────────────────────────
    @GetMapping("/enviados")
    public ResponseEntity<?> enviados(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Pageable pageable = pageOf(page, size);
        Page<Correo> pg = correoRepository.findEnviadosPaged(yo.getId(), pageable);
        return ResponseEntity.ok(toPage(enriquecerEnviados(pg.getContent()), pg));
    }

    // ─────────────────────────────────────────────
    //  BORRADORES
    // ─────────────────────────────────────────────
    @GetMapping("/borradores")
    public ResponseEntity<?> borradores(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        List<Correo> correos = correoRepository.findBorradores(yo.getId());
        return ResponseEntity.ok(correos.stream().map(this::correoToResumen).toList());
    }

    // ─────────────────────────────────────────────
    //  FAVORITOS (paginados)
    // ─────────────────────────────────────────────
    @GetMapping("/favoritos")
    public ResponseEntity<?> favoritos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Pageable pageable = pageOf(page, size);
        Page<Correo> pg = correoRepository.findFavoritosPaged(yo.getId(), pageable);
        return ResponseEntity.ok(toPage(enriquecer(pg.getContent(), yo.getId()), pg));
    }

    // ─────────────────────────────────────────────
    //  NO LEÍDOS — lista (paginada)
    // ─────────────────────────────────────────────
    @GetMapping("/no-leidos/lista")
    public ResponseEntity<?> listaNoLeidos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Pageable pageable = pageOf(page, size);
        Page<Correo> pg = correoRepository.findNoLeidosPaged(yo.getId(), pageable);
        return ResponseEntity.ok(toPage(enriquecer(pg.getContent(), yo.getId()), pg));
    }

    // ─────────────────────────────────────────────
    //  ARCHIVADOS (paginados)
    // ─────────────────────────────────────────────
    @GetMapping("/archivados")
    public ResponseEntity<?> archivados(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Pageable pageable = pageOf(page, size);
        Page<Correo> pg = correoRepository.findArchivadosPaged(yo.getId(), pageable);
        return ResponseEntity.ok(toPage(enriquecer(pg.getContent(), yo.getId()), pg));
    }

    // ─────────────────────────────────────────────
    //  CATEGORÍAS (paginadas)
    // ─────────────────────────────────────────────
    @GetMapping("/categoria/{categoria}")
    public ResponseEntity<?> porCategoria(
            @PathVariable String categoria,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Pageable pageable = pageOf(page, size);
        Page<Correo> pg = correoRepository.findByCategoriaPaged(yo.getId(), normalizarCategoria(categoria), pageable);
        return ResponseEntity.ok(toPage(enriquecer(pg.getContent(), yo.getId()), pg));
    }

    // ─────────────────────────────────────────────
    //  PAPELERA (paginada)
    // ─────────────────────────────────────────────
    @GetMapping("/papelera")
    public ResponseEntity<?> papelera(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Pageable pageable = pageOf(page, size);
        Page<Correo> pg = correoRepository.findPapeleraPaged(yo.getId(), pageable);
        return ResponseEntity.ok(toPage(enriquecer(pg.getContent(), yo.getId()), pg));
    }

    // ─────────────────────────────────────────────
    //  POR ETIQUETA
    // ─────────────────────────────────────────────
    @GetMapping("/etiqueta/{nombre}")
    public ResponseEntity<?> porEtiqueta(@PathVariable String nombre, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        List<Correo> correos = correoRepository.findByEtiqueta(yo.getId(), nombre);
        return ResponseEntity.ok(enriquecer(correos, yo.getId()));
    }

    // ─────────────────────────────────────────────
    //  COMUNICADOS
    // ─────────────────────────────────────────────
    @GetMapping("/comunicados")
    public ResponseEntity<?> comunicados() {
        List<Correo> correos = correoRepository.findComunicados();
        return ResponseEntity.ok(enriquecerEnviados(correos));
    }

    // ─────────────────────────────────────────────
    //  NO LEÍDOS — contador
    // ─────────────────────────────────────────────
    @GetMapping("/no-leidos")
    public ResponseEntity<?> noLeidos(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        long count = destRepository.countNoLeidosBandeja(yo.getId());
        return ResponseEntity.ok(Map.of("count", count));
    }

    // ─────────────────────────────────────────────
    //  BÚSQUEDA
    // ─────────────────────────────────────────────
    @GetMapping("/buscar")
    public ResponseEntity<?> buscar(@RequestParam String q, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        String like = "%" + q.toLowerCase() + "%";
        List<CorreoResumenDTO> entrada  = enriquecer(correoRepository.buscarEntrada(yo.getId(), like), yo.getId());
        List<CorreoResumenDTO> enviados = enriquecerEnviados(correoRepository.buscarEnviados(yo.getId(), like));
        return ResponseEntity.ok(Map.of("entrada", entrada, "enviados", enviados));
    }

    // ─────────────────────────────────────────────
    //  BÚSQUEDA AVANZADA (paginada, multi-filtro)
    // ─────────────────────────────────────────────
    @GetMapping("/buscar-avanzado")
    public ResponseEntity<?> buscarAvanzado(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String fechaDesde,
            @RequestParam(required = false) String fechaHasta,
            @RequestParam(required = false) Boolean tieneAdjuntos,
            @RequestParam(required = false) Boolean esComunicado,
            @RequestParam(required = false) Long emisorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            HttpServletRequest request) {

        Usuario yo = getUsuario(request);
        String like = "%" + (q == null || q.isBlank() ? "" : q.trim().toLowerCase()) + "%";
        String cat = (categoria == null || categoria.isBlank()) ? null : normalizarCategoria(categoria);

        LocalDateTime desde = null;
        LocalDateTime hasta = null;
        try {
            if (fechaDesde != null && !fechaDesde.isBlank())
                desde = LocalDate.parse(fechaDesde.trim()).atStartOfDay();
            if (fechaHasta != null && !fechaHasta.isBlank())
                hasta = LocalDate.parse(fechaHasta.trim()).atTime(23, 59, 59);
        } catch (Exception ignored) {}

        Pageable pageable = pageOf(page, size);
        Page<Correo> pg = correoRepository.buscarAvanzadoPaged(
                yo.getId(), like, cat, desde, hasta, tieneAdjuntos, esComunicado, emisorId, pageable);

        return ResponseEntity.ok(toPage(enriquecer(pg.getContent(), yo.getId()), pg));
    }

    // ─────────────────────────────────────────────
    //  ACCIONES MASIVAS
    // ─────────────────────────────────────────────
    @PostMapping("/acciones-masivas")
    public ResponseEntity<?> accionesMasivas(@RequestBody Map<String, Object> body,
                                              HttpServletRequest request) {
        Usuario yo = getUsuario(request);

        @SuppressWarnings("unchecked")
        List<Long> ids = ((List<Object>) body.getOrDefault("ids", List.of()))
                .stream().map(o -> Long.valueOf(o.toString())).distinct().toList();
        String accion   = ((String) body.getOrDefault("accion", "")).toLowerCase(Locale.ROOT).trim();
        String etiqueta = (String) body.getOrDefault("etiqueta", null);

        if (ids.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Sin IDs especificados"));
        }
        if (accion.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Acción requerida"));
        }

        int procesados = 0;
        for (Long id : ids) {
            Optional<CorreoDestinatario> dest = getDestForAction(id, yo.getId());
            if (dest.isEmpty()) continue;
            switch (accion) {
                case "leer"        -> destRepository.marcarLeido(id, yo.getId());
                case "no-leer"     -> destRepository.marcarNoLeido(id, yo.getId());
                case "archivar"    -> destRepository.setArchivado(id, yo.getId(), true);
                case "desarchivar" -> destRepository.setArchivado(id, yo.getId(), false);
                case "papelera"    -> destRepository.moverPapelera(id, yo.getId());
                case "restaurar"   -> destRepository.restaurarDePapelera(id, yo.getId());
                case "favorito"    -> destRepository.setFavorito(id, yo.getId(), true);
                case "no-favorito" -> destRepository.setFavorito(id, yo.getId(), false);
                case "etiqueta"    -> destRepository.setEtiqueta(id, yo.getId(), etiqueta);
                default            -> {}
            }
            procesados++;
        }

        return ResponseEntity.ok(Map.of("ok", true, "procesados", procesados, "accion", accion));
    }

    // ─────────────────────────────────────────────
    //  VER CORREO (detalle — marca leído)
    // ─────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> ver(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Correo correo = correoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Correo no encontrado"));

        boolean esEmisor = correo.getEmisorId().equals(yo.getId());
        Optional<CorreoDestinatario> destOpt = destRepository.findByCorreoIdAndReceptorId(id, yo.getId());

        if (!esEmisor && destOpt.isEmpty()) {
            return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado"));
        }

        if (destOpt.isPresent() && !destOpt.get().getLeido()) {
            destRepository.marcarLeido(id, yo.getId());
        }

        CorreoDetalleDTO dto = new CorreoDetalleDTO();
        dto.setId(correo.getId());
        dto.setEmisorId(correo.getEmisorId());
        dto.setAsunto(correo.getAsunto());
        dto.setCuerpo(correo.getCuerpo());
        dto.setCuerpoHtml(htmlSanitizerService.sanitize(correo.getCuerpoHtml()));
        dto.setFecha(correo.getFecha());
        dto.setEsComunicado(Boolean.TRUE.equals(correo.getEsComunicado()));
        dto.setEsBorrador(Boolean.TRUE.equals(correo.getEsBorrador()));
        dto.setProgramadoPara(correo.getProgramadoPara());
        dto.setTieneAdjuntos(Boolean.TRUE.equals(correo.getTieneAdjuntos()));
        dto.setCategoria(correo.getCategoria() != null ? correo.getCategoria() : "GENERAL");
        dto.setTipo(correo.getTipo() != null ? correo.getTipo() : "PERSONAL");
        dto.setPrioridad(Boolean.TRUE.equals(correo.getEsComunicado()) ? "ALTA" : "NORMAL");
        dto.setReferenciaId(correo.getReferenciaId());
        dto.setTipoAccion(correo.getTipoAccion());
        dto.setThreadId(correo.getThreadId());
        dto.setParentId(correo.getParentId());
        dto.setReplicasCount((int) correoRepository.countByThreadId(correo.getId()));
        dto.setAudiencia(correo.getAudiencia() != null ? correo.getAudiencia() : "INDIVIDUAL");
        dto.setAudienciaCarrera(correo.getAudienciaCarrera());
        dto.setAudienciaGrupo(correo.getAudienciaGrupo());

        usuarioRepository.findById(correo.getEmisorId())
                .ifPresent(e -> dto.setEmisor(usuarioInstitucional(e)));

        List<DestinatarioDTO> destDTOs = destRepository.findByCorreoId(id).stream().map(d -> {
            DestinatarioDTO dd = new DestinatarioDTO();
            dd.setReceptorId(d.getReceptorId());
            dd.setLeido(Boolean.TRUE.equals(d.getLeido()));
            dd.setFechaLectura(d.getFechaLectura());
            dd.setEsFavorito(Boolean.TRUE.equals(d.getEsFavorito()));
            dd.setEtiqueta(d.getEtiqueta());
            dd.setArchivado(Boolean.TRUE.equals(d.getArchivado()));
            usuarioRepository.findById(d.getReceptorId())
                    .ifPresent(u -> dd.setUsuario(usuarioInstitucional(u)));
            return dd;
        }).toList();
        dto.setDestinatarios(destDTOs);

        List<String> destNombres = destDTOs.stream()
                .map(d -> d.getUsuario() != null ? (String) d.getUsuario().get("nombre") : "?")
                .toList();
        dto.setDestinatarioNombres(destNombres);

        destOpt.ifPresent(d -> {
            dto.setLeido(Boolean.TRUE.equals(d.getLeido()));
            dto.setEsFavorito(Boolean.TRUE.equals(d.getEsFavorito()));
            dto.setEtiqueta(d.getEtiqueta());
            dto.setEnPapelera(Boolean.TRUE.equals(d.getEnPapelera()));
            dto.setArchivado(Boolean.TRUE.equals(d.getArchivado()));
        });

        dto.setAdjuntos(adjuntoRepository.findByCorreoId(id).stream()
                .map(this::adjuntoToDTO).toList());

        if (correo.getReferenciaId() != null) {
            correoRepository.findById(correo.getReferenciaId()).ifPresent(ref -> {
                Map<String, Object> refMap = new LinkedHashMap<>();
                refMap.put("id", ref.getId());
                refMap.put("asunto", ref.getAsunto());
                refMap.put("cuerpo", ref.getCuerpo());
                refMap.put("fecha", ref.getFecha());
                usuarioRepository.findById(ref.getEmisorId())
                        .ifPresent(e -> refMap.put("emisorNombre", e.getUsername()));
                dto.setReferencia(refMap);
            });
        }

        return ResponseEntity.ok(dto);
    }

    // ─────────────────────────────────────────────
    //  ENVIAR (usa EnviarCorreoRequest DTO)
    // ─────────────────────────────────────────────
    @PostMapping("/enviar")
    public ResponseEntity<?> enviar(@Valid @RequestBody EnviarCorreoRequest body,
                                    HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (!permitirEnvio(yo.getId())) {
            return ResponseEntity.status(429).body(Map.of("error", "Demasiados mensajes. Intenta de nuevo en un minuto."));
        }

        String asunto    = body.getAsunto().trim();
        String cuerpo    = body.getCuerpo().trim();
        String cuerpoHtml = htmlSanitizerService.sanitize(body.getCuerpoHtml());

        List<Long> receptorIds = body.getReceptorIds() == null ? List.of()
                : body.getReceptorIds().stream()
                    .filter(id -> !id.equals(yo.getId()))
                    .distinct()
                    .toList();

        if (receptorIds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Debe haber al menos un destinatario válido"));
        }

        Correo correo = new Correo();
        correo.setEmisorId(yo.getId());
        correo.setAsunto(asunto);
        correo.setCuerpo(cuerpo);
        correo.setCuerpoHtml(cuerpoHtml);
        correo.setFecha(LocalDateTime.now());
        correo.setEsComunicado(false);
        correo.setEsBorrador(false);
        correo.setCategoria(normalizarCategoria(body.getCategoria()));
        correo.setTipo(normalizarTipo(body.getTipo()));
        correo.setReferenciaId(body.getReferenciaId());
        correo.setThreadId(body.getThreadId());
        correo.setParentId(body.getParentId());
        if (body.getTipoAccion() != null) {
            String ta = body.getTipoAccion().trim().toUpperCase(Locale.ROOT);
            if (Set.of("RESPUESTA", "RESPUESTA_TODOS", "REENVIO").contains(ta)) {
                correo.setTipoAccion(ta);
            }
        }
        correo.setReenviadoDe(body.getReenviadoDe());
        correoRepository.save(correo);

        List<Long> entregados = new ArrayList<>();
        for (Long rid : receptorIds) {
            Optional<Usuario> receptor = usuarioRepository.findById(rid);
            if (receptor.isPresent() && receptor.get().isActivo()) {
                CorreoDestinatario d = new CorreoDestinatario();
                d.setCorreoId(correo.getId());
                d.setReceptorId(rid);
                d.setNotificarLectura(body.isNotificarLectura());
                destRepository.save(d);
                entregados.add(rid);
            }
        }

        if (entregados.isEmpty()) {
            correoRepository.deleteById(correo.getId());
            return ResponseEntity.badRequest().body(Map.of("error", "No se encontraron destinatarios válidos"));
        }

        Long borradorId = body.getBorradorId();
        if (borradorId != null) {
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

    // ─────────────────────────────────────────────
    //  GUARDAR BORRADOR
    // ─────────────────────────────────────────────
    @PostMapping("/borrador")
    public ResponseEntity<?> guardarBorrador(@RequestBody Map<String, Object> body,
                                             HttpServletRequest request) {
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
        correo.setCategoria(normalizarCategoria((String) body.getOrDefault("categoria", "GENERAL")));
        correo.setTipo(normalizarTipo((String) body.getOrDefault("tipo", "PERSONAL")));
        correoRepository.save(correo);

        return ResponseEntity.ok(Map.of("id", correo.getId(), "mensaje", "Borrador guardado"));
    }

    // ─────────────────────────────────────────────
    //  PROGRAMAR ENVÍO
    // ─────────────────────────────────────────────
    @PostMapping("/programar")
    public ResponseEntity<?> programar(@RequestBody Map<String, Object> body,
                                       HttpServletRequest request) {
        Usuario yo = getUsuario(request);

        String asunto   = (String) body.get("asunto");
        String cuerpo   = (String) body.get("cuerpo");
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
        correo.setCategoria(normalizarCategoria((String) body.getOrDefault("categoria", "GENERAL")));
        correo.setTipo(normalizarTipo((String) body.getOrDefault("tipo", "PERSONAL")));
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

    // ─────────────────────────────────────────────
    //  SUBIR ADJUNTO — único
    // ─────────────────────────────────────────────
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

        ResponseEntity<?> validacion = validarAdjunto(archivo, id);
        if (validacion != null) return validacion;

        try {
            AdjuntoDTO guardado = guardarAdjunto(id, archivo);
            correo.setTieneAdjuntos(true);
            correoRepository.save(correo);
            return ResponseEntity.ok(guardado);
        } catch (IOException e) {
            log.error("[adjunto/upload] error IO — correoId={}", id, e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Error al guardar el adjunto"));
        }
    }

    // ─────────────────────────────────────────────
    //  SUBIR ADJUNTOS — múltiples
    // ─────────────────────────────────────────────
    @PostMapping("/{id}/adjuntos")
    public ResponseEntity<?> subirAdjuntos(@PathVariable Long id,
                                           @RequestParam("archivos") List<MultipartFile> archivos,
                                           HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Correo correo = correoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Correo no encontrado"));

        if (!correo.getEmisorId().equals(yo.getId())) {
            return ResponseEntity.status(403).build();
        }

        List<AdjuntoDTO> subidos = new ArrayList<>();
        List<String> errores = new ArrayList<>();

        for (MultipartFile archivo : archivos) {
            ResponseEntity<?> validacion = validarAdjunto(archivo, id);
            if (validacion != null) {
                String nombre = archivo.getOriginalFilename() != null ? archivo.getOriginalFilename() : "archivo";
                Object errorBody = validacion.getBody();
                String errorMsg = (errorBody instanceof Map<?,?> m) ? (String) m.get("error") : "error";
                errores.add(nombre + ": " + errorMsg);
                continue;
            }
            try {
                subidos.add(guardarAdjunto(id, archivo));
            } catch (IOException e) {
                errores.add((archivo.getOriginalFilename() != null ? archivo.getOriginalFilename() : "archivo") + ": error al guardar");
            }
        }

        if (!subidos.isEmpty()) {
            correo.setTieneAdjuntos(true);
            correoRepository.save(correo);
        }

        return ResponseEntity.ok(Map.of("adjuntos", subidos, "errores", errores));
    }

    // ─────────────────────────────────────────────
    //  DESCARGAR ADJUNTO (JWT requerido)
    // ─────────────────────────────────────────────
    @GetMapping("/adjuntos/{adjuntoId}/descargar")
    public ResponseEntity<?> descargarAdjunto(@PathVariable Long adjuntoId,
                                              HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        log.info("[adjunto/download] usuarioId={} adjuntoId={}", yo.getId(), adjuntoId);

        CorreoAdjunto adj = adjuntoRepository.findById(adjuntoId).orElse(null);
        if (adj == null) {
            log.warn("[adjunto/download] adjunto {} no encontrado", adjuntoId);
            return ResponseEntity.notFound().build();
        }

        Long correoId = adj.getCorreoId();
        boolean tienePermiso = correoAccessService.puedeVerCorreo(correoId, yo.getId());
        log.info("[adjunto/download] adjuntoId={} correoId={} nombreArchivo={} tienePermiso={}",
                adjuntoId, correoId, adj.getNombreArchivo(), tienePermiso);

        if (!tienePermiso) {
            log.warn("[adjunto/download] acceso denegado — usuarioId={} correoId={}", yo.getId(), correoId);
            return ResponseEntity.status(403).body(Map.of("error", "Sin permiso"));
        }

        String archivoUrl = adj.getArchivoUrl();
        String nombre = archivoUrl.substring(archivoUrl.lastIndexOf('/') + 1);
        Path ruta = Paths.get(uploadDir, "adjuntos").resolve(nombre);
        boolean existe = Files.exists(ruta);
        log.info("[adjunto/download] ruta={} existe={}", ruta, existe);

        if (!existe) {
            log.warn("[adjunto/download] archivo no encontrado en disco — ruta={}", ruta);
            return ResponseEntity.notFound().build();
        }

        try {
            Resource recurso = new UrlResource(ruta.toUri());
            String contentType = Files.probeContentType(ruta);
            if (contentType == null) contentType = "application/octet-stream";
            String nombreOriginal = adj.getNombreArchivo() != null ? adj.getNombreArchivo() : nombre;
            String encodedName    = nombreOriginal.replace("\"", "\\\"");
            log.info("[adjunto/download] sirviendo — contentType={} nombreOriginal={}", contentType, nombreOriginal);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedName + "\"")
                    .body(recurso);
        } catch (MalformedURLException e) {
            log.error("[adjunto/download] URL malformada — ruta={}", ruta, e);
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            log.error("[adjunto/download] error IO — ruta={}", ruta, e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Error al leer el archivo"));
        }
    }

    // ─────────────────────────────────────────────
    //  DESTINATARIOS DE COORDINACIÓN
    // ─────────────────────────────────────────────
    @GetMapping("/destinatarios/coordinacion")
    public ResponseEntity<?> destinatariosCoordinacion(HttpServletRequest request) {
        getUsuario(request);
        List<Usuario> coordinacion = usuarioRepository.findByRolIn(
                List.of(Usuario.Rol.AUTORIDAD, Usuario.Rol.ADMIN, Usuario.Rol.DIRECCION)
        );
        return ResponseEntity.ok(coordinacion.stream()
                .filter(Usuario::isActivo)
                .map(this::usuarioInstitucional)
                .toList());
    }

    // ─────────────────────────────────────────────
    //  COMUNICADO MASIVO
    // ─────────────────────────────────────────────
    @PostMapping("/comunicado")
    public ResponseEntity<?> comunicado(@RequestBody Map<String, Object> body,
                                        HttpServletRequest request) {
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
        correo.setCategoria("INSTITUCIONAL");
        correo.setTipo("INSTITUCIONAL");
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

    // ─────────────────────────────────────────────
    //  ACCIONES EN CORREO
    // ─────────────────────────────────────────────
    @PutMapping("/{id}/leer")
    public ResponseEntity<?> marcarLeido(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        destRepository.marcarLeido(id, yo.getId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PatchMapping("/{id}/marcar-no-leido")
    public ResponseEntity<?> marcarNoLeido(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Optional<CorreoDestinatario> dest = destRepository.findByCorreoIdAndReceptorId(id, yo.getId());
        if (dest.isEmpty()) return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado"));
        destRepository.marcarNoLeido(id, yo.getId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ─────────────────────────────────────────────
    //  HILO / CONVERSACIÓN
    // ─────────────────────────────────────────────
    @GetMapping("/{id}/hilo")
    public ResponseEntity<?> hilo(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Correo correo = correoRepository.findById(id).orElse(null);
        if (correo == null) return ResponseEntity.notFound().build();
        if (!correoAccessService.puedeVerCorreo(id, yo.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado"));
        }

        Long rootId = correo.getThreadId() != null ? correo.getThreadId() : correo.getId();
        List<Correo> hilo = correoRepository.findByThread(rootId);

        List<ThreadMessageDTO> result = hilo.stream().map(c -> {
            ThreadMessageDTO dto = new ThreadMessageDTO();
            dto.setId(c.getId());
            dto.setEmisorId(c.getEmisorId());
            dto.setAsunto(c.getAsunto());
            dto.setCuerpo(c.getCuerpo());
            dto.setCuerpoHtml(htmlSanitizerService.sanitize(c.getCuerpoHtml()));
            dto.setFecha(c.getFecha());
            dto.setTipoAccion(c.getTipoAccion());
            dto.setThreadId(c.getThreadId());
            dto.setParentId(c.getParentId());
            usuarioRepository.findById(c.getEmisorId()).ifPresent(e -> dto.setEmisor(usuarioInstitucional(e)));
            dto.setAdjuntos(adjuntoRepository.findByCorreoId(c.getId()).stream()
                    .map(this::adjuntoToDTO).toList());
            return dto;
        }).toList();

        return ResponseEntity.ok(result);
    }

    @PutMapping("/{id}/favorito")
    public ResponseEntity<?> toggleFavorito(@PathVariable Long id,
                                            @RequestBody(required = false) Map<String, Object> body,
                                            HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Optional<CorreoDestinatario> dest = getDestForAction(id, yo.getId());
        if (dest.isEmpty()) return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado"));
        boolean valor = body != null && body.containsKey("favorito")
                ? Boolean.TRUE.equals(body.get("favorito"))
                : !Boolean.TRUE.equals(dest.get().getEsFavorito());
        destRepository.setFavorito(id, yo.getId(), valor);
        return ResponseEntity.ok(Map.of("ok", true, "favorito", valor));
    }

    @PutMapping("/{id}/archivar")
    public ResponseEntity<?> archivar(@PathVariable Long id,
                                      @RequestBody(required = false) Map<String, Object> body,
                                      HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Optional<CorreoDestinatario> dest = getDestForAction(id, yo.getId());
        if (dest.isEmpty()) return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado"));
        boolean valor = body != null && body.containsKey("archivado")
                ? Boolean.TRUE.equals(body.get("archivado"))
                : !Boolean.TRUE.equals(dest.get().getArchivado());
        destRepository.setArchivado(id, yo.getId(), valor);
        return ResponseEntity.ok(Map.of("ok", true, "archivado", valor));
    }

    @PutMapping("/{id}/papelera")
    public ResponseEntity<?> moverPapelera(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Optional<CorreoDestinatario> dest = getDestForAction(id, yo.getId());
        if (dest.isEmpty()) return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado"));
        destRepository.moverPapelera(id, yo.getId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PutMapping("/{id}/restaurar")
    public ResponseEntity<?> restaurar(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Optional<CorreoDestinatario> dest = getDestForAction(id, yo.getId());
        if (dest.isEmpty()) return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado"));
        destRepository.restaurarDePapelera(id, yo.getId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @DeleteMapping("/papelera/vaciar")
    public ResponseEntity<?> vaciarPapelera(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        LocalDateTime limite = LocalDateTime.now().minusDays(30);
        destRepository.vaciarPapeleraAntigua(yo.getId(), limite);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PutMapping("/{id}/etiqueta")
    public ResponseEntity<?> setEtiqueta(@PathVariable Long id,
                                         @RequestBody Map<String, Object> body,
                                         HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        String etiqueta = (String) body.get("etiqueta");
        destRepository.setEtiqueta(id, yo.getId(), etiqueta);
        return ResponseEntity.ok(Map.of("ok", true));
    }

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

    // ─────────────────────────────────────────────
    //  ETIQUETAS
    // ─────────────────────────────────────────────
    @GetMapping("/etiquetas")
    public ResponseEntity<?> misEtiquetas(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        return ResponseEntity.ok(etiquetaRepository.findByUsuarioId(yo.getId()));
    }

    @PostMapping("/etiquetas")
    public ResponseEntity<?> crearEtiqueta(@RequestBody Map<String, Object> body,
                                           HttpServletRequest request) {
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

    // ─────────────────────────────────────────────
    //  AUDIENCIA ACADÉMICA — INFO
    // ─────────────────────────────────────────────
    @GetMapping("/destinatarios/info-academica")
    public ResponseEntity<?> infoAcademica(HttpServletRequest request) {
        getUsuario(request);

        // Merge DB carreras with TESVG catalog — catalog always visible even if no users enrolled yet
        Set<String> carrerasEnDB = new HashSet<>(usuarioRepository.findDistinctCarreras());
        List<String> todasCarreras = new ArrayList<>(carrerasEnDB);
        for (String c : TESVG_CARRERAS) {
            boolean yaExiste = carrerasEnDB.stream().anyMatch(db -> db.equalsIgnoreCase(c));
            if (!yaExiste) todasCarreras.add(c);
        }
        todasCarreras.sort(String::compareToIgnoreCase);

        List<AudienciaInfoDTO.CarreraInfo> carreraInfos = todasCarreras.stream().map(carrera -> {
            int estudiantes = (int) usuarioRepository.countByCarreraAndRolAndActivoTrue(carrera, Rol.ESTUDIANTE);
            int docentes    = (int) usuarioRepository.countByCarreraAndRolAndActivoTrue(carrera, Rol.DOCENTE);
            List<String> grupos = usuarioRepository.findGruposByCarrera(carrera);
            List<AudienciaInfoDTO.GrupoInfo> grupoInfos = grupos.stream().map(g -> {
                int total = (int) usuarioRepository.countByCarreraAndGrupoAndRolAndActivoTrue(carrera, g, Rol.ESTUDIANTE);
                return new AudienciaInfoDTO.GrupoInfo(g, total);
            }).toList();
            return new AudienciaInfoDTO.CarreraInfo(carrera, estudiantes, docentes, grupoInfos);
        }).toList();

        AudienciaInfoDTO dto = new AudienciaInfoDTO();
        dto.setCarreras(carreraInfos);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/catalogos/carreras")
    public ResponseEntity<?> catalogoCarreras(HttpServletRequest request) {
        getUsuario(request);
        return ResponseEntity.ok(TESVG_CARRERAS);
    }

    @GetMapping("/destinatarios/por-carrera")
    public ResponseEntity<?> destinatariosPorCarrera(@RequestParam String carrera,
                                                      HttpServletRequest request) {
        getUsuario(request);
        List<Usuario> usuarios = usuarioRepository.findByCarreraAndActivoTrue(carrera);
        return ResponseEntity.ok(usuarios.stream().map(this::usuarioInstitucional).toList());
    }

    @GetMapping("/destinatarios/por-grupo")
    public ResponseEntity<?> destinatariosPorGrupo(@RequestParam String carrera,
                                                    @RequestParam String grupo,
                                                    HttpServletRequest request) {
        getUsuario(request);
        List<Usuario> usuarios = usuarioRepository.findByCarreraAndGrupoAndActivoTrue(carrera, grupo);
        return ResponseEntity.ok(usuarios.stream().map(this::usuarioInstitucional).toList());
    }

    @GetMapping("/destinatarios/coordinacion-por-carrera")
    public ResponseEntity<?> coordinacionPorCarrera(@RequestParam String carrera,
                                                     HttpServletRequest request) {
        getUsuario(request);
        List<Usuario> coords = usuarioRepository.findByCarreraAndRolInAndActivoTrue(
                carrera, List.of(Rol.AUTORIDAD, Rol.DOCENTE));
        return ResponseEntity.ok(coords.stream().filter(Usuario::isActivo).map(this::usuarioInstitucional).toList());
    }

    // ─────────────────────────────────────────────
    //  ENVÍO MASIVO (por audiencia)
    // ─────────────────────────────────────────────
    @PostMapping("/enviar-masivo")
    public ResponseEntity<?> enviarMasivo(@Valid @RequestBody EnviarMasivoRequest body,
                                          HttpServletRequest request) {
        Usuario yo = getUsuario(request);

        // Permission matrix
        if (!puedeEnviarMasivo(yo, body)) {
            return ResponseEntity.status(403).body(Map.of("error", "Sin permiso para envío masivo"));
        }

        if (!permitirEnvio(yo.getId())) {
            return ResponseEntity.status(429).body(Map.of("error", "Demasiados mensajes. Intenta de nuevo en un minuto."));
        }

        List<Long> receptorIds = resolverAudiencia(yo, body);
        if (receptorIds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No se encontraron destinatarios para la audiencia seleccionada"));
        }

        Correo correo = new Correo();
        correo.setEmisorId(yo.getId());
        correo.setAsunto(body.getAsunto().trim());
        correo.setCuerpo(body.getCuerpo().trim());
        correo.setCuerpoHtml(htmlSanitizerService.sanitize(body.getCuerpoHtml()));
        correo.setFecha(LocalDateTime.now());
        correo.setEsComunicado(body.isEsComunicado() && puedeEnviarComunicado(yo));
        correo.setEsBorrador(false);
        correo.setCategoria(normalizarCategoria(body.getCategoria()));
        correo.setTipo(normalizarTipo(body.getTipo()));
        correo.setAudiencia(body.getAudiencia().toUpperCase(Locale.ROOT));
        correo.setAudienciaCarrera(body.getCarrera());
        correo.setAudienciaGrupo(body.getGrupo());
        correoRepository.save(correo);

        List<Long> entregados = new ArrayList<>();
        for (Long rid : receptorIds) {
            if (rid.equals(yo.getId())) continue;
            usuarioRepository.findById(rid).ifPresent(receptor -> {
                if (receptor.isActivo()) {
                    CorreoDestinatario d = new CorreoDestinatario();
                    d.setCorreoId(correo.getId());
                    d.setReceptorId(rid);
                    destRepository.save(d);
                    entregados.add(rid);
                }
            });
        }

        if (entregados.isEmpty()) {
            correoRepository.deleteById(correo.getId());
            return ResponseEntity.badRequest().body(Map.of("error", "No se encontraron destinatarios válidos"));
        }

        notificarNuevoCorreo(correo, yo, entregados);
        return ResponseEntity.ok(Map.of(
            "id",           correo.getId(),
            "mensaje",      "Correo enviado a " + entregados.size() + " destinatario(s)",
            "entregados",   entregados.size()
        ));
    }

    private boolean puedeEnviarMasivo(Usuario emisor, EnviarMasivoRequest body) {
        return switch (emisor.getRol()) {
            case ADMIN, AUTORIDAD, DIRECCION, ADMINISTRATIVO -> true;
            case DOCENTE -> {
                String audiencia = body.getAudiencia() != null ? body.getAudiencia().toUpperCase(Locale.ROOT) : "";
                String carreraEmitido = emisor.getCarrera();
                boolean tieneCarrera = carreraEmitido != null && !carreraEmitido.isBlank();
                boolean mismaCarre   = tieneCarrera && carreraEmitido.equalsIgnoreCase(body.getCarrera());
                yield switch (audiencia) {
                    case "CARRERA", "GRUPO", "DOCENTES_CARRERA" -> mismaCarre;
                    case "COORDINACION_CARRERA"                  -> mismaCarre;
                    default -> false;
                };
            }
            default -> false;
        };
    }

    private boolean puedeEnviarComunicado(Usuario emisor) {
        return switch (emisor.getRol()) {
            case ADMIN, AUTORIDAD, DIRECCION -> true;
            default -> false;
        };
    }

    private List<Long> resolverAudiencia(Usuario emisor, EnviarMasivoRequest body) {
        String audiencia = body.getAudiencia().toUpperCase(Locale.ROOT);
        return switch (audiencia) {
            case "CARRERA" -> {
                if (body.getCarrera() == null || body.getCarrera().isBlank())
                    yield List.of();
                yield usuarioRepository.findByCarreraAndActivoTrue(body.getCarrera())
                        .stream().map(Usuario::getId).toList();
            }
            case "GRUPO" -> {
                if (body.getCarrera() == null || body.getGrupo() == null)
                    yield List.of();
                yield usuarioRepository.findByCarreraAndGrupoAndActivoTrue(body.getCarrera(), body.getGrupo())
                        .stream().map(Usuario::getId).toList();
            }
            case "DOCENTES_CARRERA" -> {
                if (body.getCarrera() == null || body.getCarrera().isBlank())
                    yield List.of();
                yield usuarioRepository.findByCarreraAndRolInAndActivoTrue(
                        body.getCarrera(), List.of(Rol.DOCENTE))
                        .stream().map(Usuario::getId).toList();
            }
            case "TODOS_ACTIVOS" -> {
                // Only ADMIN/AUTORIDAD/DIRECCION allowed — checked in puedeEnviarMasivo
                yield usuarioRepository.findAll().stream()
                        .filter(Usuario::isActivo)
                        .map(Usuario::getId).toList();
            }
            default -> List.of();
        };
    }

    // ─────────────────────────────────────────────
    //  BUZONES OFICIALES
    // ─────────────────────────────────────────────
    @GetMapping("/buzones")
    public ResponseEntity<?> listarBuzones(HttpServletRequest request) {
        getUsuario(request);
        List<BuzonOficialDTO> dtos = buzonRepository.findByActivoTrueOrderByNombreAsc().stream().map(b -> {
            int count = buzonMiembroRepository.findByBuzonId(b.getId()).size();
            return new BuzonOficialDTO(b.getId(), b.getNombre(), b.getAlias(), b.getDescripcion(), b.getTipo(), count);
        }).toList();
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/buzones/{buzonId}/enviar")
    public ResponseEntity<?> enviarABuzon(@PathVariable Long buzonId,
                                           @RequestBody Map<String, Object> body,
                                           HttpServletRequest request) {
        Usuario yo = getUsuario(request);

        // Only AUTORIDAD/ADMIN/DIRECCION/ADMINISTRATIVO can use official mailboxes
        if (!puedeUsarBuzon(yo)) {
            return ResponseEntity.status(403).body(Map.of("error", "Sin permiso para usar buzones oficiales"));
        }

        BuzonOficial buzon = buzonRepository.findById(buzonId).orElse(null);
        if (buzon == null || !buzon.isActivo()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Buzón no encontrado o inactivo"));
        }

        String asunto = (String) body.getOrDefault("asunto", "");
        String cuerpo = (String) body.getOrDefault("cuerpo", "");
        if (asunto.isBlank() || cuerpo.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Asunto y cuerpo son obligatorios"));
        }

        // Resolve recipients: explicit members → fallback to receptorRol
        List<Long> receptorIds;
        List<BuzonMiembro> miembros = buzonMiembroRepository.findByBuzonId(buzonId);
        if (!miembros.isEmpty()) {
            receptorIds = miembros.stream().map(BuzonMiembro::getUsuarioId).toList();
        } else {
            // Fallback: users matching receptorRol
            Rol rolFallback = resolverRol(buzon.getReceptorRol());
            receptorIds = usuarioRepository.findByRolAndActivoTrue(rolFallback)
                    .stream().map(Usuario::getId).toList();
        }

        if (receptorIds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El buzón no tiene miembros configurados"));
        }

        Correo correo = new Correo();
        correo.setEmisorId(yo.getId());
        correo.setAsunto(asunto.trim());
        correo.setCuerpo(cuerpo.trim());
        correo.setCuerpoHtml(htmlSanitizerService.sanitize((String) body.getOrDefault("cuerpoHtml", null)));
        correo.setFecha(LocalDateTime.now());
        correo.setEsComunicado(false);
        correo.setEsBorrador(false);
        correo.setCategoria("INSTITUCIONAL");
        correo.setTipo("INSTITUCIONAL");
        correo.setAudiencia("BUZON");
        correo.setAudienciaCarrera(buzon.getNombre());
        correoRepository.save(correo);

        List<Long> entregados = new ArrayList<>();
        for (Long rid : receptorIds) {
            if (rid.equals(yo.getId())) continue;
            usuarioRepository.findById(rid).ifPresent(r -> {
                if (r.isActivo()) {
                    CorreoDestinatario d = new CorreoDestinatario();
                    d.setCorreoId(correo.getId());
                    d.setReceptorId(rid);
                    destRepository.save(d);
                    entregados.add(rid);
                }
            });
        }

        if (entregados.isEmpty()) {
            correoRepository.deleteById(correo.getId());
            return ResponseEntity.badRequest().body(Map.of("error", "No se encontraron destinatarios válidos en el buzón"));
        }

        notificarNuevoCorreo(correo, yo, entregados);
        return ResponseEntity.ok(Map.of("id", correo.getId(), "mensaje", "Enviado a " + buzon.getNombre(), "entregados", entregados.size()));
    }

    @PostMapping("/buzones")
    public ResponseEntity<?> crearBuzon(@RequestBody Map<String, Object> body,
                                         HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (yo.getRol() != Rol.ADMIN && yo.getRol() != Rol.AUTORIDAD && yo.getRol() != Rol.DIRECCION) {
            return ResponseEntity.status(403).body(Map.of("error", "Solo administradores pueden crear buzones"));
        }

        String nombre = (String) body.getOrDefault("nombre", "");
        String alias  = (String) body.getOrDefault("alias", "");
        if (nombre.isBlank() || alias.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Nombre y alias son obligatorios"));
        }
        // Sanitize alias
        alias = alias.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9\\-_]", "");
        if (buzonRepository.existsByAlias(alias)) {
            return ResponseEntity.badRequest().body(Map.of("error", "El alias ya está en uso"));
        }

        BuzonOficial b = new BuzonOficial();
        b.setNombre(nombre.trim());
        b.setAlias(alias);
        b.setDescripcion((String) body.getOrDefault("descripcion", null));
        b.setTipo((String) body.getOrDefault("tipo", "COORDINACION"));
        b.setReceptorRol((String) body.getOrDefault("receptorRol", "AUTORIDAD"));
        b.setActivo(true);
        buzonRepository.save(b);
        return ResponseEntity.ok(Map.of("id", b.getId(), "mensaje", "Buzón creado"));
    }

    @PostMapping("/buzones/{buzonId}/miembros")
    public ResponseEntity<?> agregarMiembro(@PathVariable Long buzonId,
                                             @RequestBody Map<String, Object> body,
                                             HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (yo.getRol() != Rol.ADMIN && yo.getRol() != Rol.AUTORIDAD && yo.getRol() != Rol.DIRECCION) {
            return ResponseEntity.status(403).body(Map.of("error", "Sin permiso"));
        }

        Long usuarioId = Long.valueOf(body.get("usuarioId").toString());
        if (!buzonRepository.existsById(buzonId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Buzón no encontrado"));
        }
        if (buzonMiembroRepository.findByBuzonIdAndUsuarioId(buzonId, usuarioId).isPresent()) {
            return ResponseEntity.ok(Map.of("ok", true, "mensaje", "Ya es miembro"));
        }

        BuzonMiembro m = new BuzonMiembro();
        m.setBuzonId(buzonId);
        m.setUsuarioId(usuarioId);
        m.setEsAdmin(Boolean.TRUE.equals(body.get("esAdmin")));
        buzonMiembroRepository.save(m);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @DeleteMapping("/buzones/{buzonId}/miembros/{usuarioId}")
    public ResponseEntity<?> quitarMiembro(@PathVariable Long buzonId,
                                            @PathVariable Long usuarioId,
                                            HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (yo.getRol() != Rol.ADMIN && yo.getRol() != Rol.AUTORIDAD && yo.getRol() != Rol.DIRECCION) {
            return ResponseEntity.status(403).body(Map.of("error", "Sin permiso"));
        }
        buzonMiembroRepository.deleteByBuzonIdAndUsuarioId(buzonId, usuarioId);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private boolean puedeUsarBuzon(Usuario emisor) {
        return switch (emisor.getRol()) {
            case ADMIN, AUTORIDAD, DIRECCION, ADMINISTRATIVO, DOCENTE -> true;
            default -> false;
        };
    }

    private Rol resolverRol(String rolStr) {
        if (rolStr == null) return Rol.AUTORIDAD;
        return switch (rolStr.toUpperCase(Locale.ROOT)) {
            case "DIRECCION"     -> Rol.DIRECCION;
            case "ADMINISTRATIVO"-> Rol.ADMINISTRATIVO;
            case "DOCENTE"       -> Rol.DOCENTE;
            case "ADMIN"         -> Rol.ADMIN;
            default              -> Rol.AUTORIDAD;
        };
    }

    // ─────────────────────────────────────────────
    //  HELPERS INTERNOS
    // ─────────────────────────────────────────────

    private List<CorreoResumenDTO> enriquecer(List<Correo> correos, Long receptorId) {
        return correos.stream().map(c -> {
            CorreoResumenDTO dto = correoToResumen(c);
            boolean isMio = c.getEmisorId().equals(receptorId);
            dto.setEsMio(isMio);
            usuarioRepository.findById(c.getEmisorId()).ifPresent(e ->
                    dto.setEmisor(usuarioInstitucional(e)));
            destRepository.findByCorreoIdAndReceptorId(c.getId(), receptorId).ifPresent(d -> {
                dto.setLeido(Boolean.TRUE.equals(d.getLeido()));
                dto.setEsFavorito(Boolean.TRUE.equals(d.getEsFavorito()));
                dto.setEtiqueta(d.getEtiqueta());
                dto.setEnPapelera(Boolean.TRUE.equals(d.getEnPapelera()));
                dto.setArchivado(Boolean.TRUE.equals(d.getArchivado()));
            });
            // For sent mail appearing in Favoritos/Archivados: also populate recipient names
            if (isMio) {
                List<CorreoDestinatario> allDests = destRepository.findByCorreoId(c.getId());
                List<CorreoDestinatario> realDests = allDests.stream()
                        .filter(d -> !Boolean.TRUE.equals(d.getEsSender()))
                        .toList();
                dto.setDestinatarioNombres(realDests.stream()
                        .map(d -> usuarioRepository.findById(d.getReceptorId())
                                .map(Usuario::getUsername).orElse("?"))
                        .toList());
                dto.setDestinatarios(realDests.stream()
                        .map(d -> usuarioRepository.findById(d.getReceptorId())
                                .map(this::usuarioInstitucional).orElse(null))
                        .filter(Objects::nonNull)
                        .toList());
            }
            return dto;
        }).toList();
    }

    private List<CorreoResumenDTO> enriquecerEnviados(List<Correo> correos) {
        return correos.stream().map(c -> {
            CorreoResumenDTO dto = correoToResumen(c);
            dto.setEsMio(true);
            usuarioRepository.findById(c.getEmisorId()).ifPresent(e ->
                    dto.setEmisor(usuarioInstitucional(e)));
            List<CorreoDestinatario> allDests = destRepository.findByCorreoId(c.getId());
            // Exclude sender self-reference rows from the recipient display
            List<CorreoDestinatario> realDests = allDests.stream()
                    .filter(d -> !Boolean.TRUE.equals(d.getEsSender()))
                    .toList();
            List<String> nombres = realDests.stream()
                    .map(d -> usuarioRepository.findById(d.getReceptorId())
                            .map(Usuario::getUsername).orElse("?"))
                    .toList();
            List<Map<String, Object>> destinatarios = realDests.stream()
                    .map(d -> usuarioRepository.findById(d.getReceptorId())
                            .map(this::usuarioInstitucional).orElse(null))
                    .filter(Objects::nonNull)
                    .toList();
            boolean todosLeidos = !realDests.isEmpty() && realDests.stream().allMatch(CorreoDestinatario::getLeido);
            dto.setDestinatarioNombres(nombres);
            dto.setDestinatarios(destinatarios);
            dto.setLeido(todosLeidos);
            // Populate sender's own state (esFavorito etc.) from their sender-reference row
            allDests.stream()
                    .filter(d -> Boolean.TRUE.equals(d.getEsSender()))
                    .findFirst()
                    .ifPresent(senderRow -> {
                        dto.setEsFavorito(Boolean.TRUE.equals(senderRow.getEsFavorito()));
                        dto.setArchivado(Boolean.TRUE.equals(senderRow.getArchivado()));
                        dto.setEnPapelera(Boolean.TRUE.equals(senderRow.getEnPapelera()));
                    });
            return dto;
        }).toList();
    }

    /**
     * Returns the CorreoDestinatario for the given user.
     * If none exists but the user is the emisor, creates a sender-reference row on demand
     * so that favorites, archive, trash can be stored per-sender.
     */
    private Optional<CorreoDestinatario> getDestForAction(Long correoId, Long userId) {
        Optional<CorreoDestinatario> existing = destRepository.findByCorreoIdAndReceptorId(correoId, userId);
        if (existing.isPresent()) return existing;
        Optional<Correo> correoOpt = correoRepository.findById(correoId);
        if (correoOpt.isEmpty() || !correoOpt.get().getEmisorId().equals(userId)) {
            return Optional.empty();
        }
        CorreoDestinatario row = new CorreoDestinatario();
        row.setCorreoId(correoId);
        row.setReceptorId(userId);
        row.setLeido(true);
        row.setEsSender(true);
        return Optional.of(destRepository.save(row));
    }

    private CorreoResumenDTO correoToResumen(Correo c) {
        CorreoResumenDTO dto = new CorreoResumenDTO();
        dto.setId(c.getId());
        dto.setEmisorId(c.getEmisorId());
        dto.setAsunto(c.getAsunto());
        String preview = c.getCuerpo() != null
                ? c.getCuerpo().length() > 200 ? c.getCuerpo().substring(0, 200) : c.getCuerpo()
                : "";
        dto.setCuerpo(preview);
        dto.setFecha(c.getFecha());
        dto.setTieneAdjuntos(Boolean.TRUE.equals(c.getTieneAdjuntos()));

        List<AdjuntoDTO> adjuntoDTOs = adjuntoRepository.findByCorreoId(c.getId()).stream()
                .map(this::adjuntoToDTO).toList();
        dto.setAdjuntos(adjuntoDTOs);
        dto.setAdjuntosCount(adjuntoDTOs.size());

        dto.setCategoria(c.getCategoria() != null ? c.getCategoria() : "GENERAL");
        dto.setTipo(c.getTipo() != null ? c.getTipo() : "PERSONAL");
        dto.setPrioridad(Boolean.TRUE.equals(c.getEsComunicado()) ? "ALTA" : "NORMAL");
        dto.setThreadId(c.getThreadId());
        dto.setReplicasCount((int) correoRepository.countByThreadId(c.getId()));
        dto.setEsComunicado(Boolean.TRUE.equals(c.getEsComunicado()));
        dto.setAudiencia(c.getAudiencia() != null ? c.getAudiencia() : "INDIVIDUAL");
        dto.setAudienciaCarrera(c.getAudienciaCarrera());
        dto.setAudienciaGrupo(c.getAudienciaGrupo());
        return dto;
    }

    private AdjuntoDTO adjuntoToDTO(CorreoAdjunto a) {
        String downloadUrl = "/correos/adjuntos/" + a.getId() + "/descargar";
        return new AdjuntoDTO(a.getId(), a.getNombreArchivo(), downloadUrl,
                a.getTipoArchivo(), a.getTamanio(), a.getFecha());
    }

    private <T> CorreoPageDTO<T> toPage(List<T> content, Page<?> pg) {
        return new CorreoPageDTO<>(content, pg.getNumber(), pg.getSize(),
                pg.getTotalElements(), pg.getTotalPages());
    }

    private Pageable pageOf(int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        return PageRequest.of(Math.max(page, 0), safeSize);
    }

    private Usuario getUsuario(HttpServletRequest request) {
        return correoAccessService.getUsuario(request);
    }

    private boolean permitirEnvio(Long usuarioId) {
        LocalDateTime ahora  = LocalDateTime.now();
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
        // WebSocket (STOMP) notification
        if (messagingTemplate != null) {
            Map<String, Object> wsPayload = new LinkedHashMap<>();
            wsPayload.put("event",        "mail:new");
            wsPayload.put("id",           correo.getId());
            wsPayload.put("asunto",       correo.getAsunto());
            wsPayload.put("preview",      correo.getCuerpo());
            wsPayload.put("fecha",        correo.getFecha());
            wsPayload.put("emisorId",     emisor.getId());
            wsPayload.put("emisorNombre", emisor.getUsername());
            wsPayload.put("emisorFoto",   emisor.getFotoPerfil());
            for (Long receptorId : receptorIds) {
                usuarioRepository.findById(receptorId)
                        .ifPresent(u -> messagingTemplate.convertAndSendToUser(
                                u.getCorreo(), "/queue/correos", wsPayload));
            }
        }
        // Push notifications
        if (webPushService != null && !correo.getEsBorrador()) {
            for (Long receptorId : receptorIds) {
                try {
                    webPushService.sendMailNotification(receptorId, correo.getId(),
                            emisor.getUsername(), correo.getAsunto());
                } catch (Exception e) {
                    log.warn("Push notification failed for user {}: {}", receptorId, e.getMessage());
                }
            }
        }
    }

    // Validates a single file upload against all constraints
    private ResponseEntity<?> validarAdjunto(MultipartFile archivo, Long correoId) {
        if (archivo == null || archivo.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Archivo vacío"));
        }

        String ext = obtenerExtension(archivo.getOriginalFilename());

        if (DANGEROUS_EXTS.contains(ext)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tipo de archivo peligroso: ." + ext));
        }

        if (!ALLOWED_EXTS.contains(ext)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tipo de archivo no permitido: ." + ext));
        }

        if (archivo.getSize() > maxAttachmentSizeBytes) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "El archivo excede el tamaño máximo por archivo (25 MB)"));
        }

        long conteoActual = adjuntoRepository.countByCorreoId(correoId);
        if (conteoActual >= MAX_ADJUNTOS_POR_CORREO) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "Se alcanzó el límite de " + MAX_ADJUNTOS_POR_CORREO + " adjuntos por correo"));
        }

        long totalActual = adjuntoRepository.sumTamanioByCorreoId(correoId);
        if (totalActual + archivo.getSize() > MAX_TOTAL_SIZE_BYTES) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "El tamaño total de adjuntos excede 100 MB"));
        }

        return null; // OK
    }

    private AdjuntoDTO guardarAdjunto(Long correoId, MultipartFile archivo) throws IOException {
        Path carpeta = Paths.get(uploadDir, "adjuntos");
        if (!Files.exists(carpeta)) Files.createDirectories(carpeta);

        String ext = obtenerExtension(archivo.getOriginalFilename());
        String nombreUUID = UUID.randomUUID() + "." + ext;
        Path destino = carpeta.resolve(nombreUUID);
        Files.copy(archivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);

        String nombreOriginal = sanitizarNombre(archivo.getOriginalFilename());

        CorreoAdjunto adj = new CorreoAdjunto();
        adj.setCorreoId(correoId);
        adj.setNombreArchivo(nombreOriginal);
        adj.setArchivoUrl("/imagenes/adjuntos/" + nombreUUID);   // internal reference only
        adj.setTipoArchivo(archivo.getContentType());
        adj.setTamanio(archivo.getSize());
        adjuntoRepository.save(adj);

        return adjuntoToDTO(adj);
    }

    private String sanitizarNombre(String original) {
        if (original == null || original.isBlank()) return "archivo";
        String base = original.trim();
        // Remove path traversal
        base = base.replace("..", "").replace("/", "").replace("\\", "");
        // Remove dangerous chars
        base = SAFE_NAME_PATTERN.matcher(base).replaceAll("_");
        // Truncate
        if (base.length() > 200) base = base.substring(0, 200);
        return base.isBlank() ? "archivo" : base;
    }

    private String normalizarCategoria(String categoria) {
        if (categoria == null || categoria.isBlank()) return "GENERAL";
        String c = categoria.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        Set<String> permitidas = Set.of(
                "GENERAL", "ACADEMICO", "EQUIPOS", "MARKETPLACE", "EVENTOS",
                "INSTITUCIONAL", "IMPORTANTE", "COORDINACION", "TRAMITE",
                "JUSTIFICANTE", "SOLICITUD", "REPORTE", "AVISO", "DUDA"
        );
        return permitidas.contains(c) ? c : "GENERAL";
    }

    private String normalizarTipo(String tipo) {
        if (tipo == null || tipo.isBlank()) return "PERSONAL";
        String t = tipo.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        Set<String> permitidos = Set.of(
                "PERSONAL", "ACADEMICO", "INSTITUCIONAL", "DOCENTE",
                "EQUIPO", "CLUB", "SISTEMA", "MARKETPLACE", "EVENTO", "COORDINACION"
        );
        return permitidos.contains(t) ? t : "PERSONAL";
    }

    private String obtenerExtension(String nombreOriginal) {
        if (nombreOriginal == null || !nombreOriginal.contains(".")) return "bin";
        return nombreOriginal.substring(nombreOriginal.lastIndexOf(".") + 1).toLowerCase();
    }

    private Map<String, Object> usuarioInstitucional(Usuario u) {
        Map<String, Object> m = new LinkedHashMap<>();
        String nombre = u.getUsername() != null && !u.getUsername().isBlank()
                ? u.getUsername() : u.getCorreo().split("@")[0];
        String correoInstitucional = u.getCorreo();
        boolean verificado = correoInstitucional != null
                && correoInstitucional.toLowerCase().endsWith("@tesvg.edu.mx");

        m.put("id",                   u.getId());
        m.put("nombre",               nombre);
        m.put("username",             nombre);
        m.put("correo",               correoInstitucional);
        m.put("fotoPerfil",           u.getFotoPerfil());
        m.put("carrera",              u.getCarrera());
        m.put("semestre",             u.getGrupo());
        m.put("grupo",                u.getGrupo());
        m.put("matricula",            u.getNumeroControl());
        m.put("numeroControl",        u.getNumeroControl());
        m.put("rol",                  u.getRol() != null ? u.getRol().name() : "ESTUDIANTE");
        m.put("rolLabel",             rolLabel(u.getRol()));
        m.put("departamento",         u.getCarrera() != null && !u.getCarrera().isBlank()
                ? u.getCarrera() : "Instituto Tecnológico Superior del Valle de Guaymas");
        m.put("facultad",             "Instituto Tecnológico Superior del Valle de Guaymas");
        m.put("verificadoInstitucional", verificado);
        return m;
    }

    private String rolLabel(Usuario.Rol rol) {
        if (rol == null) return "Estudiante";
        return switch (rol) {
            case ESTUDIANTE     -> "Estudiante";
            case DOCENTE        -> "Docente";
            case AUTORIDAD      -> "Coordinación";
            case ADMINISTRATIVO -> "Administrativo";
            case PERSONAL       -> "Personal";
            case ADMIN          -> "Administrador";
            case DIRECCION      -> "Dirección";
        };
    }
}
