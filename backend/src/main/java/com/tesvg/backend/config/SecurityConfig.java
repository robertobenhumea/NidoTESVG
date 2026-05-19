package com.tesvg.backend.config;

import com.tesvg.backend.security.JwtFilter;
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
        config.setAllowedOrigins(origins);
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
                .requestMatchers("/imagenes/adjuntos/**").authenticated()
                .requestMatchers("/imagenes/**").permitAll()

                // ── Role-restricted endpoints ──────────────────────────────────────────
                // Any authenticated user can report a post (more specific → must come first)
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
                        "/destacados/**"
                ).authenticated()

                // ── Anything else: 404 (no static files served in API-only mode) ───────
                .anyRequest().denyAll()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
