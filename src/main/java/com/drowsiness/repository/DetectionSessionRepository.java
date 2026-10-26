package com.drowsiness.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.drowsiness.entity.DetectionSession;

public interface DetectionSessionRepository extends JpaRepository<DetectionSession, Long> {
}
