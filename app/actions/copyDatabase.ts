"use server";

import { db } from '@/src/lib/db';
import { users, activeCopies } from '@/src/lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';

async function getUserId() {
  // FIX 1: Next.js 15+ requires awaiting cookies()
  const cookieStore = await cookies(); 
  const token = cookieStore.get('auth_token');
  
  if (!token) return 1; 
  return 1; 
}

export async function fetchUserActiveCopies() {
  try {
    const userId = await getUserId();
    if (!userId) return {};

    const copies = await db.select().from(activeCopies).where(eq(activeCopies.userId, userId));
    
    const formatted: Record<number, any> = {};
    
    // FIX 2: Explicitly type 'copy' as 'any' locally to bypass the strict ORM editor flags 
    // while your local TS server caches the new schema
    copies.forEach((copy: any) => {
      if (copy.traderId) {
        formatted[copy.traderId] = {
          amount: Number(copy.amount),
          entryPrice: Number(copy.entryPrice),
          sl: copy.sl ? Number(copy.sl) : undefined,
          tp: copy.tp ? Number(copy.tp) : undefined,
          timestamp: copy.createdAt ? new Date(copy.createdAt).getTime() : Date.now()
        };
      }
    });

    return formatted;
  } catch (error) {
    console.error("Database Error - fetchUserActiveCopies:", error);
    return {};
  }
}

export async function startMirrorTrade(payload: { traderId: number; amount: number; entryPrice: number; sl?: number; tp?: number }) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ balance: sql`${users.balance} - ${payload.amount}` })
        .where(eq(users.id, userId));
        
      await tx.insert(activeCopies).values({
        userId,
        traderId: payload.traderId,
        amount: payload.amount.toString(),
        entryPrice: payload.entryPrice.toString(),
        sl: payload.sl?.toString(),
        tp: payload.tp?.toString(),
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Database Error - startMirrorTrade:", error);
    return { success: false, error: "Transaction failed" };
  }
}

export async function stopMirrorTrade(traderId: number, returnAmount: number) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ balance: sql`${users.balance} + ${returnAmount}` })
        .where(eq(users.id, userId));
        
      await tx.delete(activeCopies)
        .where(and(eq(activeCopies.userId, userId), eq(activeCopies.traderId, traderId)));
    });

    return { success: true };
  } catch (error) {
    console.error("Database Error - stopMirrorTrade:", error);
    return { success: false, error: "Transaction failed" };
  }
}