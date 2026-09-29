"use server";

import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function getCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('citadel_session');
  if (!session?.value) return null;
  const userId = parseInt(session.value, 10);
  return isNaN(userId) ? null : userId;
}

export async function getRecentActivity() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const { rows } = await pool.query(
      `SELECT id, action, metadata, created_at 
       FROM activity_logs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId]
    );

    return rows.map(r => ({
      id: String(r.id),
      action: r.action,
      metadata: r.metadata,
      timestamp: new Date(r.created_at).toLocaleString([], {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    }));
  } catch (error) {
    console.error("Error fetching activity:", error);
    return [];
  }
}