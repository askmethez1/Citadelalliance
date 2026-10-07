"use server";

import { Pool } from 'pg';
import { revalidatePath } from "next/cache";
import { getUserProfile } from './profile'; // Using your existing profile fetcher to get the logged-in user

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function upgradeToProPlan(amount: number, planType: 'monthly' | 'annual') {
  const client = await pool.connect();
  
  try {
    // 1. Authenticate user
    const profile = await getUserProfile();
    if (!profile || !profile.email) {
      return { success: false, message: "Unauthorized. Please log in again." };
    }

    await client.query('BEGIN');

    // 2. Failsafe: Ensure Pro tracking columns exist in the DB (only runs if missing)
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_plan_type VARCHAR(50);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_expiry TIMESTAMP;`);

    // 3. Lock user row and fetch their real balance
    const userRes = await client.query('SELECT id, balance FROM users WHERE email = $1 FOR UPDATE', [profile.email]);
    if (userRes.rows.length === 0) {
      throw new Error("User record not found in database.");
    }
    
    const user = userRes.rows[0];
    const currentBalance = parseFloat(user.balance);

    // 4. Verify affordability on the server side
    if (currentBalance < amount) {
       await client.query('ROLLBACK');
       return { success: false, message: "Insufficient real balance. Please deposit funds." };
    }

    // 5. Determine exact Postgres interval for expiry
    const expiryInterval = planType === 'annual' ? "1 year" : "1 month";
    
    // 6. Execute Payment: Deduct balance & activate Pro status
    await client.query(`
      UPDATE users 
      SET balance = balance - $1,
          is_pro = true,
          pro_plan_type = $2,
          pro_expiry = NOW() + INTERVAL '${expiryInterval}'
      WHERE email = $3
    `, [amount, planType, profile.email]);

    // 7. Log transaction so Admin can see it in Activity Logs
    await client.query(`
      INSERT INTO activity_logs (user_id, action, metadata) 
      VALUES ($1, 'SUBSCRIPTION', $2)
    `, [user.id, `Purchased ${planType} Pro Plan for $${amount}`]);

    await client.query('COMMIT');
    
    // 8. Revalidate routes so the lock screen goes away automatically
    revalidatePath('/dashboard/copy-trading');
    revalidatePath('/dashboard/signals');
    
    return { success: true, message: `Payment of $${amount} successful! Pro features unlocked.` };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Upgrade Database Error:", error);
    return { success: false, message: "A server error occurred during payment processing." };
  } finally {
    client.release();
  }
}