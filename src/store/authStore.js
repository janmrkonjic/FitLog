import { create } from 'zustand'
import { db } from '../db/db'

async function hashPassword(password) {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(password))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function loadPersistedUser() {
  try {
    const raw = localStorage.getItem('fitlog_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistUser(user) {
  if (user) localStorage.setItem('fitlog_user', JSON.stringify(user))
  else localStorage.removeItem('fitlog_user')
}

const useAuthStore = create((set) => ({
  user: loadPersistedUser(), // { id, username }
  error: null,

  register: async (username, password) => {
    set({ error: null })
    const trimmed = username.trim()
    if (!trimmed || !password) {
      set({ error: 'Username and password are required.' })
      return false
    }

    const existing = await db.users.where('username').equalsIgnoreCase(trimmed).first()
    if (existing) {
      set({ error: 'Username already taken.' })
      return false
    }

    const hash = await hashPassword(password)
    const isFirst = (await db.users.count()) === 0

    const userId = await db.users.add({ username: trimmed, passwordHash: hash })

    // First-ever registration: claim all unassigned existing workouts
    if (isFirst) {
      await db.workouts
        .filter((w) => w.userId == null)
        .modify({ userId })
    }

    const user = { id: userId, username: trimmed }
    persistUser(user)
    set({ user })
    return true
  },

  login: async (username, password) => {
    set({ error: null })
    const trimmed = username.trim()
    const record = await db.users.where('username').equalsIgnoreCase(trimmed).first()
    if (!record) {
      set({ error: 'Invalid username or password.' })
      return false
    }

    const hash = await hashPassword(password)
    if (hash !== record.passwordHash) {
      set({ error: 'Invalid username or password.' })
      return false
    }

    const user = { id: record.id, username: record.username }
    persistUser(user)
    set({ user })
    return true
  },

  logout: () => {
    persistUser(null)
    set({ user: null, error: null })
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore
