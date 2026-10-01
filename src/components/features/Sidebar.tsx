import { useState, type ComponentType } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Activity,
  Bell,
  HelpCircle,
  LayoutGrid,
  LayoutTemplate,
  LogOut,
  Menu as MenuIcon,
  Plus,
  Settings,
  Star,
  UserCog,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import { useMembros, useWorkspaceAtual } from '@/hooks/useQuadro'
import { useSessao } from '@/hooks/useSessao'
import { sair } from '@/services/auth'
import { BoardFormModal } from './BoardFormModal'
import { IntegrantesModal } from './IntegrantesModal'
import { SeletorWorkspace } from './SeletorWorkspace'
import { WorkspaceFormModal } from './WorkspaceFormModal'

interface ItemNav {
  href: string
  rotulo: string
  Icone: ComponentType<{ 'aria-hidden'?: boolean | 'true'; className?: string }>
}

const ITENS_NAV: ItemNav[] = [
  { href: '/paineis', rotulo: 'Meus Painéis', Icone: LayoutGrid },
  { href: '/favoritos', rotulo: 'Favoritos', Icone: Star },
  { href: '/atividades', rotulo: 'Atividades', Icone: Activity },
  { href: '/modelos', rotulo: 'Modelos', Icone: LayoutTemplate },
]

/** Só para o master (administração de contas). Esconder é conveniência; o servidor é quem barra. */
const ITEM_USUARIOS: ItemNav = { href: '/usuarios', rotulo: 'Usuários', Icone: UserCog }

const ITENS_RODAPE: ItemNav[] = [
  { href: '/notificacoes', rotulo: 'Notificações', Icone: Bell },
  { href: '/ajuda', rotulo: 'Ajuda', Icone: HelpCircle },
  { href: '/configuracoes', rotulo: 'Configurações', Icone: Settings },
]

/**
 * Botão do trilho (md+): círculo de 48px só com o ícone; no hover ou no foco de teclado vira pílula e mostra
 * o rótulo. O rótulo está SEMPRE no DOM (nome acessível do link), só fica clipado pelo overflow enquanto o
 * botão é círculo. `self-start ml-space-sm` = a posição do círculo centrado no trilho, mas crescendo só para a
 * direita (centrado, a pílula cresceria também para a esquerda e sairia da tela). Vidro, e branco com a cor
 * primária quando é a rota atual.
 */
const BOTAO_TRILHO =
  'ml-space-sm flex h-12 w-12 shrink-0 items-center self-start overflow-hidden whitespace-nowrap rounded-full border border-glass-border bg-glass text-ink backdrop-blur-md ' +
  'transition-[width,background-color] duration-fast ease-out-soft motion-reduce:transition-none hover:w-rail-aberto hover:shadow-card focus-visible:w-rail-aberto focus-visible:shadow-card'

/** Fundo ao expandir: opaco (o vidro deixaria o conteúdo aparecer por trás). Fora do BOTAO_TRILHO para o primário ter o próprio hover sem conflito de classes. */
const HOVER_VIDRO = 'hover:bg-surface focus-visible:bg-surface'

/** Ícone (célula de 48px, fixa à esquerda) + rótulo do botão do trilho. */
function conteudoTrilho(Icone: ItemNav['Icone'], rotulo: string) {
  return (
    <>
      <span className="grid size-12 shrink-0 place-items-center">
        <Icone aria-hidden="true" className="size-5" />
      </span>
      <span className="pr-space-lg text-body">{rotulo}</span>
    </>
  )
}

/**
 * Casca de navegação do workspace (docs/superpowers/specs/2026-09-17-casca-sidebar-design.md;
 * visual do novo design em docs/mockups/novo-design-urbanist.html). Responsiva
 * conforme docs/responsive.md: drawer no celular, trilho de botões redondos a
 * partir de md. O trilho não tem mais versão "completa" com rótulos: o nome do
 * workspace vai no `title` do logo e a navegação no `title` de cada botão.
 */
