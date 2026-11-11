import { useEffect, useState } from 'react'

function IndicadorSenal() {
  const [conSenal, cambiarConSenal] = useState(navigator.onLine)

  useEffect(() => {
    const marcarConSenal = () => cambiarConSenal(true)
    const marcarSinSenal = () => cambiarConSenal(false)
    window.addEventListener('online', marcarConSenal)
    window.addEventListener('offline', marcarSinSenal)
    return () => {
      window.removeEventListener('online', marcarConSenal)
      window.removeEventListener('offline', marcarSinSenal)
    }
  }, [])

  return <p>{conSenal ? 'Con señal' : 'Sin señal'}</p>
}

export default IndicadorSenal
