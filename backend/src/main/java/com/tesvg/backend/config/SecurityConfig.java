package com.tesvg.backend.config;

import com.tesvg.backend.security.JwtFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpMethod;

@Configuration
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    @Autowired
    private JwtFilter jwtFilter;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth
                // ── Public endpoints (no token required) ──────────────────────────────
                .requestMatchers(
                        "/",
                        "/usuarios/login",
                        "/usuarios/registro",
                        "/ws/**"
                ).permitAll()
                .requestMatchers("/imagenes/adjuntos/**").permitAll()
                .requestMatchers("/imagenes/mensajes/**").authenticated()
                .requestMatchers("/imagenes/grupos-chat/**").authenticated()
                .requestMatchers("/imagenes/**").permitAll()

                // ── Role-restricted endpoints ──────────────────────────────────────────
                .requestMatchers(HttpMethod.POST, "/admin/reportes/publicacion/**").authenticated()
                .requestMatchers("/admin/**").hasAuthority("ADMIN")
                .requestMatchers("/publicaciones/anuncio").hasAnyAuthority("AUTORIDAD", "ADMIN", "DIRECCION")

                // ── All other API endpoints require a valid JWT ─────────────────────────
                .requestMatchers(
                        "/usuarios/**",
                        "/publicaciones/**",
                        "/interacciones/**",
                        "/comentarios/**",
                        "/imagenes/subir",
                        "/seguidores/**",
                        "/stories/**",
                        "/notificaciones/**",
                        "/mensajes/**",
                        "/correos/**",
                        "/buscar/**",
                        "/grupos/**",
                        "/encuestas/**",
                        "/eventos/**",
                        "/avisos/**",
                        "/reclutamiento/**",
                        "/insignias/**",
                        "/recursos/**",
                        "/ranking/**",
                        "/market/**",
                        "/push/**",
                        "/destacados",   // POST base path (belt-and-suspenders for AntMatcher)
                        "/destacados/**"
                ).authenticated()

                // ── Anything else: deny ────────────────────────────────────────────────
                .anyRequest().denyAll()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    log.warn("[SECURITY] 401 AuthenticationEntryPoint — {} {} — principal={} — reason: {}",
                            request.getMethod(), request.getRequestURI(),
                            request.getAttribute("correo"), authException.getMessage());
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"No autenticado\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    var principal = org.springframework.security.core.context.SecurityContextHolder
                            .getContext().getAuthentication();
                    log.warn("[SECURITY] 403 AccessDenied — {} {} — principal={} authorities={} — reason: {}",
                            request.getMethod(), request.getRequestURI(),
                            principal != null ? principal.getName() : "null",
                            principal != null ? principal.getAuthorities() : "[]",
                            accessDeniedException.getMessage());
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Acceso denegado\"}");
                })
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
