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
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

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
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> {})
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                        "/login.html",
                        "/usuarios/login",
                        "/usuarios/registro",
                        "/ws/**"
                ).permitAll()
                .requestMatchers("/imagenes/adjuntos/**").authenticated()
                .requestMatchers("/imagenes/**").permitAll()
                .requestMatchers("/grupos.html").permitAll()
                .requestMatchers("/admin/**").hasAuthority("ADMIN")
                .requestMatchers(
                        "/publicaciones/anuncio"
                ).hasAnyAuthority("AUTORIDAD", "ADMIN")
                .requestMatchers(
                        "/usuarios/**",
                        "/publicaciones/**",
                        "/interacciones/**",
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
                        "/insignias/**",
                        "/recursos/**",
                        "/ranking/**",
                        "/market/**"
                ).authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins(allowedOrigins.split(","))
                        .allowedMethods("*")
                        .allowedHeaders("*");
            }
        };
    }
}
