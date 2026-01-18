-- CreateTable
CREATE TABLE `OverheadAllocationOverride` (
    `id` VARCHAR(191) NOT NULL,
    `viewId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `overheadTypeId` VARCHAR(191) NOT NULL,
    `share` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OverheadAllocationOverride_viewId_employeeId_overheadTypeId_key`(`viewId`, `employeeId`, `overheadTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OverheadAllocationOverride` ADD CONSTRAINT `OverheadAllocationOverride_viewId_fkey` FOREIGN KEY (`viewId`) REFERENCES `PricingView`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OverheadAllocationOverride` ADD CONSTRAINT `OverheadAllocationOverride_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OverheadAllocationOverride` ADD CONSTRAINT `OverheadAllocationOverride_overheadTypeId_fkey` FOREIGN KEY (`overheadTypeId`) REFERENCES `OverheadType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


