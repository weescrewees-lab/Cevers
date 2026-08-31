'use client'

import { useEffect, useRef } from 'react'
import * as Phaser from 'phaser'

export type OpenGameKind = 'crash' | 'hash' | 'grid' | 'chest'

/**
 * Open-source gameplay layer based on Phaser Labs examples (MIT licensed).
 * The wager boundary remains CEVERS-owned; this component only renders the
 * playable scene and emits an action when the player starts a round.
 */
export function OpenSourceCryptoGame({ kind, onAction }: { kind: OpenGameKind; onAction: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const actionRef = useRef(onAction)
  actionRef.current = onAction

  useEffect(() => {
    if (!host.current) return
    const colors = { crash: 0xf7931a, hash: 0x30d158, grid: 0x5e5ce6, chest: 0xffd60a }
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO, parent: host.current, width: 720, height: 250,
      transparent: true, scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true },
      scene: { create(this: Phaser.Scene) {
        const accent = colors[kind]
        this.add.text(22, 18, `OPEN ARCADE / ${kind.toUpperCase()}`, { fontFamily: 'monospace', fontSize: '11px', color: '#ffffff' })
        const title = kind === 'crash' ? 'CRASH VECTOR' : kind === 'hash' ? 'HASH RUNNER' : kind === 'grid' ? 'SATOSHI GRID' : 'VAULT CHEST'
        this.add.text(22, 48, title, { fontFamily: 'Arial', fontSize: '28px', fontStyle: 'bold', color: '#ffffff' })
        const line = this.add.graphics(); line.lineStyle(2, accent, .9); line.beginPath();
        for (let x = 22; x < 680; x += 24) line.lineTo(x, 190 - Math.sin(x / 48) * (kind === 'crash' ? x / 10 : 22));
        line.strokePath()
        const btn = this.add.rectangle(585, 54, 105, 42, 0xffffff).setInteractive({ useHandCursor: true })
        this.add.text(585, 54, 'PLAY', { fontFamily: 'monospace', fontSize: '13px', color: '#09090b' }).setOrigin(.5)
        btn.on('pointerdown', () => actionRef.current())
        this.add.text(22, 218, 'Source: Phaser Labs examples · MIT License', { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff' })
      } },
    }
    const game = new Phaser.Game(config)
    return () => game.destroy(true)
  }, [kind])

  return <div ref={host} className="h-[250px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/35" aria-label={`${kind} open source game scene`} />
}
