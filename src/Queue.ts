import { EventEmitter } from "node:events";

class Queue extends EventEmitter {
    #queue: any[];

    constructor() {
        super();
        this.#queue = [];
    }

    add (job: any): string {
        // TODO: create ID
        this.#queue.push(job)
        // TODO: notify worker
        return "";
    }


}

export default Queue;
