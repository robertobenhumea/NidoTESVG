package com.tesvg.backend.controller;

import com.tesvg.backend.model.*;
import com.tesvg.backend.dto.*;
import com.tesvg.backend.repository.*;
import com.tesvg.backend.service.RateLimitService;
import com.tesvg.backend.service.RedisCacheService;
import com.tesvg.backend.service.WebPushService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/grupos/chat")
public class ChatGrupoController {
    private static final long MAX_ATTACHMENT_SIZE = 10L * 1024L * 1024L;
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> DOCUMENT_EXTENSIONS = Set.of("pdf", "doc", "docx", "txt");
    private static final Set<String> DANGEROUS_EXTENSIONS = Set.of("html", "htm", "svg", "js", "exe", "bat", "sh", "cmd", "com", "scr", "msi", "jar");

    @Autowired private ChatGrupoRepository grupoRepo;
    @Autowired private ChatGrupoMiembroRepository miembroRepo;
    @Autowired private ChatGrupoMensajeRepository mensajeRepo;
    @Autowired private GroupAttachmentRepository attachmentRepo;
    @Autowired private MessageReactionRepository reactionRepo;
    @Autowired private ChatGrupoMensajeOcultoRepository ocultoRepo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private SimpMessagingTemplate messagingTemplate;
    @Autowired private RedisCacheService redisCacheService;
    @Autowired private RateLimitService rateLimitService;
    @Autowired private ChatAuditLogRepository auditRepository;
    @Autowired private WebPushService webPushService;

    @Value("${app.upload.dir}")
    private String uploadDir;

    private final Map<Long, List<LocalDateTime>> sendRate = new java.util.concurrent.ConcurrentHashMap<>();

    // ── MIS GRUPOS ──
    @GetMapping
    public ResponseEntity<?> misGrupos(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (!rateLimitService.allow("create:group", yo.getId().toString(), 5, Duration.ofHours(1))) {
            audit(yo.getId(), "RATE_LIMIT", "GROUP", null, "create:group");
            return ResponseEntity.status(429).body(Map.of("error", "Espera antes de crear más grupos"));
        }
        List<ChatGrupo> grupos = grupoRepo.findByMiembro(yo.getId());

        List<ChatGroupDTO> resultado = grupos.stream().map(g -> {
            ChatGrupoMiembro miembro = miembroRepo.findByGrupoIdAndUsuarioId(g.getId(), yo.getId()).orElse(null);
            Optional<ChatGrupoMensaje> ultimoOpt = mensajeRepo.findTopByGrupoIdOrderByFechaDesc(g.getId());

            long noLeidos = 0;
            if (miembro != null) {
                LocalDateTime desde = miembro.getUltimaLectura() != null ? miembro.getUltimaLectura() : LocalDateTime.MIN;
                noLeidos = mensajeRepo.countUnread(g.getId(), yo.getId(), desde);
            }

            return toGroupDTO(g, miembro, noLeidos, ultimoOpt.orElse(null));
        }).collect(Collectors.toList());

        return ResponseEntity.ok(resultado);
    }

    // ── NO LEÍDOS TOTAL ──
    @GetMapping("/no-leidos")
    public ResponseEntity<?> noLeidos(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        String key = "chat:groups:unread:" + yo.getId();
        var cached = redisCacheService.get(key, Long.class);
        if (cached.isPresent()) return ResponseEntity.ok(Map.of("count", cached.get()));
        List<ChatGrupo> grupos = grupoRepo.findByMiembro(yo.getId());
        long total = 0;
        for (ChatGrupo g : grupos) {
            ChatGrupoMiembro m = miembroRepo.findByGrupoIdAndUsuarioId(g.getId(), yo.getId()).orElse(null);
            if (m == null) continue;
            LocalDateTime desde = m.getUltimaLectura() != null ? m.getUltimaLectura() : LocalDateTime.MIN;
            total += mensajeRepo.countUnread(g.getId(), yo.getId(), desde);
        }
        redisCacheService.set(key, total, Duration.ofSeconds(15));
        return ResponseEntity.ok(Map.of("count", total));
    }

    // ── CREAR GRUPO ──
    @PostMapping
    public ResponseEntity<?> crearGrupo(@RequestBody CreateChatGroupRequest body, HttpServletRequest request) {
        Usuario yo = getUsuario(request);

        String nombre = body.nombre();
        if (nombre == null || nombre.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre es obligatorio"));
        }
        if (nombre.trim().length() > 100) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre no puede superar 100 caracteres"));
        }

        ChatGrupo g = new ChatGrupo();
        g.setNombre(nombre.trim());
        g.setDescripcion(limit(body.descripcion(), 600));
        g.setFoto(body.foto());
        g.setTipo(body.tipo() != null ? normalizarGrupoTipo(body.tipo()) : "PRIVADO");
        g.setCreadorId(yo.getId());
        g.setActivo(true);
        g.setFechaCreacion(LocalDateTime.now());
        grupoRepo.save(g);

        // Add creator as OWNER
        ChatGrupoMiembro owner = new ChatGrupoMiembro();
        owner.setGrupoId(g.getId());
        owner.setUsuarioId(yo.getId());
        owner.setRol("OWNER");
        owner.setActivo(true);
        owner.setFechaUnion(LocalDateTime.now());
        miembroRepo.save(owner);

        // Add initial members
        List<Long> miembros = body.miembros() != null ? body.miembros() : new ArrayList<>();
        for (Long uid : miembros) {
            long userId = uid;
            if (userId == yo.getId()) continue;
            if (!usuarioRepo.existsById(userId)) continue;
            if (miembroRepo.existsByGrupoIdAndUsuarioIdAndActivoTrue(g.getId(), userId)) continue;
            ChatGrupoMiembro m = new ChatGrupoMiembro();
            m.setGrupoId(g.getId());
            m.setUsuarioId(userId);
            m.setRol("MIEMBRO");
            m.setActivo(true);
            m.setFechaUnion(LocalDateTime.now());
            miembroRepo.save(m);

            // system message
            enviarSistema(g.getId(), yo.getUsername() + " añadió a " + nombreDeUsuario(userId));
        }

