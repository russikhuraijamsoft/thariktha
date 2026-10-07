import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Standard interface for all services supporting fallback execution
export interface DbContext {
  isRealDb: boolean;
  pool: null;
  fallbackData: any;
}

// Initial Seed data for reliable local storage fallback - empty to avoid fabricated business data
export const initialFallbackData = {
  products: [],
  inventory: [],
  customers: [],
  suppliers: [],
  purchaseorders: [],
  orders: [],
  orderitems: [],
  inventorytransactions: [],
  auditlogs: []
};

const SANDBOX_DB_PATH = path.join(process.cwd(), 'server', 'sandbox_db.json');
let cachedFallbackData: any = null;

export function getFallbackDataReady(): any {
  if (cachedFallbackData) {
    return cachedFallbackData;
  }

  try {
    if (fs.existsSync(SANDBOX_DB_PATH)) {
      const content = fs.readFileSync(SANDBOX_DB_PATH, 'utf8');
      cachedFallbackData = JSON.parse(content);
      return cachedFallbackData;
    }
  } catch (err: any) {
    console.error("[SANDBOX DB] Error loading database file:", err.message);
  }

  cachedFallbackData = JSON.parse(JSON.stringify(initialFallbackData));
  
  try {
    fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(cachedFallbackData, null, 2), 'utf8');
  } catch (err: any) {
    console.error("[SANDBOX DB] Failed to create database file:", err.message);
  }

  return cachedFallbackData;
}

export function persistFallbackData(): void {
  if (!cachedFallbackData) return;
  try {
    fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(cachedFallbackData, null, 2), 'utf8');
  } catch (err: any) {
    console.error("[SANDBOX DB] Failed to write database update:", err.message);
  }
}

export async function getDbContext(): Promise<DbContext> {
  return {
    isRealDb: false,
    pool: null,
    fallbackData: getFallbackDataReady()
  };
}

