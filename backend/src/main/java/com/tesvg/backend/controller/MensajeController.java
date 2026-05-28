package com.tesvg.backend.controller;

import com.tesvg.backend.dto.DMRealtimeEventDTO;
import com.tesvg.backend.dto.MessageDTO;
import com.tesvg.backend.dto.MessageReactionDTO;
import com.tesvg.backend.dto.ReactionRequest;
import com.tesvg.backend.dto.ReplyPreviewDTO;
import com.tesvg.backend.model.DMConversationPreference;
import com.tesvg.backend.model.DMMessageHidden;
import com.tesvg.backend.model.DMMessageReaction;
import com.tesvg.backend.model.ChatAuditLog;
import com.tesvg.backend.model.ChatBlock;
import com.tesvg.backend.model.ChatReport;
import com.tesvg.backend.model.Mensaje;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.ChatAuditLogRepository;
import com.tesvg.backend.repository.ChatBlockRepository;
import com.tesvg.backend.repository.ChatReportRepository;
import com.tesvg.backend.repository.DMConversationPreferenceRepository;
import com.tesvg.backend.repository.DMMessageHiddenRepository;
import com.tesvg.backend.repository.DMMessageReactionRepository;
import com.tesvg.backend.repository.MensajeRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import com.tesvg.backend.service.RateLimitService;
import com.tesvg.backend.service.RedisCacheService;
import com.tesvg.backend.service.WebPushService;
import com.tesvg.backend.websocket.PresenceService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/mensajes")
public class MensajeController {
    private static final long MAX_ATTACHMENT_SIZE = 10L * 1024L * 1024L;
    private static final int DEFAULT_PAGE_SIZE = 50;
    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_TEXT_LENGTH = 2000;
    private static final int MAX_AUDIO_DURATION_SECONDS = 5 * 60;
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> DOCUMENT_EXTENSIONS = Set.of("pdf", "doc", "docx", "txt");
    private static final Set<String> AUDIO_EXTENSIONS = Set.of("webm", "ogg", "mp3", "m4a", "mp4", "wav");
    private static final Set<String> DANGEROUS_EXTENSIONS = Set.of("html", "htm", "svg", "js", "exe", "bat", "sh", "cmd", "com", "scr", "msi", "jar");

    @Autowired private MensajeRepository mensajeRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RedisCacheService redisCacheService;
    @Autowired private RateLimitService rateLimitService;
    @Autowired private SimpMessagingTemplate messagingTemplate;
    @Autowired private DMMessageReactionRepository dmReactionRepository;
    @Autowired private DMMessageHiddenRepository hiddenRepository;
    @Autowired private DMConversationPreferenceRepository preferenceRepository;
    @Autowired private PresenceService presenceService;
    @Autowired private ChatBlockRepository blockRepository;
    @Autowired private ChatReportRepository reportRepository;
    @Autowired private ChatAuditLogRepository auditRepository;
    @Autowired private WebPushService webPushService;

    @Value("${app.upload.dir}")
    private String uploadDir;

