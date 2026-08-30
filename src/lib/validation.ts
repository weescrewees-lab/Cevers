import { z } from 'zod'
import { CURRENCY_LIST } from '@/lib/currencies'

/** Skema validasi terpusat untuk semua endpoint API */

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Nama pengguna minimal 3 karakter')
  .max(20, 'Nama pengguna maksimal 20 karakter')
  .regex(/^[a-zA-Z0-9_]+$/, 'Hanya huruf, angka, dan underscore')

export const passwordSchema = z
  .string()
  .min(8, 'Kata sandi minimal 8 karakter')
  .max(100, 'Kata sandi terlalu panjang')
  .regex(/[a-zA-Z]/, 'Kata sandi harus memuat huruf')
  .regex(/[0-9]/, 'Kata sandi harus memuat angka')

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  email: z.string().email('Email tidak valid').max(120).optional().nullable(),
})

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Nama pengguna wajib diisi').max(20),
  password: z.string().min(1, 'Kata sandi wajib diisi').max(100),
})

export const currencyEnum = z.enum(CURRENCY_LIST as [string, ...string[]])

export const diceSchema = z.object({
  currency: currencyEnum,
  amount: z.number().positive('Taruhan harus positif').finite(),
  target: z.number().min(2).max(98),
  direction: z.enum(['over', 'under']),
})

export const limboSchema = z.object({
  currency: currencyEnum,
  amount: z.number().positive().finite(),
  target: z.number().min(1.01).max(1000),
})

export const plinkoSchema = z.object({
  currency: currencyEnum,
  amount: z.number().positive().finite(),
  risk: z.enum(['low', 'medium', 'high']),
})

export const kenoSchema = z.object({
  currency: currencyEnum,
  amount: z.number().positive().finite(),
  picks: z.array(z.number().int().min(0).max(39)).min(1).max(10),
})

export const rouletteSchema = z.object({
  currency: currencyEnum,
  amount: z.number().positive().finite(),
  bets: z
    .array(
      z.object({
        type: z.enum(['straight', 'red', 'black', 'even', 'odd', 'low', 'high', 'dozen1', 'dozen2', 'dozen3']),
        number: z.number().int().min(0).max(36).optional(),
      }),
    )
    .min(1)
    .max(10),
})

export const slotsSchema = z.object({
  currency: currencyEnum,
  amount: z.number().positive().finite(),
  theme: z.enum(['lucky777', 'fruitparty', 'pharaoh', 'neon']),
})

export const minesStartSchema = z.object({
  action: z.literal('start'),
  currency: currencyEnum,
  amount: z.number().positive().finite(),
  mines: z.number().int().min(1).max(24),
})

export const minesActionSchema = z.object({
  action: z.enum(['reveal', 'cashout']),
  tile: z.number().int().min(0).max(24).optional(),
})

export const blackjackStartSchema = z.object({
  action: z.literal('start'),
  currency: currencyEnum,
  amount: z.number().positive().finite(),
})

export const blackjackActionSchema = z.object({
  action: z.enum(['hit', 'stand', 'double']),
})

export const faucetSchema = z.object({
  currency: currencyEnum,
})

export const swapSchema = z.object({
  from: currencyEnum,
  to: currencyEnum,
  amount: z.number().positive().finite(),
})

export const fairRotateSchema = z.object({
  clientSeed: z.string().trim().min(6).max(64).optional(),
})

/** Parse zod → kembalikan pesan error Indonesia pertama atau null jika valid */
export function zodMessage(err: z.ZodError): string {
  return err.issues[0]?.message ?? 'Data tidak valid'
}
