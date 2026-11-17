# Sistema de registro y trazabilidad de eventos para tambos chicos y medianos

Prototipado tecnológico. Trabajo Final de Grado, Ingeniería en Software, Universidad Siglo 21.

Autor: Santiago Emanuel Perez. Tutor: Cassi, Jorge Humberto. Noviembre de 2026.

## Qué es

Una aplicación web que el tambero usa en el lote, aun sin señal, para registrar los eventos del rodeo (servicio, tacto, secado y parto) en el momento en que ocurren. Las capturas se guardan en el celular hasta que vuelve la señal, se envían a un servidor que propone el asiento con ayuda de inteligencia artificial, y el propietario o el asesor lo confirma. Con los eventos confirmados se arma la historia de cada animal y sus avisos.

## Qué hace

- **Ingreso por rol.** Cada usuario entra con su correo y su contraseña y ve lo que le corresponde: propietario, tambero o asesor.
- **Registro desde el celular.** El tambero elige la vaca por su caravana, ve su ficha y registra lo que pasó por voz, por foto o por escrito.
- **Funciona sin señal.** El registro queda guardado en el celular y se envía solo cuando vuelve la señal, sin duplicarse.
- **Asiento propuesto.** El servidor transcribe el audio, lee la foto o el texto y propone el asiento: tipo de evento, fecha y datos. Si algo no se entendió, lo avisa.
- **Confirmación.** El propietario revisa cada asiento, lo corrige si hace falta y lo confirma o lo rechaza. Si el registro nombra otra vaca, puede pasarlo a la que corresponde. El asesor confirma solo lo que cargó él. Nada entra a la historia sin que una persona lo confirme.
- **Rodeo e historia.** Lista de animales con su categoría, su estado y su último evento, búsqueda por caravana, alta de animales y la historia de cada uno, con quién confirmó cada evento.
- **Avisos.** Se calculan a partir de los eventos confirmados: tactar, secar, parto probable, sin celo e inducir celo.

## Enlaces

- Aplicación publicada: https://app-registro-tambo.vercel.app
- Repositorio: https://github.com/Santiago-Perez-Tambo/app-registro-tambo
- Versión entregada: etiqueta `v1.0.1`

El servidor de la demostración se duerme cuando pasa un rato sin uso. La primera acción puede tardar hasta un minuto.

## Instalar la aplicación en el celular

No hace falta ninguna tienda de aplicaciones. Se instala desde el navegador:

- **Android (Chrome):** abrir https://app-registro-tambo.vercel.app, tocar el menú de los tres puntos y elegir "Instalar aplicación" o "Agregar a la pantalla principal".
- **iPhone (Safari):** abrir https://app-registro-tambo.vercel.app, tocar el botón de compartir y elegir "Agregar a inicio".

Queda un ícono llamado "Mi tambo". La primera vez hay que entrar con señal y esperar a que cargue la pantalla de inicio. Después se puede usar sin señal.

## Herramientas

- **React y Vite:** el cliente, una aplicación web que se puede instalar en el celular (vite-plugin-pwa).
- **Dexie (IndexedDB):** guarda en el celular las capturas pendientes y la copia del rodeo que permite elegir la vaca sin señal.
- **Node.js y Express:** el servidor. Recibe las capturas, descarta las repetidas y aplica las reglas.
- **Supabase:** la base de datos PostgreSQL con seguridad por fila, los usuarios y el depósito de fotos y audios.
- **API de Claude (Anthropic), modelo `claude-sonnet-5-5`:** interpreta cada captura y propone el asiento.
- **API de OpenAI, modelo `whisper-1`:** transcribe los audios.

## Estructura del repositorio

- `cliente/`: la aplicación web (React y Vite).
- `servidor/`: el servidor (Node.js y Express).
- `base_de_datos/`: los scripts SQL, numerados en el orden en que se ejecutan.

## Requisitos

- Node.js 22.12 o superior, con npm.
- Un proyecto de Supabase. Alcanza con el plan gratuito.
- Una clave de la API de Claude (Anthropic). Sin ella las capturas quedan "Sin interpretar".
- Una clave de la API de OpenAI. Sin ella los audios quedan sin transcribir.

## Instalación

### 1. Base de datos

En el panel de Supabase, con un proyecto nuevo:

