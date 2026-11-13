import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { AuthResponse } from './authApi'
import { getProfile, updateProfile } from './profileApi'
import './ProfilePage.css'

type ProfilePageProps = {
  user: AuthResponse['user']
  onUserUpdated: (user: AuthResponse['user']) => void
}

function getInitials(displayName: string, email: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
  return (words[0]?.slice(0, 2) || email.slice(0, 2)).toUpperCase()
}

export default function ProfilePage({ user, onUserUpdated }: ProfilePageProps) {
  const [profile, setProfile] = useState(user)
  const [displayName, setDisplayName] = useState(user.displayName)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const onUserUpdatedRef = useRef(onUserUpdated)

  useEffect(() => {
    onUserUpdatedRef.current = onUserUpdated
  }, [onUserUpdated])

  useEffect(() => {
    let isCurrent = true
    getProfile()
      .then(({ user: loadedUser }) => {
        if (!isCurrent) return
        setProfile(loadedUser)
        setDisplayName(loadedUser.displayName)
        onUserUpdatedRef.current(loadedUser)
      })
      .catch((requestError: unknown) => {
        if (isCurrent) setError(requestError instanceof Error ? requestError.message : 'Profil sa nepodarilo načítať.')
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => { isCurrent = false }
  }, [user.id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSaving(true)
    try {
      const { user: updatedUser } = await updateProfile(displayName.trim())
      setProfile(updatedUser)
      setDisplayName(updatedUser.displayName)
      onUserUpdated(updatedUser)
      setSuccess('Profil bol úspešne uložený.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Profil sa nepodarilo uložiť.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="profile-page">
      <section className="profile-card" aria-labelledby="profile-title">
        <div className="profile-card__header">
          <div className="profile-avatar" aria-hidden="true">{getInitials(profile.displayName, profile.email)}</div>
          <div>
            <h1 id="profile-title">Môj profil</h1>
            <p className="profile-avatar__note">Nahrávanie obrázka profilu zatiaľ nie je dostupné.</p>
          </div>
        </div>
        {isLoading ? <p className="profile-status">Načítavam profil…</p> : (
          <form className="profile-form" onSubmit={handleSubmit}>
            <label className="profile-form__field">
              E-mail
              <input type="email" value={profile.email} readOnly />
            </label>
            <label className="profile-form__field">
              Zobrazované meno
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                maxLength={80}
                required
              />
            </label>
            {error && <p className="profile-form__error" role="alert">{error}</p>}
            {success && <p className="profile-form__success" role="status">{success}</p>}
            <button className="profile-form__submit" type="submit" disabled={isSaving}>
              {isSaving ? 'Ukladanie…' : 'Uložiť zmeny'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}