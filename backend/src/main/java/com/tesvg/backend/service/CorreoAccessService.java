package com.tesvg.backend.service;

import com.tesvg.backend.model.Correo;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.CorreoDestinatarioRepository;
import com.tesvg.backend.repository.CorreoRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class CorreoAccessService {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private CorreoRepository correoRepository;
    @Autowired private CorreoDestinatarioRepository destinatarioRepository;

    public Usuario getUsuario(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        return usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    public boolean puedeVerCorreo(Long correoId, Long usuarioId) {
        return correoRepository.findById(correoId)
                .map(c -> puedeVerCorreo(c, usuarioId))
                .orElse(false);
    }

    public boolean puedeVerCorreo(Correo correo, Long usuarioId) {
        return correo.getEmisorId().equals(usuarioId)
                || destinatarioRepository.findByCorreoIdAndReceptorId(correo.getId(), usuarioId).isPresent();
    }
}
