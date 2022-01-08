"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.File = void 0;
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const promises_2 = require("timers/promises");
class File {
    constructor(options) {
        this.options = options;
        const { directory, name } = options;
        this.path = (0, path_1.resolve)(directory, name);
    }
    async read() {
        return this.attempt(async () => JSON.parse(await (0, promises_1.readFile)(this.path, { encoding: 'utf-8' })));
    }
    async write(data) {
        await this.attempt(() => (0, promises_1.writeFile)(this.path, JSON.stringify(data)));
    }
    async copy(to) {
        await this.attempt(() => (0, promises_1.copyFile)(this.path, to));
    }
    async rename(to) {
        await this.attempt(() => (0, promises_1.rename)(this.path, to));
    }
    async delete() {
        await this.attempt(() => (0, promises_1.rm)(this.path));
    }
    async attempt(callback, retry = this.retryOptions) {
        try {
            return callback();
        }
        catch {
            if (retry.attempts === 0)
                throw new Error('TODO');
            return (0, promises_2.setTimeout)(retry.delay, this.attempt(callback, { ...retry, attempts: retry.attempts - 1 }));
        }
    }
    get retryOptions() {
        return this.options.retry ?? File.defaultRetryOptions;
    }
    get exists() {
        return (0, fs_1.existsSync)(this.path);
    }
}
exports.File = File;
File.defaultRetryOptions = { delay: 100, attempts: 10 };
//# sourceMappingURL=File.js.map