"use server";

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function getLoginLogs() {
  try {
    // Join activity_logs with users to get names and emails
    const { rows } = await pool.query(`
      SELECT 
        al.id, 
        al.created_at, 
        al.metadata, 
        u.first_name, 
        u.last_name, 
        u.email 
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.action = 'LOGIN'
      ORDER BY al.created_at DESC
    `);
    
    return { success: true, data: rows };
  } catch (error) {
    console.error("Error fetching login logs:", error);
    return { success: false, data: [] };
  }
}