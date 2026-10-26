package com.drowsiness.vision;

import org.springframework.stereotype.Service;

@Service
public class EyeAnalyzer {

    private static final int RIGHT_EYE_START = 36;
    private static final int LEFT_EYE_START = 42;

    public double calculateEar(double[][] points) {
        double right = eyeRatio(points, RIGHT_EYE_START);
        double left = eyeRatio(points, LEFT_EYE_START);
        return (left + right) / 2.0;
    }

    private double eyeRatio(double[][] p, int s) {
        double a = distance(p[s + 1], p[s + 5]);
        double b = distance(p[s + 2], p[s + 4]);
        double c = distance(p[s], p[s + 3]);

        if (c == 0) {
            return 0;
        }
        return (a + b) / (2.0 * c);
    }

    private double distance(double[] p1, double[] p2) {
        return Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
    }
}
