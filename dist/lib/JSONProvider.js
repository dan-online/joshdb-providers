"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONProvider = void 0;
const core_1 = require("@joshdb/core");
const utilities_1 = require("@realware/utilities");
const utilities_2 = require("@sapphire/utilities");
const ChunkHandler_1 = require("./ChunkHandler");
const JSONProviderError_1 = require("./JSONProviderError");
class JSONProvider extends core_1.JoshProvider {
    constructor(options) {
        super(options);
    }
    async init(context) {
        context = await super.init(context);
        const { dataDirectoryName, maxChunkSize, epoch, synchronize, retry } = this.options;
        this._handler = await new ChunkHandler_1.ChunkHandler({
            name: context.name,
            dataDirectoryName,
            maxChunkSize: maxChunkSize ?? 100,
            epoch,
            synchronize,
            retry
        }).init();
        return context;
    }
    async [core_1.Method.AutoKey](payload) {
        await this.handler.queue.wait();
        const index = await this.handler.index.fetch();
        index.autoKeyCount++;
        await this.handler.index.save(index);
        this.handler.queue.shift();
        payload.data = index.autoKeyCount.toString();
        return payload;
    }
    async [core_1.Method.Clear](payload) {
        await this.handler.clear();
        return payload;
    }
    async [core_1.Method.Dec](payload) {
        const { key, path } = payload;
        const { data } = await this.get({ method: core_1.Method.Get, key, path });
        if (data === undefined) {
            payload.error = new JSONProviderError_1.JSONProviderError({
                identifier: JSONProvider.Identifiers.DecMissingData,
                message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')} does not exist.`,
                method: core_1.Method.Dec
            });
            return payload;
        }
        if (typeof data !== 'number') {
            payload.error = new JSONProviderError_1.JSONProviderError({
                identifier: JSONProvider.Identifiers.DecInvalidType,
                message: path.length === 0 ? `The data at "${key}" must be of type "number"` : `The data at "${key}.${path.join('.')}" must be of type "number".`,
                method: core_1.Method.Dec
            });
            return payload;
        }
        await this.set({ method: core_1.Method.Set, key, path, value: data - 1 });
        return payload;
    }
    async [core_1.Method.Delete](payload) {
        const { key, path } = payload;
        if (path.length === 0) {
            await this.handler.delete(key);
            return payload;
        }
        if ((await this.has({ method: core_1.Method.Has, key, path, data: false })).data) {
            const { data } = await this.get({ method: core_1.Method.Get, key, path: [] });
            (0, utilities_1.deleteFromObject)(data, path);
            await this.handler.set(key, data);
            return payload;
        }
        return payload;
    }
    async [core_1.Method.Ensure](payload) {
        const { key } = payload;
        if (!(await this.handler.has(key)))
            await this.handler.set(key, payload.defaultValue);
        Reflect.set(payload, 'data', await this.handler.get(key));
        return payload;
    }
    async [core_1.Method.Every](payload) {
        if ((await this.handler.size()) === 0) {
            payload.data = false;
            return payload;
        }
        if ((0, core_1.isEveryByHookPayload)(payload)) {
            const { hook } = payload;
            for (const value of await this.handler.values()) {
                const everyValue = await hook(value);
                if (everyValue)
                    continue;
                payload.data = false;
            }
        }
        if ((0, core_1.isEveryByValuePayload)(payload)) {
            const { path, value } = payload;
            for (const key of (await this.keys({ method: core_1.Method.Keys, data: [] })).data) {
                const { data } = await this.get({ method: core_1.Method.Get, key, path });
                if (value === data)
                    continue;
                payload.data = false;
            }
        }
        return payload;
    }
    async [core_1.Method.Filter](payload) {
        if ((0, core_1.isFilterByHookPayload)(payload)) {
            const { hook } = payload;
            for (const [key, value] of await this.handler.entries()) {
                const filterValue = await hook(value);
                if (!filterValue)
                    continue;
                payload.data[key] = value;
            }
        }
        if ((0, core_1.isFilterByValuePayload)(payload)) {
            const { path, value } = payload;
            if (!(0, utilities_2.isPrimitive)(value)) {
                payload.error = new JSONProviderError_1.JSONProviderError({
                    identifier: JSONProvider.Identifiers.FilterInvalidValue,
                    message: 'The "value',
                    method: core_1.Method.Filter
                });
                return payload;
            }
            for (const [key, storedValue] of await this.handler.entries())
                if (value === (path.length === 0 ? storedValue : (0, utilities_1.getFromObject)(storedValue, path)))
                    payload.data[key] = storedValue;
        }
        return payload;
    }
    async [core_1.Method.Find](payload) {
        if ((0, core_1.isFindByHookPayload)(payload)) {
            const { hook } = payload;
            for (const value of await this.handler.values()) {
                const foundValue = await hook(value);
                if (!foundValue)
                    continue;
                payload.data = value;
                break;
            }
        }
        if ((0, core_1.isFindByValuePayload)(payload)) {
            const { path, value } = payload;
            if (!(0, utilities_2.isPrimitive)(value)) {
                payload.error = new JSONProviderError_1.JSONProviderError({
                    identifier: JSONProvider.Identifiers.FindInvalidValue,
                    message: 'The "value" must be of type primitive.',
                    method: core_1.Method.Find
                });
                return payload;
            }
            for (const storedValue of await this.handler.values()) {
                if (payload.data !== undefined)
                    break;
                if (value === (path.length === 0 ? storedValue : (0, utilities_1.getFromObject)(storedValue, path)))
                    payload.data = storedValue;
            }
        }
        return payload;
    }
    async [core_1.Method.Get](payload) {
        const { key, path } = payload;
        const value = await this.handler.get(key);
        Reflect.set(payload, 'data', path.length === 0 ? value : (0, utilities_1.getFromObject)(value, path));
        return payload;
    }
    async [core_1.Method.GetAll](payload) {
        for (const [key, value] of await this.handler.entries())
            payload.data[key] = value;
        return payload;
    }
    async [core_1.Method.GetMany](payload) {
        const { keys } = payload;
        for (const key of keys)
            payload.data[key] = (await this.handler.get(key)) ?? null;
        return payload;
    }
    async [core_1.Method.Has](payload) {
        const { key, path } = payload;
        if (await this.handler.has(key)) {
            payload.data = true;
            if (path.length !== 0)
                payload.data = (0, utilities_1.hasFromObject)(await this.handler.get(key), path);
        }
        return payload;
    }
    async [core_1.Method.Inc](payload) {
        const { key, path } = payload;
        const { data } = await this.get({ method: core_1.Method.Get, key, path });
        if (data === undefined) {
            payload.error = new JSONProviderError_1.JSONProviderError({
                identifier: JSONProvider.Identifiers.IncMissingData,
                message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data "${key}.${path.join('.')}" does not exist.`,
                method: core_1.Method.Inc
            });
            return payload;
        }
        if (typeof data !== 'number') {
            payload.error = new JSONProviderError_1.JSONProviderError({
                identifier: JSONProvider.Identifiers.IncInvalidType,
                message: path.length === 0 ? `The data at "${key}" must be of type "number".` : `The data at "${key}.${path.join('.')}" must be of type "number".`,
                method: core_1.Method.Inc
            });
            return payload;
        }
        await this.set({ method: core_1.Method.Set, key, path, value: data + 1 });
        return payload;
    }
    async [core_1.Method.Keys](payload) {
        payload.data = await this.handler.keys();
        return payload;
    }
    async [core_1.Method.Map](payload) {
        if ((0, core_1.isMapByHookPayload)(payload)) {
            const { hook } = payload;
            // @ts-expect-error 2345
            for (const value of await this.handler.values())
                payload.data.push(await hook(value));
        }
        if ((0, core_1.isMapByPathPayload)(payload)) {
            const { path } = payload;
            // @ts-expect-error 2345
            for (const value of await this.handler.values())
                payload.data.push(path.length === 0 ? value : (0, utilities_1.getFromObject)(value, path));
        }
        return payload;
    }
    async [core_1.Method.Math](payload) {
        const { key, path, operator, operand } = payload;
        let { data } = await this.get({ method: core_1.Method.Get, key, path });
        if (data === undefined) {
            payload.error = new JSONProviderError_1.JSONProviderError({
                identifier: JSONProvider.Identifiers.MathMissingData,
                message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                method: core_1.Method.Math
            });
            return payload;
        }
        if (!(0, utilities_2.isNumber)(data)) {
            payload.error = new JSONProviderError_1.JSONProviderError({
                identifier: JSONProvider.Identifiers.MathInvalidType,
                message: path.length === 0 ? `The data at "${key}" must be a number.` : `The data at "${key}.${path.join('.')}" must be a number.`,
                method: core_1.Method.Math
            });
            return payload;
        }
        switch (operator) {
            case core_1.MathOperator.Addition:
                data += operand;
                break;
            case core_1.MathOperator.Subtraction:
                data -= operand;
                break;
            case core_1.MathOperator.Multiplication:
                data *= operand;
                break;
            case core_1.MathOperator.Division:
                data /= operand;
                break;
            case core_1.MathOperator.Remainder:
                data %= operand;
                break;
            case core_1.MathOperator.Exponent:
                data **= operand;
                break;
        }
        await this.set({ method: core_1.Method.Set, key, path, value: data });
        return payload;
    }
    async [core_1.Method.Partition](payload) {
        if ((0, core_1.isPartitionByHookPayload)(payload)) {
            const { hook } = payload;
            for (const [key, value] of await this.handler.entries()) {
                const filterValue = await hook(value);
                if (filterValue)
                    payload.data.truthy[key] = value;
                else
                    payload.data.falsy[key] = value;
            }
        }
        if ((0, core_1.isPartitionByValuePayload)(payload)) {
            const { path, value } = payload;
            if (!(0, utilities_2.isPrimitive)(value)) {
                payload.error = new JSONProviderError_1.JSONProviderError({
                    identifier: JSONProvider.Identifiers.PartitionInvalidValue,
                    message: 'The "value" must be a primitive type.',
                    method: core_1.Method.Partition
                });
                return payload;
            }
            for (const [key, storedValue] of await this.handler.entries())
                if (value === (path.length === 0 ? storedValue : (0, utilities_1.getFromObject)(storedValue, path)))
                    payload.data.truthy[key] = storedValue;
                else
                    payload.data.falsy[key] = storedValue;
        }
        return payload;
    }
    async [core_1.Method.Push](payload) {
        const { key, path, value } = payload;
        const { data } = await this.get({ method: core_1.Method.Get, key, path });
        if (data === undefined) {
            payload.error = new JSONProviderError_1.JSONProviderError({
                identifier: JSONProvider.Identifiers.PushMissingData,
                message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')} does not exist.`,
                method: core_1.Method.Push
            });
            return payload;
        }
        if (!Array.isArray(data)) {
            payload.error = new JSONProviderError_1.JSONProviderError({
                identifier: JSONProvider.Identifiers.PushInvalidType,
                message: path.length === 0 ? `The data at "${key}" must be an array.` : `The data at "${key}.${path.join('.')}" must be an array.`,
                method: core_1.Method.Push
            });
            return payload;
        }
        data.push(value);
        await this.set({ method: core_1.Method.Set, key, path, value: data });
        return payload;
    }
    async [core_1.Method.Random](payload) {
        const values = await this.handler.values();
        Reflect.set(payload, 'data', values[Math.floor(Math.random() * values.length)]);
        return payload;
    }
    async [core_1.Method.RandomKey](payload) {
        const keys = await this.handler.keys();
        payload.data = keys[Math.floor(Math.random() * keys.length)];
        return payload;
    }
    async [core_1.Method.Remove](payload) {
        if ((0, core_1.isRemoveByHookPayload)(payload)) {
            const { key, path, hook } = payload;
            const { data } = await this.get({ method: core_1.Method.Get, key, path });
            if (data === undefined) {
                payload.error = new JSONProviderError_1.JSONProviderError({
                    identifier: JSONProvider.Identifiers.RemoveMissingData,
                    message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                    method: core_1.Method.Remove
                });
                return payload;
            }
            if (!Array.isArray(data)) {
                payload.error = new JSONProviderError_1.JSONProviderError({
                    identifier: JSONProvider.Identifiers.RemoveInvalidType,
                    message: path.length === 0 ? `The data at "${key}" must be an array.` : `The data at "${key}.${path.join('.')}" must be an array.`,
                    method: core_1.Method.Remove
                });
                return payload;
            }
            const filterValues = await Promise.all(data.map(hook));
            await this.set({ method: core_1.Method.Set, key, path, value: data.filter((_, index) => !filterValues[index]) });
        }
        if ((0, core_1.isRemoveByValuePayload)(payload)) {
            const { key, path, value } = payload;
            const { data } = await this.get({ method: core_1.Method.Get, key, path });
            if (data === undefined) {
                payload.error = new JSONProviderError_1.JSONProviderError({
                    identifier: JSONProvider.Identifiers.RemoveMissingData,
                    message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                    method: core_1.Method.Remove
                });
                return payload;
            }
            if (!Array.isArray(data)) {
                payload.error = new JSONProviderError_1.JSONProviderError({
                    identifier: JSONProvider.Identifiers.RemoveInvalidType,
                    message: path.length === 0 ? `The data at "${key}" must be an array.` : `The data at "${key}.${path.join('.')}" must be an array.`,
                    method: core_1.Method.Remove
                });
                return payload;
            }
            await this.set({ method: core_1.Method.Set, key, path, value: data.filter((storedValue) => value !== storedValue) });
        }
        return payload;
    }
    async [core_1.Method.Set](payload) {
        const { key, path, value } = payload;
        if (path.length === 0)
            await this.handler.set(key, value);
        else {
            const storedValue = await this.handler.get(key);
            await this.handler.set(key, (0, utilities_1.setToObject)(storedValue, path, value));
        }
        return payload;
    }
    async [core_1.Method.SetMany](payload) {
        const { keys, value } = payload;
        for (const key of keys)
            await this.handler.set(key, value);
        return payload;
    }
    async [core_1.Method.Size](payload) {
        payload.data = await this.handler.size();
        return payload;
    }
    async [core_1.Method.Some](payload) {
        if ((0, core_1.isSomeByHookPayload)(payload)) {
            const { hook } = payload;
            for (const value of await this.handler.values()) {
                const someValue = await hook(value);
                if (!someValue)
                    continue;
                payload.data = true;
                break;
            }
        }
        if ((0, core_1.isSomeByValuePayload)(payload)) {
            const { path, value } = payload;
            for (const storedValue of await this.handler.values()) {
                if (path.length !== 0 && value !== (0, utilities_1.getFromObject)(storedValue, path))
                    continue;
                if ((0, utilities_2.isPrimitive)(storedValue) && value === storedValue)
                    continue;
                payload.data = true;
            }
        }
        return payload;
    }
    async [core_1.Method.Update](payload) {
        const { key, path, hook } = payload;
        const { data } = await this.get({ method: core_1.Method.Get, key, path });
        if (data === undefined)
            return payload;
        Reflect.set(payload, 'data', await hook(data));
        await this.set({ method: core_1.Method.Set, key, path, value: payload.data });
        return payload;
    }
    async [core_1.Method.Values](payload) {
        payload.data = await this.handler.values();
        return payload;
    }
    get handler() {
        if (this._handler === undefined)
            throw new core_1.JoshError({
                identifier: JSONProvider.Identifiers.ChunkHandlerNotFound,
                message: 'The "ChunkHandler" was not found for this provider. This usually means the "init()" method was not invoked.'
            });
        return this._handler;
    }
}
exports.JSONProvider = JSONProvider;
(function (JSONProvider) {
    let Identifiers;
    (function (Identifiers) {
        Identifiers["ChunkHandlerNotFound"] = "chunkHandlerNotFound";
        Identifiers["DecMissingData"] = "decMissingData";
        Identifiers["DecInvalidType"] = "decInvalidType";
        Identifiers["FilterInvalidValue"] = "filterInvalidValue";
        Identifiers["FindInvalidValue"] = "findInvalidValue";
        Identifiers["IncInvalidType"] = "incInvalidType";
        Identifiers["IncMissingData"] = "incMissingData";
        Identifiers["MathInvalidType"] = "mathInvalidType";
        Identifiers["MathMissingData"] = "mathMissingData";
        Identifiers["PartitionInvalidValue"] = "partitionInvalidValue";
        Identifiers["PushInvalidType"] = "pushInvalidType";
        Identifiers["PushMissingData"] = "pushMissingData";
        Identifiers["RemoveInvalidType"] = "removeInvalidType";
        Identifiers["RemoveMissingData"] = "removeMissingData";
    })(Identifiers = JSONProvider.Identifiers || (JSONProvider.Identifiers = {}));
})(JSONProvider = exports.JSONProvider || (exports.JSONProvider = {}));
//# sourceMappingURL=JSONProvider.js.map