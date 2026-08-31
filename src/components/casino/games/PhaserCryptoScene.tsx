'use client'

import { useEffect, useRef } from 'react'
import * as Phaser from 'phaser'

type SceneKind = 'crash' | 'hash' | 'grid' | 'chest'

export function PhaserCryptoScene({ kind, onAction }: { kind: SceneKind; onAction?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const actionRef = useRef(onAction)
  actionRef.current = onAction

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    const accent = 0xffffff
    class CryptoScene extends Phaser.Scene {
      constructor() { super('crypto') }
      create() {
        const { width, height } = this.scale
        this.cameras.main.setBackgroundColor('#09090b')
        this.add.grid(width / 2, height / 2, width, height, 32, 32, 0x09090b, 1, 0x26262b, 0.24)
        const title = kind === 'crash' ? 'BTC / ORBIT' : kind === 'hash' ? 'BTC / HASH RUN' : kind === 'grid' ? 'BTC / GRID' : 'BTC / VAULT'
        this.add.text(28, 24, title, { fontFamily: 'Arial', fontSize: '13px', color: '#ffffff', fontStyle: 'bold' })
        this.add.text(28, 47, 'ENGINE SESSION · SERVER VERIFIED', { fontFamily: 'Arial', fontSize: '9px', color: '#7a7a82', letterSpacing: 2 })
        if (kind === 'crash') this.drawCrash(width, height)
        if (kind === 'hash') this.drawHash(width, height)
        if (kind === 'grid') this.drawGrid(width, height)
        if (kind === 'chest') this.drawChest(width, height)
        const button = this.add.text(width - 28, height - 28, 'PLAY ROUND', { fontFamily: 'Arial', fontSize: '11px', color: '#050505', backgroundColor: '#ffffff', padding: { left: 14, right: 14, top: 9, bottom: 9 } }).setOrigin(1)
        button.setInteractive({ useHandCursor: true }).on('pointerdown', () => actionRef.current?.())
      }
      drawCrash(width: number, height: number) {
        const line = this.add.graphics({ lineStyle: { width: 3, color: accent } }); line.beginPath(); line.moveTo(28, height - 64); line.lineTo(width * .28, height * .68); line.lineTo(width * .48, height * .74); line.lineTo(width * .68, height * .4); line.lineTo(width - 34, height * .18); line.strokePath()
        this.add.text(28, height - 116, '1.84×', { fontFamily: 'Arial', fontSize: '42px', color: '#ffffff', fontStyle: 'bold' })
      }
      drawHash(width: number, height: number) {
        for (let i = 0; i < 8; i++) { const x = 30 + i * ((width - 60) / 7); const y = height / 2 + Math.sin(i * .9) * 50; this.add.circle(x, y, 5, 0xffffff, .9); if (i) this.add.line(0, 0, x - ((width - 60) / 7), height / 2 + Math.sin((i - 1) * .9) * 50, x, y).setStrokeStyle(2, 0xffffff, .7) }
        this.add.text(28, height - 92, 'HASH RATE  ·  742 TH/s', { fontFamily: 'Arial', fontSize: '11px', color: '#ffffff' })
      }
      drawGrid(width: number, height: number) {
        const cols = 8, rows = 4, size = Math.min((width - 70) / cols, 48), startX = (width - cols * size) / 2, startY = 100
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) this.add.rectangle(startX + x * size + size / 2, startY + y * size + size / 2, size - 6, size - 6, (x + y * 3) % 7 === 0 ? 0xffffff : 0x17171b, 1).setStrokeStyle(1, 0x3a3a40, 1)
        this.add.text(28, height - 92, 'BLOCK 840,126  ·  DIFFICULTY LOCKED', { fontFamily: 'Arial', fontSize: '11px', color: '#ffffff' })
      }
      drawChest(width: number, height: number) {
        const g = this.add.graphics(); g.lineStyle(3, 0xffffff, 1); g.strokeRect(width / 2 - 86, height / 2 - 40, 172, 92); g.lineBetween(width / 2 - 86, height / 2 - 4, width / 2 + 86, height / 2 - 4); g.strokeRect(width / 2 - 14, height / 2 - 7, 28, 34); this.add.text(width / 2, height / 2 + 75, 'VAULT SEALED · READY', { fontFamily: 'Arial', fontSize: '11px', color: '#ffffff' }).setOrigin(.5)
      }
    }
    const game = new Phaser.Game({ type: Phaser.AUTO, parent: host, width: '100%', height: 360, transparent: true, scene: CryptoScene, scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH } })
    return () => game.destroy(true)
  }, [kind])

  return <div ref={hostRef} className="min-h-[360px] w-full overflow-hidden rounded-2xl" aria-label={`${kind} game engine`} />
}
