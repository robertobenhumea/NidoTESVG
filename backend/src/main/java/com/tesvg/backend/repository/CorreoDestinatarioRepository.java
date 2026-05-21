package com.tesvg.backend.repository;

import com.tesvg.backend.model.CorreoDestinatario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CorreoDestinatarioRepository extends JpaRepository<CorreoDestinatario, Long> {

    List<CorreoDestinatario> findByCorreoId(Long correoId);

    Optional<CorreoDestinatario> findByCorreoIdAndReceptorId(Long correoId, Long receptorId);

    long countByReceptorIdAndLeidoFalse(Long receptorId);

    @Query("""
        SELECT COUNT(d) FROM CorreoDestinatario d
        WHERE d.receptorId = :receptorId AND d.leido = false AND d.enPapelera = false
        """)
    long countNoLeidosBandeja(@Param("receptorId") Long receptorId);

    @Modifying
    @Transactional
    @Query("""
        UPDATE CorreoDestinatario d
        SET d.leido = true, d.fechaLectura = CURRENT_TIMESTAMP, d.leidoEn = CURRENT_TIMESTAMP
        WHERE d.correoId = :correoId AND d.receptorId = :receptorId AND d.leido = false
        """)
    void marcarLeido(@Param("correoId") Long correoId, @Param("receptorId") Long receptorId);

    @Modifying
    @Transactional
    @Query("UPDATE CorreoDestinatario d SET d.esFavorito = :valor WHERE d.correoId = :correoId AND d.receptorId = :receptorId")
    void setFavorito(@Param("correoId") Long correoId, @Param("receptorId") Long receptorId, @Param("valor") boolean valor);

    @Modifying
    @Transactional
    @Query("UPDATE CorreoDestinatario d SET d.archivado = :valor WHERE d.correoId = :correoId AND d.receptorId = :receptorId")
    void setArchivado(@Param("correoId") Long correoId, @Param("receptorId") Long receptorId, @Param("valor") boolean valor);

    @Modifying
    @Transactional
    @Query("""
        UPDATE CorreoDestinatario d
        SET d.enPapelera = true, d.archivado = false, d.fechaPapelera = CURRENT_TIMESTAMP
        WHERE d.correoId = :correoId AND d.receptorId = :receptorId
        """)
    void moverPapelera(@Param("correoId") Long correoId, @Param("receptorId") Long receptorId);

    @Modifying
    @Transactional
    @Query("UPDATE CorreoDestinatario d SET d.enPapelera = false, d.fechaPapelera = null WHERE d.correoId = :correoId AND d.receptorId = :receptorId")
    void restaurarDePapelera(@Param("correoId") Long correoId, @Param("receptorId") Long receptorId);

    @Modifying
    @Transactional
    @Query("UPDATE CorreoDestinatario d SET d.etiqueta = :etiqueta WHERE d.correoId = :correoId AND d.receptorId = :receptorId")
    void setEtiqueta(@Param("correoId") Long correoId, @Param("receptorId") Long receptorId, @Param("etiqueta") String etiqueta);

    @Modifying
    @Transactional
    @Query("DELETE FROM CorreoDestinatario d WHERE d.receptorId = :receptorId AND d.enPapelera = true AND d.fechaPapelera < :limite")
    void vaciarPapeleraAntigua(@Param("receptorId") Long receptorId, @Param("limite") LocalDateTime limite);

    @Query("SELECT d FROM CorreoDestinatario d WHERE d.enPapelera = true AND d.fechaPapelera < :limite")
    List<CorreoDestinatario> findPapeleraAntigua(@Param("limite") LocalDateTime limite);

    @Query("SELECT d FROM CorreoDestinatario d WHERE d.correoId = :correoId AND d.notificarLectura = true AND d.leidoEn IS NOT NULL")
    List<CorreoDestinatario> findLecturasParaNotificar(@Param("correoId") Long correoId);

    void deleteByCorreoId(Long correoId);
}
