CREATE DATABASE IF NOT EXISTS drowsiness_db;
USE drowsiness_db;

CREATE TABLE IF NOT EXISTS detection_session (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    started_at DATETIME NOT NULL,
    ended_at DATETIME NULL
);

CREATE TABLE IF NOT EXISTS drowsiness_event (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    ear_value DOUBLE NOT NULL,
    mar_value DOUBLE NOT NULL,
    detected_at DATETIME NOT NULL
);