    // ── ENVIAR ──
    @PostMapping("/enviar/{receptorId}")
    public ResponseEntity<?> enviar(@PathVariable Long receptorId,
                                    @RequestBody Map<String, Object> body,
                                    HttpServletRequest request) {
        Usuario emisor = getUsuario(request);
        String contenido = body.containsKey("contenido") ? ((String) body.get("contenido")) : "";
        String tipo = body.containsKey("messageType") ? (String) body.get("messageType")
                : body.containsKey("tipo") ? (String) body.get("tipo") : "TEXT";
        String archivoUrl = body.containsKey("fileUrl") ? (String) body.get("fileUrl")
                : body.containsKey("archivoUrl") ? (String) body.get("archivoUrl") : null;
        String nombreArchivo = body.containsKey("fileName") ? (String) body.get("fileName")
                : body.containsKey("nombreArchivo") ? (String) body.get("nombreArchivo") : null;
        Integer durationSeconds = body.get("durationSeconds") != null ? Integer.valueOf(body.get("durationSeconds").toString()) : null;
        String waveformData = body.get("waveformData") != null ? body.get("waveformData").toString() : null;
        Object refIdObj = body.get("referenciaId");
        Long referenciaId = refIdObj != null ? Long.valueOf(refIdObj.toString()) : null;
        String trimmed = contenido != null ? contenido.trim() : "";
        boolean hasAttachment = archivoUrl != null && !archivoUrl.isBlank();

        if (usuarioRepository.findById(receptorId).isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Receptor no encontrado"));
        }
        ResponseEntity<?> blockError = validateNotBlocked(emisor.getId(), receptorId);
        if (blockError != null) return blockError;
        if (trimmed.isBlank() && !hasAttachment) {
            return ResponseEntity.badRequest().body(Map.of("error", "El mensaje no puede estar vacío"));
        }
        ResponseEntity<?> textError = validateText(trimmed);
        if (textError != null) return textError;
        if (!hasAttachment && "TEXT".equals(normalizarTipo(tipo))
                && !rateLimitService.allow("send:dm:text", emisor.getId().toString(), 20, Duration.ofMinutes(1))) {
            audit(emisor.getId(), "RATE_LIMIT", "DM_TEXT", receptorId, "send:dm:text");
            return ResponseEntity.status(429).body(Map.of("error", "Estás enviando mensajes demasiado rápido. Intenta de nuevo en un momento."));
        }
        ResponseEntity<?> spamError = validateRepeatedMessage(emisor.getId(), trimmed);
        if (spamError != null) return spamError;
        ResponseEntity<?> refError = validateReferencia(referenciaId, emisor.getId(), receptorId);
        if (refError != null) return refError;

        LocalDateTime now = LocalDateTime.now();
        Mensaje m = new Mensaje();
        m.setEmisorId(emisor.getId());
        m.setReceptorId(receptorId);
        m.setContenido(trimmed);
        m.setTipo(normalizarTipo(tipo));
        m.setArchivoUrl(archivoUrl);
        m.setNombreArchivo(nombreArchivo);
        m.setFileType(body.containsKey("fileType") ? String.valueOf(body.get("fileType")) : null);
        m.setFileSize(body.containsKey("fileSize") && body.get("fileSize") != null ? Long.valueOf(body.get("fileSize").toString()) : null);
        try {
            m.setDurationSeconds(sanitizeAudioDuration(normalizarTipo(tipo), durationSeconds));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
        m.setWaveformData("AUDIO".equals(normalizarTipo(tipo)) ? limit(waveformData, 2000) : null);
        m.setReferenciaId(referenciaId);
        m.setFecha(now);
        m.setSentAt(now);
        m.setStatus("SENT");
        m.setLeido(false);
        m.setEliminado(false);
        mensajeRepository.save(m);
        redisCacheService.delete("chat:dm:unread:" + receptorId);

        MessageDTO dto = toDTO(m, emisor, emisor.getId(), receptorId);
        publishDMEvent("DM_MESSAGE_SENT", conversationId(emisor.getId(), receptorId), m.getId(), emisor.getId(), receptorId, dto);
        publishDMEvent("DM_MESSAGE_CREATED", conversationId(emisor.getId(), receptorId), m.getId(), emisor.getId(), receptorId, dto);
        notifyDMRecipient(emisor, receptorId, dto);
        return ResponseEntity.ok(dto);
    }

    // ── ENVIAR CON ADJUNTO ──
    @PostMapping(value = "/enviar/{receptorId}/adjunto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> enviarConAdjunto(@PathVariable Long receptorId,
                                              @RequestParam(value = "contenido", required = false) String contenido,
                                              @RequestParam(value = "content", required = false) String content,
                                              @RequestParam(value = "referenciaId", required = false) Long referenciaId,
                                              @RequestParam(value = "conversationId", required = false) Long conversationId,
                                              @RequestParam(value = "messageType", required = false) String messageType,
                                              @RequestParam(value = "tipo", required = false) String tipo,
                                              @RequestParam(value = "durationSeconds", required = false) Integer durationSeconds,
                                              @RequestParam(value = "waveformData", required = false) String waveformData,
                                              @RequestParam(value = "archivo", required = false) MultipartFile archivo,
                                              @RequestParam(value = "file", required = false) MultipartFile file,
                                              HttpServletRequest request) {
        Usuario emisor = getUsuario(request);
        if (usuarioRepository.findById(receptorId).isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Receptor no encontrado"));
        }
        ResponseEntity<?> blockError = validateNotBlocked(emisor.getId(), receptorId);
        if (blockError != null) return blockError;
        if (conversationId != null && !conversationId.equals(receptorId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "conversationId inválido"));
        }
        String trimmed = resolveText(contenido, content).trim();
        ResponseEntity<?> textError = validateText(trimmed);
        if (textError != null) return textError;
        ResponseEntity<?> refError = validateReferencia(referenciaId, emisor.getId(), receptorId);
        if (refError != null) return refError;

        AttachmentData data;
        try {
            data = guardarAdjunto(resolveMultipart(archivo, file), "mensajes", "/imagenes/mensajes/");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Error al guardar el archivo"));
        }
        ResponseEntity<?> typeError = validateRequestedAttachmentType(data.messageType(), messageType != null ? messageType : tipo);
        if (typeError != null) return typeError;
        Integer safeDuration;
        try {
            safeDuration = sanitizeAudioDuration(data.messageType(), durationSeconds);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }

        LocalDateTime now = LocalDateTime.now();
        Mensaje m = new Mensaje();
        m.setEmisorId(emisor.getId());
        m.setReceptorId(receptorId);
        m.setContenido(trimmed);
        m.setTipo(data.messageType());
        m.setArchivoUrl(data.url());
        m.setNombreArchivo(data.fileName());
        m.setFileType(data.fileType());
        m.setFileSize(data.fileSize());
        m.setDurationSeconds(safeDuration);
        m.setWaveformData("AUDIO".equals(data.messageType()) ? limit(waveformData, 2000) : null);
        m.setReferenciaId(referenciaId);
        m.setFecha(now);
        m.setSentAt(now);
        m.setStatus("SENT");
        m.setLeido(false);
        m.setEliminado(false);
        mensajeRepository.save(m);
        redisCacheService.delete("chat:dm:unread:" + receptorId);

        MessageDTO dto = toDTO(m, emisor, emisor.getId(), receptorId);
        publishDMEvent("DM_MESSAGE_SENT", conversationId(emisor.getId(), receptorId), m.getId(), emisor.getId(), receptorId, dto);
        publishDMEvent("DM_MESSAGE_CREATED", conversationId(emisor.getId(), receptorId), m.getId(), emisor.getId(), receptorId, dto);
        notifyDMRecipient(emisor, receptorId, dto);
        return ResponseEntity.ok(dto);
    }

    // ── SUBIR ADJUNTO (compatibilidad con clientes antiguos) ──
    @PostMapping("/adjunto/{receptorId}")
    public ResponseEntity<?> subirAdjunto(@PathVariable Long receptorId,
                                           @RequestParam(value = "archivo", required = false) MultipartFile archivo,
                                           @RequestParam(value = "file", required = false) MultipartFile file,
                                           HttpServletRequest request) {
        Usuario emisor = getUsuario(request);
        if (usuarioRepository.findById(receptorId).isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Receptor no encontrado"));
        }
        ResponseEntity<?> blockError = validateNotBlocked(emisor.getId(), receptorId);
        if (blockError != null) return blockError;
        if (!rateLimitService.allow("upload:dm", emisor.getId().toString(), 20, Duration.ofMinutes(1))) {
            return ResponseEntity.status(429).body(Map.of("error", "Demasiadas subidas, intenta de nuevo en un momento"));
        }

        try {
            AttachmentData data = guardarAdjunto(resolveMultipart(archivo, file), "mensajes", "/imagenes/mensajes/");
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("url", data.url());
            response.put("tipo", data.messageType());
            response.put("messageType", data.messageType());
            response.put("nombre", data.fileName());
            response.put("fileName", data.fileName());
            response.put("tamanio", data.fileSize());
            response.put("fileSize", data.fileSize());
            response.put("durationSeconds", 0);
            response.put("waveformData", "");
            response.put("tipoArchivo", data.fileType());
            response.put("fileType", data.fileType());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Error al guardar el archivo"));
        }
    }

