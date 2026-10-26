package com.drowsiness.controller;

import java.nio.charset.StandardCharsets;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import com.drowsiness.detection.DetectionLoop;

@RestController
@RequestMapping("/api/video")
public class VideoStreamController {

    private final DetectionLoop detectionLoop;

    public VideoStreamController(DetectionLoop detectionLoop) {
        this.detectionLoop = detectionLoop;
    }

    @GetMapping("/stream")
    public ResponseEntity<StreamingResponseBody> stream() {
        StreamingResponseBody body = out -> {
            try {
                while (detectionLoop.isRunning()) {
                    byte[] jpeg = detectionLoop.getLatestJpeg();
                    if (jpeg != null) {
                        String header = "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: "
                                + jpeg.length + "\r\n\r\n";
                        out.write(header.getBytes(StandardCharsets.US_ASCII));
                        out.write(jpeg);
                        out.write("\r\n".getBytes(StandardCharsets.US_ASCII));
                        out.flush();
                    }
                    Thread.sleep(40);
                }
            } catch (Exception e) {
                // browser closed the stream
            }
        };

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("multipart/x-mixed-replace;boundary=frame"))
                .body(body);
    }
}
