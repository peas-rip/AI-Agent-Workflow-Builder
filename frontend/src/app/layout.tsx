import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ApolloProvider } from '@/components/ApolloProvider'
import { NhostProvider } from '@/components/NhostProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Agent Workflow Builder',
  description: 'Build and orchestrate AI agent workflows with ease',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NhostProvider>
          <ApolloProvider>
            {children}
          </ApolloProvider>
        </NhostProvider>
      </body>
    </html>
  )
}
