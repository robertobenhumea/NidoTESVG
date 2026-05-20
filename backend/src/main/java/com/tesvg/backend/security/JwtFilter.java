package com.tesvg.backend.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.UsuarioRepository;
import java.util.List;
import java.io.IOException;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtFilter.class);

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String method = request.getMethod();
        String uri    = request.getRequestURI();
        String header = request.getHeader("Authorization");

        log.debug("[JWT] {} {} — Authorization header: {}", method, uri,
                header == null ? "ABSENT" : header.startsWith("Bearer ") ? "Bearer ***" : "INVALID_FORMAT");

        if (header != null && header.startsWith("Bearer ")) {

            String token = header.substring(7);

            try {
                String correo = jwtUtil.obtenerCorreo(token);
                int tokenVersion = jwtUtil.obtenerTokenVersion(token);
                request.setAttribute("correo", correo);

                Usuario usuario = usuarioRepository.findByCorreo(correo).orElse(null);

                if (usuario == null) {
                    log.warn("[JWT] {} {} — usuario no encontrado para correo={}", method, uri, correo);
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    return;
                }
                if (!usuario.isActivo()) {
                    log.warn("[JWT] {} {} — usuario inactivo: correo={}", method, uri, correo);
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    return;
                }
                if (usuario.getTokenVersion() != tokenVersion) {
                    log.warn("[JWT] {} {} — token version mismatch: token={} db={} correo={}",
                            method, uri, tokenVersion, usuario.getTokenVersion(), correo);
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    return;
                }

                List<SimpleGrantedAuthority> authorities = List.of(
                    new SimpleGrantedAuthority(usuario.getRol().name())
                );

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                correo, null, authorities);

                SecurityContextHolder.getContext().setAuthentication(auth);
                log.debug("[JWT] {} {} — autenticado: correo={} rol={}", method, uri, correo, usuario.getRol());

            } catch (Exception e) {
                log.warn("[JWT] {} {} — token inválido: {}", method, uri, e.getMessage());
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        } else {
            log.debug("[JWT] {} {} — sin token, continuando como anónimo", method, uri);
        }

        filterChain.doFilter(request, response);
    }
}