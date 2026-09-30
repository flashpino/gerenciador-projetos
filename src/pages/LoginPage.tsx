import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { TextInput } from '@/components/ui/TextInput'
import { useSessao } from '@/hooks/useSessao'
import { cadastrar, entrar } from '@/services/auth'

type Modo = 'entrar' | 'cadastrar'

export default function LoginPage() {
  const navigate = useNavigate()
  const { usuario } = useSessao()
  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  // Quem ja tem sessao e cai em /login (URL direta, aba antiga) e mandado de
  // volta. Espelha o RotaProtegida, que faz o inverso nas rotas protegidas.
  useEffect(() => {
    if (usuario) navigate('/', { replace: true })
  }, [usuario, navigate])

  async function aoSubmeter(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      if (modo === 'entrar') {
        await entrar(email, senha)
      } else {
        await cadastrar(email, senha, nome)
      }
      navigate('/', { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível completar a operação. Tente de novo.')
      setCarregando(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-space-lg px-space-lg">
      <h1 className="text-headline text-ink">{modo === 'entrar' ? 'Entrar' : 'Criar conta'}</h1>

      <form onSubmit={aoSubmeter} className="flex flex-col gap-space-md">
        {modo === 'cadastrar' && (
          <Field label="Nome" required>
            <TextInput value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" />
          </Field>
        )}

        <Field label="E-mail" required>
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>

        <Field label="Senha" required>
          <TextInput
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={6}
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
          />
        </Field>

        {erro && (
          <p role="alert" className="text-label text-danger-ink">
            {erro}
          </p>
        )}

        <Button type="submit" variant="primary" loading={carregando}>
          {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </Button>
      </form>

      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setErro(null)
          setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')
        }}
      >
        {modo === 'entrar' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
      </Button>
    </main>
  )
}
