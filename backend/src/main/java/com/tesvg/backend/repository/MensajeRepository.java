package com.tesvg.backend.repository;

import com.tesvg.backend.model.Mensaje;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MensajeRepository extends JpaRepository<Mensaje, Long> {

    @Query("SELECT m FROM Mensaje m WHERE ((m.emisorId = :u1 AND m.receptorId = :u2) OR (m.emisorId = :u2 AND m.receptorId = :u1)) ORDER BY m.fecha ASC, m.id ASC")
    List<Mensaje> findConversacion(@Param("u1") Long u1, @Param("u2") Long u2);

    @Query("SELECT m FROM Mensaje m WHERE ((m.emisorId = :u1 AND m.receptorId = :u2) OR (m.emisorId = :u2 AND m.receptorId = :u1)) AND (:beforeId IS NULL OR m.id < :beforeId) ORDER BY m.fecha DESC, m.id DESC")
    List<Mensaje> findConversacionPage(@Param("u1") Long u1, @Param("u2") Long u2, @Param("beforeId") Long beforeId, Pageable pageable);

    @Query("SELECT m FROM Mensaje m WHERE ((m.emisorId = :u1 AND m.receptorId = :u2) OR (m.emisorId = :u2 AND m.receptorId = :u1)) AND m.pinned = true ORDER BY m.pinnedAt DESC, m.id DESC")
    List<Mensaje> findPinned(@Param("u1") Long u1, @Param("u2") Long u2);

    @Query("SELECT m FROM Mensaje m WHERE ((m.emisorId = :u1 AND m.receptorId = :u2) OR (m.emisorId = :u2 AND m.receptorId = :u1)) AND (LOWER(m.contenido) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(COALESCE(m.nombreArchivo, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(COALESCE(m.fileName, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(COALESCE(m.tipo, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(COALESCE(m.messageType, '')) LIKE LOWER(CONCAT('%', :q, '%'))) ORDER BY m.fecha DESC, m.id DESC")
    List<Mensaje> searchConversacion(@Param("u1") Long u1, @Param("u2") Long u2, @Param("q") String q, Pageable pageable);

    @Query("SELECT COUNT(m) > 0 FROM Mensaje m WHERE m.id = :id AND ((m.emisorId = :u1 AND m.receptorId = :u2) OR (m.emisorId = :u2 AND m.receptorId = :u1))")
    boolean existsInConversacion(@Param("id") Long id, @Param("u1") Long u1, @Param("u2") Long u2);

    @Query("SELECT m FROM Mensaje m WHERE (m.emisorId = :uid OR m.receptorId = :uid) ORDER BY m.fecha DESC, m.id DESC")
    List<Mensaje> findAllByUsuario(@Param("uid") Long uid);

    long countByReceptorIdAndEmisorIdAndLeidoFalse(Long receptorId, Long emisorId);

    long countByReceptorIdAndLeidoFalse(Long receptorId);

    Optional<Mensaje> findFirstByArchivoUrlOrFileUrl(String archivoUrl, String fileUrl);

    @Modifying
    @Transactional
    @Query("UPDATE Mensaje m SET m.leido = true, m.readAt = COALESCE(m.readAt, :readAt), m.status = 'READ' WHERE m.emisorId = :emisorId AND m.receptorId = :receptorId AND (m.leido = false OR m.leido IS NULL OR m.readAt IS NULL OR m.status IS NULL OR m.status <> 'READ')")
    int marcarLeidos(@Param("emisorId") Long emisorId, @Param("receptorId") Long receptorId, @Param("readAt") LocalDateTime readAt);

    @Query("SELECT m FROM Mensaje m WHERE m.emisorId = :emisorId AND m.receptorId = :receptorId AND (m.leido = false OR m.leido IS NULL OR m.readAt IS NULL OR m.status IS NULL OR m.status <> 'READ')")
    List<Mensaje> findUnreadFromSender(@Param("emisorId") Long emisorId, @Param("receptorId") Long receptorId);
}
