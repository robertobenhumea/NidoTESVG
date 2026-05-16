package com.tesvg.backend.repository;

import com.tesvg.backend.model.SolicitudCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SolicitudCompraRepository extends JpaRepository<SolicitudCompra, Long> {
    List<SolicitudCompra> findByVendedorIdOrderByFechaDesc(Long vendedorId);
    List<SolicitudCompra> findByCompradorIdOrderByFechaDesc(Long compradorId);
    List<SolicitudCompra> findByProductoId(Long productoId);
}
