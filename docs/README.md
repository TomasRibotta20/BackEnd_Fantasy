# BackEnd_Fantasy

Este es el repositorio para el backend del trabajo de desarrollo de software

## Documentación

Toda la documentación técnica del proyecto, manuales de la API (Swagger), estructura del código (TypeDoc) y evidencia de pruebas (Testing) se encuentra en nuestro directorio de **[documentación](/docs/README.md)**.


## Requisitos Previos

| Requisito           | Descripción / Valor Necesario   |
|---------------------|-------------------------------|
| Node.js             | v22.16.0                      |
| Gestor de Paquetes  | pnpm v10.11.0                 |
| Git                 | Instalado                     |
| Base de Datos       | MySQL o compatible            |

## Configuración de Variables de Entorno

Configurar variables de entorno: Duplique el archivo `.env.example` y renómbrelo a `.env`. Luego, rellene cada variable que se especifica dentro del archivo.

### Base de datos

Para las variables de la base de datos se debe tener en cuenta que la base de datos se creará automáticamente al ejecutar el proyecto si el usuario tiene las credenciales correctas. Es decir, solo hace falta definir previamente el nombre de la base de datos y un usuario con persimos para que la app pueda usarlo y conectarse a la base de datos.

```env
    DB_HOST=localhost # Host del servidor MySQL.
    DB_PORT=3307 # Puerto de MySQL (ajustar si es 3306).
    DB_USER=dws # Usuario con permisos.
    DB_PASSWORD=dsw # Contraseña del usuario.
    DB_NAME=fantasydatabase # Nombre de la base de datos a conectar.
```
### JWT

Se debe definir una clave para cada uno de los tokens de autenticación que existen en la app. También se recomienda que la clave posea más de 50 caracteres y que sea bastante segura. Se recomienda que la clave sea distinta para cada token.
    
```env
    SECRET_JWT_KEY=CLAVE_SECRETA_ACCESS_TOKEN_AQUI # Para tokens de acceso.
    SECRET_RESETJWT_KEY=CLAVE_SECRETA_RESET_TOKEN_AQUI # Para tokens de reseteo de contraseña.
    SECRET_REFRESHJWT_KEY=CLAVE_SECRETA_REFRESH_TOKEN_AQUI # Para tokens de refresco
```
### API-Sports (Datos de Partidos Reales)
La aplicación utiliza una API externa para obtener las estadísticas de los jugadores en la vida real.
1. Regístrate en [API-Football](https://www.api-football.com/) y obtén tu clave gratuita.
2. Agrega las siguientes variables a tu `.env`:

```env
   APISPORTS_KEY=Pega_AQUI_TU_CLAVE # API key de api-sports.io.
   AFA_LEAGUE_ID=128
   AFA_SEASON=2021
```
### Correo

La app posee un sistema de envío de mails para recuperar la contraseña de un usuario. Para ello se requiere una cuenta que envíe esos mails a los usuarios. Entonces se debe poner un nombre de gmail de una cuenta existente y una contraseña de aplicación. Esta contraseña debe ser creada por el propietario del mail. Con esta clave es posible acceder a la cuenta de gmail para enviar los mails a los usuarios. En el siguiente link hay un video explicativo de como crear esta contraseña: https://www.youtube.com/watch?v=HV2wcj6oLhs
    
```env 
    GMAIL_USER=tu_usuario_de_gmail
    GMAIL_PASS=tu_clave_de_aplicacion_gmail
```
Es importante aclarar que no es necesario crear la contraseña de aplicacion si no se desea. Si este es el caso entonces la app puede funcionar igualmente. Se deberá usar la consola para poder ver el envio de mails al momento de solicitar recuperar la contraseña.

### Groq (Inteligencia Artificial)
La aplicación integra la IA de Groq para generar análisis y tendencias automatizadas sobre el rendimiento de los jugadores. Puedes obtener tu clave API gratuita creando una cuenta en la consola de desarrolladores de Groq.

```env 
    GROQ_API_KEY=tu_api_key_de_groq
```
## Pasos de Ejecución

1. Clonar el repositorio:
    ```bash
    git clone link-del-repo-backend
    cd nombre-del-repo-backend
    ```
2. Instalar dependencias:
    ```bash
    pnpm install
    ```
3. Ejecutar en modo desarrollo:
    ```bash
    pnpm start:dev
    ```
2. Agrega las siguientes variables a tu `.env`:
   ```env
   APISPORTS_KEY=Pega_AQUI_TU_CLAVE
   AFA_LEAGUE_ID=128
   AFA_SEASON=2021
