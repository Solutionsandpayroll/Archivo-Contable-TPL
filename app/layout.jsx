import './globals.css'

export const metadata = {
  title: 'Archivo Contable - TPL',
  description: 'Archivo Contable - TPL | Solutions & Payroll',
  icons: {
    icon: '/Logo syp.png',
    apple: '/Logo syp.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
