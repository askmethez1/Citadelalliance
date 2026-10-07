"use server";

import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// For User: Submit KYC Document URL to DB
export async function submitKycDocument(documentUrl: string) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('citadel_session');
    if (!session?.value) return { success: false, error: "Unauthorized" };

    const userId = parseInt(session.value, 10);
    if (isNaN(userId)) return { success: false, error: "Invalid session" };

    await pool.query(
      "UPDATE users SET kyc_status = 'pending', kyc_document_url = $1 WHERE id = $2",
      [documentUrl, userId]
    );

    return { success: true };
  } catch (error) {
    console.error("KYC Submission Error:", error);
    return { success: false, error: "Database error" };
  }
}

// For Admin: Get all pending KYC requests
export async function getPendingKycRequests() {
  try {
    const { rows } = await pool.query(
      "SELECT id, first_name, last_name, email, kyc_status, kyc_document_url, created_at FROM users WHERE kyc_status = 'pending' ORDER BY created_at DESC"
    );
    return { success: true, data: rows };
  } catch (error) {
    console.error("Fetch KYC Error:", error);
    return { success: false, data: [] };
  }
}

// For Admin: Approve or Reject KYC
export async function resolveKycRequest(userId: number, status: 'verified' | 'unverified') {
  try {
    // If rejected, we clear the URL so they can upload a new one
    const query = status === 'verified' 
      ? "UPDATE users SET kyc_status = $1 WHERE id = $2"
      : "UPDATE users SET kyc_status = $1, kyc_document_url = NULL WHERE id = $2";

    await pool.query(query, [status, userId]);
    return { success: true };
  } catch (error) {
    console.error("Resolve KYC Error:", error);
    return { success: false, error: "Failed to update status" };
  }
}

// For User: Fetch current KYC Status safely (Bypasses Drizzle ORM schema mapping)
export async function getUserKycStatus() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('citadel_session');
    if (!session?.value) return { success: false, status: 'unverified' };

    const userId = parseInt(session.value, 10);
    if (isNaN(userId)) return { success: false, status: 'unverified' };

    const { rows } = await pool.query(
      "SELECT kyc_status FROM users WHERE id = $1 LIMIT 1",
      [userId]
    );

    if (rows.length > 0 && rows[0].kyc_status) {
      return { success: true, status: rows[0].kyc_status };
    }
    
    return { success: true, status: 'unverified' };
  } catch (error) {
    console.error("Fetch KYC Status Error:", error);
    return { success: false, status: 'unverified' };
  }
}