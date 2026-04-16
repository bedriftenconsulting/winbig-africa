import { useState } from 'react'
import AdminLayout from '@/components/layouts/AdminLayout'
import { GameList } from '@/components/games/GameList'
import { CreateGameWizard } from '@/components/games/CreateGameWizard'
import { EditGameWizard } from '@/components/games/EditGameWizard'
import { GameDetails } from '@/components/games/GameDetails'
import { PrizeStructureEditor } from '@/components/games/PrizeStructureEditor'
import { ScheduledGamesView } from '@/components/games/ScheduledGamesView'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type Game, gameService } from '@/services/games'
import { CalendarDays, List, Gamepad2, Play, FileEdit, CalendarCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

// ── Stat Cards ────────────────────────────────────────────────────────────────

function GameStatsCards() {
  const { data } = useQuery({
    queryKey: ['games-list'],   // same key as GameList so one fetch serves both
    queryFn: () => gameService.getGames(1, 1000),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const games: Game[] = data?.data || []
  const total   = games.length
  const active  = games.filter(g => g.status?.toLowerCase() === 'active').length
  const draft   = games.filter(g => g.status?.toLowerCase() === 'draft').length
  const running = active // competitions that are live right now

  const cards = [
    { label: 'TOTAL GAMES',   value: total,   sub: 'All games',            icon: Gamepad2,     color: 'text-violet-400' },
    { label: 'ACTIVE GAMES',  value: active,  sub: 'Live & running',       icon: Play,         color: 'text-green-400'  },
    { label: 'DRAFT GAMES',   value: draft,   sub: 'Pending activation',   icon: FileEdit,     color: 'text-blue-400'   },
    { label: 'ACTIVE NOW',    value: running, sub: 'Running competitions',  icon: CalendarCheck,color: 'text-violet-400' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map(({ label, value, sub, icon: Icon, color }) => (
        <div key={label} className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
            <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        </div>
      ))}
    </div>
  )
}

export default function GamesNew() {
  const [activeTab, setActiveTab] = useState('games')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isPrizeEditorOpen, setIsPrizeEditorOpen] = useState(false)

  const handleCreateGame = () => setIsCreateDialogOpen(true)

  const handleEditGame = (game: Game) => {
    setSelectedGame(game)
    setIsEditDialogOpen(true)
  }

  const handleViewDetails = (game: Game) => {
    setSelectedGame(game); setIsDetailsOpen(true)
  }

  const handleManageSchedule = (_game: Game) => {
    setActiveTab('scheduler')
  }

  const handleManagePrizes = (game: Game) => {
    setSelectedGame(game); setIsPrizeEditorOpen(true)
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Game Management</h1>
            <p className="text-muted-foreground">Manage competitions and configurations</p>
          </div>
          <button
            onClick={handleCreateGame}
            className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition"
          >
            + Create Game
          </button>
        </div>

        <GameStatsCards />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-auto">
            <TabsTrigger value="scheduler" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Competition Schedule
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-2">
              <List className="h-4 w-4" />
              Competitions List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scheduler" className="mt-6">
            <ScheduledGamesView />
          </TabsContent>

          <TabsContent value="games" className="mt-6">
            <GameList
              onCreateGame={handleCreateGame}
              onEditGame={handleEditGame}
              onViewDetails={handleViewDetails}
              onManageSchedule={handleManageSchedule}
              onManagePrizes={handleManagePrizes}
            />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <CreateGameWizard
          isOpen={isCreateDialogOpen}
          onClose={() => { setIsCreateDialogOpen(false); setSelectedGame(null) }}
        />

        {selectedGame && (
          <>
            <EditGameWizard
              game={selectedGame}
              isOpen={isEditDialogOpen}
              onClose={() => { setIsEditDialogOpen(false); setSelectedGame(null) }}
            />
            <GameDetails
              game={selectedGame}
              isOpen={isDetailsOpen}
              onClose={() => { setIsDetailsOpen(false); setSelectedGame(null) }}
              onEdit={() => { setIsDetailsOpen(false); handleEditGame(selectedGame) }}
              onManageSchedule={() => { setIsDetailsOpen(false); handleManageSchedule(selectedGame) }}
              onManagePrizes={() => { setIsDetailsOpen(false); handleManagePrizes(selectedGame) }}
            />
            <PrizeStructureEditor
              game={selectedGame}
              isOpen={isPrizeEditorOpen}
              onClose={() => { setIsPrizeEditorOpen(false); setSelectedGame(null) }}
            />
          </>
        )}
      </div>
    </AdminLayout>
  )
}
