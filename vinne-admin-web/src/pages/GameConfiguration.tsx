import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { 
  Save, 
  Plus, 
  Trash2, 
  Trophy, 
  Settings, 
  DollarSign,
  Users,
  Target
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/ui/page-header'
import { gameService } from '@/services/games'

export interface PrizeStructure {
  position: number
  position_name: string
  prize_amount: number
  prize_type: 'fixed' | 'percentage' | 'physical'
  percentage_of_pool?: number
  // Physical prize fields
  prize_name?: string        // e.g. "BMW M3 Competition"
  prize_description?: string // e.g. "Brand new 2026 BMW M3 Competition"
}

export interface GameConfig {
  id?: string
  name: string
  description: string
  game_type: 'instant_win' | 'draw_based' | 'raffle'
  ticket_price: number
  max_tickets_per_player: number
  total_winners: number
  prize_structure: PrizeStructure[]
  winner_selection_method: 'google_rng' | 'cryptographic_rng'
  auto_payout_enabled: boolean
  big_win_threshold: number
  draw_frequency?: 'daily' | 'weekly' | 'monthly' | 'special'
  status: 'draft' | 'active' | 'suspended' | 'archived'
}

const GameConfiguration: React.FC = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  // Form state
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    name: '',
    description: '',
    game_type: 'draw_based',
    ticket_price: 100, // 1 GHS in pesewas
    max_tickets_per_player: 10,
    total_winners: 1,
    prize_structure: [
      {
        position: 1,
        position_name: '1st Place',
        prize_amount: 10000,
        prize_type: 'fixed',
        prize_name: '',
      }
    ],
    winner_selection_method: 'google_rng',
    auto_payout_enabled: true,
    big_win_threshold: 10000, // 100 GHS in pesewas
    status: 'draft'
  })

  // Save game configuration
  const saveGameMutation = useMutation({
    mutationFn: async (config: GameConfig) => {
      const firstPrize = config.prize_structure[0]
      const isPhysical = firstPrize?.prize_type === 'physical'
      const prizeName = isPhysical ? firstPrize?.prize_name || config.name : undefined

      return gameService.createGame({
        code: config.name.toUpperCase().replace(/\s+/g, '_').slice(0, 8) + '_' + Date.now().toString().slice(-4),
        name: config.name,
        description: config.description,
        draw_frequency: (config.draw_frequency || 'daily') as 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'special',
        sales_cutoff_minutes: 30,
        base_price: config.ticket_price / 100, // pesewas → GHS
        max_tickets_per_player: config.max_tickets_per_player,
        multi_draw_enabled: false,
        status: config.status === 'active' ? 'ACTIVE' : 'DRAFT',
        prize_details: isPhysical
          ? prizeName
          : `Prize pool: ${formatCurrency(config.prize_structure.reduce((s, p) => s + p.prize_amount, 0))}`,
        game_category: 'private',
        format: 'competition',
        organizer: 'winbig_africa',
        bet_types: [],
        number_range_min: 1,
        number_range_max: 100,
        selection_count: 1,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
      queryClient.invalidateQueries({ queryKey: ['games-list'] })
      toast({
        title: 'Game Created',
        description: 'Game has been created successfully.'
      })
      navigate({ to: '/games' })
    },
    onError: (error: Error) => {
      toast({
        title: 'Save Failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const handleSave = () => {
    // Validate configuration
    if (!gameConfig.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Game name is required',
        variant: 'destructive'
      })
      return
    }

    if (gameConfig.prize_structure.length !== gameConfig.total_winners) {
      toast({
        title: 'Validation Error',
        description: 'Prize structure must match the number of winners',
        variant: 'destructive'
      })
      return
    }

    saveGameMutation.mutate(gameConfig)
  }

  const updateTotalWinners = (newTotal: number) => {
    const currentPrizes = [...gameConfig.prize_structure]
    
    if (newTotal > currentPrizes.length) {
      // Add new prize positions
      for (let i = currentPrizes.length; i < newTotal; i++) {
        currentPrizes.push({
          position: i + 1,
          position_name: getPositionName(i + 1),
          prize_amount: Math.max(1000, 10000 - (i * 2000)),
          prize_type: 'fixed',
          prize_name: '',
        })
      }
    } else if (newTotal < currentPrizes.length) {
      // Remove excess prize positions
      currentPrizes.splice(newTotal)
    }

    setGameConfig(prev => ({
      ...prev,
      total_winners: newTotal,
      prize_structure: currentPrizes
    }))
  }

  const getPositionName = (position: number): string => {
    const suffixes = ['st', 'nd', 'rd']
    const suffix = suffixes[position - 1] || 'th'
    return `${position}${suffix} Place`
  }

  const updatePrizeStructure = (index: number, field: keyof PrizeStructure, value: any) => {
    const newStructure = [...gameConfig.prize_structure]
    newStructure[index] = { ...newStructure[index], [field]: value }
    
    setGameConfig(prev => ({
      ...prev,
      prize_structure: newStructure
    }))
  }

  const getTotalPrizePool = () => {
    return gameConfig.prize_structure.reduce((total, prize) => total + prize.prize_amount, 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Game Configuration"
        description="Create and configure games with winner selection settings"
        badge="Beta"
        badgeVariant="secondary"
      >
        <Button
          onClick={handleSave}
          disabled={saveGameMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Game Configuration
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Game Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Basic Game Settings
            </CardTitle>
            <CardDescription>
              Configure the fundamental game parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Game Name</Label>
              <Input
                value={gameConfig.name}
                onChange={(e) => setGameConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., BMW Car Raffle"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={gameConfig.description}
                onChange={(e) => setGameConfig(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the game and prizes..."
                className="mt-1"
              />
            </div>

            <div>
              <Label>Game Type</Label>
              <Select 
                value={gameConfig.game_type} 
                onValueChange={(value: 'instant_win' | 'draw_based' | 'raffle') => 
                  setGameConfig(prev => ({ ...prev, game_type: value }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant_win">Instant Win</SelectItem>
                  <SelectItem value="draw_based">Draw Based</SelectItem>
                  <SelectItem value="raffle">Raffle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ticket Price (GHS)</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={gameConfig.ticket_price / 100} // Convert from pesewas
                  onChange={(e) => setGameConfig(prev => ({ 
                    ...prev, 
                    ticket_price: Math.round((parseFloat(e.target.value) || 0) * 100) 
                  }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Max Tickets per Player</Label>
                <Input
                  type="number"
                  min="1"
                  value={gameConfig.max_tickets_per_player}
                  onChange={(e) => setGameConfig(prev => ({ 
                    ...prev, 
                    max_tickets_per_player: parseInt(e.target.value) || 1 
                  }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Winner Selection Method</Label>
              <Select 
                value={gameConfig.winner_selection_method} 
                onValueChange={(value: 'google_rng' | 'cryptographic_rng') => 
                  setGameConfig(prev => ({ ...prev, winner_selection_method: value }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google_rng">Google Random Number Generator</SelectItem>
                  <SelectItem value="cryptographic_rng">Cryptographic RNG</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {gameConfig.winner_selection_method === 'google_rng' 
                  ? 'Uses Google\'s quantum random number generator for maximum transparency'
                  : 'Uses cryptographically secure pseudorandom number generation'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Winner Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Winner Configuration
            </CardTitle>
            <CardDescription>
              Set the number of winners and prize structure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Total Number of Winners</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={gameConfig.total_winners}
                onChange={(e) => updateTotalWinners(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Google RNG will select this many winning tickets
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Prize Pool Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Total Winners:</span>
                  <p className="font-semibold">{gameConfig.total_winners}</p>
                </div>
                <div>
                  <span className="text-blue-700">Total Prize Pool:</span>
                  <p className="font-semibold">
                    {gameConfig.prize_structure.every(p => p.prize_type === 'physical')
                      ? gameConfig.prize_structure.map(p => p.prize_name || 'Physical Prize').join(', ')
                      : formatCurrency(getTotalPrizePool())}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label>Big Win Threshold (GHS)</Label>
              <Input
                type="number"
                min="10"
                step="10"
                value={gameConfig.big_win_threshold / 100} // Convert from pesewas
                onChange={(e) => setGameConfig(prev => ({ 
                  ...prev, 
                  big_win_threshold: Math.round((parseFloat(e.target.value) || 100) * 100) 
                }))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Wins above this amount require manual approval
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Automatic Payouts</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically process payouts below big win threshold
                </p>
              </div>
              <Switch
                checked={gameConfig.auto_payout_enabled}
                onCheckedChange={(checked) => setGameConfig(prev => ({ 
                  ...prev, 
                  auto_payout_enabled: checked 
                }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prize Structure Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Prize Structure Configuration
          </CardTitle>
          <CardDescription>
            Configure prize amounts for each winner position
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {gameConfig.prize_structure.map((prize, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      Position {prize.position}
                    </Badge>
                    <span className="font-medium">{prize.position_name}</span>
                  </div>
                  <Badge variant="secondary">
                    {prize.prize_type === 'physical'
                      ? prize.prize_name || 'Physical Prize'
                      : formatCurrency(prize.prize_amount)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Position Name</Label>
                    <Input
                      value={prize.position_name}
                      onChange={(e) => updatePrizeStructure(index, 'position_name', e.target.value)}
                      placeholder="e.g., Grand Prize, Runner Up"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Prize Type</Label>
                    <Select
                      value={prize.prize_type}
                      onValueChange={(value: 'fixed' | 'physical') =>
                        updatePrizeStructure(index, 'prize_type', value)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">💵 Cash</SelectItem>
                        <SelectItem value="physical">🎁 Physical Prize</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {prize.prize_type === 'physical' ? (
                  <div>
                    <Label className="text-sm">Prize Name</Label>
                    <Input
                      value={prize.prize_name || ''}
                      onChange={(e) => updatePrizeStructure(index, 'prize_name', e.target.value)}
                      placeholder="e.g., BMW M3 Competition, iPhone 16 Pro, PS5"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This is what the winner receives — shown on the Results page
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label className="text-sm">Prize Amount (GHS)</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={prize.prize_amount / 100}
                      onChange={(e) => updatePrizeStructure(
                        index,
                        'prize_amount',
                        Math.round((parseFloat(e.target.value) || 0) * 100)
                      )}
                      className="mt-1"
                    />
                  </div>
                )}

                {prize.prize_amount >= gameConfig.big_win_threshold && (
                  <Alert>
                    <Trophy className="h-4 w-4" />
                    <AlertTitle>Big Win Alert</AlertTitle>
                    <AlertDescription>
                      This prize amount exceeds the big win threshold and will require manual approval for payout.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Prize Structure Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Winners:</span>
                <p className="font-semibold">{gameConfig.total_winners}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Prize Pool:</span>
                <p className="font-semibold">{formatCurrency(getTotalPrizePool())}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Prize per Winner:</span>
                <p className="font-semibold">
                  {formatCurrency(gameConfig.total_winners > 0 ? getTotalPrizePool() / gameConfig.total_winners : 0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Preview</CardTitle>
          <CardDescription>
            Review your game configuration before saving
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                <p className="text-sm text-muted-foreground">Winners</p>
                <p className="text-lg font-bold">{gameConfig.total_winners}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <DollarSign className="h-6 w-6 mx-auto mb-1 text-green-600" />
                <p className="text-sm text-muted-foreground">Prize Pool</p>
                <p className="text-lg font-bold">{formatCurrency(getTotalPrizePool())}</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Trophy className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                <p className="text-sm text-muted-foreground">Ticket Price</p>
                <p className="text-lg font-bold">{formatCurrency(gameConfig.ticket_price)}</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <Target className="h-6 w-6 mx-auto mb-1 text-orange-600" />
                <p className="text-sm text-muted-foreground">Max per Player</p>
                <p className="text-lg font-bold">{gameConfig.max_tickets_per_player}</p>
              </div>
            </div>

            <Alert>
              <Settings className="h-4 w-4" />
              <AlertTitle>Winner Selection Configuration</AlertTitle>
              <AlertDescription>
                This game will use <strong>{gameConfig.winner_selection_method === 'google_rng' ? 'Google RNG' : 'Cryptographic RNG'}</strong> to 
                select <strong>{gameConfig.total_winners}</strong> winner{gameConfig.total_winners > 1 ? 's' : ''} from all valid ticket entries. 
                Each winner position has a predefined prize amount, and payouts {gameConfig.auto_payout_enabled ? 'will be' : 'will not be'} processed automatically.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GameConfiguration