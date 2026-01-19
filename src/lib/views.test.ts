import { describe, it, expect } from "vitest";
import {
  computeEffectiveEmployeeActive,
  computeEffectiveOverheadTypeActive,
} from "./views";

describe("Views - Effective Active Computation", () => {
  describe("computeEffectiveEmployeeActive", () => {
    it("should return base status when no override exists", () => {
      const result = computeEffectiveEmployeeActive(true, null);
      expect(result.isActive).toBe(true);
      expect(result.isOverridden).toBe(false);
    });

    it("should return override status when override exists and differs from base", () => {
      const result = computeEffectiveEmployeeActive(true, { isActive: false });
      expect(result.isActive).toBe(false);
      expect(result.isOverridden).toBe(true);
    });

    it("should return override status when override exists and matches base", () => {
      const result = computeEffectiveEmployeeActive(true, { isActive: true });
      expect(result.isActive).toBe(true);
      expect(result.isOverridden).toBe(false);
    });

    it("should handle inactive base with active override", () => {
      const result = computeEffectiveEmployeeActive(false, { isActive: true });
      expect(result.isActive).toBe(true);
      expect(result.isOverridden).toBe(true);
    });
  });

  describe("computeEffectiveOverheadTypeActive", () => {
    it("should return base status when no override exists", () => {
      const result = computeEffectiveOverheadTypeActive(false, null);
      expect(result.isActive).toBe(false);
      expect(result.isOverridden).toBe(false);
    });

    it("should return override status when override exists and differs from base", () => {
      const result = computeEffectiveOverheadTypeActive(false, { isActive: true });
      expect(result.isActive).toBe(true);
      expect(result.isOverridden).toBe(true);
    });

    it("should return override status when override exists and matches base", () => {
      const result = computeEffectiveOverheadTypeActive(false, { isActive: false });
      expect(result.isActive).toBe(false);
      expect(result.isOverridden).toBe(false);
    });

    it("should handle active base with inactive override", () => {
      const result = computeEffectiveOverheadTypeActive(true, { isActive: false });
      expect(result.isActive).toBe(false);
      expect(result.isOverridden).toBe(true);
    });
  });
});



