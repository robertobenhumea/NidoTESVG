package com.tesvg.backend.repository;

import com.tesvg.backend.model.Producto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductoRepository extends JpaRepository<Producto, Long> {
    List<Producto> findByEstadoOrderByFechaDesc(Producto.Estado estado);
    Page<Producto> findByEstadoOrderByFechaDesc(Producto.Estado estado, Pageable pageable);
    List<Producto> findByCategoriaAndEstadoOrderByFechaDesc(Producto.Categoria categoria, Producto.Estado estado);
    Page<Producto> findByCategoriaAndEstadoOrderByFechaDesc(Producto.Categoria categoria, Producto.Estado estado, Pageable pageable);
    List<Producto> findByVendedorIdOrderByFechaDesc(Long vendedorId);
    List<Producto> findByTituloContainingIgnoreCaseAndEstado(String titulo, Producto.Estado estado);
    Page<Producto> findByTituloContainingIgnoreCaseAndEstado(String titulo, Producto.Estado estado, Pageable pageable);
}
