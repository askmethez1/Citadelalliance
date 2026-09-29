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

// --- USER ACTIONS ---

export async function getUserMessages() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const { rows } = await pool.query(
      `SELECT id, sender_type as sender, message as text, image_url, reply_to_text, created_at 
       FROM support_messages 
       WHERE user_id = $1 
       ORDER BY created_at ASC`,
      [userId]
    );

    return rows.map(r => ({
      id: String(r.id),
      sender: r.sender,
      text: r.text,
      imageUrl: r.image_url,
      replyToText: r.reply_to_text,
      time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
  } catch (error) {
    console.error("Error fetching user messages:", error);
    return [];
  }
}

export async function sendUserMessage(text: string, imageUrl?: string, replyToText?: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false };

  try {
    await pool.query(
      `INSERT INTO support_messages (user_id, sender_type, message, image_url, reply_to_text) 
       VALUES ($1, 'user', $2, $3, $4)`,
      [userId, text, imageUrl || null, replyToText || null]
    );
    return { success: true };
  } catch (error) {
    console.error("Error sending message:", error);
    return { success: false };
  }
}

// --- ADMIN ACTIONS ---

export async function getAdminConversations() {
  try {
    const { rows } = await pool.query(`
      WITH LastMessages AS (
        SELECT user_id, message, created_at,
               ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY created_at DESC) as rn
        FROM support_messages
      ),
      UnreadCounts AS (
        SELECT user_id, COUNT(*) as unread_count
        FROM support_messages
        WHERE sender_type = 'user' AND is_read = FALSE
        GROUP BY user_id
      )
      SELECT u.id, u.first_name, u.last_name, u.email, 
             lm.message as last_message, lm.created_at as last_time,
             COALESCE(uc.unread_count, 0) as unread_count
      FROM users u
      JOIN LastMessages lm ON u.id = lm.user_id AND lm.rn = 1
      LEFT JOIN UnreadCounts uc ON u.id = uc.user_id
      ORDER BY lm.created_at DESC
    `);

    return rows.map(r => ({
      id: r.id,
      userName: `${r.first_name} ${r.last_name}`,
      userEmail: r.email,
      status: 'online',
      unreadCount: parseInt(r.unread_count, 10),
      lastMessageTime: new Date(r.last_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lastMessageText: r.last_message
    }));
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }
}

export async function getAdminMessagesForUser(targetUserId: number) {
  try {
    await pool.query(
      `UPDATE support_messages SET is_read = TRUE WHERE user_id = $1 AND sender_type = 'user'`,
      [targetUserId]
    );

    const { rows } = await pool.query(
      `SELECT id, sender_type as sender, message as text, image_url, reply_to_text, created_at 
       FROM support_messages 
       WHERE user_id = $1 
       ORDER BY created_at ASC`,
      [targetUserId]
    );

    return rows.map(r => ({
      id: String(r.id),
      sender: r.sender,
      text: r.text,
      imageUrl: r.image_url,
      replyToText: r.reply_to_text,
      time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
  } catch (error) {
    console.error("Error fetching admin messages:", error);
    return [];
  }
}

export async function sendAdminMessage(targetUserId: number, text: string, imageUrl?: string, replyToText?: string) {
  try {
    await pool.query(
      `INSERT INTO support_messages (user_id, sender_type, message, image_url, reply_to_text) 
       VALUES ($1, 'admin', $2, $3, $4)`,
      [targetUserId, text, imageUrl || null, replyToText || null]
    );
    return { success: true };
  } catch (error) {
    console.error("Error sending admin message:", error);
    return { success: false };
  }
}