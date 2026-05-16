package com.tesvg.backend.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RootController {

    private static final String REDIRECT_HTML =
        "<!DOCTYPE html>" +
        "<html lang=\"es\">" +
        "<head>" +
        "<meta charset=\"UTF-8\">" +
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
        "<meta name=\"theme-color\" content=\"#09090d\">" +
        "<title>NidoTESVG</title>" +
        "<style>" +
        "html,body{margin:0;height:100%;background:#09090d}" +
        "</style>" +
        "<script>" +
        "(function(){" +
        "var t=localStorage.getItem('token');" +
        "if(t&&t.trim().length>10){" +
        "window.location.replace('/home.html');" +
        "}else{" +
        "window.location.replace('/login.html');" +
        "}" +
        "})();" +
        "</script>" +
        "</head>" +
        "<body></body>" +
        "</html>";

    @GetMapping(value = "/", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> root() {
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(REDIRECT_HTML);
    }
}
