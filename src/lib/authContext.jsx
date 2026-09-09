import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState(null)

  const refreshAccount = useCallback(async () => {
    if (!session?.user) {
      setAccount(null)
      return null
    }
    const { data, error } = await supabase.rpc('get_my_account')
    if (!error && Array.isArray(data) && data[0]) {
      setAccount(data[0])
      return data[0]
    }
    return null
  }, [session?.user])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => listener?.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    refreshAccount()
  }, [refreshAccount])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      await supabase.auth.signOut({ scope: 'local' })
    }
    setAccount(null)
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, account, refreshAccount, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}