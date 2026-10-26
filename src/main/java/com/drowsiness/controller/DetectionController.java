package com.drowsiness.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.drowsiness.config.DetectionProperties;
import com.drowsiness.detection.DetectionLoop;
import com.drowsiness.detection.DetectionResult;
import com.drowsiness.detection.DriverState;

@RestController
@RequestMapping("/api")
public class DetectionController {

    private final DetectionLoop detectionLoop;
    private final DetectionProperties properties;

    public DetectionController(DetectionLoop detectionLoop, DetectionProperties properties) {
        this.detectionLoop = detectionLoop;
        this.properties = properties;
    }

    @PostMapping("/detection/start")
    public ResponseEntity<Map<String, Object>> start() {
        Map<String, Object> body = new LinkedHashMap<>();

        if (detectionLoop.start()) {
            body.put("running", true);
            return ResponseEntity.ok(body);
        }

        body.put("running", false);
        body.put("message", "Could not open the camera");
        return ResponseEntity.status(503).body(body);
    }

    @PostMapping("/detection/stop")
    public Map<String, Object> stop() {
        detectionLoop.stop();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("running", false);
        return body;
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        DetectionResult result = detectionLoop.getLatestResult();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("running", detectionLoop.isRunning());
        body.put("state", result.getState().name());
        body.put("alarm", result.getState() == DriverState.DROWSY);
        body.put("eventType", result.getEventType());
        body.put("ear", Math.round(result.getEar() * 100.0) / 100.0);
        body.put("mar", Math.round(result.getMar() * 100.0) / 100.0);
        body.put("eyeFrames", result.getEyeFrames());
        body.put("yawnFrames", result.getYawnFrames());
        body.put("earThreshold", properties.getEarThreshold());
        body.put("marThreshold", properties.getMarThreshold());
        body.put("frameThreshold", properties.getFrameThreshold());
        return body;
    }
}
