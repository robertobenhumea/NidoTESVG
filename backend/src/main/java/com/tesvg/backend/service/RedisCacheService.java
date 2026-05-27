package com.tesvg.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.Set;

@Service
public class RedisCacheService {

    @Autowired private StringRedisTemplate redis;
    @Autowired @Qualifier("redisObjectMapper") private ObjectMapper redisObjectMapper;

    @Value("${app.redis.enabled:true}")
    private boolean enabled;

    public <T> Optional<T> get(String key, Class<T> type) {
        if (!enabled) return Optional.empty();
        try {
            String raw = redis.opsForValue().get(key);
            if (raw == null) return Optional.empty();
            return Optional.of(redisObjectMapper.readValue(raw, type));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    public <T> Optional<T> get(String key, TypeReference<T> type) {
        if (!enabled) return Optional.empty();
        try {
            String raw = redis.opsForValue().get(key);
            if (raw == null) return Optional.empty();
            return Optional.of(redisObjectMapper.readValue(raw, type));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    public void set(String key, Object value, Duration ttl) {
        if (!enabled) return;
        try {
            redis.opsForValue().set(key, redisObjectMapper.writeValueAsString(value), ttl);
        } catch (Exception ignored) {
            // Redis cache must never break the request path.
        }
    }

    public void delete(String key) {
        if (!enabled) return;
        try { redis.delete(key); } catch (Exception ignored) {}
    }

    public void deleteByPrefix(String prefix) {
        if (!enabled) return;
        try {
            Set<String> keys = redis.keys(prefix + "*");
            if (keys != null && !keys.isEmpty()) redis.delete(keys);
        } catch (Exception ignored) {}
    }

    public boolean incrementWithinLimit(String key, int limit, Duration window) {
        if (!enabled) return true;
        try {
            Long value = redis.opsForValue().increment(key);
            if (value != null && value == 1L) redis.expire(key, window);
            return value == null || value <= limit;
        } catch (Exception ignored) {
            return true;
        }
    }

    public void setValue(String key, String value, Duration ttl) {
        if (!enabled) return;
        try { redis.opsForValue().set(key, value, ttl); } catch (Exception ignored) {}
    }

    public Optional<String> getValue(String key) {
        if (!enabled) return Optional.empty();
        try { return Optional.ofNullable(redis.opsForValue().get(key)); } catch (Exception ignored) { return Optional.empty(); }
    }

    public void setAdd(String key, String value, Duration ttl) {
        if (!enabled) return;
        try {
            redis.opsForSet().add(key, value);
            redis.expire(key, ttl);
        } catch (Exception ignored) {}
    }

    public void setRemove(String key, String value) {
        if (!enabled) return;
        try { redis.opsForSet().remove(key, value); } catch (Exception ignored) {}
    }

    public long setSize(String key) {
        if (!enabled) return 0;
        try {
            Long size = redis.opsForSet().size(key);
            return size != null ? size : 0;
        } catch (Exception ignored) {
            return 0;
        }
    }

    public void publish(String channel, Object payload) {
        if (!enabled) return;
        try {
            redis.convertAndSend(channel, redisObjectMapper.writeValueAsString(payload));
        } catch (Exception ignored) {
            // Pub/Sub is an optimization path; local REST/WebSocket flow remains authoritative.
        }
    }
}
