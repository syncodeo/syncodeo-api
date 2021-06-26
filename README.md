# API Syncodeo !

## 1. Environnement

Voici les variables d'environnement nécessaire pour l'API

| Variable               | Description   | Exemple | Défaut |
| ---------------------- |:------------- |:------- |:------ |
| **Serveur**            |               |         |        |
| *SERVER_HOST*          | API listening IP | 0.0.0.0 | localhost |
| *SERVER_PORT*          | API listening port | 1337    | 1337   |
| **Base de données**    |               |         |        |
| *DB_HOST*              | MySQL server host | localhost | localhost |
| *DB_PORT*              | MySQL server port | 1234    | 3306   |
| *DB_DATABASE*          | MySQL server database name (should exists) | syncodeo | syncodeo |
| *DB_USER*              | MySQL server username | root | root |
| *DB_PASS*              | MySQL server password | root |      |
| *DB_MIGRATION*         | Migration type (**DROP** delete everything on startup, **SAFE** does not affect data) | SAFE | SAFE |
| **Redis**              |               |         |        |
| *REDIS_HOST*           | Redis server host | localhost | localhost |
| *REDIS_PORT*           | Redis server port | 1234    | 9200   |
| **Elastic Search**     |               |         |        |
| *ELASTIC_SEARCH_HOST*  | Elastic Search server host | localhost | localhost |
| *ELASTIC_SEARCH_PORT*  | Elastic Search server port | 1234 | 9200 |
| **Environnement**      |               |         |        |
| *ENV*                  | API Environment (**PROD**, **DEV**, **TEST**) | PROD | PROD |
| **Google API**         |               |         |        |
| *GOOGLE_CLIENT_ID*     | Google Oauth 2.0 client ID |   |        |
| *GOOGLE_CLIENT_SECRET* | Google Oauth 2.0 client secret |      |        |
| *GOOGLE_CLIENT_REDIRECT_URI* | Google Oauth 2.0 client redirect URL | http://localhost:3000 | |
| **JWT**                |               |         |        |
| *ACCESS_TOKEN_SECRET*  | JWT access token secret | o9ir6nPd4ds0 | |
| *REFRESH_TOKEN_SECRET* | JWT refresh token secret | p7h9SB5gD48kh | |
| **Discord**            |               |         |        |
| *DISCORD_WEBHOOK_URL_MESSAGES* | Webhooks URL for messages channel | https://discordapp.com/api/webhooks/CHANNEL_ID/HOOK_ID | |
| *DISCORD_WEBHOOK_URL_BUG_REPORTS* | Webhooks URL for bug reports channel | https://discordapp.com/api/webhooks/CHANNEL_ID/HOOK_ID | |
| *DISCORD_WEBHOOK_URL_IMPROVEMENTS* | Webhooks URL for improvements channel | https://discordapp.com/api/webhooks/CHANNEL_ID/HOOK_ID | |
| *DISCORD_WEBHOOK_URL_FEATURES* | Webhooks URL for features channel | https://discordapp.com/api/webhooks/CHANNEL_ID/HOOK_ID | |
| *DISCORD_WEBHOOK_URL_LOGS* | Webhooks URL for logs channel | https://discordapp.com/api/webhooks/CHANNEL_ID/HOOK_ID | |
| *DISCORD_WEBHOOK_URL_INTERNAL_ERRORS* | Webhooks URL for internal errors channel | https://discordapp.com/api/webhooks/CHANNEL_ID/HOOK_ID | |
| **HTTPS**              |               |         |        |
| *HTTPS_ENABLED*        | Enable HTTPS | TRUE | FALSE |
| *HTTPS_KEY*            | Absolute path to SSL private key (privkey.pem) | /home/privkey.pem | |
| *HTTPS_CERT*           | Absolute path to SSL certificate (fullchain.pem) | /home/fullchain.pem | |
| **SOCKET.IO**          |               |         |        |
| *SOCKET_IO_PORT*       | Socket.IO port | 1234 | 1338  |
| **PROXY**              |               |         |        |
| *PROXY*                | Is API behind reverse proxy ? | TRUE | FALSE |
| **Others**             |               |         |        |
| *SITE_URL*             | Front app URL | localhost | https://syncodeo.io |
| **Secret Routes**      |               |         |        |
| *SECRET_ROUTE_USERNAME* | Metrics / Debug routes basic auth username | user | *generated* |
| *SECRET_ROUTE_PASSWORD* | Metrics / Debug routes basic auth password | pass | *generated* |
| **Tests**              |               |         |        |
| *TESTS_URL*            | URL de l'API à tester | |        |
| *TESTS_GOOGLE_TOKEN*   | id_token de connexion Google, accessible en échangeant le code d'authorisation (scope: profile email) | | |
| *TESTS_GOOGLE_CODE_1*  | Premier code d'authorisation Google (scope: https://www.googleapis.com/auth/youtube.readonly) | | |
| *TESTS_GOOGLE_CODE_2*  | Second code d'authorisation Google (scope: https://www.googleapis.com/auth/youtube.readonly) | | |
| *TESTS_CHANNEL_ID*     | Channel ID du compte Youtube connecté dans les tests | | |
| *TESTS_VIDEO_ID*       | Video ID d'une vidéo du compte Youtube connecté dans les tests, nécessite d'être dans les 50 uploads les plus récents | | |

### *ENV*

Les Rate-Limits peuvent ne s'appliquer que sur certains environnements, de plus :   

* PROD
    - Caching de swagger.json pour une durée plus longue
* DEV
    - Nothing
* TEST
    - Disponibilité des routes de test
    - Les vidéos récemments modifiées ne sont pas cache.

## 2. Tests

Voici la démarche à suivre pour lancer les tests

1. Définir la bonne base de données de tests dans les variables d'environnement.
2. Passer la variable d'environnement ENV à TEST
3. Lancer l'API.   
    ```
        npm start
    ```
4. Démarrer les tests.   
    ```
        npm test
    ```

Les tests nécessitant des appels à l'API Google et Youtube sont activés seulement si la variable d'environnement *TESTS_GOOGLE_TOKEN* est définie.

### Couverture du code

Il est possible de connaitre la couverture du code des tests en remplacant l'étape 2 par la commande suivante :   
```
    npm run start-coverage
```

À la fin des tests, il suffit de lancer la commande suivante pour obtenir le rapport de la couverture du code des tests :   
```
    npm run report
```