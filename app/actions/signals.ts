"use server";

import { db } from '@/src/lib/db';
import { signals } from '@/src/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export interface TradingSignal {
  id: string;
  pair: string;
  type: 'LONG' | 'SHORT';
  status: 'ACTIVE' | 'CLOSED' | 'TARGET_HIT';
  entryPrice: number;
  targetPrice1: number;
  targetPrice2: number;
  stopLoss: number;
  timeframe: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  notes: string;
  leverage: number;
  timestamp?: string; // Formatted date for UI
}

// 1. Fetch All Signals (For Admin & Users)
export async function getSignals() {
  try {
    const rawSignals = await db.select().from(signals).orderBy(desc(signals.createdAt));
    
    // Format for the UI
    return rawSignals.map(sig => ({
      id: `SIG-${sig.id}`, // Add prefix for UI if needed
      pair: sig.pair,
      type: sig.type as 'LONG' | 'SHORT',
      status: sig.status as 'ACTIVE' | 'CLOSED' | 'TARGET_HIT',
      entryPrice: parseFloat(sig.entryPrice),
      targetPrice1: parseFloat(sig.targetPrice1),
      targetPrice2: parseFloat(sig.targetPrice2),
      stopLoss: parseFloat(sig.stopLoss),
      timeframe: sig.timeframe,
      riskLevel: sig.riskLevel as 'Low' | 'Medium' | 'High',
      notes: sig.notes || '',
      leverage: 10, // Defaulting to 10 as it's not in the schema
      timestamp: sig.createdAt 
        ? new Date(sig.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Just now'
    }));
  } catch (error) {
    console.error("Failed to fetch signals:", error);
    return [];
  }
}

// 2. Create a New Signal (Admin Only)
export async function createSignal(data: Omit<TradingSignal, 'id' | 'status' | 'timestamp'>) {
  try {
    await db.insert(signals).values({
      pair: data.pair.toUpperCase(),
      type: data.type,
      status: 'ACTIVE',
      entryPrice: data.entryPrice.toString(),
      targetPrice1: data.targetPrice1.toString(),
      targetPrice2: data.targetPrice2.toString(),
      stopLoss: data.stopLoss.toString(),
      timeframe: data.timeframe,
      riskLevel: data.riskLevel,
      notes: data.notes,
    });

    revalidatePath('/admin/dashboard');
    revalidatePath('/dashboard/signals');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create signal:", error);
    return { success: false, error: error.message };
  }
}

// 3. Update Signal Status (Admin Only)
export async function updateSignalStatus(id: string, newStatus: 'ACTIVE' | 'CLOSED' | 'TARGET_HIT') {
  try {
    // Strip "SIG-" prefix if present
    const numericId = parseInt(id.replace('SIG-', ''), 10);

    await db.update(signals)
      .set({ status: newStatus })
      .where(eq(signals.id, numericId));

    revalidatePath('/admin/dashboard');
    revalidatePath('/dashboard/signals');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4. Delete Signal (Admin Only)
export async function deleteSignal(id: string) {
  try {
    // Strip "SIG-" prefix if present
    const numericId = parseInt(id.replace('SIG-', ''), 10);

    await db.delete(signals).where(eq(signals.id, numericId));
    revalidatePath('/admin/dashboard');
    revalidatePath('/dashboard/signals');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}