    // ── CONVERSACIÓN ──
    @GetMapping("/conversacion/{otroId}")
    public ResponseEntity<?> conversacion(@PathVariable Long otroId,
                                          @RequestParam(value = "beforeId", required = false) Long beforeId,
                                          @RequestParam(value = "limit", required = false) Integer limit,
                                          HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        List<Mensaje> unread = mensajeRepository.findUnreadFromSender(otroId, yo.getId());
        LocalDateTime readAt = LocalDateTime.now();
        mensajeRepository.marcarLeidos(otroId, yo.getId(), readAt);
        redisCacheService.delete("chat:dm:unread:" + yo.getId());
        publishDMEvent(
                "DM_MESSAGE_READ",
                conversationId(yo.getId(), otroId),
                null,
                yo.getId(),
                otroId,
                Map.of("readerId", yo.getId(), "senderId", otroId, "messageIds", unread.stream().map(Mensaje::getId).toList(), "readAt", readAt)
        );
        publishDMEvent("DM_READ", conversationId(yo.getId(), otroId), null, yo.getId(), otroId, Map.of("readerId", yo.getId(), "senderId", otroId, "readAt", readAt));
        int pageSize = normalizeLimit(limit);
        List<Mensaje> mensajes = new ArrayList<>(mensajeRepository.findConversacionPage(
                yo.getId(),
                otroId,
                beforeId,
                PageRequest.of(0, pageSize)
        ));
        Collections.reverse(mensajes);
        mensajes = filtrarOcultos(mensajes, yo.getId());

        List<MessageDTO> resultado = mensajes.stream()
                .map(m -> toDTO(m, null, yo.getId(), otroId))
                .toList();

        return ResponseEntity.ok(resultado);
    }

    // ── CONVERSACIONES ──
    @GetMapping("/conversaciones")
    public ResponseEntity<?> conversaciones(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        List<Mensaje> todos = mensajeRepository.findAllByUsuario(yo.getId());

        Map<Long, Mensaje> ultimoPorPartner = new LinkedHashMap<>();
        for (Mensaje m : todos) {
            if (hiddenRepository.existsByMessageIdAndUsuarioId(m.getId(), yo.getId())) continue;
            Long partnerId = m.getEmisorId().equals(yo.getId()) ? m.getReceptorId() : m.getEmisorId();
            DMConversationPreference pref = preferenceRepository.findByUsuarioIdAndPartnerId(yo.getId(), partnerId).orElse(null);
            if (pref != null && Boolean.TRUE.equals(pref.getArchived())) continue;
            ultimoPorPartner.putIfAbsent(partnerId, m);
        }

        List<Map<String, Object>> resultado = new ArrayList<>();
        for (Map.Entry<Long, Mensaje> entry : ultimoPorPartner.entrySet()) {
            Long partnerId = entry.getKey();
            Mensaje ultimo = entry.getValue();
            Optional<Usuario> partnerOpt = usuarioRepository.findById(partnerId);
            if (partnerOpt.isEmpty()) continue;
            Usuario partner = partnerOpt.get();
            DMConversationPreference pref = preferenceRepository.findByUsuarioIdAndPartnerId(yo.getId(), partnerId).orElse(null);

            long noLeidos = mensajeRepository.countByReceptorIdAndEmisorIdAndLeidoFalse(yo.getId(), partnerId);

            boolean deleted = Boolean.TRUE.equals(ultimo.getEliminado());
        String previewType = normalizarTipo(ultimo.getTipo());
        String preview = deleted ? "Mensaje eliminado"
                : "TEXT".equals(previewType) ? ultimo.getContenido()
                : "IMAGE".equals(previewType) ? "Imagen"
                : "AUDIO".equals(previewType) ? "Audio"
                : "Documento: " + (ultimo.getNombreArchivo() != null ? ultimo.getNombreArchivo() : "Archivo");

            Map<String, Object> conv = new LinkedHashMap<>();
            conv.put("partnerId", partner.getId());
            conv.put("partnerNombre", partner.getUsername());
            conv.put("partnerFoto", partner.getFotoPerfil());
            conv.put("partnerCarrera", partner.getCarrera());
            conv.put("partnerRol", partner.getRol());
            conv.put("ultimoMensaje", preview);
            conv.put("ultimoTipo", previewType);
            conv.put("fecha", resolveCreatedAt(ultimo));
            conv.put("noLeidos", noLeidos);
            conv.put("esMio", ultimo.getEmisorId().equals(yo.getId()));
            conv.put("archived", pref != null && Boolean.TRUE.equals(pref.getArchived()));
            conv.put("muted", pref != null && Boolean.TRUE.equals(pref.getMuted()));
            conv.put("online", presenceService.isOnline(partnerId));
            conv.put("lastSeen", partner.getLastSeen());
            resultado.add(conv);
        }

        return ResponseEntity.ok(resultado);
    }

    // ── NO LEÍDOS ──
    @GetMapping("/no-leidos")
    public ResponseEntity<?> noLeidos(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        String key = "chat:dm:unread:" + yo.getId();
        var cached = redisCacheService.get(key, Long.class);
        if (cached.isPresent()) return ResponseEntity.ok(Map.of("count", cached.get()));
        long total = mensajeRepository.countByReceptorIdAndLeidoFalse(yo.getId());
        redisCacheService.set(key, total, Duration.ofSeconds(15));
        return ResponseEntity.ok(Map.of("count", total));
    }

