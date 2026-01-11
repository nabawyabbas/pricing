-- CreateTable
CREATE TABLE `SettingOverride` (
    `id` VARCHAR(191) NOT NULL,
    `viewId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `valueType` ENUM('string', 'number', 'float', 'integer', 'boolean') NOT NULL,
    `group` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SettingOverride_viewId_key_key`(`viewId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SettingOverride` ADD CONSTRAINT `SettingOverride_viewId_fkey` FOREIGN KEY (`viewId`) REFERENCES `PricingView`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

