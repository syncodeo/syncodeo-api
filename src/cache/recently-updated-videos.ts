import * as Constants from '../constants/';
import { server } from '../server';
import { PolicyOptions, Policy } from 'catbox';

export default server.cache({
    segment: 'recently-updated-videos',
    expiresIn: Constants.Rates.recentlyUpdatedVideosRate
}) as Policy<string[], PolicyOptions<string[]>>;