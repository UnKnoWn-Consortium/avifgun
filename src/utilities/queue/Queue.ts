import { EventEmitter } from "node:events";

import Worker from "./Worker.js";
import Job from "./Job.js";

import { v4 as uuidv4 } from "uuid";


class Queue extends EventEmitter {
    #jobs: Job[];
    #idleWorkers: Worker[];
    #busyWorkers: Worker[];

    constructor() {
        super();
        this.#jobs = [];
        this.#idleWorkers = [];
        this.#busyWorkers = [];
    }

    join (worker: Worker) {
        this.#idleWorkers.push(worker);
        // TODO: add event listeners
        // TODO: check if there is any job to assign
    }

    async quit (worker: Worker) {

    }

    add (job: Job): string {
        // TODO: create ID
        uuidv4();
        this.#jobs.push(job)
        // TODO: assign job to idle worker
        return "";
    }

    get workers (): Worker[] {
        return this.#idleWorkers.concat(this.#busyWorkers);
    }


}

export default Queue;
