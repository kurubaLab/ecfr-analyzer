// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'USDS eCFR Analyzer',
  description: 'Federal Regulation Analysis Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        {/* TOP NAVIGATION BAR */}
        {/*
        <nav className="bg-slate-900 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <span className="font-bold text-xl tracking-tight">🏛️ eCFR Analyzer</span>
                <div className="ml-10 flex items-baseline space-x-4">
                  <Link href="/dashboard" className="px-3 py-2 rounded-md hover:bg-slate-700 transition">
                    Dashboard
                  </Link>
                  <Link href="/admin" className="px-3 py-2 rounded-md hover:bg-slate-700 transition">
                    Admin Console
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>
         */}

        {/* PAGE CONTENT */}
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}