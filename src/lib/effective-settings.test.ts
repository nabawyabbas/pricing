import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db";
import { getEffectiveSettings } from "./effective-settings";

describe("Effective Settings", () => {
  beforeEach(async () => {
    // Clean up test data if needed
  });

  it("should return global settings when viewId is null", async () => {
    // This test assumes there are some global settings in the database
    const settings = await getEffectiveSettings(null);
    expect(settings).toBeDefined();
    expect(typeof settings).toBe("object");
  });

  it("should return global settings when viewId is undefined", async () => {
    const settings = await getEffectiveSettings(undefined);
    expect(settings).toBeDefined();
    expect(typeof settings).toBe("object");
  });

  it("should merge override values into global settings", async () => {
    // Create a test view
    const view = await db.pricingView.create({
      data: { name: "Test View" },
    });

    // Create a global setting
    const globalSetting = await db.setting.upsert({
      where: { key: "test_margin" },
      create: {
        key: "test_margin",
        value: "0.20",
        valueType: "float",
        group: "Pricing",
      },
      update: {},
    });

    // Create an override
    await db.settingOverride.create({
      data: {
        viewId: view.id,
        key: "test_margin",
        value: "0.25",
        valueType: "float",
        group: "Pricing",
      },
    });

    const effective = await getEffectiveSettings(view.id);
    expect(effective.test_margin).toBe(0.25); // Override value, not global

    // Cleanup
    await db.settingOverride.deleteMany({ where: { viewId: view.id } });
    await db.setting.delete({ where: { key: "test_margin" } });
    await db.pricingView.delete({ where: { id: view.id } });
  });

  it("should use global value when override is deleted", async () => {
    // Create a test view
    const view = await db.pricingView.create({
      data: { name: "Test View" },
    });

    // Create a global setting
    await db.setting.upsert({
      where: { key: "test_risk" },
      create: {
        key: "test_risk",
        value: "0.10",
        valueType: "float",
        group: "Pricing",
      },
      update: {},
    });

    // Create and then delete override
    await db.settingOverride.create({
      data: {
        viewId: view.id,
        key: "test_risk",
        value: "0.15",
        valueType: "float",
        group: "Pricing",
      },
    });

    let effective = await getEffectiveSettings(view.id);
    expect(effective.test_risk).toBe(0.15);

    await db.settingOverride.deleteMany({ where: { viewId: view.id } });

    effective = await getEffectiveSettings(view.id);
    expect(effective.test_risk).toBe(0.10); // Back to global

    // Cleanup
    await db.setting.delete({ where: { key: "test_risk" } });
    await db.pricingView.delete({ where: { id: view.id } });
  });

  it("should parse different value types correctly", async () => {
    const view = await db.pricingView.create({
      data: { name: "Test View Types" },
    });

    // Test float
    await db.setting.upsert({
      where: { key: "test_float" },
      create: { key: "test_float", value: "1.5", valueType: "float", group: "Test" },
      update: {},
    });
    await db.settingOverride.create({
      data: { viewId: view.id, key: "test_float", value: "2.5", valueType: "float", group: "Test" },
    });

    // Test integer
    await db.setting.upsert({
      where: { key: "test_int" },
      create: { key: "test_int", value: "100", valueType: "integer", group: "Test" },
      update: {},
    });
    await db.settingOverride.create({
      data: { viewId: view.id, key: "test_int", value: "200", valueType: "integer", group: "Test" },
    });

    // Test boolean
    await db.setting.upsert({
      where: { key: "test_bool" },
      create: { key: "test_bool", value: "false", valueType: "boolean", group: "Test" },
      update: {},
    });
    await db.settingOverride.create({
      data: { viewId: view.id, key: "test_bool", value: "true", valueType: "boolean", group: "Test" },
    });

    const effective = await getEffectiveSettings(view.id);
    expect(effective.test_float).toBe(2.5);
    expect(effective.test_int).toBe(200);
    expect(effective.test_bool).toBe(1); // Boolean true becomes 1

    // Cleanup
    await db.settingOverride.deleteMany({ where: { viewId: view.id } });
    await db.setting.deleteMany({ where: { key: { in: ["test_float", "test_int", "test_bool"] } } });
    await db.pricingView.delete({ where: { id: view.id } });
  });
});



