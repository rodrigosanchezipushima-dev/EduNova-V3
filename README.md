# EduNova V3 — publicación

## Archivos
- `server.js`: servidor y endpoint `/api/chat`.
- `public/`: web + PWA.
- `.env.example`: variables locales.
- `render.yaml`: configuración de despliegue en Render.
- `.gitignore`: evita subir secretos.

## Publicación recomendada: Render + GitHub

1. Crea un repositorio en GitHub llamado `edunova-v3`.
2. Sube TODOS estos archivos manteniendo las carpetas.
3. En Render crea `New > Web Service` y conecta ese repositorio.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. En Environment agrega:
   `OPENAI_API_KEY` = tu clave de OpenAI.
   `OPENAI_MODEL` = `gpt-5.6-luna`
7. Pulsa Deploy.

No subas nunca el archivo `.env` ni pegues la clave de OpenAI dentro de `public/index.html`.

Cuando Render termine, te dará una dirección `https://...onrender.com`.
Esa será tu dirección de EduNova.

## Instalar en celular
Abre esa dirección en el navegador del celular.
- Android/Chrome: menú > Instalar aplicación / Añadir a pantalla de inicio.
- iPhone/Safari: Compartir > Añadir a pantalla de inicio.

## Probar
Abre la URL de EduNova y entra en Asistente IA.
Si la API está configurada, el indicador mostrará `IA conectada`.

## Seguridad
La clave de OpenAI solo vive como variable del servidor. No debe estar en HTML, JavaScript del navegador, GitHub ni capturas de pantalla.
