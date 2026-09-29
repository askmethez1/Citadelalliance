"use server";

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
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

export async function getUserProfile() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { rows } = await pool.query(
      'SELECT first_name, last_name, email, country FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );
    
    if (rows.length > 0) return rows[0];
    return null;
  } catch (error) {
    console.error('Error fetching user profile from Neon:', error);
    return null;
  }
}

export async function updateUserProfile(data: { first_name: string; last_name: string; country: string}) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    await pool.query(
      'UPDATE users SET first_name = $1, last_name = $2, country = $3 WHERE id = $4',
      [data.first_name, data.last_name, data.country, userId]
    );
    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
}

export async function updatePassword(currentPass: string, newPass: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    // 1. Fetch user password hash
    const { rows } = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );
    if (rows.length === 0) return false;

    // 2. Verify current password
    const isValid = await bcrypt.compare(currentPass, rows[0].password_hash);
    if (!isValid) return false;

    // 3. Hash new password and update
    const newHash = await bcrypt.hash(newPass, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, userId]
    );

    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    return false;
  }
}