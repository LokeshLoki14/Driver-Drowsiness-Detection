package com.drowsiness.detection;

public class DetectionResult {

    private final DriverState state;
    private final double ear;
    private final double mar;
    private final String eventType;
    private final int eyeFrames;
    private final int yawnFrames;

    public DetectionResult(DriverState state, double ear, double mar,
            String eventType, int eyeFrames, int yawnFrames) {
        this.state = state;
        this.ear = ear;
        this.mar = mar;
        this.eventType = eventType;
        this.eyeFrames = eyeFrames;
        this.yawnFrames = yawnFrames;
    }

    public DriverState getState() {
        return state;
    }

    public double getEar() {
        return ear;
    }

    public double getMar() {
        return mar;
    }

    public String getEventType() {
        return eventType;
    }

    public int getEyeFrames() {
        return eyeFrames;
    }

    public int getYawnFrames() {
        return yawnFrames;
    }
}
