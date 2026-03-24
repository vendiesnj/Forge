export default function NotFound() {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          margin: 0,
          background: '#eeebe0',
          color: '#1a1915',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 8 }}>404</h1>
          <p style={{ color: '#6b6860' }}>Page not found</p>
          <a href="/" style={{ color: '#e5820a', marginTop: 16, display: 'block' }}>
            Go home
          </a>
        </div>
      </body>
    </html>
  )
}
