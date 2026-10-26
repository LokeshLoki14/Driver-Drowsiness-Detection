package com.drowsiness.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "detection")
public class DetectionProperties {

    private int cameraIndex;
    private double earThreshold = 0.25;
    private double marThreshold = 0.70;
    private int frameThreshold = 18;
    private String faceModelPath;
    private String landmarkModelPath;

    public int getCameraIndex() {
        return cameraIndex;
    }

    public void setCameraIndex(int cameraIndex) {
        this.cameraIndex = cameraIndex;
    }

    public double getEarThreshold() {
        return earThreshold;
    }

    public void setEarThreshold(double earThreshold) {
        this.earThreshold = earThreshold;
    }

    public double getMarThreshold() {
        return marThreshold;
    }

    public void setMarThreshold(double marThreshold) {
        this.marThreshold = marThreshold;
    }

    public int getFrameThreshold() {
        return frameThreshold;
    }

    public void setFrameThreshold(int frameThreshold) {
        this.frameThreshold = frameThreshold;
    }

    public String getFaceModelPath() {
        return faceModelPath;
    }

    public void setFaceModelPath(String faceModelPath) {
        this.faceModelPath = faceModelPath;
    }

    public String getLandmarkModelPath() {
        return landmarkModelPath;
    }

    public void setLandmarkModelPath(String landmarkModelPath) {
        this.landmarkModelPath = landmarkModelPath;
    }
}
