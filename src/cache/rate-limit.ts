import { Policy, PolicyOptions } from "catbox";

import { server } from "../server";
import * as Constants from '../constants/'

export const watchViewsCount = server.cache({
    segment: 'watchviewscount',
    expiresIn: Constants.Rates.watchViewsCount
}) as Policy<boolean, PolicyOptions<boolean>>

export default {
    watchViewsCount
}