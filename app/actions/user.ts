"use server";

import { db } from '../../src/lib/db';
import { users } from '../../src/lib/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

// Fetch the current user's actual database balance
export async function getUserBalance() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('citadel_session')?.value;
  
  if (!userId) return { success: false, balance: 0 };

  try {
    const [user] = await db
      .select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);

    if (!user) return { success: false, balance: 0 };

    return { success: true, balance: parseFloat(user.balance) };
  } catch (error) {
    console.error("Error fetching balance:", error);
    return { success: false, balance: 0 };
  }
}

// Process a trade settlement (Deduct stake, or Add winnings)
export async function settleTradeBalance(amountDelta: number) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('citadel_session')?.value;
  
  if (!userId) return { success: false };

  try {
    // 1. Get current balance
    const [user] = await db
      .select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);

    const currentBalance = parseFloat(user.balance);
    const newBalance = currentBalance + amountDelta;

    // Prevent negative balances on the server side
    if (newBalance < 0) return { success: false, error: "Insufficient funds" };

    // 2. Update the database with the new balance
    await db
      .update(users)
      .set({ balance: newBalance.toFixed(2) })
      .where(eq(users.id, parseInt(userId)));

    return { success: true, newBalance };
  } catch (error) {
    console.error("Error updating balance:", error);
    return { success: false };
  }
}