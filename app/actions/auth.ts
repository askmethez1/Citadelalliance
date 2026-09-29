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

    // Safely insert activity log
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
      maxAge: 60 * 60 * 24 * 7, // 7 days
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

    // CHECK BAN STATUS BEFORE ALLOWING LOGIN
    if (existingUser.isBanned) {
      return { success: false, error: "Your account has been suspended. Please contact support to appeal." };
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.passwordHash);

    if (!isPasswordValid) {
      return { success: false, error: "Invalid email or password." };
    }

    // Safely insert activity log
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
      maxAge: 60 * 60 * 24 * 7, // 7 days
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

// 4. FETCH LOGGED IN USER ROLE (Safe Direct SQL)
export async function getUserRole(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('citadel_session');

    if (!session?.value) return 'user';

    const userId = parseInt(session.value, 10);
    if (isNaN(userId)) return 'user';

    // Direct SQL Query avoids Drizzle ORM mapping errors on missing optional schema fields
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

// 5. CHECK BAN STATUS (Used for active session interception)
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