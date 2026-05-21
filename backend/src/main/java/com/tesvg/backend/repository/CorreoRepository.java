package com.tesvg.backend.repository;

import com.tesvg.backend.model.Correo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface CorreoRepository extends JpaRepository<Correo, Long> {

    @Query("SELECT c FROM Correo c WHERE c.emisorId = :emisorId AND c.esBorrador = false ORDER BY c.fecha DESC")
    List<Correo> findByEmisorIdOrderByFechaDesc(@Param("emisorId") Long emisorId);

    @Query("SELECT c FROM Correo c WHERE c.esComunicado = true AND c.esBorrador = false ORDER BY c.fecha DESC")
    List<Correo> findComunicados();

    @Query("""
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.enPapelera = false AND d.archivado = false
        AND c.esBorrador = false
        AND (c.programadoPara IS NULL OR c.programadoPara <= CURRENT_TIMESTAMP)
        ORDER BY c.fecha DESC
        """)
    List<Correo> findBandejaEntrada(@Param("receptorId") Long receptorId);

    @Query("""
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.esFavorito = true AND d.enPapelera = false
        ORDER BY c.fecha DESC
        """)
    List<Correo> findFavoritos(@Param("receptorId") Long receptorId);

    @Query("""
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.leido = false AND d.enPapelera = false
        AND c.esBorrador = false
        ORDER BY c.fecha DESC
        """)
    List<Correo> findNoLeidos(@Param("receptorId") Long receptorId);

    @Query("""
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.archivado = true AND d.enPapelera = false
        AND c.esBorrador = false
        ORDER BY c.fecha DESC
        """)
    List<Correo> findArchivados(@Param("receptorId") Long receptorId);

    @Query("""
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.enPapelera = true
        ORDER BY d.fechaPapelera DESC
        """)
    List<Correo> findPapelera(@Param("receptorId") Long receptorId);

    @Query("""
        SELECT c FROM Correo c
        JOIN CorreoDestinatario d ON d.correoId = c.id
        WHERE d.receptorId = :receptorId AND d.etiqueta = :etiqueta AND d.enPapelera = false
        ORDER BY c.fecha DESC
        """)
    List<Correo> findByEtiqueta(@Param("receptorId") Long receptorId, @Param("etiqueta") String etiqueta);

    @Query("SELECT c FROM Correo c WHERE c.emisorId = :emisorId AND c.esBorrador = true ORDER BY c.fecha DESC")
    List<Correo> findBorradores(@Param("emisorId") Long emisorId);

    @Query("SELECT c FROM Correo c WHERE c.programadoPara IS NOT NULL AND c.programadoPara <= :ahora AND c.esBorrador = true")
    List<Correo> findProgramadosParaEnviar(@Param("ahora") LocalDateTime ahora);

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

    @Query("""
        SELECT c FROM Correo c
        WHERE c.emisorId = :emisorId AND c.esBorrador = false
        AND (LOWER(c.asunto) LIKE :q OR LOWER(c.cuerpo) LIKE :q)
        ORDER BY c.fecha DESC
        """)
    List<Correo> buscarEnviados(@Param("emisorId") Long emisorId, @Param("q") String q);
}
