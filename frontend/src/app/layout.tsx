import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title:       'Umurava Africa – HR AI Screening',
  description: 'Intelligent talent screening platform',
  manifest:    '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Umurava HR' },
}

export const viewport: Viewport = {
  width:               'device-width',
  initialScale:        1,
  maximumScale:        1,   // prevents accidental zoom on input focus (iOS)
  userScalable:        false,
  viewportFit:         'cover', // respects notch / safe areas
  themeColor:          '#0ea5e9',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Font preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* PWA / mobile chrome */}
        <meta name="mobile-web-app-capable"       content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>
        <AuthProvider>
          {children}

          <Toaster
            position="top-center"
            // on mobile top-center is much easier to see than top-right
            gutter={8}
            containerStyle={{ top: 64 }} /* clears the topbar */
            toastOptions={{
              duration: 4000,
              style: {
                background:   '#ffffff',
                color:        '#0c4a6e',
                borderRadius: '14px',
                border:       '2px solid #bae6fd',
                fontFamily:   'DM Sans, sans-serif',
                fontSize:     '14px',
                fontWeight:   '500',
                padding:      '12px 16px',
                boxShadow:    '0 8px 32px rgba(14,165,233,0.15)',
                maxWidth:     '360px',
              },
              success: {
                iconTheme: { primary: '#0ea5e9', secondary: '#ffffff' },
                style: {
                  borderColor: '#7dd3fc',
                },
              },
              error: {
                iconTheme: { primary: '#f87171', secondary: '#ffffff' },
                style: {
                  borderColor: '#fecaca',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
