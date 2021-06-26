export default class Queue<T>{

    memory: T[];
    size: number;

    constructor(size: number){
        this.memory = [];
        this.size = size;
    }

    add(element: T){
        if(this.memory.length === this.size){
            this.memory.shift();
        }
        this.memory.push(element);
    }

    get(index?: number){
        if(index) return this.memory[index];
        return this.memory;
    }
}