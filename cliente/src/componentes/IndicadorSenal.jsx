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

  if (conSenal) {
    return <p className="senal senal-con">Con señal</p>
  }
  return <p className="senal senal-sin">Sin señal</p>
}

export default IndicadorSenal
