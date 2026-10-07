"use server";

import { db } from '../../src/lib/db';
import { users, activityLogs } from '../../src/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { Pool } from 'pg';

// Direct Pool instance for safe raw SQL queries where ORM mappings fail
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  country?: string;
}

// 1. REGISTER USER
export async function registerUser(input: RegisterInput) {
  const { firstName, lastName, email, password, country } = input;

  if (!firstName || !lastName || !email || !password) {
    return { success: false, error: "Please fill in all required fields." };
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  try {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingUser.length > 0) {
      return { success: false, error: "An account with this email address already exists." };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        firstName,
        lastName,
        email: email.toLowerCase().trim(),
        passwordHash,
        country: country || "Detected via Edge Middleware",
        balance: "0.00",
        role: "user",
        isExpert: false,
        isBanned: false,
      })
      .returning();

    try {
      await db.insert(activityLogs).values({
        userId: newUser.id,
        action: 'REGISTER',
        metadata: `Account created from ${country || 'Unknown Location'}`
      });
    } catch (logErr) {
      console.warn("Non-fatal: Activity log insertion skipped.", logErr);
    }

    const cookieStore = await cookies();
    cookieStore.set('citadel_session', String(newUser.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return { 
      success: true, 
      user: {
        id: newUser.id,
        email: newUser.email,
        name: `${newUser.firstName} ${newUser.lastName}`,
        role: newUser.role || "user"
      }
    };
  } catch (error: any) {
    console.error("Database Registration Error:", error);
    return { success: false, error: "Failed to connect to database. Please try again." };
  }
}

// 2. LOGIN USER
export async function loginUser(input: { email: string; password: string }) {
  const { email, password } = input;

  if (!email || !password) {
    return { success: false, error: "Please enter both email and password." };
  }

  try {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!existingUser) {
      return { success: false, error: "Invalid email or password." };
    }

    if (existingUser.isBanned) {
      return { success: false, error: "Your account has been suspended. Please contact support to appeal." };
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.passwordHash);

    if (!isPasswordValid) {
      return { success: false, error: "Invalid email or password." };
    }

    try {
      await db.insert(activityLogs).values({
        userId: existingUser.id,
        action: 'LOGIN',
        metadata: 'Successful login'
      });
    } catch (logErr) {
      console.warn("Non-fatal: Activity log insertion skipped.", logErr);
    }

    const cookieStore = await cookies();
    cookieStore.set('citadel_session', String(existingUser.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return { 
      success: true, 
      user: {
        id: existingUser.id,
        email: existingUser.email,
        name: `${existingUser.firstName} ${existingUser.lastName}`,
        role: existingUser.role || "user"
      }
    };
  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, error: "Failed to connect to the server." };
  }
}

// 3. CHECK AUTHENTICATION STATUS
export async function checkAuthStatus(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('citadel_session');
  return !!session?.value;
}

// 4. FETCH LOGGED IN USER ROLE
export async function getUserRole(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('citadel_session');

    if (!session?.value) return 'user';

    const userId = parseInt(session.value, 10);
    if (isNaN(userId)) return 'user';

    const { rows } = await pool.query(
      'SELECT role FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );

    if (rows.length > 0 && rows[0].role) {
      return rows[0].role;
    }

    return 'user';
  } catch (error) {
    console.error("Error fetching user role:", error);
    return 'user';
  }
}

// 5. CHECK BAN STATUS
export async function checkBanStatus(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('citadel_session');
    if (!session?.value) return false;
    
    const userId = parseInt(session.value, 10);
    if (isNaN(userId)) return false;

    const { rows } = await pool.query(
      'SELECT is_banned FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );

    return rows.length > 0 ? rows[0].is_banned : false;
  } catch (error) {
    console.error("Error checking ban status:", error);
    return false;
  }
}

// 6. LOGOUT USER
export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('citadel_session');
}

