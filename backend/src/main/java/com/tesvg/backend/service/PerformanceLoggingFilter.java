package com.tesvg.backend.service;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class PerformanceLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(PerformanceLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        long start = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long elapsed = System.currentTimeMillis() - start;
            if (elapsed > 500) {
                log.warn("[PERF] slow endpoint {} {} -> {}ms status={}",
                        request.getMethod(), request.getRequestURI(), elapsed, response.getStatus());
            }
        }
    }
}
