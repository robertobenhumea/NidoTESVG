package com.tesvg.backend.repository;

import com.tesvg.backend.model.ChatGrupoMensaje;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ChatGrupoMensajeRepository extends JpaRepository<ChatGrupoMensaje, Long> {

    @Query("SELECT m FROM ChatGrupoMensaje m WHERE m.grupoId = :grupoId ORDER BY m.fecha ASC")
    List<ChatGrupoMensaje> findByGrupoId(@Param("grupoId") Long grupoId);

    @Query("SELECT m FROM ChatGrupoMensaje m WHERE m.grupoId = :grupoId ORDER BY m.id DESC")
    List<ChatGrupoMensaje> findLatestByGrupoId(@Param("grupoId") Long grupoId, Pageable pageable);

    @Query("SELECT m FROM ChatGrupoMensaje m WHERE m.grupoId = :grupoId AND m.id < :beforeId ORDER BY m.id DESC")
    List<ChatGrupoMensaje> findBeforeByGrupoId(@Param("grupoId") Long grupoId, @Param("beforeId") Long beforeId, Pageable pageable);

    Optional<ChatGrupoMensaje> findTopByGrupoIdOrderByFechaDesc(Long grupoId);

    Optional<ChatGrupoMensaje> findFirstByArchivoUrlOrFileUrl(String archivoUrl, String fileUrl);

    @Query("SELECT m FROM ChatGrupoMensaje m WHERE m.archivoUrl LIKE %:suffix OR m.fileUrl LIKE %:suffix")
    Optional<ChatGrupoMensaje> findFirstByAttachmentUrlSuffix(@Param("suffix") String suffix);

    @Query("SELECT COUNT(m) FROM ChatGrupoMensaje m WHERE m.grupoId = :grupoId AND m.emisorId <> :usuarioId AND m.fecha > :desde AND m.esSistema = false AND m.eliminado = false")
    long countUnread(@Param("grupoId") Long grupoId, @Param("usuarioId") Long usuarioId, @Param("desde") LocalDateTime desde);

    @Query("SELECT m FROM ChatGrupoMensaje m WHERE m.grupoId = :grupoId AND m.eliminado = false AND LOWER(m.contenido) LIKE LOWER(CONCAT('%http%', '%')) ORDER BY m.fecha DESC")
    List<ChatGrupoMensaje> findLinksByGrupoId(@Param("grupoId") Long grupoId);
}
