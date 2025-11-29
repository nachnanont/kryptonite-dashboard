import './globals.css'
import { Inter } from 'next/font/google' 

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Crypto Dashboard (Final)',
  description: 'USDT Tracker and LAK Calculator',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}