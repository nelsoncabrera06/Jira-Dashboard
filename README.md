# 📋 Pasos de Instalación para el Jira Dashboard
## Prerrequisitos
Node.js (versión 14 o superior)

npm (viene incluido con Node.js)

Una cuenta activa de Jira con acceso a la API

## Pasos de Instalación
Clonar el repositorio

git clone https://github.com/nelsoncabrera06/Jira-Dashboard.git

cd jira-dashboard

## Instalar dependencias
```bash
npm install
```

## Configurar variables de entorno
Modificar el archivo .env en la raíz del proyecto con el siguiente contenido:

JIRA_EMAIL=tu-email@company.com

JIRA_API_TOKEN=tu-token-de-api-de-jira

PORT=3000

## Generar el token de API de Jira
Ir a: https://id.atlassian.com/manage-profile/security/api-tokens

Hacer clic en "Create API token"

Copiar el token y pegarlo en el archivo .env

Iniciar el servidor
```bash
npm start
```

(O para desarrollo con auto-reinicio: npm run dev)

## Acceder a la aplicación
Abrir el navegador en: http://localhost:3000
