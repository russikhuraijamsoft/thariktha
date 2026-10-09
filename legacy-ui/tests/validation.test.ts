/**
 * Unit tests for input validation schemas
 * Run with: npx jest validation.test.ts
 */

import { validate, ProductSchema, OrderSchema, CustomerSchema, InventoryUpdateSchema } from '../server/validation/schemas';

describe('Validation Schemas', () => {
  describe('ProductSchema', () => {
    it('should accept a valid product', () => {
      const result = validate({
        sku: 'SG-ST-CLS',
        name: 'SG Strokewell Classic',
        category: 'bats',
        price: 520,
        rawCost: 260
      }, ProductSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing required fields', () => {
      const result = validate({
        name: 'SG Strokewell Classic'
      }, ProductSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Field 'sku' is required");
      expect(result.errors).toContain("Field 'category' is required");
      expect(result.errors).toContain("Field 'price' is required");
    });

    it('should reject invalid category', () => {
      const result = validate({
        sku: 'SG-ST-CLS',
        name: 'Test',
        category: 'invalid',
        price: 100
      }, ProductSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Field 'category' must be one of: bats, balls, protective, teamwear, accessories");
    });

    it('should reject negative price', () => {
      const result = validate({
        sku: 'SG-ST-CLS',
        name: 'Test',
        category: 'bats',
        price: -100
      }, ProductSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Field 'price' must be >= 0");
    });

    it('should reject invalid SKU format', () => {
      const result = validate({
        sku: 'invalid sku with spaces!',
        name: 'Test',
        category: 'bats',
        price: 100
      }, ProductSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Field 'sku' has invalid format");
    });

    it('should reject unexpected fields', () => {
      const result = validate({
        sku: 'SG-ST-CLS',
        name: 'Test',
        category: 'bats',
        price: 100,
        hackerField: 'malicious'
      }, ProductSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Unexpected field 'hackerField'");
    });
  });

  describe('OrderSchema', () => {
    it('should accept a valid order', () => {
      const result = validate({
        customerId: 'CUST-001',
        totalAmount: 1040,
        status: 'pending',
        paymentStatus: 'unpaid'
      }, OrderSchema);
      expect(result.valid).toBe(true);
    });

    it('should reject negative totalAmount', () => {
      const result = validate({
        customerId: 'CUST-001',
        totalAmount: -500
      }, OrderSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Field 'totalAmount' must be >= 0");
    });

    it('should reject invalid status', () => {
      const result = validate({
        customerId: 'CUST-001',
        totalAmount: 100,
        status: 'hacked'
      }, OrderSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Field 'status' must be one of: draft, pending, manufacturing, printing, ready, delivered, canceled");
    });
  });

  describe('CustomerSchema', () => {
    it('should accept a valid customer', () => {
      const result = validate({
        name: 'Richmond Cricket Academy',
        email: 'richmond.ca@cricket.au',
        phone: '+61 3 9428 1122'
      }, CustomerSchema);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = validate({
        name: 'Test',
        email: 'not-an-email'
      }, CustomerSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Field 'email' has invalid format");
    });
  });

  describe('InventoryUpdateSchema', () => {
    it('should accept valid stock update', () => {
      const result = validate({
        sku: 'SG-ST-CLS',
        stock: 25
      }, InventoryUpdateSchema);
      expect(result.valid).toBe(true);
    });

    it('should reject negative stock', () => {
      const result = validate({
        sku: 'SG-ST-CLS',
        stock: -5
      }, InventoryUpdateSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Field 'stock' must be >= 0");
    });
  });
});
