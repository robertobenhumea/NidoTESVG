package com.tesvg.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import com.tesvg.backend.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByCorreo(String correo);
    long countByActivoTrue();
    long countByActivoFalse();
    List<Usuario> findByRolIn(List<Usuario.Rol> roles);

    // Academic audience queries
    @Query("SELECT DISTINCT u.carrera FROM Usuario u WHERE u.activo = true AND u.carrera IS NOT NULL AND u.carrera <> '' ORDER BY u.carrera ASC")
    List<String> findDistinctCarreras();

    @Query("SELECT DISTINCT u.grupo FROM Usuario u WHERE u.activo = true AND u.grupo IS NOT NULL AND u.grupo <> '' AND u.carrera = :carrera ORDER BY u.grupo ASC")
    List<String> findGruposByCarrera(@Param("carrera") String carrera);

    @Query("SELECT u FROM Usuario u WHERE u.activo = true AND u.carrera = :carrera ORDER BY u.username ASC")
    List<Usuario> findByCarreraAndActivoTrue(@Param("carrera") String carrera);

    @Query("SELECT u FROM Usuario u WHERE u.activo = true AND u.carrera = :carrera AND u.grupo = :grupo ORDER BY u.username ASC")
    List<Usuario> findByCarreraAndGrupoAndActivoTrue(@Param("carrera") String carrera, @Param("grupo") String grupo);

    @Query("SELECT u FROM Usuario u WHERE u.activo = true AND u.rol = :rol ORDER BY u.username ASC")
    List<Usuario> findByRolAndActivoTrue(@Param("rol") Usuario.Rol rol);

    @Query("SELECT u FROM Usuario u WHERE u.activo = true AND u.carrera = :carrera AND u.rol IN :roles ORDER BY u.username ASC")
    List<Usuario> findByCarreraAndRolInAndActivoTrue(@Param("carrera") String carrera, @Param("roles") List<Usuario.Rol> roles);

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.activo = true AND u.carrera = :carrera AND u.rol = :rol")
    long countByCarreraAndRolAndActivoTrue(@Param("carrera") String carrera, @Param("rol") Usuario.Rol rol);

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.activo = true AND u.carrera = :carrera AND u.grupo = :grupo AND u.rol = :rol")
    long countByCarreraAndGrupoAndRolAndActivoTrue(@Param("carrera") String carrera, @Param("grupo") String grupo, @Param("rol") Usuario.Rol rol);
}

