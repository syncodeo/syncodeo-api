import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CLIENT_REDIRECT_URI } from '../config';

/**
 * Récupère le client OAuth2 préconfiguré
 */
export function getOAuth2Client(){
    return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CLIENT_REDIRECT_URI);
}

// --- DEFAULT --- //
export default {
    getOAuth2Client
}