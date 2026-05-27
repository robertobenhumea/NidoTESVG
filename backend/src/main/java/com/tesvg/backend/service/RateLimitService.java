package com.tesvg.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RateLimitService {

    @Autowired private RedisCacheService redisCacheService;

    public boolean allow(String bucket, String actor, int limit, Duration window) {
        String safeActor = actor != null ? actor : "anonymous";
        return redisCacheService.incrementWithinLimit("rate:" + bucket + ":" + safeActor, limit, window);
    }
}
