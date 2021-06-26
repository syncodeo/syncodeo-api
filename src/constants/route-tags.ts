export default {
    /**
     * Ajoute la route dans la documentation Swagger
     */
    Documentation: 'api',
    /**
     * Permet de configurer un rate-limit pour la route
     */
    RateLimit: 'rate-limit',
    /**
     * Permet de récupérer l'utilisateur connecté via l'auth JWT
     * Utilisateur disponible sur request.auth.user
     * Si auth === jwt, récupère l'instance de l'utilisateur ou déclenche l'erreur UserNotFound
     * Si auth === false, récupère l'instance de l'utilisateur ou retourne undefined
     */
    CheckUser: 'user',
    /**
     * Permet de vérifier si le compte Youtube de l'utilisateur est lié à Syncodéo
     * Sinon déclenche l'erreur YoutubeAccountNeedToBeLinked
     */
    CheckYoutube: 'youtube'
}