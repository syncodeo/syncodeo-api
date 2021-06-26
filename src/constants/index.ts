import Difficulty from './difficulty';
import Visibility from './visibility';
import Localizations from './localizations';

export { default as RouteTags } from './route-tags';
export { default as Regex } from './regex';
export { default as Rates } from './rates';
export { default as Errors } from './errors';
export { default as Localizations } from './localizations';
export { default as Difficulty } from './difficulty';
export { default as Visibility } from './visibility';
export { default as Discord } from './discord';
export { default as Events } from './events';
export { default as ElasticSearch } from './elastic-search';
export { default as Token } from './token';

export function getDifficultyValues(){
    return Object.keys(Difficulty).map(key => Difficulty[key]);
}
export function getVisibilityValues(){
    return Object.keys(Visibility).map(key => Visibility[key]);
}
export function getLocalizationValues(){
    return Object.keys(Localizations).map(key => Localizations[key]);
}
export function getFeedbackTypes(){
    return ['message', 'bug', 'feature', 'improvement'];
}