ALTER TABLE `Game` ADD COLUMN `state` ENUM('LOBBY', 'ONGOING', 'ENDED') NOT NULL DEFAULT 'LOBBY';
UPDATE `Game` SET `state` = CASE WHEN `isOngoing` = true THEN 'ONGOING' ELSE 'ENDED' END;
ALTER TABLE `Game` DROP COLUMN `isOngoing`;