// 7. REQUEST 6-DIGIT PASSWORD RESET PIN
export async function requestPasswordReset(email: string) {
  if (!email) return { success: false, message: "Email address is required." };
  
  const cleanEmail = email.toLowerCase().trim();

  try {
    const { rows } = await pool.query('SELECT id, first_name FROM users WHERE email = $1 LIMIT 1', [cleanEmail]);
    
    if (rows.length === 0) {
      // Return success to prevent email discovery
      return { success: true, message: "If registered, a 6-digit PIN has been sent." };
    }

    const user = rows[0];

    // Generate random 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const pinExpires = new Date(Date.now() + 15 * 60 * 1000); // Expires in 15 mins

    // Save PIN to DB
    await pool.query(
      'UPDATE users SET reset_pin = $1, reset_pin_expires = $2 WHERE id = $3',
      [pin, pinExpires, user.id]
    );

    // Terminal log for quick local testing without needing email
    console.log(`\n=============================================================`);
    console.log(`🔑 [LOCAL TEST PIN] Password Reset Code for ${cleanEmail}:`);
    console.log(`👉   ${pin}   (Expires in 15 minutes)`);
    console.log(`=============================================================\n`);

    // Sendlib Email Integration (If API keys are present in .env)
    const sendlibApiKey = process.env.SENDLIB_API_KEY;
    const sendlibFromEmail = process.env.SENDLIB_FROM_EMAIL;

    if (sendlibApiKey && sendlibFromEmail) {
      try {
        await fetch('https://sendlib.samueltuoyo.com/api/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendlibApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: sendlibFromEmail,
            to: cleanEmail,
            subject: `${pin} is your Citadel password reset code`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #1E293B; border-radius: 12px; background-color: #0B0E14; color: #FFFFFF;">
                <h2 style="color: #3B82F6; margin-bottom: 10px;">Citadel Security</h2>
                <p style="color: #94A3B8; font-size: 14px;">Use the verification code below to reset your password. This code will expire in 15 minutes.</p>
                <div style="background-color: #151924; border: 1px solid #334155; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #60A5FA; padding: 16px; border-radius: 10px; margin: 20px 0;">
                  ${pin}
                </div>
                <p style="color: #64748B; font-size: 12px;">If you did not request this code, please ignore this email.</p>
              </div>
            `,
          }),
        });
      } catch (sendlibErr) {
        console.error("Failed to deliver via Sendlib:", sendlibErr);
      }
    }

    return { success: true, message: "Reset code generated." };
  } catch (error) {
    console.error("Request Password Reset Error:", error);
    return { success: false, message: "Server error generating reset PIN." };
  }
}

// 8. RESET PASSWORD WITH PIN
export async function resetPasswordWithPin(input: { email: string; pin: string; newPassword: string }) {
  const { email, pin, newPassword } = input;

  if (!email || !pin || !newPassword) {
    return { success: false, message: "Please fill in all required fields." };
  }

  if (newPassword.length < 6) {
    return { success: false, message: "Password must be at least 6 characters long." };
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanPin = pin.trim();

  try {
    const { rows } = await pool.query(
      'SELECT id, reset_pin, reset_pin_expires FROM users WHERE email = $1 LIMIT 1',
      [cleanEmail]
    );

    if (rows.length === 0) {
      return { success: false, message: "Invalid verification code or email address." };
    }

    const user = rows[0];

    if (!user.reset_pin || user.reset_pin !== cleanPin) {
      return { success: false, message: "Incorrect verification code. Please check and try again." };
    }

    if (new Date(user.reset_pin_expires) < new Date()) {
      return { success: false, message: "Verification code has expired. Please request a new code." };
    }

    // Hash new password & clear PIN
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

    await pool.query(
      'UPDATE users SET reset_pin = NULL, reset_pin_expires = NULL WHERE id = $1',
      [user.id]
    );

    return { success: true, message: "Password updated successfully!" };
  } catch (error) {
    console.error("Reset Password With PIN Error:", error);
    return { success: false, message: "Failed to reset password. Please try again." };
  }
}