import { pgTable, serial, integer, text, varchar, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  country: text('country'),
  balance: numeric('balance', { precision: 18, scale: 2 }).default('0.00'),
  isExpert: boolean('is_expert').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  role: varchar('role', { length: 20 }).default('user'),
  isBanned: boolean('is_banned').default(false),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }).default('127.0.0.1'),
  location: varchar('location', { length: 150 }).default('Unknown'),
  device: varchar('device', { length: 150 }).default('Web Browser'),
});

export const masterTraders = pgTable('master_traders', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  strategy: varchar('strategy', { length: 100 }).notNull(),
  winRate: numeric('win_rate', { precision: 5, scale: 2 }).notNull(),
  totalProfit: numeric('total_profit', { precision: 12, scale: 2 }).notNull(),
  monthlyReturn: numeric('monthly_return', { precision: 5, scale: 2 }).notNull(),
  activePair: varchar('active_pair', { length: 50 }).notNull(),
  tradeType: varchar('trade_type', { length: 10 }).notNull(),
  leverage: integer('leverage').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const signals = pgTable('signals', {
  id: serial('id').primaryKey(),
  pair: varchar('pair', { length: 50 }).notNull(),
  type: varchar('type', { length: 10 }).notNull(),
  status: varchar('status', { length: 20 }).default('ACTIVE'),
  entryPrice: varchar('entry_price', { length: 50 }).notNull(),
  targetPrice1: varchar('target_price_1', { length: 50 }).notNull(),
  targetPrice2: varchar('target_price_2', { length: 50 }).notNull(),
  stopLoss: varchar('stop_loss', { length: 50 }).notNull(),
  timeframe: varchar('timeframe', { length: 50 }).notNull(),
  riskLevel: varchar('risk_level', { length: 20 }).default('Medium'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const supportMessages = pgTable('support_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id), 
  senderType: varchar('sender_type', { length: 10 }).notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  imageUrl: text('image_url'),
  replyToText: text('reply_to_text'),
});

export const trades = pgTable('trades', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  ticket: varchar('ticket', { length: 20 }).notNull().unique(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  tradeType: varchar('trade_type', { length: 10 }).notNull(),
  volume: numeric('volume').notNull(),
  openPrice: numeric('open_price').notNull(),
  closePrice: numeric('close_price'),
  sl: numeric('sl'),
  tp: numeric('tp'),
  pnl: numeric('pnl'),
  status: varchar('status', { length: 10 }).default('OPEN'),
  openTime: timestamp('open_time').defaultNow(),
  closeTime: timestamp('close_time'),
  marginMode: varchar('margin_mode', { length: 10 }).default('CROSS'),
  leverage: integer('leverage').default(10),
  fee: numeric('fee').default('0.00'),
  orderType: varchar('order_type', { length: 50 }),
  triggerPrice: numeric('trigger_price'),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  type: varchar('type', { length: 50 }).notNull(),
  asset: varchar('asset', { length: 100 }).notNull(),
  amount: varchar('amount', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('Pending'),
  destinationAddress: text('destination_address'),
  network: varchar('network', { length: 50 }),
  txHash: text('tx_hash'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const activeCopies = pgTable('active_copies', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  traderId: integer('trader_id').notNull(),
  amount: numeric('amount').notNull(),
  entryPrice: numeric('entry_price').notNull(),
  sl: numeric('sl'),
  tp: numeric('tp'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 50 }).notNull().unique(),
  value: text('value').notNull(),
});