package com.tesvg.backend.repository;

import com.tesvg.backend.model.Correo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface CorreoRepository extends JpaRepository<Correo, Long> {

    // ── Enviados (sin paginación — usado internamente) ──
    @Query("SELECT c FROM Correo c WHERE c.emisorId = :emisorId AND c.esBorrador = false ORDER BY c.fecha DESC")
    List<Correo> findByEmisorIdOrderByFechaDesc(@Param("emisorId") Long emisorId);

    // ── Enviados paginados ──
    @Query(value = "SELECT c FROM Correo c WHERE c.emisorId = :emisorId AND c.esBorrador = false ORDER BY c.fecha DESC",
           countQuery = "SELECT COUNT(c) FROM Correo c WHERE c.emisorId = :emisorId AND c.esBorrador = false")
    Page<Correo> findEnviadosPaged(@Param("emisorId") Long emisorId, Pageable pageable);

    // ── Comunicados ──
    @Query("SELECT c FROM Correo c WHERE c.esComunicado = true AND c.esBorrador = false ORDER BY c.fecha DESC")
    List<Correo> findComunicados();

    // ── Bandeja de entrada (sin paginación) ──
    @Query("""
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.enPapelera = false AND d.archivado = false
        AND c.esBorrador = false
        AND (c.programadoPara IS NULL OR c.programadoPara <= CURRENT_TIMESTAMP)
        ORDER BY c.fecha DESC
        """)
    List<Correo> findBandejaEntrada(@Param("receptorId") Long receptorId);

    // ── Bandeja de entrada paginada ──
    @Query(value = """
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.enPapelera = false AND d.archivado = false
        AND c.esBorrador = false
        AND (c.programadoPara IS NULL OR c.programadoPara <= CURRENT_TIMESTAMP)
        ORDER BY c.fecha DESC
        """,
        countQuery = """
        SELECT COUNT(c) FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.enPapelera = false AND d.archivado = false
        AND c.esBorrador = false
        AND (c.programadoPara IS NULL OR c.programadoPara <= CURRENT_TIMESTAMP)
        """)
    Page<Correo> findBandejaEntradaPaged(@Param("receptorId") Long receptorId, Pageable pageable);

    // ── Favoritos (sin paginación) ──
    @Query("""
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.esFavorito = true AND d.enPapelera = false
        ORDER BY c.fecha DESC
        """)
    List<Correo> findFavoritos(@Param("receptorId") Long receptorId);

    // ── Favoritos paginados ──
    @Query(value = """
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.esFavorito = true AND d.enPapelera = false
        ORDER BY c.fecha DESC
        """,
        countQuery = """
        SELECT COUNT(c) FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.esFavorito = true AND d.enPapelera = false
        """)
    Page<Correo> findFavoritosPaged(@Param("receptorId") Long receptorId, Pageable pageable);

    // ── No leídos (sin paginación) ──
    @Query("""
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.leido = false AND d.enPapelera = false
        AND c.esBorrador = false
        ORDER BY c.fecha DESC
        """)
    List<Correo> findNoLeidos(@Param("receptorId") Long receptorId);

    // ── No leídos paginados ──
    @Query(value = """
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.leido = false AND d.enPapelera = false
        AND c.esBorrador = false
        ORDER BY c.fecha DESC
        """,
        countQuery = """
        SELECT COUNT(c) FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.leido = false AND d.enPapelera = false
        AND c.esBorrador = false
        """)
    Page<Correo> findNoLeidosPaged(@Param("receptorId") Long receptorId, Pageable pageable);

    // ── Archivados (sin paginación) ──
    @Query("""
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.archivado = true AND d.enPapelera = false
        AND c.esBorrador = false
        ORDER BY c.fecha DESC
        """)
    List<Correo> findArchivados(@Param("receptorId") Long receptorId);

    // ── Archivados paginados ──
    @Query(value = """
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.archivado = true AND d.enPapelera = false
        AND c.esBorrador = false
        ORDER BY c.fecha DESC
        """,
        countQuery = """
        SELECT COUNT(c) FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.archivado = true AND d.enPapelera = false
        AND c.esBorrador = false
        """)
    Page<Correo> findArchivadosPaged(@Param("receptorId") Long receptorId, Pageable pageable);

    // ── Por categoría (sin paginación) ──
    @Query("""
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND UPPER(c.categoria) = UPPER(:categoria)
        AND d.enPapelera = false AND d.archivado = false
        AND c.esBorrador = false
        ORDER BY c.fecha DESC
        """)
    List<Correo> findByCategoria(@Param("receptorId") Long receptorId, @Param("categoria") String categoria);

    // ── Por categoría paginado ──
    @Query(value = """
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND UPPER(c.categoria) = UPPER(:categoria)
        AND d.enPapelera = false AND d.archivado = false
        AND c.esBorrador = false
        ORDER BY c.fecha DESC
        """,
        countQuery = """
        SELECT COUNT(c) FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND UPPER(c.categoria) = UPPER(:categoria)
        AND d.enPapelera = false AND d.archivado = false
        AND c.esBorrador = false
        """)
    Page<Correo> findByCategoriaPaged(@Param("receptorId") Long receptorId,
                                      @Param("categoria") String categoria,
                                      Pageable pageable);

    // ── Papelera (sin paginación) ──
    @Query("""
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.enPapelera = true
        ORDER BY d.fechaPapelera DESC
        """)
    List<Correo> findPapelera(@Param("receptorId") Long receptorId);

    // ── Papelera paginada ──
    @Query(value = """
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.enPapelera = true
        ORDER BY d.fechaPapelera DESC
        """,
        countQuery = """
        SELECT COUNT(c) FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.enPapelera = true
        """)
    Page<Correo> findPapeleraPaged(@Param("receptorId") Long receptorId, Pageable pageable);

    // ── Por etiqueta ──
    @Query("""
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.etiqueta = :etiqueta AND d.enPapelera = false
        ORDER BY c.fecha DESC
        """)
    List<Correo> findByEtiqueta(@Param("receptorId") Long receptorId, @Param("etiqueta") String etiqueta);

    // ── Hilos (conversaciones) ──
    @Query("SELECT c FROM Correo c WHERE (c.id = :rootId OR c.threadId = :rootId) AND c.esBorrador = false ORDER BY c.fecha ASC")
    List<Correo> findByThread(@Param("rootId") Long rootId);

    long countByThreadId(Long threadId);

    // ── Borradores ──
    @Query("SELECT c FROM Correo c WHERE c.emisorId = :emisorId AND c.esBorrador = true ORDER BY c.fecha DESC")
    List<Correo> findBorradores(@Param("emisorId") Long emisorId);

    // ── Programados para enviar ──
    @Query("SELECT c FROM Correo c WHERE c.programadoPara IS NOT NULL AND c.programadoPara <= :ahora AND c.esBorrador = true")
    List<Correo> findProgramadosParaEnviar(@Param("ahora") LocalDateTime ahora);

    // ── Búsqueda entrada ──
    @Query("""
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.enPapelera = false
        AND c.esBorrador = false
        AND (c.programadoPara IS NULL OR c.programadoPara <= CURRENT_TIMESTAMP)
        AND (LOWER(c.asunto) LIKE :q OR LOWER(c.cuerpo) LIKE :q)
        ORDER BY c.fecha DESC
        """)
    List<Correo> buscarEntrada(@Param("receptorId") Long receptorId, @Param("q") String q);

    // ── Búsqueda enviados ──
    @Query("""
        SELECT c FROM Correo c
        WHERE c.emisorId = :emisorId AND c.esBorrador = false
        AND (LOWER(c.asunto) LIKE :q OR LOWER(c.cuerpo) LIKE :q)
        ORDER BY c.fecha DESC
        """)
    List<Correo> buscarEnviados(@Param("emisorId") Long emisorId, @Param("q") String q);

    // ── Búsqueda avanzada paginada (inbox + enviados del usuario) ──
    @Query(value = """
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :userId AND d.enPapelera = false
        AND c.esBorrador = false
        AND (c.programadoPara IS NULL OR c.programadoPara <= CURRENT_TIMESTAMP)
        AND (LOWER(c.asunto) LIKE :q OR LOWER(c.cuerpo) LIKE :q)
        AND (:categoria IS NULL OR c.categoria = :categoria)
        AND (:fechaDesde IS NULL OR c.fecha >= :fechaDesde)
        AND (:fechaHasta IS NULL OR c.fecha <= :fechaHasta)
        AND (:tieneAdjuntos IS NULL OR c.tieneAdjuntos = :tieneAdjuntos)
        AND (:esComunicado IS NULL OR c.esComunicado = :esComunicado)
        AND (:emisorId IS NULL OR c.emisorId = :emisorId)
        ORDER BY c.fecha DESC
        """,
        countQuery = """
        SELECT COUNT(c) FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :userId AND d.enPapelera = false
        AND c.esBorrador = false
        AND (c.programadoPara IS NULL OR c.programadoPara <= CURRENT_TIMESTAMP)
        AND (LOWER(c.asunto) LIKE :q OR LOWER(c.cuerpo) LIKE :q)
        AND (:categoria IS NULL OR c.categoria = :categoria)
        AND (:fechaDesde IS NULL OR c.fecha >= :fechaDesde)
        AND (:fechaHasta IS NULL OR c.fecha <= :fechaHasta)
        AND (:tieneAdjuntos IS NULL OR c.tieneAdjuntos = :tieneAdjuntos)
        AND (:esComunicado IS NULL OR c.esComunicado = :esComunicado)
        AND (:emisorId IS NULL OR c.emisorId = :emisorId)
        """)
    Page<Correo> buscarAvanzadoPaged(
        @Param("userId") Long userId,
        @Param("q") String q,
        @Param("categoria") String categoria,
        @Param("fechaDesde") LocalDateTime fechaDesde,
        @Param("fechaHasta") LocalDateTime fechaHasta,
        @Param("tieneAdjuntos") Boolean tieneAdjuntos,
        @Param("esComunicado") Boolean esComunicado,
        @Param("emisorId") Long emisorId,
        Pageable pageable
    );
}
