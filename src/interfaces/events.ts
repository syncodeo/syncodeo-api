import { VideoInstance } from "../models/Video";
import { UserInstance } from "../models/User";

interface Event{
    date: Date;
}

// ----------
// Internal Errors
// ----------
export interface IEventInternalError extends Event{
    message: string;
    route: string;
}

// ----------
// Logs
// ----------
export interface IEventNewUser extends Event{
    name: string;
}

export interface IEventNewVideo extends Event{
    video: VideoInstance;
    user: UserInstance;
}

// ----------
// Feedbacks
// ----------
export interface IEventFeedback extends Event{
    page: string;
    message: string;
    user: UserInstance;
}