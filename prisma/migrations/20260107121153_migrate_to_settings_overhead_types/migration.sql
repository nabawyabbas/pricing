-- Migration: Convert Assumptions to Settings and OverheadPool to OverheadType
-- This migration preserves existing data and handles partial migrations

-- Step 1: Create new tables (if they don't exist)
CREATE TABLE IF NOT EXISTS `Setting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `valueType` ENUM('string', 'number', 'float', 'integer', 'boolean') NOT NULL,
    `group` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Setting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `OverheadType` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `period` ENUM('annual', 'monthly', 'quarterly') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 2: Migrate Assumptions data to Settings (only if not exists)
INSERT IGNORE INTO `Setting` (`id`, `key`, `value`, `valueType`, `group`, `unit`, `createdAt`, `updatedAt`)
SELECT 
    CONCAT('setting-devhours-', UNIX_TIMESTAMP()) as `id`,
    'devReleasableHoursPerMonth' as `key`,
    CAST(`devReleasableHoursPerMonth` AS CHAR) as `value`,
    'float' as `valueType`,
    'hours' as `group`,
    'hours/month' as `unit`,
    `createdAt`,
    `updatedAt`
FROM `Assumptions`
LIMIT 1;

INSERT IGNORE INTO `Setting` (`id`, `key`, `value`, `valueType`, `group`, `unit`, `createdAt`, `updatedAt`)
SELECT 
    CONCAT('setting-stdhours-', UNIX_TIMESTAMP()) as `id`,
    'standardHoursPerMonth' as `key`,
    CAST(`standardHoursPerMonth` AS CHAR) as `value`,
    'float' as `valueType`,
    'hours' as `group`,
    'hours/month' as `unit`,
    `createdAt`,
    `updatedAt`
FROM `Assumptions`
LIMIT 1;

INSERT IGNORE INTO `Setting` (`id`, `key`, `value`, `valueType`, `group`, `unit`, `createdAt`, `updatedAt`)
SELECT 
    CONCAT('setting-qaratio-', UNIX_TIMESTAMP()) as `id`,
    'qaRatio' as `key`,
    CAST(`qaRatio` AS CHAR) as `value`,
    'float' as `valueType`,
    'ratios' as `group`,
    '' as `unit`,
    `createdAt`,
    `updatedAt`
FROM `Assumptions`
LIMIT 1;

INSERT IGNORE INTO `Setting` (`id`, `key`, `value`, `valueType`, `group`, `unit`, `createdAt`, `updatedAt`)
SELECT 
    CONCAT('setting-baratio-', UNIX_TIMESTAMP()) as `id`,
    'baRatio' as `key`,
    CAST(`baRatio` AS CHAR) as `value`,
    'float' as `valueType`,
    'ratios' as `group`,
    '' as `unit`,
    `createdAt`,
    `updatedAt`
FROM `Assumptions`
LIMIT 1;

INSERT IGNORE INTO `Setting` (`id`, `key`, `value`, `valueType`, `group`, `unit`, `createdAt`, `updatedAt`)
SELECT 
    CONCAT('setting-margin-', UNIX_TIMESTAMP()) as `id`,
    'margin' as `key`,
    CAST(`margin` AS CHAR) as `value`,
    'float' as `valueType`,
    'pricing' as `group`,
    '' as `unit`,
    `createdAt`,
    `updatedAt`
FROM `Assumptions`
LIMIT 1;

INSERT IGNORE INTO `Setting` (`id`, `key`, `value`, `valueType`, `group`, `unit`, `createdAt`, `updatedAt`)
SELECT 
    CONCAT('setting-risk-', UNIX_TIMESTAMP()) as `id`,
    'risk' as `key`,
    CAST(`risk` AS CHAR) as `value`,
    'float' as `valueType`,
    'pricing' as `group`,
    '' as `unit`,
    `createdAt`,
    `updatedAt`
FROM `Assumptions`
LIMIT 1;

-- Step 3: Migrate OverheadPool data to OverheadType (only if not exists)
INSERT IGNORE INTO `OverheadType` (`id`, `name`, `amount`, `period`, `createdAt`, `updatedAt`)
SELECT 
    CONCAT('overhead-mgmt-', UNIX_TIMESTAMP()) as `id`,
    'Management' as `name`,
    `managementOverheadAnnual` as `amount`,
    'annual' as `period`,
    `createdAt`,
    `updatedAt`
FROM `OverheadPool`
LIMIT 1;

INSERT IGNORE INTO `OverheadType` (`id`, `name`, `amount`, `period`, `createdAt`, `updatedAt`)
SELECT 
    CONCAT('overhead-company-', UNIX_TIMESTAMP()) as `id`,
    'Company' as `name`,
    `companyOverheadAnnual` as `amount`,
    'annual' as `period`,
    `createdAt`,
    `updatedAt`
FROM `OverheadPool`
LIMIT 1;

-- Step 4: Add new columns to OverheadAllocation if they don't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'OverheadAllocation' 
    AND COLUMN_NAME = 'overheadTypeId');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE `OverheadAllocation` ADD COLUMN `overheadTypeId` VARCHAR(191) NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'OverheadAllocation' 
    AND COLUMN_NAME = 'share');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE `OverheadAllocation` ADD COLUMN `share` DOUBLE NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Complete OverheadAllocation data migration
-- Update rows that have mgmtShare but no overheadTypeId
UPDATE `OverheadAllocation` oa
INNER JOIN `OverheadType` ot ON ot.name = 'Management'
SET 
    oa.`overheadTypeId` = ot.`id`,
    oa.`share` = oa.`mgmtShare`
WHERE oa.`overheadTypeId` IS NULL 
AND EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'OverheadAllocation' 
    AND COLUMN_NAME = 'mgmtShare')
AND oa.`mgmtShare` IS NOT NULL;

-- Step 6: Insert Company overhead allocations for employees
INSERT IGNORE INTO `OverheadAllocation` (`id`, `employeeId`, `overheadTypeId`, `share`, `createdAt`, `updatedAt`)
SELECT 
    CONCAT('alloc-', oa.`employeeId`, '-company-', UNIX_TIMESTAMP()) as `id`,
    oa.`employeeId`,
    ot.`id` as `overheadTypeId`,
    oa.`companyShare` as `share`,
    oa.`createdAt`,
    oa.`updatedAt`
FROM `OverheadAllocation` oa
INNER JOIN `OverheadType` ot ON ot.name = 'Company'
WHERE EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'OverheadAllocation' 
    AND COLUMN_NAME = 'companyShare')
AND oa.`companyShare` IS NOT NULL
AND oa.`companyShare` > 0
AND NOT EXISTS (
    SELECT 1 FROM `OverheadAllocation` oa2 
    WHERE oa2.`employeeId` = oa.`employeeId` 
    AND oa2.`overheadTypeId` = ot.`id`
);

-- Step 7: Set defaults for any remaining NULL values
UPDATE `OverheadAllocation` 
SET `overheadTypeId` = (SELECT `id` FROM `OverheadType` WHERE `name` = 'Management' LIMIT 1),
    `share` = 0
WHERE (`overheadTypeId` IS NULL OR `share` IS NULL)
AND EXISTS (SELECT 1 FROM `OverheadType` WHERE `name` = 'Management');

-- Step 8: Make new columns required
ALTER TABLE `OverheadAllocation` MODIFY COLUMN `overheadTypeId` VARCHAR(191) NOT NULL;
ALTER TABLE `OverheadAllocation` MODIFY COLUMN `share` DOUBLE NOT NULL;

-- Step 9: Add foreign key constraint (if it doesn't exist)
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'OverheadAllocation' 
    AND CONSTRAINT_NAME = 'OverheadAllocation_overheadTypeId_fkey');
SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE `OverheadAllocation` ADD CONSTRAINT `OverheadAllocation_overheadTypeId_fkey` FOREIGN KEY (`overheadTypeId`) REFERENCES `OverheadType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 10: Update unique constraints
-- First, drop foreign key constraint that uses the unique index
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'OverheadAllocation' 
    AND CONSTRAINT_NAME = 'OverheadAllocation_employeeId_fkey');