        return ResponseEntity.ok(Map.of("id", g.getId(), "nombre", g.getNombre()));
    }

    // ── DETALLE GRUPO ──
    @GetMapping("/{id}")
    public ResponseEntity<?> detalle(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        ChatGrupo g = grupoRepo.findById(id).orElse(null);
        if (g == null || !Boolean.TRUE.equals(g.getActivo())) return ResponseEntity.notFound().build();
        if (!miembroRepo.existsByGrupoIdAndUsuarioIdAndActivoTrue(id, yo.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No eres miembro de este grupo"));
        }

        List<ChatGroupMemberDTO> miembrosList = miembroRepo.findByGrupoIdAndActivoTrue(id)
                .stream()
                .map(this::toMemberDTO)
                .collect(Collectors.toList());

        ChatGrupoMiembro miMiembro = miembroRepo.findByGrupoIdAndUsuarioId(id, yo.getId()).orElse(null);

        ChatGroupDetailDTO result = new ChatGroupDetailDTO(
                g.getId(),
                g.getNombre(),
                g.getDescripcion(),
                resolveUrl(g.getFoto()),
                g.getTipo(),
                g.getCreadorId(),
                miMiembro != null ? miMiembro.getRol() : "MIEMBRO",
                0L,
                g.getFechaCreacion(),
                null,
                null,
                null,
                null,
                miMiembro != null ? miMiembro.getRol() : "MIEMBRO",
                miembrosList,
                miembrosList.stream()
                        .filter(m -> Set.of("OWNER", "ADMIN", "MODERADOR").contains(m.rol()))
                        .toList()
        );
        return ResponseEntity.ok(result);
    }

    // ── ACTUALIZAR GRUPO ──
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        ChatGrupo g = grupoRepo.findById(id).orElse(null);
        if (g == null) return ResponseEntity.notFound().build();

        ChatGrupoMiembro miembro = miembroRepo.findByGrupoIdAndUsuarioId(id, yo.getId()).orElse(null);
        if (!esAdmin(miembro)) return ResponseEntity.status(403).body(Map.of("error", "Sin permiso"));

        if (body.containsKey("nombre")) {
            String nuevoNombre = ((String) body.get("nombre")).trim();
            if (nuevoNombre.isBlank() || nuevoNombre.length() > 100) {
                return ResponseEntity.badRequest().body(Map.of("error", "Nombre inválido"));
            }
            g.setNombre(nuevoNombre);
        }
        if (body.containsKey("descripcion")) g.setDescripcion(limit((String) body.get("descripcion"), 600));
        if (body.containsKey("foto")) g.setFoto((String) body.get("foto"));
        if (body.containsKey("tipo")) g.setTipo(normalizarGrupoTipo((String) body.get("tipo")));
        grupoRepo.save(g);
        enviarSistema(id, yo.getUsername() + " actualizó la información del grupo");

        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── ARCHIVAR GRUPO ──
    @DeleteMapping("/{id}")
    public ResponseEntity<?> archivar(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        ChatGrupo g = grupoRepo.findById(id).orElse(null);
        if (g == null) return ResponseEntity.notFound().build();
        if (!g.getCreadorId().equals(yo.getId())) return ResponseEntity.status(403).body(Map.of("error", "Solo el creador puede archivar el grupo"));

        g.setActivo(false);
        grupoRepo.save(g);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── MENSAJES ──
    @GetMapping("/{id}/mensajes")
    public ResponseEntity<?> getMensajes(@PathVariable Long id,
                                         @RequestParam(required = false) Long beforeId,
                                         @RequestParam(defaultValue = "50") int limit,
                                         HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (!miembroRepo.existsByGrupoIdAndUsuarioIdAndActivoTrue(id, yo.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No eres miembro de este grupo"));
        }

        miembroRepo.actualizarUltimaLectura(id, yo.getId(), LocalDateTime.now());

        int safeLimit = Math.max(1, Math.min(limit, 100));
        List<ChatGrupoMensaje> raw = beforeId != null
                ? mensajeRepo.findBeforeByGrupoId(id, beforeId, PageRequest.of(0, safeLimit))
                : mensajeRepo.findLatestByGrupoId(id, PageRequest.of(0, safeLimit));
        Collections.reverse(raw);
        List<ChatGrupoMensaje> mensajes = filtrarOcultos(raw, yo.getId());
        List<ChatGroupMessageDTO> resultado = mensajes.stream()
                .map(m -> toMessageDTO(m, yo.getId()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(resultado);
    }

    // ── ENVIAR MENSAJE ──
    @PostMapping("/{id}/mensajes")
    public ResponseEntity<?> enviar(@PathVariable Long id, @RequestBody SendGroupMessageRequest body, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (!miembroRepo.existsByGrupoIdAndUsuarioIdAndActivoTrue(id, yo.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No eres miembro de este grupo"));
        }

        String contenido = body.contenido() != null ? body.contenido() : "";
        String tipo = body.messageType() != null ? body.messageType() : body.tipo() != null ? body.tipo() : "TEXT";
        String archivoUrl = body.fileUrl() != null ? body.fileUrl() : body.archivoUrl();
        String nombreArchivo = body.fileName() != null ? body.fileName() : body.nombreArchivo();
        Long replyToMessageId = body.replyToMessageId();
        if (contenido.isBlank() && archivoUrl == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "El mensaje no puede estar vacío"));
        }
        if (contenido.length() > 4000) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mensaje demasiado largo"));
        }
        ChatGrupoMiembro mi = miembroRepo.findByGrupoIdAndUsuarioId(id, yo.getId()).orElse(null);
        if (mi == null || Boolean.TRUE.equals(mi.getSilenciado())) {
            return ResponseEntity.status(403).body(Map.of("error", "No puedes enviar mensajes en este grupo"));
        }
        if (!allowSend(yo.getId())) {
            audit(yo.getId(), "RATE_LIMIT", "GROUP_MESSAGE", id, "send:group");
            return ResponseEntity.status(429).body(Map.of("error", "Demasiados mensajes, intenta de nuevo en un momento"));
        }

        ChatGrupoMensaje m = new ChatGrupoMensaje();
        m.setGrupoId(id);
        m.setEmisorId(yo.getId());
        m.setContenido(contenido.trim());
        m.setTipo(normalizarTipo(tipo));
        m.setArchivoUrl(archivoUrl);
        m.setNombreArchivo(nombreArchivo);
        m.setFileType(body.fileType());
        m.setFileSize(body.fileSize());
        m.setReferenciaId(validReplyId(id, replyToMessageId));
        m.setReenviado(Boolean.TRUE.equals(body.forwarded()));
        m.setMensajeOriginalId(body.originalMessageId());
        m.setEliminado(false);
        m.setEsSistema(false);
        m.setEditado(false);
        m.setFecha(LocalDateTime.now());
        mensajeRepo.save(m);
        redisCacheService.deleteByPrefix("chat:groups:unread:");

        if (archivoUrl != null && !archivoUrl.isBlank()) {
            GroupAttachment attachment = new GroupAttachment();
            attachment.setGrupoId(id);
            attachment.setMensajeId(m.getId());
            attachment.setUsuarioId(yo.getId());
            attachment.setUrl(archivoUrl);
            attachment.setNombreArchivo(nombreArchivo);
            attachment.setTipoArchivo(m.getFileType());
            attachment.setTipo(m.getTipo());
            attachment.setTamanio(m.getFileSize());
            attachment.setActivo(true);
            attachment.setFechaCreacion(m.getFecha());
            attachmentRepo.save(attachment);
        }

        miembroRepo.actualizarUltimaLectura(id, yo.getId(), m.getFecha());

        ChatGroupMessageDTO dto = toMessageDTO(m, yo.getId());
        publishGroupEvent("message.created", id, m.getId(), dto, yo.getId());
        notifyGroupMembers(id, yo, m);
        return ResponseEntity.ok(dto);
    }

    @PostMapping(value = "/{id}/mensajes/adjunto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> enviarConAdjunto(@PathVariable Long id,
                                              @RequestParam(value = "contenido", required = false) String contenido,
                                              @RequestParam(value = "content", required = false) String content,
                                              @RequestParam(value = "replyToMessageId", required = false) Long replyToMessageId,
                                              @RequestParam(value = "groupId", required = false) Long groupId,
                                              @RequestParam(value = "archivo", required = false) MultipartFile archivo,
                                              @RequestParam(value = "file", required = false) MultipartFile file,
                                              HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (groupId != null && !groupId.equals(id)) {
            return ResponseEntity.badRequest().body(Map.of("error", "groupId inválido"));
        }
        ChatGrupoMiembro mi = miembroRepo.findByGrupoIdAndUsuarioId(id, yo.getId()).orElse(null);
        if (mi == null || !Boolean.TRUE.equals(mi.getActivo())) {
            return ResponseEntity.status(403).body(Map.of("error", "No eres miembro de este grupo"));
        }
        if (Boolean.TRUE.equals(mi.getSilenciado())) {
            return ResponseEntity.status(403).body(Map.of("error", "No puedes enviar mensajes en este grupo"));
        }
        if (!allowSend(yo.getId())) {
            audit(yo.getId(), "RATE_LIMIT", "GROUP_MESSAGE", id, "send:group");
            return ResponseEntity.status(429).body(Map.of("error", "Demasiados mensajes, intenta de nuevo en un momento"));
        }
        if (!rateLimitService.allow("upload:group", yo.getId().toString(), 20, Duration.ofMinutes(1))) {
            return ResponseEntity.status(429).body(Map.of("error", "Demasiadas subidas, intenta de nuevo en un momento"));
        }

        AttachmentData data;
        try {
            data = guardarAdjunto(resolveMultipart(archivo, file), "grupos-chat", "/imagenes/grupos-chat/");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Error al guardar el archivo"));
        }

        ChatGrupoMensaje m = new ChatGrupoMensaje();
        m.setGrupoId(id);
        m.setEmisorId(yo.getId());
        m.setContenido(resolveText(contenido, content).trim());
        m.setTipo(data.messageType());
        m.setArchivoUrl(data.url());
        m.setNombreArchivo(data.fileName());
        m.setFileType(data.fileType());
        m.setFileSize(data.fileSize());
        m.setReferenciaId(validReplyId(id, replyToMessageId));
        m.setReenviado(false);
        m.setEliminado(false);
        m.setEsSistema(false);
        m.setEditado(false);
        m.setFecha(LocalDateTime.now());
        mensajeRepo.save(m);
        redisCacheService.deleteByPrefix("chat:groups:unread:");

        GroupAttachment attachment = new GroupAttachment();
        attachment.setGrupoId(id);
        attachment.setMensajeId(m.getId());
        attachment.setUsuarioId(yo.getId());
        attachment.setUrl(data.url());
        attachment.setNombreArchivo(data.fileName());
        attachment.setTipoArchivo(data.fileType());
        attachment.setTipo(data.messageType());
        attachment.setTamanio(data.fileSize());
        attachment.setActivo(true);
        attachment.setFechaCreacion(m.getFecha());
        attachmentRepo.save(attachment);

        miembroRepo.actualizarUltimaLectura(id, yo.getId(), m.getFecha());
        ChatGroupMessageDTO dto = toMessageDTO(m, yo.getId());
        publishGroupEvent("message.created", id, m.getId(), dto, yo.getId());
        notifyGroupMembers(id, yo, m);
        return ResponseEntity.ok(dto);
    }

    // ── EDITAR MENSAJE ──
    @PutMapping("/{id}/mensajes/{msgId}")
    public ResponseEntity<?> editarMensaje(@PathVariable Long id,
                                           @PathVariable Long msgId,
                                           @RequestBody UpdateGroupMessageRequest body,
                                           HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        ChatGrupoMensaje m = mensajeRepo.findById(msgId).orElse(null);
        if (m == null || !m.getGrupoId().equals(id)) return ResponseEntity.notFound().build();
        ChatGrupoMiembro miembro = miembroRepo.findByGrupoIdAndUsuarioId(id, yo.getId()).orElse(null);
        if (miembro == null || !Boolean.TRUE.equals(miembro.getActivo())) {
            return ResponseEntity.status(403).body(Map.of("error", "No eres miembro de este grupo"));
        }
        if (Boolean.TRUE.equals(miembro.getSilenciado())) {
            return ResponseEntity.status(403).body(Map.of("error", "No puedes editar mensajes en este grupo"));
        }
        if (!m.getEmisorId().equals(yo.getId()) || Boolean.TRUE.equals(m.getEsSistema())) {
            return ResponseEntity.status(403).body(Map.of("error", "Solo puedes editar tus mensajes"));
        }

        String contenido = body.contenido() != null ? body.contenido().trim() : "";
        if (contenido.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "El mensaje no puede quedar vacío"));
        if (contenido.length() > 4000) return ResponseEntity.badRequest().body(Map.of("error", "Mensaje demasiado largo"));

        m.setContenido(contenido);
        m.setEditado(true);
        m.setActualizadoEn(LocalDateTime.now());
        mensajeRepo.save(m);
        ChatGroupMessageDTO dto = toMessageDTO(m, yo.getId());
        publishGroupEvent("message.updated", id, m.getId(), dto, yo.getId());
        return ResponseEntity.ok(dto);
    }

    // ── REACCIONES ──
    @PostMapping("/{id}/mensajes/{msgId}/reacciones")
    public ResponseEntity<?> toggleReaccion(@PathVariable Long id,
                                            @PathVariable Long msgId,
                                            @RequestBody ReactionRequest body,
                                            HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        ChatGrupoMensaje m = mensajeRepo.findById(msgId).orElse(null);
        if (m == null || !m.getGrupoId().equals(id)) return ResponseEntity.notFound().build();
        if (!miembroRepo.existsByGrupoIdAndUsuarioIdAndActivoTrue(id, yo.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No eres miembro de este grupo"));
        }
        if (!rateLimitService.allow("reaction:group", yo.getId().toString(), 80, Duration.ofMinutes(1))) {
            audit(yo.getId(), "RATE_LIMIT", "GROUP_REACTION", msgId, "reaction:group");
            return ResponseEntity.status(429).body(Map.of("error", "Espera unos segundos antes de reaccionar de nuevo"));
        }
        if (Boolean.TRUE.equals(m.getEliminado()) || Boolean.TRUE.equals(m.getEsSistema())) {
            return ResponseEntity.badRequest().body(Map.of("error", "No se puede reaccionar a este mensaje"));
        }

        String reactionType = normalizarReaccion(body.reactionType());
        Optional<MessageReaction> current = reactionRepo.findByMessageIdAndUsuarioId(msgId, yo.getId());
        if (current.isPresent() && current.get().getReactionType().equals(reactionType)) {
            reactionRepo.delete(current.get());
        } else {
            MessageReaction reaction = current.orElse(new MessageReaction());
            reaction.setMessageId(msgId);
            reaction.setUsuarioId(yo.getId());
            reaction.setReactionType(reactionType);
            reaction.setFecha(LocalDateTime.now());
            reactionRepo.save(reaction);
        }

        ChatGroupMessageDTO dto = toMessageDTO(m, yo.getId());
        publishGroupEvent("reaction.updated", id, m.getId(), dto, yo.getId());
        return ResponseEntity.ok(dto);
    }

    // ── REENVIAR MENSAJE ──
    @PostMapping("/{id}/mensajes/{msgId}/reenviar")
    public ResponseEntity<?> reenviar(@PathVariable Long id,
                                      @PathVariable Long msgId,
                                      @RequestBody ForwardGroupMessageRequest body,
                                      HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        ChatGrupoMensaje original = mensajeRepo.findById(msgId).orElse(null);
        if (original == null || !original.getGrupoId().equals(id)) return ResponseEntity.notFound().build();
        if (!miembroRepo.existsByGrupoIdAndUsuarioIdAndActivoTrue(id, yo.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No eres miembro del grupo origen"));
        }
        if (Boolean.TRUE.equals(original.getEliminado()) || Boolean.TRUE.equals(original.getEsSistema())) {
            return ResponseEntity.badRequest().body(Map.of("error", "No se puede reenviar este mensaje"));
        }
        if (!rateLimitService.allow("forward:group", yo.getId().toString(), 10, Duration.ofMinutes(1))) {
            audit(yo.getId(), "RATE_LIMIT", "GROUP_FORWARD", msgId, "forward:group");
            return ResponseEntity.status(429).body(Map.of("error", "Estás reenviando demasiado rápido"));
        }

        Long destinoId = body.grupoId() != null ? body.grupoId() : id;
        if (!miembroRepo.existsByGrupoIdAndUsuarioIdAndActivoTrue(destinoId, yo.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No eres miembro del grupo destino"));
        }

        ChatGrupoMensaje copy = new ChatGrupoMensaje();
        copy.setGrupoId(destinoId);
        copy.setEmisorId(yo.getId());
        copy.setContenido(original.getContenido());
        copy.setTipo(original.getTipo());
        copy.setArchivoUrl(original.getArchivoUrl());
        copy.setNombreArchivo(original.getNombreArchivo());
        copy.setReferenciaId(null);
        copy.setEliminado(false);
        copy.setEsSistema(false);
        copy.setEditado(false);
        copy.setReenviado(true);
        copy.setMensajeOriginalId(original.getId());
        copy.setFecha(LocalDateTime.now());
        mensajeRepo.save(copy);
        miembroRepo.actualizarUltimaLectura(destinoId, yo.getId(), copy.getFecha());
        ChatGroupMessageDTO dto = toMessageDTO(copy, yo.getId());
        publishGroupEvent("message.created", destinoId, copy.getId(), dto, yo.getId());
        return ResponseEntity.ok(dto);
    }

    // ── ELIMINAR MENSAJE ──
    @DeleteMapping("/{id}/mensajes/{msgId}")
    public ResponseEntity<?> eliminarMensaje(@PathVariable Long id, @PathVariable Long msgId, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        ChatGrupoMensaje m = mensajeRepo.findById(msgId).orElse(null);
        if (m == null || !m.getGrupoId().equals(id)) return ResponseEntity.notFound().build();

        String modo = Optional.ofNullable(request.getParameter("modo")).orElse("todos");
        if ("para-mi".equals(modo)) {
            if (!miembroRepo.existsByGrupoIdAndUsuarioIdAndActivoTrue(id, yo.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "No eres miembro de este grupo"));
            }
            if (!ocultoRepo.existsByMensajeIdAndUsuarioId(msgId, yo.getId())) {
                ChatGrupoMensajeOculto oculto = new ChatGrupoMensajeOculto();
                oculto.setMensajeId(msgId);
                oculto.setUsuarioId(yo.getId());
                oculto.setFecha(LocalDateTime.now());
                ocultoRepo.save(oculto);
            }
            return ResponseEntity.ok(Map.of("ok", true));
        }

        ChatGrupoMiembro miembro = miembroRepo.findByGrupoIdAndUsuarioId(id, yo.getId()).orElse(null);
        boolean esAutor = m.getEmisorId().equals(yo.getId());
        boolean tienePermiso = esAutor || esAdmin(miembro);
        if (!tienePermiso) return ResponseEntity.status(403).body(Map.of("error", "Sin permiso"));

        m.setEliminado(true);
        m.setContenido("Este mensaje fue eliminado");
        mensajeRepo.save(m);
        publishGroupEvent("message.deleted", id, msgId, toMessageDTO(m, yo.getId()), yo.getId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── MIEMBROS ──
    @GetMapping("/{id}/miembros")
    public ResponseEntity<?> getMiembros(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (!miembroRepo.existsByGrupoIdAndUsuarioIdAndActivoTrue(id, yo.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No eres miembro de este grupo"));
        }

        List<ChatGroupMemberDTO> lista = miembroRepo.findByGrupoIdAndActivoTrue(id)
                .stream()
                .map(this::toMemberDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(lista);
    }

    // ── AÑADIR MIEMBROS ──
    @PostMapping("/{id}/miembros")
    public ResponseEntity<?> addMiembros(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        ChatGrupoMiembro miembro = miembroRepo.findByGrupoIdAndUsuarioId(id, yo.getId()).orElse(null);
        if (!esAdmin(miembro)) return ResponseEntity.status(403).body(Map.of("error", "Solo admins pueden añadir miembros"));

        @SuppressWarnings("unchecked")
        List<Number> uids = (List<Number>) body.get("usuarioIds");
        if (uids == null || uids.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Sin usuarios"));

        int added = 0;
        for (Number uid : uids) {
            long userId = uid.longValue();
            if (!usuarioRepo.existsById(userId)) continue;
            Optional<ChatGrupoMiembro> existente = miembroRepo.findByGrupoIdAndUsuarioId(id, userId);
            if (existente.isPresent()) {
                if (Boolean.TRUE.equals(existente.get().getActivo())) continue;
                existente.get().setActivo(true);
                existente.get().setFechaUnion(LocalDateTime.now());
                miembroRepo.save(existente.get());
            } else {
                ChatGrupoMiembro m = new ChatGrupoMiembro();
                m.setGrupoId(id);
                m.setUsuarioId(userId);
                m.setRol("MIEMBRO");
                m.setActivo(true);
                m.setFechaUnion(LocalDateTime.now());
                miembroRepo.save(m);
            }
            enviarSistema(id, yo.getUsername() + " añadió a " + nombreDeUsuario(userId));
            added++;
        }

        return ResponseEntity.ok(Map.of("added", added));
    }

    // ── UNIRSE A GRUPO PUBLICO ──
    @PostMapping("/{id}/unirse")
    public ResponseEntity<?> unirse(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        ChatGrupo g = grupoRepo.findById(id).orElse(null);
        if (g == null || !Boolean.TRUE.equals(g.getActivo())) return ResponseEntity.notFound().build();
        if (!"PUBLICO".equals(g.getTipo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Este grupo requiere invitación"));
        }
        if (miembroRepo.existsByGrupoIdAndUsuarioIdAndActivoTrue(id, yo.getId())) {
            return ResponseEntity.ok(Map.of("ok", true));
        }
        ChatGrupoMiembro miembro = miembroRepo.findByGrupoIdAndUsuarioId(id, yo.getId()).orElse(new ChatGrupoMiembro());
        miembro.setGrupoId(id);
        miembro.setUsuarioId(yo.getId());
        miembro.setRol("MIEMBRO");
        miembro.setActivo(true);
        miembro.setSilenciado(false);
        miembro.setFechaUnion(LocalDateTime.now());
        miembroRepo.save(miembro);
        enviarSistema(id, yo.getUsername() + " se unió al grupo");
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── REMOVER MIEMBRO ──
    @DeleteMapping("/{id}/miembros/{uid}")
    public ResponseEntity<?> removeMiembro(@PathVariable Long id, @PathVariable Long uid, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        ChatGrupoMiembro miembro = miembroRepo.findByGrupoIdAndUsuarioId(id, yo.getId()).orElse(null);

        boolean esSelf = yo.getId().equals(uid);
        if (!esSelf && !esAdmin(miembro)) return ResponseEntity.status(403).body(Map.of("error", "Sin permiso"));

        ChatGrupoMiembro objetivo = miembroRepo.findByGrupoIdAndUsuarioId(id, uid).orElse(null);
        if (objetivo == null) return ResponseEntity.notFound().build();

        // OWNER cannot be removed unless they leave themselves
        if ("OWNER".equals(objetivo.getRol()) && !esSelf) {
            return ResponseEntity.status(403).body(Map.of("error", "No puedes remover al creador"));
        }

        objetivo.setActivo(false);
        miembroRepo.save(objetivo);
        audit(yo.getId(), esSelf ? "GROUP_MEMBER_LEFT" : "GROUP_MEMBER_REMOVED", "GROUP_MEMBER", uid, "grupo=" + id);

        String nombreSaliente = nombreDeUsuario(uid);
        String msg = esSelf ? nombreSaliente + " salió del grupo"
                : yo.getUsername() + " removió a " + nombreSaliente;
        enviarSistema(id, msg);

        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── CAMBIAR ROL ──
    @PutMapping("/{id}/miembros/{uid}/rol")
    public ResponseEntity<?> cambiarRol(@PathVariable Long id, @PathVariable Long uid, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        ChatGrupoMiembro miMiembro = miembroRepo.findByGrupoIdAndUsuarioId(id, yo.getId()).orElse(null);

        if (!"OWNER".equals(miMiembro != null ? miMiembro.getRol() : "")) {
            return ResponseEntity.status(403).body(Map.of("error", "Solo el owner puede cambiar roles"));
        }

        String nuevoRol = normalizarRol((String) body.get("rol"));
        ChatGrupoMiembro objetivo = miembroRepo.findByGrupoIdAndUsuarioId(id, uid).orElse(null);
        if (objetivo == null) return ResponseEntity.notFound().build();
        if ("OWNER".equals(objetivo.getRol())) return ResponseEntity.status(400).body(Map.of("error", "No puedes cambiar el rol del owner"));

        objetivo.setRol(nuevoRol);
        miembroRepo.save(objetivo);
        audit(yo.getId(), "GROUP_ROLE_CHANGED", "GROUP_MEMBER", uid, "grupo=" + id + ",rol=" + nuevoRol);
        enviarSistema(id, yo.getUsername() + " cambió el rol de " + nombreDeUsuario(uid) + " a " + nuevoRol);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── SILENCIAR / ACTIVAR MIEMBRO ──
    @PutMapping("/{id}/miembros/{uid}/silencio")
    public ResponseEntity<?> silenciar(@PathVariable Long id, @PathVariable Long uid, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        ChatGrupoMiembro miMiembro = miembroRepo.findByGrupoIdAndUsuarioId(id, yo.getId()).orElse(null);
        if (!esAdmin(miMiembro)) return ResponseEntity.status(403).body(Map.of("error", "Sin permiso"));

        ChatGrupoMiembro objetivo = miembroRepo.findByGrupoIdAndUsuarioId(id, uid).orElse(null);
        if (objetivo == null || "OWNER".equals(objetivo.getRol())) return ResponseEntity.status(403).body(Map.of("error", "No se puede modificar este miembro"));
        boolean silenciado = Boolean.TRUE.equals(body.get("silenciado"));
        objetivo.setSilenciado(silenciado);
        miembroRepo.save(objetivo);
        audit(yo.getId(), "GROUP_MEMBER_MUTED", "GROUP_MEMBER", uid, "grupo=" + id + ",silenciado=" + silenciado);
        enviarSistema(id, yo.getUsername() + (silenciado ? " silenció a " : " activó a ") + nombreDeUsuario(uid));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── ADJUNTO ──
    @PostMapping("/{id}/adjunto")
    public ResponseEntity<?> subirAdjunto(@PathVariable Long id,
                                           @RequestParam(value = "archivo", required = false) MultipartFile archivo,
                                           @RequestParam(value = "file", required = false) MultipartFile file,
                                           HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (!miembroRepo.existsByGrupoIdAndUsuarioIdAndActivoTrue(id, yo.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No eres miembro de este grupo"));
        }
        if (!rateLimitService.allow("upload:group", yo.getId().toString(), 20, Duration.ofMinutes(1))) {
            audit(yo.getId(), "RATE_LIMIT", "GROUP_UPLOAD", id, "upload:group");
            return ResponseEntity.status(429).body(Map.of("error", "Demasiadas subidas, intenta de nuevo en un momento"));
        }

        try {
            AttachmentData data = guardarAdjunto(resolveMultipart(archivo, file), "grupos-chat", "/imagenes/grupos-chat/");
            return ResponseEntity.ok(Map.of(
                    "url", data.url(),
                    "tipo", data.messageType(),
                    "messageType", data.messageType(),
                    "nombre", data.fileName(),
                    "fileName", data.fileName(),
                    "tamanio", data.fileSize(),
                    "fileSize", data.fileSize(),
                    "tipoArchivo", data.fileType(),
                    "fileType", data.fileType()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Error al guardar el archivo"));
        }
    }

    // ── ARCHIVOS COMPARTIDOS ──
    @GetMapping("/{id}/adjuntos")
    public ResponseEntity<?> adjuntos(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (!miembroRepo.existsByGrupoIdAndUsuarioIdAndActivoTrue(id, yo.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No eres miembro de este grupo"));
        }
        return ResponseEntity.ok(attachmentRepo.findByGrupoIdAndActivoTrueOrderByFechaCreacionDesc(id).stream().map(a -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", a.getId());
            map.put("mensajeId", a.getMensajeId());
            map.put("usuarioId", a.getUsuarioId());
            map.put("url", "/grupos/chat/files/" + a.getId());
            map.put("nombreArchivo", a.getNombreArchivo());
            map.put("tipoArchivo", a.getTipoArchivo());
            map.put("tipo", a.getTipo());
            map.put("tamanio", a.getTamanio());
            map.put("fechaCreacion", a.getFechaCreacion());
            usuarioRepo.findById(a.getUsuarioId()).ifPresent(u -> map.put("usuarioNombre", u.getUsername()));
            return map;
        }).toList());
    }

    @GetMapping("/files/{attachmentId}")
    public ResponseEntity<?> descargarAdjuntoSeguro(@PathVariable Long attachmentId, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        GroupAttachment attachment = attachmentRepo.findById(attachmentId).orElse(null);
        if (attachment == null || !Boolean.TRUE.equals(attachment.getActivo())) {
            return ResponseEntity.notFound().build();
        }
        if (!miembroRepo.existsByGrupoIdAndUsuarioIdAndActivoTrue(attachment.getGrupoId(), yo.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No puedes ver este adjunto"));
        }

        String nombre = fileNameFromUrl(attachment.getUrl());
        return servirAdjunto(Paths.get(uploadDir, "grupos-chat").resolve(nombre), attachment.getNombreArchivo(), nombre);
    }

    // ── LINKS COMPARTIDOS ──
    @GetMapping("/{id}/links")
    public ResponseEntity<?> links(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (!miembroRepo.existsByGrupoIdAndUsuarioIdAndActivoTrue(id, yo.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No eres miembro de este grupo"));
        }
        return ResponseEntity.ok(mensajeRepo.findLinksByGrupoId(id).stream().map(m -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("mensajeId", m.getId());
            map.put("contenido", m.getContenido());
            map.put("fecha", m.getFecha());
            map.put("emisorId", m.getEmisorId());
            usuarioRepo.findById(m.getEmisorId()).ifPresent(u -> map.put("emisorNombre", u.getUsername()));
            return map;
        }).toList());
    }

    // ── MARCAR LEÍDO ──
    @PutMapping("/{id}/leer")
    public ResponseEntity<?> marcarLeido(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (!miembroRepo.existsByGrupoIdAndUsuarioIdAndActivoTrue(id, yo.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No eres miembro de este grupo"));
        }
        miembroRepo.actualizarUltimaLectura(id, yo.getId(), LocalDateTime.now());
        redisCacheService.delete("chat:groups:unread:" + yo.getId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── HELPERS ──
    private ChatGroupDTO toGroupDTO(ChatGrupo g, ChatGrupoMiembro miembro, long noLeidos, ChatGrupoMensaje ultimo) {
        String ultimoMensaje = null;
        String ultimoTipo = null;
        LocalDateTime ultimaFecha = null;
        String ultimoEmisor = null;
        if (ultimo != null) {
            ultimoMensaje = buildPreview(ultimo);
            ultimoTipo = ultimo.getTipo();
            ultimaFecha = ultimo.getFecha();
            if (!Boolean.TRUE.equals(ultimo.getEsSistema())) {
                ultimoEmisor = usuarioRepo.findById(ultimo.getEmisorId()).map(Usuario::getUsername).orElse(null);
            }
        }
        return new ChatGroupDTO(
                g.getId(),
                g.getNombre(),
                g.getDescripcion(),
                resolveUrl(g.getFoto()),
                g.getTipo(),
                g.getCreadorId(),
                miembro != null ? miembro.getRol() : "MIEMBRO",
                noLeidos,
                g.getFechaCreacion(),
                ultimoMensaje,
                ultimoTipo,
                ultimaFecha,
                ultimoEmisor
        );
    }

    private ChatGroupMemberDTO toMemberDTO(ChatGrupoMiembro m) {
        Optional<Usuario> usuario = usuarioRepo.findById(m.getUsuarioId());
        return new ChatGroupMemberDTO(
                m.getUsuarioId(),
                m.getRol(),
                m.getFechaUnion(),
                Boolean.TRUE.equals(m.getSilenciado()),
                usuario.map(Usuario::getUsername).orElse("Usuario"),
                resolveUrl(usuario.map(Usuario::getFotoPerfil).orElse(null)),
                usuario.map(Usuario::getCarrera).orElse(null)
        );
    }

    private ChatGroupMessageDTO toMessageDTO(ChatGrupoMensaje m, Long currentUserId) {
        Optional<Usuario> emisor = Boolean.TRUE.equals(m.getEsSistema())
                ? Optional.empty()
                : usuarioRepo.findById(m.getEmisorId());
        ReplyPreviewDTO replyPreview = buildReplyPreview(m.getReferenciaId());
        List<MessageReactionDTO> reactions = buildReactions(m.getId(), currentUserId);
        String myReaction = reactionRepo.findByMessageIdAndUsuarioId(m.getId(), currentUserId)
                .map(MessageReaction::getReactionType)
                .orElse(null);
        return new ChatGroupMessageDTO(
                m.getId(),
                m.getGrupoId(),
                m.getEmisorId(),
                m.getContenido(),
                m.getFecha(),
                normalizarTipo(m.getTipo()),
                normalizarTipo(m.getTipo()),
                resolveUrl(m.getArchivoUrl()),
                m.getNombreArchivo(),
                m.getFileType(),
                m.getFileSize(),
                resolveUrl(m.getArchivoUrl()),
                m.getNombreArchivo(),
                Boolean.TRUE.equals(m.getEliminado()),
                Boolean.TRUE.equals(m.getEsSistema()),
                m.getReferenciaId(),
                replyPreview,
                Boolean.TRUE.equals(m.getEditado()),
                m.getActualizadoEn(),
                Boolean.TRUE.equals(m.getReenviado()),
                m.getMensajeOriginalId(),
                reactions,
                myReaction,
                m.getFecha(),
                emisor.map(Usuario::getUsername).orElse(null),
                resolveUrl(emisor.map(Usuario::getFotoPerfil).orElse(null))
        );
    }

    private void enviarSistema(Long grupoId, String texto) {
        ChatGrupoMensaje sys = new ChatGrupoMensaje();
        sys.setGrupoId(grupoId);
        sys.setEmisorId(0L);
        sys.setContenido(texto);
        sys.setTipo("TEXT");
        sys.setEliminado(false);
        sys.setEsSistema(true);
        sys.setFecha(LocalDateTime.now());
        mensajeRepo.save(sys);
        publishGroupEvent("message.created", grupoId, sys.getId(), toMessageDTO(sys, 0L), 0L);
    }

    private void publishGroupEvent(String type, Long grupoId, Long messageId, ChatGroupMessageDTO message, Long actorId) {
        ChatRealtimeEventDTO event = new ChatRealtimeEventDTO(type, grupoId, messageId, message, actorId);
        messagingTemplate.convertAndSend("/topic/grupos/" + grupoId + "/events", event);
        redisCacheService.publish("falconnet:chat-events", event);
    }

    private void notifyGroupMembers(Long grupoId, Usuario sender, ChatGrupoMensaje message) {
        try {
            ChatGrupo grupo = grupoRepo.findById(grupoId).orElse(null);
            String title = grupo != null ? grupo.getNombre() : "FalconNet";
            String body = sender.getUsername() + ": " + ("TEXT".equals(normalizarTipo(message.getTipo()))
                    ? previewText(message.getContenido(), 80)
                    : "IMAGE".equals(normalizarTipo(message.getTipo())) ? "Imagen" : "Documento");
            for (ChatGrupoMiembro member : miembroRepo.findByGrupoIdAndActivoTrue(grupoId)) {
                if (member.getUsuarioId().equals(sender.getId())) continue;
                webPushService.sendToUser(member.getUsuarioId(), title, body, "/messages/groups/" + grupoId);
            }
        } catch (Exception ignored) {
            // Push is best-effort and must not affect group messaging.
        }
    }

    private List<ChatGrupoMensaje> filtrarOcultos(List<ChatGrupoMensaje> mensajes, Long usuarioId) {
        if (mensajes.isEmpty()) return mensajes;
        List<Long> ids = mensajes.stream().map(ChatGrupoMensaje::getId).toList();
        Set<Long> ocultos = ocultoRepo.findByUsuarioIdAndMensajeIdIn(usuarioId, ids)
                .stream()
                .map(ChatGrupoMensajeOculto::getMensajeId)
                .collect(Collectors.toSet());
        return mensajes.stream().filter(m -> !ocultos.contains(m.getId())).toList();
    }

    private Long validReplyId(Long grupoId, Long replyToMessageId) {
        if (replyToMessageId == null) return null;
        return mensajeRepo.findById(replyToMessageId)
                .filter(m -> m.getGrupoId().equals(grupoId))
                .map(ChatGrupoMensaje::getId)
                .orElse(null);
    }

    private ReplyPreviewDTO buildReplyPreview(Long referenciaId) {
        if (referenciaId == null) return null;
        return mensajeRepo.findById(referenciaId).map(ref -> {
            String senderName = Boolean.TRUE.equals(ref.getEsSistema())
                    ? "Sistema"
                    : usuarioRepo.findById(ref.getEmisorId()).map(Usuario::getUsername).orElse("Usuario");
            String contenido = Boolean.TRUE.equals(ref.getEliminado())
                    ? "Mensaje eliminado"
                    : previewText(ref.getContenido(), 120);
            return new ReplyPreviewDTO(
                    ref.getId(),
                    ref.getEmisorId(),
                    senderName,
                    contenido,
                    ref.getTipo(),
                    Boolean.TRUE.equals(ref.getEliminado())
            );
        }).orElse(null);
    }

    private List<MessageReactionDTO> buildReactions(Long messageId, Long currentUserId) {
        List<MessageReaction> reactions = reactionRepo.findByMessageId(messageId);
        Map<String, Long> counts = reactions.stream()
                .collect(Collectors.groupingBy(MessageReaction::getReactionType, LinkedHashMap::new, Collectors.counting()));
        Set<String> mine = reactions.stream()
                .filter(r -> r.getUsuarioId().equals(currentUserId))
                .map(MessageReaction::getReactionType)
                .collect(Collectors.toSet());
        return counts.entrySet().stream()
                .map(e -> new MessageReactionDTO(e.getKey(), e.getValue(), mine.contains(e.getKey())))
                .toList();
    }

    private String normalizarReaccion(String reactionType) {
        if (reactionType == null) return "👍";
        return switch (reactionType) {
            case "❤️", "👍", "😂", "😮" -> reactionType;
            default -> "👍";
        };
    }

    private String previewText(String value, int max) {
        if (value == null || value.isBlank()) return "Archivo";
        String clean = value.trim();
        return clean.length() <= max ? clean : clean.substring(0, max).trim() + "…";
    }

    private String nombreDeUsuario(Long uid) {
        return usuarioRepo.findById(uid).map(Usuario::getUsername).orElse("Usuario");
    }

    private boolean esAdmin(ChatGrupoMiembro m) {
        if (m == null || !Boolean.TRUE.equals(m.getActivo())) return false;
        String rol = m.getRol();
        return "OWNER".equals(rol) || "ADMIN".equals(rol) || "MODERADOR".equals(rol);
    }

    private String buildPreview(ChatGrupoMensaje m) {
        if (Boolean.TRUE.equals(m.getEsSistema())) return m.getContenido();
        return switch (normalizarTipo(m.getTipo())) {
            case "IMAGE" -> "Imagen";
            case "DOCUMENT" -> "Documento: " + (m.getNombreArchivo() != null ? m.getNombreArchivo() : "Archivo");
            default -> m.getContenido();
        };
    }

    private Usuario getUsuario(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        return usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private String normalizarTipo(String tipo) {
        if (tipo == null) return "TEXT";
        return switch (tipo.toUpperCase()) {
            case "IMAGE", "IMAGEN" -> "IMAGE";
            case "DOCUMENT", "ARCHIVO" -> "DOCUMENT";
            case "TEXT", "TEXTO" -> "TEXT";
            default -> "TEXT";
        };
    }

    private String normalizarGrupoTipo(String tipo) {
        if (tipo == null) return "PRIVADO";
        return switch (tipo.toUpperCase()) {
            case "PUBLICO", "PÚBLICO" -> "PUBLICO";
            case "INVITE", "INVITACION", "INVITACIÓN", "SOLO_INVITACION" -> "INVITE";
            default -> "PRIVADO";
        };
    }

    private String limit(String value, int max) {
        if (value == null) return null;
        String clean = value.trim();
        return clean.length() <= max ? clean : clean.substring(0, max);
    }

    private boolean allowSend(Long usuarioId) {
        if (!rateLimitService.allow("chat:group:send", usuarioId.toString(), 20, Duration.ofSeconds(20))) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime window = now.minusSeconds(20);
        List<LocalDateTime> events = sendRate.computeIfAbsent(usuarioId, ignored -> new ArrayList<>());
        synchronized (events) {
            events.removeIf(ts -> ts.isBefore(window));
            if (events.size() >= 20) return false;
            events.add(now);
            return true;
        }
    }

    private String normalizarRol(String rol) {
        if (rol == null) return "MIEMBRO";
        return switch (rol.toUpperCase()) {
            case "ADMIN" -> "ADMIN";
            case "MODERADOR" -> "MODERADOR";
            default -> "MIEMBRO";
        };
    }

    private String obtenerExtension(String nombre) {
        if (nombre == null || !nombre.contains(".")) throw new IllegalArgumentException("El archivo debe tener extensión");
        return nombre.substring(nombre.lastIndexOf(".") + 1).toLowerCase();
    }

    private AttachmentData guardarAdjunto(MultipartFile archivo, String folder, String publicPrefix) throws IOException {
        if (archivo.isEmpty()) throw new IllegalArgumentException("Archivo vacío");
        if (archivo.getSize() > MAX_ATTACHMENT_SIZE) throw new IllegalArgumentException("Archivo mayor a 10 MB");

        String original = archivo.getOriginalFilename() != null ? archivo.getOriginalFilename() : "archivo";
        String ext = obtenerExtension(original);
        if (DANGEROUS_EXTENSIONS.contains(ext)) {
            audit(null, "FILE_REJECTED", "GROUP_ATTACHMENT", null, "dangerous_extension:" + ext);
            throw new IllegalArgumentException("Archivo bloqueado por seguridad");
        }
        String messageType = detectarMessageType(ext);
        String contentType = archivo.getContentType() != null ? archivo.getContentType() : Files.probeContentType(Paths.get(original));
        validarContentType(messageType, contentType);
        validarMagicBytes(ext, archivo);

        Path carpeta = Paths.get(uploadDir, folder).normalize();
        Files.createDirectories(carpeta);
        String nombre = UUID.randomUUID() + "." + ext;
        Path destino = carpeta.resolve(nombre).normalize();
        if (!destino.startsWith(carpeta)) throw new IllegalArgumentException("Nombre de archivo inválido");
        Files.copy(archivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);
        return new AttachmentData(publicPrefix + nombre, messageType, original, contentType != null ? contentType : "application/octet-stream", archivo.getSize());
    }

    private MultipartFile resolveMultipart(MultipartFile archivo, MultipartFile file) {
        MultipartFile selected = archivo != null ? archivo : file;
        if (selected == null) throw new IllegalArgumentException("No se envió ningún archivo");
        return selected;
    }

    private String resolveText(String contenido, String content) {
        return contenido != null ? contenido : content != null ? content : "";
    }

    private ResponseEntity<?> servirAdjunto(Path ruta, String originalName, String storedName) {
        try {
            Path normalized = ruta.normalize();
            Resource recurso = new UrlResource(normalized.toUri());
            if (!recurso.exists()) return ResponseEntity.notFound().build();
            String contentType = Files.probeContentType(normalized);
            if (contentType == null) contentType = "application/octet-stream";
            String disposition = contentType.startsWith("image/") || "application/pdf".equals(contentType)
                    ? "inline"
                    : "attachment";
            String safeName = originalName != null && !originalName.isBlank() ? originalName : storedName;
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + safeName.replace("\"", "") + "\"")
                    .body(recurso);
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Archivo inválido"));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Error al leer el archivo"));
        }
    }

    private String fileNameFromUrl(String url) {
        if (url == null || url.isBlank()) return "";
        String clean = url.split("\\?", 2)[0];
        int slash = clean.lastIndexOf('/');
        return slash >= 0 ? clean.substring(slash + 1) : clean;
    }

    private String detectarMessageType(String ext) {
        if (IMAGE_EXTENSIONS.contains(ext)) return "IMAGE";
        if (DOCUMENT_EXTENSIONS.contains(ext)) return "DOCUMENT";
        throw new IllegalArgumentException("Tipo de archivo no permitido");
    }

    private void validarContentType(String messageType, String contentType) {
        if (contentType == null || contentType.isBlank()) return;
        String lower = contentType.toLowerCase(Locale.ROOT);
        if ("IMAGE".equals(messageType) && !lower.startsWith("image/")) {
            throw new IllegalArgumentException("Tipo de imagen no permitido");
        }
        if ("DOCUMENT".equals(messageType) && lower.startsWith("image/")) {
            throw new IllegalArgumentException("Tipo de documento no permitido");
        }
    }

    private void validarMagicBytes(String ext, MultipartFile archivo) throws IOException {
        byte[] header = archivo.getInputStream().readNBytes(12);
        if (header.length >= 2 && header[0] == 'M' && header[1] == 'Z') {
            audit(null, "FILE_REJECTED", "GROUP_ATTACHMENT", null, "executable_magic");
            throw new IllegalArgumentException("Archivo bloqueado por seguridad");
        }
        if (Set.of("jpg", "jpeg").contains(ext) && !(header.length >= 3 && (header[0] & 0xff) == 0xff && (header[1] & 0xff) == 0xd8 && (header[2] & 0xff) == 0xff)) {
            throw new IllegalArgumentException("Contenido de imagen inválido");
        }
        if ("png".equals(ext) && !(header.length >= 8 && (header[0] & 0xff) == 0x89 && header[1] == 'P' && header[2] == 'N' && header[3] == 'G')) {
            throw new IllegalArgumentException("Contenido de imagen inválido");
        }
        if ("webp".equals(ext) && !(header.length >= 12 && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F' && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P')) {
            throw new IllegalArgumentException("Contenido de imagen inválido");
        }
        if ("pdf".equals(ext) && !(header.length >= 4 && header[0] == '%' && header[1] == 'P' && header[2] == 'D' && header[3] == 'F')) {
            throw new IllegalArgumentException("Contenido de PDF inválido");
        }
    }

    private void audit(Long actorId, String action, String targetType, Long targetId, String detail) {
        try {
            ChatAuditLog log = new ChatAuditLog();
            log.setActorId(actorId);
            log.setAction(action);
            log.setTargetType(targetType);
            log.setTargetId(targetId);
            log.setDetail(detail);
            log.setCreatedAt(LocalDateTime.now());
            auditRepository.save(log);
        } catch (Exception ignored) {}
    }

    private record AttachmentData(String url, String messageType, String fileName, String fileType, Long fileSize) {}

    private String resolveUrl(String path) {
        if (path == null) return null;
        if (path.startsWith("data:")) return path;
        if (path.startsWith("http://") || path.startsWith("https://")) {
            int imagenesIndex = path.indexOf("/imagenes/");
            if (imagenesIndex >= 0) return path.substring(imagenesIndex);
            return path;
        }
        return path.startsWith("/") ? path : "/" + path;
    }
}
