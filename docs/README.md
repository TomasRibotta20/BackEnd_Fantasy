# BackEnd_Fantasy

Este es el repositorio para el backend del trabajo de desarrollo de software

## Requisitos Previos

| Requisito           | Descripción / Valor Necesario   |
|---------------------|-------------------------------|
| Node.js             | v22.16.0                      |
| Gestor de Paquetes  | pnpm v10.11.0                 |
| Git                 | Instalado                     |
| Base de Datos       | MySQL o compatible            |

## Configuración de Variables

Configurar variables de entorno: Duplique el archivo `.env.example` y renómbrelo a `.env`. Luego, rellene cada variable que se especifica dentro del archivo.

### Base de datos

Para las variables de la base de datos se debe tener en cuenta que la base de datos se creará automáticamente al ejecutar el proyecto si el usuario tiene las credenciales correctas. Es decir, solo hace falta definir previamente el nombre de la base de datos y un usuario con persimos para que la app pueda usarlo y conectarse a la base de datos.
### JWT

Se debe definir una clave para cada uno de los tokens de autenticación que existen en la app. También se recomienda que la clave posea más de 50 caracteres y que sea bastante segura. Se recomienda que la clave sea distinta para cada token.

### Correo

La app posee un sistema de envío de mails para recuperar la contraseña de un usuario. Para ello se requiere una cuenta que envíe esos mails a los usuarios. Entonces se debe poner un nombre de gmail de una cuenta existente y una contraseña de aplicación. Esta contraseña debe ser creada por el propietario del mail. Con esta clave es posible acceder a la cuenta de gmail para enviar los mails a los usuarios. En el siguiente link hay un video explicativo de como crear esta contraseña: https://www.youtube.com/watch?v=HV2wcj6oLhs

Es importante aclarar que no es necesario crear la contraseña de aplicacion si no se desea. Si este es el caso entonces la app puede funcionar igualmente. Se deberá usar la consola para poder ver el envio de mails al momento de solicitar recuperar la contraseña.


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
