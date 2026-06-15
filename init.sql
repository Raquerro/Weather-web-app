CREATE DATABASE IF NOT EXISTS authdb;
CREATE DATABASE IF NOT EXISTS appdb;
GRANT ALL PRIVILEGES ON authdb.* TO 'authuser'@'%';
GRANT ALL PRIVILEGES ON appdb.* TO 'authuser'@'%';
FLUSH PRIVILEGES;

USE appdb;
CREATE TABLE IF NOT EXISTS notification_configs (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    user_id     INT NOT NULL,
    name        VARCHAR(100) NOT NULL,
    latitude    DECIMAL(9,6) NOT NULL,
    longitude   DECIMAL(9,6) NOT NULL,
    active      BOOLEAN DEFAULT TRUE,
    notify_hour INT DEFAULT 7,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