1. En Authentication, desactivar el registro abierto de usuarios y pedir contraseñas de ocho caracteres con mayúscula, minúscula, número y símbolo.
2. En Storage, crear el depósito `capturas`: privado, con un tope de 5 MB por archivo y sin políticas.
3. En el SQL Editor, ejecutar `base_de_datos/01_esquema.sql`.
4. En Authentication, crear tres usuarios: propietario, tambero y asesor. Abrir `02_datos_iniciales.sql`, reemplazar `CORREO_PROPIETARIO`, `CORREO_TAMBERO` y `CORREO_ASESOR` por esos correos y ejecutarlo. La consulta del final tiene que mostrar tres filas.
5. Ejecutar `03_padron.sql`, que carga los animales del establecimiento.
6. Ejecutar `04_cerrar_escrituras.sql` y `05_cerrar_alertas.sql`, una sola vez. Dejan la escritura de eventos, capturas, advertencias y avisos solo en manos del servidor.
7. Para tener los datos de demostración, crear en Authentication los usuarios `caepropietario@tambo.test`, `caetambero@tambo.test` y `caeasesor@tambo.test` y ejecutar `06_demo.sql`. Arma un segundo establecimiento con 26 animales y su historia, con fechas relativas al momento en que se ejecuta. Se puede volver a ejecutar: deja la demostración como nueva.

`07_limpiar_tambo.sql` no forma parte de la instalación. Vuelve a cero el establecimiento 1 para empezar el uso real.

### 2. Variables de entorno

En `cliente/`, copiar `.env.ejemplo` como `.env` y completar:

| Variable | Qué es |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase. |
| `VITE_SUPABASE_KEY` | Clave publicable de Supabase. No es secreta: las reglas de fila limitan lo que puede ver. |
| `VITE_SERVIDOR_URL` | URL del servidor. En la PC, `http://localhost:3000`. |

En `servidor/`, copiar `.env.ejemplo` como `.env` y completar:

| Variable | Qué es |
|---|---|
| `SUPABASE_URL` | URL del proyecto de Supabase. |
| `SUPABASE_CLAVE_SECRETA` | Clave secreta de Supabase. Solo vive en el servidor. |
| `ORIGEN_PERMITIDO` | URL del cliente autorizada a llamar al servidor. En la PC, `http://localhost:5173`. Sin esta variable el servidor no arranca. |
| `ANTHROPIC_API_KEY` | Clave de la API de Claude. |
| `OPENAI_API_KEY` | Clave de la API de OpenAI. |
| `PORT` | Opcional. Por defecto, 3000. |

Las claves no están en el código: viven en los archivos `.env`, que no se suben al repositorio.

### 3. Puesta en marcha

El servidor:

```
cd servidor
npm install
npm start
```

Queda escuchando en el puerto 3000. Si anda, `http://localhost:3000/salud` responde.

El cliente, en otra terminal:

```
cd cliente
npm install
npm run dev
```

La aplicación abre en http://localhost:5173.

## Pruebas

```
cd servidor
npm test
```

Corre 137 pruebas.

```
cd cliente
npm test
```

Corre 120 pruebas.

## Usuarios de demostración

La aplicación publicada tiene un establecimiento de demostración con tres usuarios, uno por rol. Las contraseñas están en el README de la carpeta de entrega, no en este repositorio.

## Decisiones de diseño

- El celular es una cola de salida, no un almacenamiento: cada captura se borra del teléfono cuando el servidor confirma que la recibió.
- Cada captura nace con un identificador único (UUID) generado en el celular; si llega dos veces, la base la descarta.
- La inteligencia artificial propone el asiento, nunca lo asienta: todo evento queda pendiente hasta que una persona lo confirma.
- Las reglas de negocio (estados, fechas y alertas) viven en un solo archivo del servidor.
- La base aplica seguridad por fila: cada usuario ve solo los datos de su establecimiento.

## Qué entra en esta entrega y qué queda para la defensa

En esta entrega está el núcleo del sistema. Historia por historia:

- HU-001, ingreso con usuario y rol: entra.
- HU-002, rodeo, búsqueda y alta: entra, sin la modificación ni la baja.
- HU-003, captura por texto, foto y voz sin señal: entra.
- HU-004, sincronización sin duplicados: entra.
- HU-005, interpretación: entra.
- HU-006, confirmar, corregir o rechazar: entra.
- HU-007 a HU-010, servicio, tacto, secado y parto: entran, sin el secado por tratamiento.
- HU-015, historia, y HU-016, avisos: entran, sin el fin de retiro.

Quedan para la defensa oral:

- HU-011, tratamiento sanitario con período de retiro.
- HU-012, descarte, venta o muerte.
- HU-013, producción por retiro de leche.
- HU-014, control lechero por fecha.
- HU-017, advertencias sobre eventos que pueden afectar una preñez. Ya se guarda y se muestra en la historia la advertencia por un servicio sobre una vaca preñada; falta avisar antes de confirmar.
- HU-018, la pantalla de parámetros del establecimiento.