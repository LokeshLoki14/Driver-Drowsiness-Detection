package com.drowsiness.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.drowsiness.entity.DrowsinessEvent;

public interface DrowsinessEventRepository extends JpaRepository<DrowsinessEvent, Long> {

    List<DrowsinessEvent> findAllByOrderByDetectedAtDesc();
}
