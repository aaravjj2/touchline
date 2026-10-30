import {integer,sqliteTable,text,primaryKey,index} from 'drizzle-orm/sqlite-core';
export const rooms=sqliteTable('duel_rooms',{
 code:text('code').primaryKey(),state:text('state').notNull(),revision:integer('revision').notNull(),expiresAt:integer('expires_at').notNull(),
},t=>[index('duel_room_expiry').on(t.expiresAt)]);
export const presence=sqliteTable('duel_presence',{
 code:text('code').notNull(),seat:integer('seat').notNull(),seen:integer('seen').notNull(),
},t=>[primaryKey({columns:[t.code,t.seat]})]);
export const rates=sqliteTable('duel_rates',{
 key:text('key').primaryKey(),window:integer('window').notNull(),hits:integer('hits').notNull(),
});
