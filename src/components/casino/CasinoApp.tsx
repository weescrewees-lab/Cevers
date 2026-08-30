'use client'

import { useEffect } from 'react'
import { useCasino } from '@/lib/store'
import { TopBar } from '@/components/casino/TopBar'
import { Sidebar } from '@/components/casino/Sidebar'
import { Lobby } from '@/components/casino/Lobby'
import { WalletView } from '@/components/casino/WalletView'
import { ChallengesView } from '@/components/casino/ChallengesView'
import { ProfileView } from '@/components/casino/ProfileView'
import { GameView } from '@/components/casino/games/GameView'
import { AuthModal } from '@/components/casino/AuthModal'
import { FairnessModal } from '@/components/casino/FairnessModal'
import { CookieBanner, CookiePrefsDialog } from '@/components/casino/CookieBanner'
import { SiteFooter } from '@/components/casino/SiteFooter'

export default function CasinoApp() {
  const { route, boot, booted } = useCasino()

  useEffect(() => {
    boot()
  }, [boot])

  if (!booted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/15 border-t-white" />
      </div>
    )
  }

  const renderRoute = () => {
    if (route.startsWith('game/')) {
      return <GameView gameId={route.slice(5)} />
    }
    switch (route) {
      case 'wallet':
        return <WalletView />
      case 'challenges':
        return <ChallengesView />
      case 'profile':
        return <ProfileView />
      default:
        return <Lobby />
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <TopBar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden">{renderRoute()}</main>
      </div>
      <AuthModal />
      <FairnessModal />
      <CookiePrefsDialog />
      <CookieBanner />

      <SiteFooter />
    </div>
  )
}
