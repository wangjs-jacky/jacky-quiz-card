import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '智卡 AI - AI 驱动的知识卡片与测试生成器',
  description: 'AI 驱动的知识卡片与测试生成器',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}

