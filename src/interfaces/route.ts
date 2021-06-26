import { Util, Lifecycle, RouteOptions} from 'hapi';

export interface ICreateRoute{
    method: Util.HTTP_METHODS_PARTIAL_LOWERCASE,
    path: string,
    handler: Lifecycle.Method,
    options?: RouteOptions
}