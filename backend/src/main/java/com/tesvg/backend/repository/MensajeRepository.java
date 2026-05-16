package com.tesvg.backend.repository;

import com.tesvg.backend.model.Mensaje;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface MensajeRepository extends JpaRepository<Mensaje, Long> {

    @Query("SELECT m FROM Mensaje m WHERE (m.emisorId = :u1 AND m.receptorId = :u2) OR (m.emisorId = :u2 AND m.receptorId = :u1) ORDER BY m.fecha ASC")
    List<Mensaje> findConversacion(@Param("u1") Long u1, @Param("u2") Long u2);

    @Query("SELECT m FROM Mensaje m WHERE m.emisorId = :uid OR m.receptorId = :uid ORDER BY m.fecha DESC")
    List<Mensaje> findAllByUsuario(@Param("uid") Long uid);

    long countByReceptorIdAndEmisorIdAndLeidoFalse(Long receptorId, Long emisorId);

    long countByReceptorIdAndLeidoFalse(Long receptorId);

    @Modifying
    @Transactional
    @Query("UPDATE Mensaje m SET m.leido = true WHERE m.emisorId = :emisorId AND m.receptorId = :receptorId AND m.leido = false")
    void marcarLeidos(@Param("emisorId") Long emisorId, @Param("receptorId") Long receptorId);
}
