-- CreateTable
CREATE TABLE `PricingView` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeeActiveOverride` (
    `id` VARCHAR(191) NOT NULL,
    `viewId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmployeeActiveOverride_viewId_employeeId_key`(`viewId`, `employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OverheadTypeActiveOverride` (
    `id` VARCHAR(191) NOT NULL,
    `viewId` VARCHAR(191) NOT NULL,
    `overheadTypeId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OverheadTypeActiveOverride_viewId_overheadTypeId_key`(`viewId`, `overheadTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EmployeeActiveOverride` ADD CONSTRAINT `EmployeeActiveOverride_viewId_fkey` FOREIGN KEY (`viewId`) REFERENCES `PricingView`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeActiveOverride` ADD CONSTRAINT `EmployeeActiveOverride_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OverheadTypeActiveOverride` ADD CONSTRAINT `OverheadTypeActiveOverride_viewId_fkey` FOREIGN KEY (`viewId`) REFERENCES `PricingView`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OverheadTypeActiveOverride` ADD CONSTRAINT `OverheadTypeActiveOverride_overheadTypeId_fkey` FOREIGN KEY (`overheadTypeId`) REFERENCES `OverheadType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;



