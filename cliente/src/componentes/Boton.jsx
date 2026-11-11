function Boton({ tipo, ...resto }) {
  return <button type="button" className={`boton boton-${tipo}`} {...resto} />
}

export default Boton
