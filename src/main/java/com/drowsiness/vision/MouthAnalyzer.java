package com.drowsiness.vision;

import org.springframework.stereotype.Service;

@Service
public class MouthAnalyzer {

    public double calculateMar(double[][] p) {
        double a = distance(p[61], p[67]);
        double b = distance(p[62], p[66]);
        double c = distance(p[63], p[65]);
        double d = distance(p[60], p[64]);

        if (d == 0) {
            return 0;
        }
        return (a + b + c) / d;
    }

    private double distance(double[] p1, double[] p2) {
        return Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
    }
}
