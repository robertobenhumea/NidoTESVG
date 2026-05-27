package com.tesvg.backend.dto;

public record MessageReactionDTO(
        String reactionType,
        Long count,
        Boolean mine
) {}