export function Sidebar() {
  const [aberto, setAberto] = useState(false)
  const [criandoBoard, setCriandoBoard] = useState(false)
  const [novoWorkspace, setNovoWorkspace] = useState(false)
  const [compartilhando, setCompartilhando] = useState(false)
  const { pathname } = useLocation()
  const workspace = useWorkspaceAtual()
  const membros = useMembros(workspace.data?.id)
  const { usuario } = useSessao()
  const eu = membros.data?.find((m) => m.id === usuario?.id)
  const nomeWorkspace = workspace.data?.name ?? 'Workspace'
  const rodape = usuario?.master ? [ITEM_USUARIOS, ...ITENS_RODAPE] : ITENS_RODAPE

  function itemDeNav(item: ItemNav, tipo: 'aside' | 'drawer') {
    const ativo = pathname === item.href
    return (
      <Link
        key={item.href}
        to={item.href}
        aria-current={ativo ? 'page' : undefined}
        onClick={() => setAberto(false)}
        className={
          tipo === 'aside'
            ? cn(BOTAO_TRILHO, HOVER_VIDRO, ativo && 'border-surface bg-surface text-primary shadow-card')
            : cn(
                'flex min-h-touch items-center gap-space-sm rounded-full px-space-md text-body',
                ativo ? 'bg-primary-soft font-semibold text-primary' : 'text-sidebar-fg-muted hover:bg-sidebar-hover',
              )
        }
      >
        {tipo === 'aside' ? (
          conteudoTrilho(item.Icone, item.rotulo)
        ) : (
          <>
            <item.Icone aria-hidden="true" className="size-5 shrink-0" />
            <span className="truncate">{item.rotulo}</span>
          </>
        )}
      </Link>
    )
  }

  // Fecha o drawer antes, como no Novo Painel: dois <dialog> modais empilhados no celular.
  function abrirCompartilhar() {
    setAberto(false)
    setCompartilhando(true)
  }

  function abrirNovoPainel() {
    // Fecha o drawer antes: dois <dialog> modais empilhados no mobile.
    setAberto(false)
    setCriandoBoard(true)
  }

  function botaoSair(tipo: 'aside' | 'drawer') {
    return (
      <button
        type="button"
        onClick={() => void sair()}
        className={
          tipo === 'aside'
            ? cn(BOTAO_TRILHO, HOVER_VIDRO, 'text-danger-ink')
            : 'flex min-h-touch items-center gap-space-sm rounded-full px-space-md text-body text-sidebar-fg-muted hover:bg-sidebar-hover'
        }
      >
        {tipo === 'aside' ? (
          conteudoTrilho(LogOut, 'Sair')
        ) : (
          <>
            <LogOut aria-hidden="true" className="size-5 shrink-0" />
            <span className="truncate">Sair</span>
          </>
        )}
      </button>
    )
  }

  function trilho() {
    return (
      <>
        {/* O logo é o seletor de workspace (trocar, novo, compartilhar, gerenciar). */}
        <SeletorWorkspace aoNovo={() => setNovoWorkspace(true)} aoCompartilhar={abrirCompartilhar} />

        <button
          type="button"
          onClick={abrirNovoPainel}
          className={cn(BOTAO_TRILHO, 'border-transparent bg-primary text-primary-fg hover:bg-primary-hover focus-visible:bg-primary-hover')}
        >
          {conteudoTrilho(Plus, 'Novo Painel')}
        </button>

        <nav aria-label="Navegação do workspace" className="flex flex-col gap-space-md self-stretch py-space-sm">
          {ITENS_NAV.map((item) => itemDeNav(item, 'aside'))}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-space-md self-stretch">
          <div className="flex flex-col gap-space-md self-stretch">
            {rodape.map((item) => itemDeNav(item, 'aside'))}
          </div>
          {eu && (
            <div className="grid size-12 place-items-center" title={eu.full_name}>
              <Avatar users={[eu]} size="md" />
              <span className="sr-only">{eu.full_name}</span>
            </div>
          )}
          <div className="flex flex-col self-stretch">{botaoSair('aside')}</div>
        </div>
      </>
    )
  }

  function gaveta() {
    return (
      <>
        <div className="px-space-sm py-space-md">
          <SeletorWorkspace variante="gaveta" aoNovo={() => setNovoWorkspace(true)} aoCompartilhar={abrirCompartilhar} />
        </div>

        <div className="px-space-sm">
          <Button
            variant="primary"
            size="sm"
            className="w-full justify-start"
            iconStart={<Plus aria-hidden="true" className="size-4" />}
            onClick={abrirNovoPainel}
          >
            <span className="truncate">Novo Painel</span>
          </Button>
        </div>

        <nav aria-label="Navegação do workspace" className="flex flex-col gap-space-xs px-space-sm py-space-md">
          {ITENS_NAV.map((item) => itemDeNav(item, 'drawer'))}
        </nav>

        <div className="mt-auto flex flex-col gap-space-xs border-t border-border px-space-sm py-space-md">
          {rodape.map((item) => itemDeNav(item, 'drawer'))}

          {eu && (
            <div className="flex items-center gap-space-sm px-space-md py-space-sm">
              <Avatar users={[eu]} size="sm" />
              <span className="truncate text-cell text-sidebar-fg">{eu.full_name}</span>
            </div>
          )}

          {botaoSair('drawer')}
        </div>
      </>
    )
  }

  return (
    <>
      {/* Gatilho do drawer — a faixa só existe no celular; de md em diante o trilho cobre a navegação. */}
      <div className="glass-strong flex items-center gap-space-sm border-x-0 border-t-0 px-space-md py-space-sm md:hidden">
        <button
          type="button"
          aria-expanded={aberto}
          aria-label="Abrir menu"
          onClick={() => setAberto(true)}
          className="grid min-h-touch min-w-touch place-items-center rounded-full hover:bg-surface-2"
        >
          <MenuIcon aria-hidden="true" className="size-5" />
        </button>
        <span className="truncate text-body font-semibold text-ink">{nomeWorkspace}</span>
      </div>

      <aside className="hidden shrink-0 flex-col items-center gap-space-md px-space-md py-margin md:sticky md:top-0 md:z-20 md:flex md:h-dvh md:w-rail">
        {trilho()}
      </aside>

      <Modal size="drawer" open={aberto} onClose={() => setAberto(false)} title={nomeWorkspace}>
        <div className="flex min-h-full flex-col bg-sidebar">{gaveta()}</div>
      </Modal>

      {/* Fora de trilho()/gaveta(): renderizam duas vezes (aside + drawer) e o formulário é um só. */}
      <BoardFormModal aberto={criandoBoard} aoFechar={() => setCriandoBoard(false)} board={null} />
      <WorkspaceFormModal aberto={novoWorkspace} aoFechar={() => setNovoWorkspace(false)} workspace={null} />
      {/* Compartilhar é do workspace aberto inteiro: quem entra vê todos os painéis dele. */}
      {workspace.data && (
        <IntegrantesModal
          aberto={compartilhando}
          aoFechar={() => setCompartilhando(false)}
          workspaceId={workspace.data.id}
          donoId={workspace.data.owner_id}
        />
      )}
    </>
  )
}
