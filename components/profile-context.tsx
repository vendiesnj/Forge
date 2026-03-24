'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { UserProfile, SkillLevel } from '@/types'

interface ProfileContextValue {
  profile: UserProfile | null
  skillLevel: SkillLevel | null
  loading: boolean
  saveSkillLevel: (level: SkillLevel) => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  skillLevel: null,
  loading: true,
  saveSkillLevel: async () => {},
})

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => setProfile(d.profile ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const saveSkillLevel = async (level: SkillLevel) => {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill_level: level }),
    })
    const d = await res.json()
    if (d.profile) setProfile(d.profile)
  }

  return (
    <ProfileContext.Provider value={{ profile, skillLevel: profile?.skill_level ?? null, loading, saveSkillLevel }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
