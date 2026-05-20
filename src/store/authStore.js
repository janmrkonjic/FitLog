import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useAuthStore = create((set) => ({
  user: null,    // { id, email }
  error: null,
  loading: true, // true until initial session check is done

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({
      user: session?.user ? { id: session.user.id, email: session.user.email } : null,
      loading: false,
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        user: session?.user ? { id: session.user.id, email: session.user.email } : null,
      })
    })
  },

  register: async (email, password) => {
    set({ error: null })
    const trimmed = email.trim()
    if (!trimmed || !password) {
      set({ error: 'Email and password are required.' })
      return false
    }
    const { data, error } = await supabase.auth.signUp({ email: trimmed, password })
    if (error) {
      set({ error: error.message })
      return false
    }
    if (data.session) {
      set({ user: { id: data.user.id, email: data.user.email } })
      return true
    }
    // Email confirmation required — tell the user
    set({ error: 'Check your email for a confirmation link, then sign in.' })
    return false
  },

  login: async (email, password) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      set({ error: error.message })
      return false
    }
    set({ user: { id: data.user.id, email: data.user.email } })
    return true
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, error: null })
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore
