import { UserInstance } from "../models/User";
import { VideoInstance } from "../models/Video";

/**
 * Type des données envoyées au client
 */
export interface EventData{
    type: 'ADD_VIDEO' | 'UPDATE_VIDEO' | 'ADD_CODE' | 'UPDATE_CODE';
    user: string;
    thumbnail: string;
    video: string;
    date: Date;
}

/**
 * Paramètres pour ajouter un nouvel event
 */
export interface SendRealtimeDataType{
    type: EventData['type'];
    user: UserInstance;
    video: VideoInstance;
}