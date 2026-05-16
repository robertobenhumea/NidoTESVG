package com.tesvg.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import com.tesvg.backend.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
   
	
    Optional<Usuario> findByCorreo(String correo);
    long countByActivoTrue();
    long countByActivoFalse();
}

