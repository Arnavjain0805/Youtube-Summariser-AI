import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { SpinnerIcon } from '../components/Icons'

export default function OAuthCallback() {
  const [params] = useSearchParams()
  const { signIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      navigate('/auth', { replace: true })
      return
    }
    signIn(token, { id: '', email: '', name: null, provider: '' })
    api
      .me()
      .then((res) => {
        signIn(token, res.user)
        navigate('/', { replace: true })
      })
      .catch(() => navigate('/', { replace: true }))
  }, [params, signIn, navigate])

  return (
    <div className="flex h-full items-center justify-center gap-2 text-(--muted)">
      <SpinnerIcon className="h-5 w-5" /> Signing you in…
    </div>
  )
}
