package com.tesvg.backend.dto;

import com.fasterxml.jackson.annotation.JsonGetter;
import java.time.LocalDateTime;
import java.util.List;

public record ChatGroupMessageDTO(
        Long id,
        Long grupoId,
        Long emisorId,
        String contenido,
        LocalDateTime createdAt,
        String messageType,
        String tipo,
        String fileUrl,
        String fileName,
        String fileType,
        Long fileSize,
        Integer durationSeconds,
        String waveformData,
        String archivoUrl,
        String nombreArchivo,
        Boolean eliminado,
        Boolean esSistema,
        Long referenciaId,
        ReplyPreviewDTO replyPreview,
        Boolean editado,
        LocalDateTime actualizadoEn,
        Boolean reenviado,
        Long mensajeOriginalId,
        List<MessageReactionDTO> reactions,
        String myReaction,
        LocalDateTime fecha,
        String emisorNombre,
        String emisorFoto
) {
        @JsonGetter("content")
        public String content() {
                return contenido;
        }

        @JsonGetter("senderId")
        public Long senderId() {
                return emisorId;
        }

        @JsonGetter("senderName")
        public String senderName() {
                return emisorNombre;
        }

        @JsonGetter("senderAvatar")
        public String senderAvatar() {
                return emisorFoto;
        }
}
