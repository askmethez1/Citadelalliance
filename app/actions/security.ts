"use server";

import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export interface ActivityLog {
  id: string;
  action: string;
  ip_address: string;
  location: string;
  device: string;
  created_at: string;
}

async function getCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('citadel_session');
  if (!session?.value) return null;
  const userId = parseInt(session.value, 10);
  return isNaN(userId) ? null : userId;
}

// Fetch real security logs from Neon DB
export async function getUserSecurityLogs(): Promise<ActivityLog[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { rows } = await pool.query(
      `SELECT id, action, ip_address, location, device, created_at 
       FROM activity_logs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 30`,
      [userId]
    );

    return rows.map(r => ({
      id: `LOG-${r.id}`,
      action: r.action,
      ip_address: r.ip_address || '127.0.0.1',
      location: r.location || 'Unknown Location',
      device: r.device || 'Web Browser',
      created_at: new Date(r.created_at).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    }));
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }
}

// Helper to log new events (Logins, password changes, etc.)
export async function logUserActivity(action: string, ip: string, location: string, device: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, ip_address, location, device, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, action, ip, location, device]
    );
    return true;
  } catch (error) {
    console.error('Error recording activity log:', error);
    return false;
  }
}