SET @sql = IF(@fk_exists > 0, 
    'ALTER TABLE `OverheadAllocation` DROP FOREIGN KEY `OverheadAllocation_employeeId_fkey`',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop old unique constraint on employeeId if it exists
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'OverheadAllocation' 
    AND INDEX_NAME = 'OverheadAllocation_employeeId_key');
SET @sql = IF(@idx_exists > 0, 
    'ALTER TABLE `OverheadAllocation` DROP INDEX `OverheadAllocation_employeeId_key`',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Recreate foreign key constraint
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'OverheadAllocation' 
    AND CONSTRAINT_NAME = 'OverheadAllocation_employeeId_fkey');
SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE `OverheadAllocation` ADD CONSTRAINT `OverheadAllocation_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new composite unique constraint
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'OverheadAllocation' 
    AND INDEX_NAME = 'OverheadAllocation_employeeId_overheadTypeId_key');
SET @sql = IF(@idx_exists = 0, 
    'ALTER TABLE `OverheadAllocation` ADD UNIQUE INDEX `OverheadAllocation_employeeId_overheadTypeId_key`(`employeeId`, `overheadTypeId`)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 11: Drop old columns (if they exist)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'OverheadAllocation' 
    AND COLUMN_NAME = 'mgmtShare');
SET @sql = IF(@col_exists > 0, 
    'ALTER TABLE `OverheadAllocation` DROP COLUMN `mgmtShare`',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'OverheadAllocation' 
    AND COLUMN_NAME = 'companyShare');
SET @sql = IF(@col_exists > 0, 
    'ALTER TABLE `OverheadAllocation` DROP COLUMN `companyShare`',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 12: Drop old tables (if they exist)
DROP TABLE IF EXISTS `Assumptions`;
DROP TABLE IF EXISTS `OverheadPool`;
