// ==============================================================================
// V-ACT HUB: Offline Write Sync Queue Manager
// ==============================================================================

import { openDB, IDBPDatabase } from 'idb';
import { SupabaseClient } from '@supabase/supabase-js';
import { SyncQueueItem, SyncTable, SyncOperation } from './types';

const DB_NAME = 'vact_hub_db';

export class SyncQueueManager {
  private dbPromise: Promise<IDBPDatabase> | null = null;
  private isProcessing = false;
  private inMemoryQueue: SyncQueueItem[] = [];

  private getDB(): Promise<IDBPDatabase> | null {
    if (typeof indexedDB === 'undefined') return null;
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, 1);
    }
    return this.dbPromise;
  }

  private generateId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async enqueue(
    table: SyncTable,
    operation: SyncOperation,
    recordId: string,
    data?: any
  ): Promise<void> {
    try {
      const item: SyncQueueItem = {
        id: this.generateId(),
        table,
        operation,
        recordId,
        data,
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };

      const dbPromise = this.getDB();
      if (dbPromise) {
        const db = await dbPromise;
        await db.put('syncQueue', item);
      } else {
        this.inMemoryQueue.push(item);
      }
    } catch (err) {
      console.error('Failed to enqueue sync operation:', err);
    }
  }

  async getPendingCount(): Promise<number> {
    try {
      const dbPromise = this.getDB();
      if (dbPromise) {
        const db = await dbPromise;
        return await db.count('syncQueue');
      }
      return this.inMemoryQueue.length;
    } catch {
      return 0;
    }
  }

  async processQueue(supabase: SupabaseClient): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing) return { processed: 0, failed: 0 };
    this.isProcessing = true;

    let processed = 0;
    let failed = 0;

    try {
      const dbPromise = this.getDB();
      if (dbPromise) {
        const db = await dbPromise;
        const items: SyncQueueItem[] = await db.getAllFromIndex('syncQueue', 'createdAt');

        for (const item of items) {
          try {
            if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
              const { error } = await supabase.from(item.table).upsert(item.data);
              if (error) throw error;
            } else if (item.operation === 'DELETE') {
              const { error } = await supabase.from(item.table).delete().eq('id', item.recordId);
              if (error) throw error;
            }

            await db.delete('syncQueue', item.id);
            processed++;
          } catch (err: any) {
            failed++;
            console.warn(`Sync queue processing failed for item ${item.id}:`, err?.message || err);
            item.retryCount += 1;
            item.lastError = err?.message || String(err);
            if (item.retryCount > 10) {
              await db.delete('syncQueue', item.id);
            } else {
              await db.put('syncQueue', item);
            }
          }
        }
      } else {
        // Fallback for non-browser / in-memory queue
        const remaining: SyncQueueItem[] = [];
        for (const item of this.inMemoryQueue) {
          try {
            if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
              const { error } = await supabase.from(item.table).upsert(item.data);
              if (error) throw error;
            } else if (item.operation === 'DELETE') {
              const { error } = await supabase.from(item.table).delete().eq('id', item.recordId);
              if (error) throw error;
            }
            processed++;
          } catch (err: any) {
            failed++;
            item.retryCount += 1;
            if (item.retryCount <= 10) remaining.push(item);
          }
        }
        this.inMemoryQueue = remaining;
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed, failed };
  }
}

export const syncQueueManager = new SyncQueueManager();
