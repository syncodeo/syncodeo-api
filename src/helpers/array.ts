/**
 * Transforme un tableau en un objet indexé (début à 1)
 * @example arrayToIndexedObject(['a', 'b']) returns {1: 'a', 2: 'b'}
 */
export function arrayToIndexedObject(array: any[]){
    let obj: any = {};
    for(let i = 0; i < array.length; i++){
        obj[i+1] = array[i];
    }
    return obj;
}

// --- DEFAULT --- //
export default {
    arrayToIndexedObject
}