    // ── MARCAR LEÍDOS ──
    @PutMapping("/leer/{emisorId}")
    public ResponseEntity<?> marcarLeidos(@PathVariable Long emisorId, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        List<Mensaje> unread = mensajeRepository.findUnreadFromSender(emisorId, yo.getId());
        LocalDateTime readAt = LocalDateTime.now();
        mensajeRepository.marcarLeidos(emisorId, yo.getId(), readAt);
        redisCacheService.delete("chat:dm:unread:" + yo.getId());
        publishDMEvent(
                "DM_MESSAGE_READ",
                conversationId(yo.getId(), emisorId),
                null,
                yo.getId(),
                emisorId,
                Map.of("readerId", yo.getId(), "senderId", emisorId, "messageIds", unread.stream().map(Mensaje::getId).toList(), "readAt", readAt)
        );
        publishDMEvent("DM_READ", conversationId(yo.getId(), emisorId), null, yo.getId(), emisorId, Map.of("readerId", yo.getId(), "senderId", emisorId, "readAt", readAt));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PutMapping("/{id}/entregado")
    public ResponseEntity<?> marcarEntregado(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        return mensajeRepository.findById(id).map(m -> {
            if (!m.getReceptorId().equals(yo.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "No puedes actualizar este mensaje"));
            }
            LocalDateTime deliveredAt = m.getDeliveredAt() != null ? m.getDeliveredAt() : LocalDateTime.now();
            if (m.getDeliveredAt() == null) m.setDeliveredAt(deliveredAt);
            if (!"READ".equals(m.getStatus())) m.setStatus("DELIVERED");
            mensajeRepository.save(m);
            MessageDTO dto = toDTO(m, null, yo.getId(), m.getEmisorId());
            publishDMEvent(
                    "DM_MESSAGE_DELIVERED",
                    conversationId(m.getEmisorId(), m.getReceptorId()),
                    m.getId(),
                    yo.getId(),
                    m.getEmisorId(),
                    dto
            );
            return ResponseEntity.ok(dto);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/bloqueos/{blockedId}")
    public ResponseEntity<?> bloquear(@PathVariable Long blockedId,
                                      @RequestBody(required = false) Map<String, String> body,
                                      HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (yo.getId().equals(blockedId)) return ResponseEntity.badRequest().body(Map.of("error", "No puedes bloquearte a ti mismo"));
        if (usuarioRepository.findById(blockedId).isEmpty()) return ResponseEntity.notFound().build();
        ChatBlock block = blockRepository.findByBlockerIdAndBlockedId(yo.getId(), blockedId).orElse(new ChatBlock());
        block.setBlockerId(yo.getId());
        block.setBlockedId(blockedId);
        block.setCreatedAt(block.getCreatedAt() != null ? block.getCreatedAt() : LocalDateTime.now());
        block.setReason(body != null ? limit(body.get("reason"), 500) : null);
        blockRepository.save(block);
        audit(yo.getId(), "USER_BLOCKED", "USER", blockedId, block.getReason());
        return ResponseEntity.ok(Map.of("blocked", true, "blockedId", blockedId));
    }

    @DeleteMapping("/bloqueos/{blockedId}")
    public ResponseEntity<?> desbloquear(@PathVariable Long blockedId, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        blockRepository.findByBlockerIdAndBlockedId(yo.getId(), blockedId).ifPresent(blockRepository::delete);
        audit(yo.getId(), "USER_UNBLOCKED", "USER", blockedId, null);
        return ResponseEntity.ok(Map.of("blocked", false, "blockedId", blockedId));
    }

    @GetMapping("/bloqueos")
    public ResponseEntity<?> bloqueados(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        return ResponseEntity.ok(blockRepository.findByBlockerId(yo.getId()).stream().map(b -> Map.of(
                "blockedId", b.getBlockedId(),
                "createdAt", b.getCreatedAt(),
                "reason", b.getReason()
        )).toList());
    }

    @GetMapping("/bloqueos/{otherId}")
    public ResponseEntity<?> estadoBloqueo(@PathVariable Long otherId, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        return ResponseEntity.ok(Map.of(
                "blockedByMe", blockRepository.existsByBlockerIdAndBlockedId(yo.getId(), otherId),
                "blockedMe", blockRepository.existsByBlockerIdAndBlockedId(otherId, yo.getId())
        ));
    }

    @PostMapping("/{id}/reportes")
    public ResponseEntity<?> reportar(@PathVariable Long id,
                                      @RequestBody Map<String, String> body,
                                      HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Mensaje m = mensajeRepository.findById(id).orElse(null);
        if (m == null) return ResponseEntity.notFound().build();
        if (!isParticipant(m, yo.getId())) return ResponseEntity.status(403).body(Map.of("error", "No puedes reportar este mensaje"));
        String reason = normalizarReporte(body.get("reason"));
        ChatReport report = new ChatReport();
        report.setReporterId(yo.getId());
        report.setReportedUserId(otherParticipant(m, yo.getId()));
        report.setMessageId(id);
        report.setConversationType("DM");
        report.setReason(reason);
        report.setDescription(limit(body.get("description"), 1000));
        report.setStatus("PENDING");
        report.setCreatedAt(LocalDateTime.now());
        reportRepository.save(report);
        audit(yo.getId(), "MESSAGE_REPORTED", "MESSAGE", id, reason);
        return ResponseEntity.ok(Map.of("ok", true, "reportId", report.getId()));
    }

    @GetMapping("/reportes")
    public ResponseEntity<?> listarReportes(@RequestParam(value = "status", defaultValue = "PENDING") String status,
                                            HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (!"ADMIN".equals(String.valueOf(yo.getRol()))) {
            return ResponseEntity.status(403).body(Map.of("error", "Sin permiso"));
        }
        return ResponseEntity.ok(reportRepository.findByStatusOrderByCreatedAtDesc(status));
    }

    @PostMapping("/{id}/reacciones")
    public ResponseEntity<?> toggleReaccion(@PathVariable Long id,
                                            @RequestBody ReactionRequest body,
                                            HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Mensaje m = mensajeRepository.findById(id).orElse(null);
        if (m == null) return ResponseEntity.notFound().build();
        if (!isParticipant(m, yo.getId())) return ResponseEntity.status(403).body(Map.of("error", "No puedes reaccionar a este mensaje"));
        ResponseEntity<?> blockError = validateNotBlocked(yo.getId(), otherParticipant(m, yo.getId()));
        if (blockError != null) return blockError;
        if (!rateLimitService.allow("reaction:dm", yo.getId().toString(), 60, Duration.ofMinutes(1))) {
            audit(yo.getId(), "RATE_LIMIT", "DM_REACTION", id, "reaction:dm");
            return ResponseEntity.status(429).body(Map.of("error", "Espera unos segundos antes de reaccionar de nuevo"));
        }
        if (Boolean.TRUE.equals(m.getEliminado())) return ResponseEntity.badRequest().body(Map.of("error", "No se puede reaccionar a este mensaje"));

        String reactionType = normalizarReaccion(body.reactionType());
        Optional<DMMessageReaction> current = dmReactionRepository.findByMessageIdAndUsuarioId(id, yo.getId());
        if (current.isPresent() && current.get().getReactionType().equals(reactionType)) {
            dmReactionRepository.delete(current.get());
        } else {
            DMMessageReaction reaction = current.orElse(new DMMessageReaction());
            reaction.setMessageId(id);
            reaction.setUsuarioId(yo.getId());
            reaction.setReactionType(reactionType);
            reaction.setFecha(LocalDateTime.now());
            dmReactionRepository.save(reaction);
        }

        MessageDTO dto = toDTO(m, null, yo.getId(), otherParticipant(m, yo.getId()));
        publishDMEvent("DM_REACTION_UPDATED", conversationId(m.getEmisorId(), m.getReceptorId()), id, yo.getId(), otherParticipant(m, yo.getId()), dto);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{id}/editar")
    public ResponseEntity<?> editar(@PathVariable Long id,
                                    @RequestBody Map<String, String> body,
                                    HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Mensaje m = mensajeRepository.findById(id).orElse(null);
        if (m == null) return ResponseEntity.notFound().build();
        if (!m.getEmisorId().equals(yo.getId())) return ResponseEntity.status(403).body(Map.of("error", "Solo puedes editar tus mensajes"));
        if (!rateLimitService.allow("edit:dm", yo.getId().toString(), 20, Duration.ofMinutes(1))) {
            audit(yo.getId(), "RATE_LIMIT", "DM_EDIT", id, "edit:dm");
            return ResponseEntity.status(429).body(Map.of("error", "Espera unos segundos antes de editar de nuevo"));
        }
        if (Boolean.TRUE.equals(m.getEliminado())) return ResponseEntity.badRequest().body(Map.of("error", "No se puede editar un mensaje eliminado"));
        if (!"TEXT".equals(normalizarTipo(m.getTipo()))) return ResponseEntity.badRequest().body(Map.of("error", "Solo se pueden editar mensajes de texto"));
        if (m.getFecha() != null && m.getFecha().isBefore(LocalDateTime.now().minusMinutes(15))) {
            return ResponseEntity.badRequest().body(Map.of("error", "El tiempo para editar este mensaje expiró"));
        }
        String content = body.getOrDefault("content", body.getOrDefault("contenido", "")).trim();
        if (content.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "El mensaje no puede estar vacío"));
        ResponseEntity<?> textError = validateText(content);
        if (textError != null) return textError;
        m.setContenido(content);
        m.setEditado(true);
        m.setActualizadoEn(LocalDateTime.now());
        mensajeRepository.save(m);
        MessageDTO dto = toDTO(m, yo, yo.getId(), m.getReceptorId());
        publishDMEvent("DM_MESSAGE_EDITED", conversationId(m.getEmisorId(), m.getReceptorId()), id, yo.getId(), m.getReceptorId(), dto);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{id}/reenviar/{destinatarioId}")
    public ResponseEntity<?> reenviar(@PathVariable Long id,
                                      @PathVariable Long destinatarioId,
                                      HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Mensaje original = mensajeRepository.findById(id).orElse(null);
        if (original == null) return ResponseEntity.notFound().build();
        if (!isParticipant(original, yo.getId())) return ResponseEntity.status(403).body(Map.of("error", "No puedes reenviar este mensaje"));
        if (Boolean.TRUE.equals(original.getEliminado())) return ResponseEntity.badRequest().body(Map.of("error", "No se puede reenviar un mensaje eliminado"));
        if (usuarioRepository.findById(destinatarioId).isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Destinatario no encontrado"));
        ResponseEntity<?> blockError = validateNotBlocked(yo.getId(), destinatarioId);
        if (blockError != null) return blockError;
        if (!rateLimitService.allow("forward:dm", yo.getId().toString(), 10, Duration.ofMinutes(1))) {
            audit(yo.getId(), "RATE_LIMIT", "DM_FORWARD", id, "forward:dm");
            return ResponseEntity.status(429).body(Map.of("error", "Estás reenviando demasiado rápido"));
        }

        LocalDateTime now = LocalDateTime.now();
        Mensaje copy = new Mensaje();
        copy.setEmisorId(yo.getId());
        copy.setReceptorId(destinatarioId);
        copy.setContenido(original.getContenido());
        copy.setTipo(original.getTipo());
        copy.setArchivoUrl(original.getArchivoUrl());
        copy.setNombreArchivo(original.getNombreArchivo());
        copy.setFileType(original.getFileType());
        copy.setFileSize(original.getFileSize());
        copy.setFecha(now);
        copy.setSentAt(now);
        copy.setStatus("SENT");
        copy.setLeido(false);
        copy.setEliminado(false);
        copy.setReenviado(true);
        copy.setMensajeOriginalId(original.getId());
        mensajeRepository.save(copy);

        MessageDTO dto = toDTO(copy, yo, yo.getId(), destinatarioId);
        publishDMEvent("DM_MESSAGE_CREATED", conversationId(yo.getId(), destinatarioId), copy.getId(), yo.getId(), destinatarioId, dto);
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/{id}/para-mi")
    public ResponseEntity<?> eliminarParaMi(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Mensaje m = mensajeRepository.findById(id).orElse(null);
        if (m == null) return ResponseEntity.notFound().build();
        if (!isParticipant(m, yo.getId())) return ResponseEntity.status(403).body(Map.of("error", "No puedes ocultar este mensaje"));
        DMMessageHidden hidden = hiddenRepository.findByMessageIdAndUsuarioId(id, yo.getId()).orElse(new DMMessageHidden());
        hidden.setMessageId(id);
        hidden.setUsuarioId(yo.getId());
        hidden.setHiddenAt(LocalDateTime.now());
        hiddenRepository.save(hidden);
        audit(yo.getId(), "MESSAGE_HIDDEN", "DM_MESSAGE", id, "for_me");
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/conversacion/{otroId}/buscar")
    public ResponseEntity<?> buscar(@PathVariable Long otroId,
                                    @RequestParam String q,
                                    @RequestParam(value = "limit", required = false) Integer limit,
                                    HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        String query = q != null ? q.trim() : "";
        if (query.isBlank()) return ResponseEntity.ok(List.of());
        List<Mensaje> found = mensajeRepository.searchConversacion(yo.getId(), otroId, query, PageRequest.of(0, normalizeLimit(limit)));
        found = filtrarOcultos(found, yo.getId());
        return ResponseEntity.ok(found.stream().map(m -> toDTO(m, null, yo.getId(), otroId)).toList());
    }

    @GetMapping("/conversacion/{otroId}/fijados")
    public ResponseEntity<?> fijados(@PathVariable Long otroId, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        List<Mensaje> pinned = filtrarOcultos(mensajeRepository.findPinned(yo.getId(), otroId), yo.getId());
        return ResponseEntity.ok(pinned.stream().map(m -> toDTO(m, null, yo.getId(), otroId)).toList());
    }

    @PutMapping("/{id}/fijar")
    public ResponseEntity<?> fijar(@PathVariable Long id,
                                   @RequestBody Map<String, Object> body,
                                   HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Mensaje m = mensajeRepository.findById(id).orElse(null);
        if (m == null) return ResponseEntity.notFound().build();
        if (!isParticipant(m, yo.getId())) return ResponseEntity.status(403).body(Map.of("error", "No puedes fijar este mensaje"));
        boolean pinned = !Boolean.FALSE.equals(body.get("pinned"));
        m.setPinned(pinned);
        m.setPinnedBy(pinned ? yo.getId() : null);
        m.setPinnedAt(pinned ? LocalDateTime.now() : null);
        mensajeRepository.save(m);
        MessageDTO dto = toDTO(m, null, yo.getId(), otherParticipant(m, yo.getId()));
        publishDMEvent("DM_MESSAGE_PINNED", conversationId(m.getEmisorId(), m.getReceptorId()), id, yo.getId(), otherParticipant(m, yo.getId()), dto);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/conversacion/{partnerId}/preferencias")
    public ResponseEntity<?> preferencias(@PathVariable Long partnerId,
                                          @RequestBody Map<String, Object> body,
                                          HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        DMConversationPreference pref = getPreference(yo.getId(), partnerId);
        if (body.containsKey("archived")) pref.setArchived(Boolean.TRUE.equals(body.get("archived")));
        if (body.containsKey("muted")) pref.setMuted(Boolean.TRUE.equals(body.get("muted")));
        pref.setUpdatedAt(LocalDateTime.now());
        preferenceRepository.save(pref);
        return ResponseEntity.ok(Map.of(
                "partnerId", partnerId,
                "archived", Boolean.TRUE.equals(pref.getArchived()),
                "muted", Boolean.TRUE.equals(pref.getMuted())
        ));
    }

    // ── ELIMINAR MENSAJE ──
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        return mensajeRepository.findById(id).map(m -> {
            if (!m.getEmisorId().equals(yo.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "No puedes eliminar este mensaje"));
            }
            m.setEliminado(true);
            m.setContenido("Mensaje eliminado");
            m.setArchivoUrl(null);
            m.setNombreArchivo(null);
            m.setFileType(null);
            m.setFileSize(null);
            if (!"READ".equals(m.getStatus())) m.setStatus(resolveStatus(m));
            mensajeRepository.save(m);
            audit(yo.getId(), "MESSAGE_DELETED", "DM_MESSAGE", id, "for_all");
            Long recipientId = m.getEmisorId().equals(m.getReceptorId()) ? m.getReceptorId() : m.getReceptorId();
            publishDMEvent(
                    "DM_MESSAGE_DELETED",
                    conversationId(m.getEmisorId(), m.getReceptorId()),
                    m.getId(),
                    yo.getId(),
                    recipientId,
                    toDTO(m, yo, m.getEmisorId(), m.getReceptorId())
            );
            return ResponseEntity.ok(Map.of("ok", true));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── HELPERS ──
    private MessageDTO toDTO(Mensaje m, Usuario emisor, Long currentUserId, Long otherUserId) {
        boolean deleted = Boolean.TRUE.equals(m.getEliminado());
        Usuario sender = emisor != null ? emisor : usuarioRepository.findById(m.getEmisorId()).orElse(null);
        String content = deleted ? "Mensaje eliminado" : m.getContenido();
        String fileUrl = deleted ? null : m.getArchivoUrl();
        String fileName = deleted ? null : m.getNombreArchivo();
        String fileType = deleted ? null : m.getFileType();
        Long fileSize = deleted ? null : m.getFileSize();
        LocalDateTime createdAt = resolveCreatedAt(m);
        return new MessageDTO(
                m.getId(),
                content,
                m.getEmisorId(),
                sender != null ? sender.getUsername() : null,
                m.getReceptorId(),
                resolveStatus(m),
                m.getSentAt() != null ? m.getSentAt() : createdAt,
                m.getDeliveredAt(),
                m.getReadAt(),
                deleted,
                buildReplyPreview(m.getReferenciaId(), currentUserId, otherUserId),
                m.getEmisorId(),
                m.getReceptorId(),
                content,
                createdAt,
                createdAt,
                Boolean.TRUE.equals(m.getLeido()),
                normalizarTipo(m.getTipo()),
                normalizarTipo(m.getTipo()),
                fileUrl,
                fileName,
                fileType,
                fileSize,
                deleted ? null : m.getDurationSeconds(),
                deleted ? null : m.getWaveformData(),
                fileUrl,
                fileName,
                deleted,
                m.getReferenciaId(),
                sender != null ? sender.getUsername() : null,
                sender != null ? sender.getFotoPerfil() : null,
                Boolean.TRUE.equals(m.getEditado()),
                m.getActualizadoEn(),
                Boolean.TRUE.equals(m.getReenviado()),
                m.getMensajeOriginalId(),
                Boolean.TRUE.equals(m.getPinned()),
                m.getPinnedBy(),
                m.getPinnedAt(),
                buildReactions(m.getId(), currentUserId),
                dmReactionRepository.findByMessageIdAndUsuarioId(m.getId(), currentUserId)
                        .map(DMMessageReaction::getReactionType)
                        .orElse(null)
        );
    }

    private LocalDateTime resolveCreatedAt(Mensaje m) {
        if (m.getFecha() != null) return m.getFecha();
        if (m.getSentAt() != null) return m.getSentAt();
        return LocalDateTime.now();
    }

    private ResponseEntity<?> validateText(String text) {
        if (text != null && text.length() > MAX_TEXT_LENGTH) {
            return ResponseEntity.badRequest().body(Map.of("error", "El mensaje no puede superar " + MAX_TEXT_LENGTH + " caracteres"));
        }
        return null;
    }

    private ResponseEntity<?> validateNotBlocked(Long senderId, Long recipientId) {
        if (blockRepository.existsByBlockerIdAndBlockedId(recipientId, senderId)) {
            return ResponseEntity.status(403).body(Map.of("error", "No puedes enviar mensajes a este usuario"));
        }
        if (blockRepository.existsByBlockerIdAndBlockedId(senderId, recipientId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Desbloquea a este usuario para continuar"));
        }
        return null;
    }

    private ResponseEntity<?> validateRepeatedMessage(Long senderId, String text) {
        if (text == null || text.isBlank()) return null;
        String normalized = text.trim().toLowerCase(Locale.ROOT);
        String key = "chat:dm:repeat:" + senderId;
        Optional<String> previous = redisCacheService.getValue(key);
        if (previous.isPresent()) {
            String[] parts = previous.get().split(":", 2);
            int count = 0;
            try { count = Integer.parseInt(parts[0]); } catch (Exception ignored) {}
            String last = parts.length > 1 ? parts[1] : "";
            if (last.equals(normalized) && count >= 3) {
                audit(senderId, "SPAM_BLOCKED", "DM_TEXT", null, "repeated_message");
                return ResponseEntity.status(429).body(Map.of("error", "Espera unos segundos antes de repetir el mismo mensaje"));
            }
            redisCacheService.setValue(key, (last.equals(normalized) ? count + 1 : 1) + ":" + normalized, Duration.ofMinutes(2));
        } else {
            redisCacheService.setValue(key, "1:" + normalized, Duration.ofMinutes(2));
        }
        return null;
    }

    private String normalizarReporte(String reason) {
        if (reason == null) return "otro";
        return switch (reason.toLowerCase(Locale.ROOT)) {
            case "spam", "acoso", "contenido ofensivo", "archivo peligroso", "otro" -> reason.toLowerCase(Locale.ROOT);
            default -> "otro";
        };
    }

    private String limit(String value, int max) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
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
        } catch (Exception ignored) {
            // Audit failures must not break chat actions.
        }
    }

    private boolean isParticipant(Mensaje m, Long userId) {
        return m.getEmisorId().equals(userId) || m.getReceptorId().equals(userId);
    }

    private Long otherParticipant(Mensaje m, Long userId) {
        return m.getEmisorId().equals(userId) ? m.getReceptorId() : m.getEmisorId();
    }

    private List<Mensaje> filtrarOcultos(List<Mensaje> mensajes, Long usuarioId) {
        if (mensajes.isEmpty()) return mensajes;
        Set<Long> hidden = hiddenRepository.findByUsuarioIdAndMessageIdIn(usuarioId, mensajes.stream().map(Mensaje::getId).toList())
                .stream()
                .map(DMMessageHidden::getMessageId)
                .collect(Collectors.toSet());
        return mensajes.stream().filter(m -> !hidden.contains(m.getId())).toList();
    }

    private DMConversationPreference getPreference(Long usuarioId, Long partnerId) {
        return preferenceRepository.findByUsuarioIdAndPartnerId(usuarioId, partnerId).orElseGet(() -> {
            DMConversationPreference pref = new DMConversationPreference();
            pref.setUsuarioId(usuarioId);
            pref.setPartnerId(partnerId);
            pref.setArchived(false);
            pref.setMuted(false);
            pref.setUpdatedAt(LocalDateTime.now());
            return pref;
        });
    }

    private List<MessageReactionDTO> buildReactions(Long messageId, Long currentUserId) {
        List<DMMessageReaction> reactions = dmReactionRepository.findByMessageId(messageId);
        Map<String, Long> counts = reactions.stream()
                .collect(Collectors.groupingBy(DMMessageReaction::getReactionType, LinkedHashMap::new, Collectors.counting()));
        Set<String> mine = reactions.stream()
                .filter(r -> r.getUsuarioId().equals(currentUserId))
                .map(DMMessageReaction::getReactionType)
                .collect(Collectors.toSet());
        return counts.entrySet().stream()
                .map(e -> new MessageReactionDTO(e.getKey(), e.getValue(), mine.contains(e.getKey())))
                .toList();
    }

    private String normalizarReaccion(String reactionType) {
        if (reactionType == null) return "👍";
        return switch (reactionType) {
            case "❤️", "👍", "😂", "😮", "😢", "🔥" -> reactionType;
            default -> "👍";
        };
    }

    private ResponseEntity<?> validateReferencia(Long referenciaId, Long usuarioId, Long otroId) {
        if (referenciaId == null) return null;
        if (!mensajeRepository.existsInConversacion(referenciaId, usuarioId, otroId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "El mensaje de referencia no pertenece a esta conversación"));
        }
        return null;
    }

    private ReplyPreviewDTO buildReplyPreview(Long referenciaId, Long usuarioId, Long otroId) {
        if (referenciaId == null || !mensajeRepository.existsInConversacion(referenciaId, usuarioId, otroId)) return null;
        return mensajeRepository.findById(referenciaId).map(ref -> {
            String senderName = usuarioRepository.findById(ref.getEmisorId()).map(Usuario::getUsername).orElse("Usuario");
            boolean deleted = Boolean.TRUE.equals(ref.getEliminado());
            String contenido = deleted ? "Mensaje eliminado" : previewText(ref.getContenido(), 120);
            return new ReplyPreviewDTO(
                    ref.getId(),
                    ref.getEmisorId(),
                    senderName,
                    contenido,
                    normalizarTipo(ref.getTipo()),
                    deleted
            );
        }).orElse(null);
    }

    private String previewText(String text, int max) {
        if (text == null || text.isBlank()) return "Archivo";
        String trimmed = text.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max) + "...";
    }

    private String resolveStatus(Mensaje m) {
        if (m.getStatus() != null && !m.getStatus().isBlank()) return m.getStatus();
        if (m.getReadAt() != null || Boolean.TRUE.equals(m.getLeido())) return "READ";
        if (m.getDeliveredAt() != null) return "DELIVERED";
        return "SENT";
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null) return DEFAULT_PAGE_SIZE;
        if (limit < 1) return DEFAULT_PAGE_SIZE;
        return Math.min(limit, MAX_PAGE_SIZE);
    }

    private String conversationId(Long first, Long second) {
        long min = Math.min(first, second);
        long max = Math.max(first, second);
        return min + "-" + max;
    }

    private void publishDMEvent(String eventType, String conversationId, Long messageId, Long senderId, Long recipientId, Object payload) {
        try {
            messagingTemplate.convertAndSend(
                    "/topic/dm/" + conversationId + "/events",
                    new DMRealtimeEventDTO(
                            eventType,
                            conversationId,
                            messageId,
                            senderId,
                            recipientId,
                            LocalDateTime.now(),
                            payload
                    )
            );
        } catch (Exception ignored) {
            // REST remains authoritative; realtime delivery must not break writes.
        }
    }

    private void notifyDMRecipient(Usuario sender, Long recipientId, MessageDTO message) {
        try {
            DMConversationPreference pref = preferenceRepository.findByUsuarioIdAndPartnerId(recipientId, sender.getId()).orElse(null);
            if (pref != null && Boolean.TRUE.equals(pref.getMuted())) return;
            String preview = "TEXT".equals(message.messageType())
                    ? previewText(message.content(), 90)
                    : "IMAGE".equals(message.messageType()) ? "Imagen"
                    : "AUDIO".equals(message.messageType()) ? "Audio" : "Documento";
            webPushService.sendToUser(recipientId, sender.getUsername(), preview, "/messages/" + sender.getId());
        } catch (Exception ignored) {
            // Push is best-effort and must not affect message persistence.
        }
    }

    private Usuario getUsuario(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        return usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private String normalizarTipo(String tipo) {
        if (tipo == null) return "TEXT";
        return switch (tipo.toUpperCase()) {
            case "IMAGE", "IMAGEN" -> "IMAGE";
            case "DOCUMENT", "ARCHIVO" -> "DOCUMENT";
            case "AUDIO", "VOICE", "VOZ" -> "AUDIO";
            case "TEXT", "TEXTO" -> "TEXT";
            default -> "TEXT";
        };
    }

    private AttachmentData guardarAdjunto(MultipartFile archivo, String folder, String publicPrefix) throws IOException {
        if (archivo.isEmpty()) throw new IllegalArgumentException("Archivo vacío");
        if (archivo.getSize() > MAX_ATTACHMENT_SIZE) throw new IllegalArgumentException("Archivo mayor a 10 MB");

        String original = archivo.getOriginalFilename() != null ? archivo.getOriginalFilename() : "archivo";
        String ext = obtenerExtension(original);
        if (DANGEROUS_EXTENSIONS.contains(ext)) throw new IllegalArgumentException("Archivo bloqueado por seguridad");
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

    private String detectarMessageType(String ext) {
        if (IMAGE_EXTENSIONS.contains(ext)) return "IMAGE";
        if (AUDIO_EXTENSIONS.contains(ext)) return "AUDIO";
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
        if ("AUDIO".equals(messageType) && !lower.startsWith("audio/")) {
            throw new IllegalArgumentException("Tipo de audio no permitido");
        }
    }

    private void validarMagicBytes(String ext, MultipartFile archivo) throws IOException {
        byte[] header = archivo.getInputStream().readNBytes(12);
        if (header.length >= 2 && header[0] == 'M' && header[1] == 'Z') {
            audit(null, "FILE_REJECTED", "DM_ATTACHMENT", null, "executable_magic");
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

    private Integer sanitizeAudioDuration(String messageType, Integer durationSeconds) {
        if (!"AUDIO".equals(messageType)) return null;
        if (durationSeconds == null || durationSeconds <= 0) return null;
        if (durationSeconds > MAX_AUDIO_DURATION_SECONDS) {
            throw new IllegalArgumentException("El audio no puede superar 5 minutos");
        }
        return durationSeconds;
    }

    private ResponseEntity<?> validateRequestedAttachmentType(String detectedType, String requestedType) {
        if (requestedType == null || requestedType.isBlank()) return null;
        String normalizedRequested = normalizarTipo(requestedType);
        if (!detectedType.equals(normalizedRequested)) {
            return ResponseEntity.badRequest().body(Map.of("error", "El tipo de mensaje no coincide con el archivo enviado"));
        }
        return null;
    }

    private String obtenerExtension(String nombre) {
        if (nombre == null || !nombre.contains(".")) throw new IllegalArgumentException("El archivo debe tener extensión");
        return nombre.substring(nombre.lastIndexOf(".") + 1).toLowerCase();
    }

    private record AttachmentData(String url, String messageType, String fileName, String fileType, Long fileSize) {}
}
