import type { CSSProperties } from 'react'
import type { Theme } from './themes.api'
import { safeUrl } from '@/shared/lib/display'
export function ThemePreview({
  theme,
  compact = false,
}: {
  theme: Pick<Theme, 'font_config' | 'corner_config' | 'wallpaper_config'>
  compact?: boolean
}) {
  const font = theme.font_config ?? {}
  const corner = theme.corner_config ?? {}
  const wallpaper = theme.wallpaper_config ?? {}
  const background: CSSProperties = { backgroundColor: '#f0f2e9' }
  if (typeof wallpaper.backgroundColor === 'string')
    background.backgroundColor = wallpaper.backgroundColor
  if (
    wallpaper.type === 'gradient' &&
    Array.isArray(wallpaper.backgroundColor) &&
    wallpaper.backgroundColor.length > 1
  )
    background.backgroundImage = `linear-gradient(to bottom, ${wallpaper.backgroundColor.map((stop) => `${stop.color} ${stop.amount * 100}%`).join(', ')})`
  if (wallpaper.type === 'image' && safeUrl(wallpaper.image))
    background.backgroundImage = `url(${JSON.stringify(safeUrl(wallpaper.image))})`
  const button: CSSProperties = {
    borderRadius:
      corner.type === 'round' ? 999 : corner.type === 'sharp' ? 0 : 12,
    backgroundColor: corner.fillColor ?? '#ffffff',
    border: `1px solid ${corner.strokeColor || 'transparent'}`,
    opacity: corner.opacity ?? 1,
    boxShadow:
      corner.shadow === 'hard'
        ? '4px 4px 0 #0004'
        : corner.shadow === 'soft'
          ? '0 4px 12px #0002'
          : 'none',
  }
  return (
    <div
      className={`theme-preview ${compact ? 'compact' : ''}`}
      aria-label="Theme preview"
      style={{
        ...background,
        color: font.fillColor ?? '#292c28',
        fontFamily: font.name || 'Arial',
        fontStyle: font.italic ? 'italic' : 'normal',
        textDecoration: font.underline ? 'underline' : 'none',
        fontWeight: { regular: 400, medium: 500, semibold: 600, bold: 700 }[
          font.weight ?? 'regular'
        ],
      }}
    >
      <div className="preview-avatar">a</div>
      <strong>Your name</strong>
      <p>A little about you and what you do.</p>
      <div className="preview-links">
        {['My website', 'Latest work', 'Say hello'].map((label) => (
          <div key={label} style={button}>
            {label}
          </div>
        ))}
      </div>
      <span className="preview-brand">abio</span>
    </div>
  )
}
