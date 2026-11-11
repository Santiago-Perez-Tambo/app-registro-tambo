import { useEffect, useState } from 'react'

export function useSenal() {
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

  return conSenal
}

function IndicadorSenal() {
  const conSenal = useSenal()

  if (conSenal) {
    return <p className="senal senal-con">Con señal</p>
  }
  return <p className="senal senal-sin">Sin señal</p>
}

export default IndicadorSenal
