-- CreateTable
CREATE TABLE `TechStack` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TechStack_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Employee` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` ENUM('DEV', 'QA', 'BA') NOT NULL,
    `techStackId` VARCHAR(191) NULL,
    `grossMonthly` DECIMAL(10, 2) NOT NULL,
    `netMonthly` DECIMAL(10, 2) NOT NULL,
    `oncostRate` DOUBLE NULL,
    `annualBenefits` DECIMAL(10, 2) NULL,
    `annualBonus` DECIMAL(10, 2) NULL,
    `fte` DOUBLE NOT NULL DEFAULT 1.0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Assumptions` (
    `id` VARCHAR(191) NOT NULL,
    `devReleasableHoursPerMonth` DOUBLE NOT NULL DEFAULT 100,
    `standardHoursPerMonth` DOUBLE NOT NULL DEFAULT 160,
    `qaRatio` DOUBLE NOT NULL DEFAULT 0.5,
    `baRatio` DOUBLE NOT NULL DEFAULT 0.25,
    `margin` DOUBLE NOT NULL DEFAULT 0.2,
    `risk` DOUBLE NOT NULL DEFAULT 0.1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OverheadPool` (
    `id` VARCHAR(191) NOT NULL,
    `managementOverheadAnnual` DECIMAL(10, 2) NOT NULL,
    `companyOverheadAnnual` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OverheadAllocation` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `mgmtShare` DOUBLE NOT NULL,
    `companyShare` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OverheadAllocation_employeeId_key`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_techStackId_fkey` FOREIGN KEY (`techStackId`) REFERENCES `TechStack`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OverheadAllocation` ADD CONSTRAINT `OverheadAllocation_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
