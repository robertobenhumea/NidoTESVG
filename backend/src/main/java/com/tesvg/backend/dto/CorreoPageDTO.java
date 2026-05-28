package com.tesvg.backend.dto;

import java.util.List;

public class CorreoPageDTO<T> {

    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean hasMore;

    public CorreoPageDTO() {}

    public CorreoPageDTO(List<T> content, int page, int size, long totalElements, int totalPages) {
        this.content       = content;
        this.page          = page;
        this.size          = size;
        this.totalElements = totalElements;
        this.totalPages    = totalPages;
        this.hasMore       = page + 1 < totalPages;
    }

    public List<T> getContent()        { return content; }
    public int getPage()               { return page; }
    public int getSize()               { return size; }
    public long getTotalElements()     { return totalElements; }
    public int getTotalPages()         { return totalPages; }
    public boolean isHasMore()         { return hasMore; }
}
