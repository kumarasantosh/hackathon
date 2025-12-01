import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'UNIVO+ - Verified Topper Tutoring & Smart Study Group Matching',
  description: 'Connect with verified toppers for affordable tutoring and find study groups that match your needs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="scroll-smooth">
        <body className={`${inter.className} relative`}>
          <Navbar />
          <main className="relative z-10">
            {children}
          </main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  )
}

