package com.tesvg.backend.service;

import com.tesvg.backend.model.BuzonOficial;
import com.tesvg.backend.repository.BuzonOficialRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class BuzonDataSeeder {

    @Autowired
    private BuzonOficialRepository buzonRepo;

    @PostConstruct
    public void seed() {
        if (buzonRepo.count() > 0) return;
        crearBuzon("Coordinación General",   "coordinacion",  "Recibe solicitudes académicas y administrativas generales.", "COORDINACION",  "AUTORIDAD");
        crearBuzon("Dirección",              "direccion",     "Buzón oficial de la Dirección del Instituto.",               "DIRECCION",     "DIRECCION");
        crearBuzon("Servicios Escolares",    "escolares",     "Trámites escolares, kardex, historial académico.",           "SERVICIOS",     "ADMINISTRATIVO");
        crearBuzon("Recursos Humanos",       "rh",            "Asuntos de personal y recursos humanos.",                   "ADMINISTRATIVO","ADMINISTRATIVO");
        crearBuzon("Soporte Académico",      "academico",     "Consultas y apoyo académico a docentes.",                   "ACADEMICO",     "DOCENTE");
    }

    private void crearBuzon(String nombre, String alias, String descripcion, String tipo, String receptorRol) {
        if (buzonRepo.existsByAlias(alias)) return;
        BuzonOficial b = new BuzonOficial();
        b.setNombre(nombre);
        b.setAlias(alias);
        b.setDescripcion(descripcion);
        b.setTipo(tipo);
        b.setReceptorRol(receptorRol);
        b.setActivo(true);
        buzonRepo.save(b);
    }
}
