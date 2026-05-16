package com.tesvg.backend.service;

import org.springframework.stereotype.Service;

@Service
public class HtmlSanitizerService {

    public String sanitize(String html) {
        if (html == null) return null;
        String sanitized = html;
        sanitized = sanitized.replaceAll("(?is)<\\s*script[^>]*>.*?<\\s*/\\s*script\\s*>", "");
        sanitized = sanitized.replaceAll("(?is)<\\s*(iframe|object|embed|form|input|button|textarea|select|meta|link)[^>]*>.*?<\\s*/\\s*\\1\\s*>", "");
        sanitized = sanitized.replaceAll("(?is)<\\s*(iframe|object|embed|form|input|button|textarea|select|meta|link)[^>]*/?\\s*>", "");
        sanitized = sanitized.replaceAll("(?i)\\s+on[a-z]+\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+)", "");
        sanitized = sanitized.replaceAll("(?i)(href|src)\\s*=\\s*(\"|')\\s*javascript:[^\"']*(\"|')", "$1=\"#\"");
        sanitized = sanitized.replaceAll("(?i)style\\s*=\\s*(\"[^\"]*\"|'[^']*')", "");
        return sanitized;
    }
}
