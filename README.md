# Sistema de registro y trazabilidad de eventos para tambos chicos y medianos

Prototipado tecnológico. Trabajo Final de Grado, Ingeniería en Software, Universidad Siglo 21.

Autor: Santiago Emanuel Perez. Tutor: Cassi, Jorge Humberto. Noviembre de 2026.

## Qué es

Una aplicación web que el tambero usa en el lote, aun sin señal, para registrar los eventos del rodeo (servicio, tacto, parto, secado, tratamiento y baja) en el momento en que ocurren. Las capturas se guardan en el celular hasta que vuelve la señal, se sincronizan con un servidor que propone el asiento con ayuda de inteligencia artificial, y el propietario o el asesor lo confirma desde la computadora. Con los eventos confirmados se arma la historia de cada animal y sus avisos.

## Enlaces

- Aplicación publicada: [URL de Vercel]
- Repositorio: https://github.com/Santiago-Perez-Tambo/app-registro-tambo

## Estado del prototipo

Al momento de esta entrega está construida y publicada la base de datos en Supabase, con las diez tablas del modelo, las funciones de apoyo y las políticas de seguridad por fila, y están creados los usuarios de prueba. La aplicación web y el servidor se encuentran en desarrollo y se completan antes de la defensa oral.

## Estructura del repositorio

- `cliente/`: aplicación web progresiva hecha con React y Vite. Es lo que usan el tambero desde el celular y el propietario y los asesores desde la computadora.
- `servidor/`: servidor Node.js con Express. Recibe las capturas, descarta las repetidas y se comunica con los servicios de inteligencia artificial.
- `base_de_datos/`: scripts SQL para crear la base en PostgreSQL (Supabase).
  - `01_esquema.sql`: tablas, funciones de apoyo y seguridad por fila.
  - `02_datos_iniciales.sql`: establecimiento y usuarios de prueba.

## Requisitos

- Node.js 22 o superior.
- Una cuenta gratuita en Supabase.

## Tecnologías

- Cliente: React, Vite, vite-plugin-pwa, Dexie.js (IndexedDB), react-router-dom.
- Servidor: Node.js, Express, SDK de Supabase, SDK de Anthropic.
- Base de datos y servicios: PostgreSQL, autenticación y almacenamiento de archivos en Supabase.
- Inteligencia artificial: API de Claude para interpretar las capturas; transcripción de voz con la API de OpenAI.
- Alojamiento: Vercel (cliente) y Render (servidor).

## Variables de entorno

Cliente (`cliente/.env`):

| Variable | Qué es |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase. |
| `VITE_SUPABASE_KEY` | Clave publicable de Supabase. No es secreta: las reglas de fila limitan lo que puede ver. |
| `VITE_SERVIDOR_URL` | URL del servidor Express (local o en Render). |

Servidor (`servidor/.env`):

| Variable | Qué es |
|---|---|
| `SUPABASE_URL` | URL del proyecto de Supabase. |
| `SUPABASE_SERVICE_KEY` | Clave secreta de Supabase. Solo vive en el servidor. |
| `ORIGEN_PERMITIDO` | URL del cliente autorizada a llamar al servidor. |
| `ANTHROPIC_API_KEY` | Clave de la API de Claude. |
| `OPENAI_API_KEY` | Clave de la API de OpenAI, solo si se usa la captura por voz. |

## Puesta en marcha local

1. Descomprimir el código o clonar el repositorio.
2. En Supabase, crear un proyecto nuevo. En el SQL Editor, ejecutar `base_de_datos/01_esquema.sql`.
3. En Authentication, crear dos usuarios: uno será el propietario y otro el tambero. Abrir `base_de_datos/02_datos_iniciales.sql`, reemplazar `CORREO_PROPIETARIO` y `CORREO_TAMBERO` por esos correos y ejecutarlo en el SQL Editor.
4. En `cliente/`, copiar `.env.ejemplo` como `.env` y completar la URL del proyecto y la clave publicable de Supabase. Ejecutar `npm install` y después `npm run dev`. La aplicación abre en http://localhost:5173.
5. En `servidor/`, copiar `.env.ejemplo` como `.env` y completar las variables. Ejecutar `npm install` y después `npm start`.

Las claves no están en el código: viven en los archivos `.env`, que no se suben al repositorio.

## Publicación

El cliente se publica en Vercel (carpeta raíz `cliente`) y el servidor en Render (carpeta raíz `servidor`). Las variables de entorno se cargan en el panel de cada servicio, nunca en el código.

## Usuarios de prueba

Se entregan por separado en el documento del TFG.

## Decisiones de diseño

- El celular es una cola de salida, no un almacenamiento: cada captura se borra del teléfono cuando el servidor confirma que la recibió.
- Cada captura nace con un identificador único (UUID) generado en el celular; si llega dos veces, la base la descarta.
- La inteligencia artificial propone el asiento, nunca lo asienta: todo evento queda pendiente hasta que una persona lo confirma.
- Las reglas de negocio (estados, fechas y alertas) viven en un solo archivo del servidor.
- La base aplica seguridad por fila: cada usuario ve solo los datos de su establecimiento.

## Uso

El propietario entra desde la computadora, ve el rodeo, los asientos por confirmar y los avisos, y administra los parámetros del establecimiento. El tambero entra desde el celular, elige la vaca por su caravana y registra lo que pasó por texto, foto o voz; las capturas se envían solas cuando hay señal. El asesor consulta la historia y los avisos y confirma los eventos sanitarios.
