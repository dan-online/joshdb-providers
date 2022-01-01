"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoProvider = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@joshdb/core");
const utilities_1 = require("@realware/utilities");
const utilities_2 = require("@sapphire/utilities");
const mongoose_1 = (0, tslib_1.__importDefault)(require("mongoose"));
const uuid_1 = require("uuid");
const MongoDoc_1 = require("./MongoDoc");
const MongoProviderError_1 = require("./MongoProviderError");
class MongoProvider extends core_1.JoshProvider {
    constructor(options) {
        super(options);
    }
    async init(context) {
        context = await super.init(context);
        const { collectionName = this.instance?.name, enforceCollectionName, authentication = MongoProvider.defaultAuthentication } = this.options;
        if (collectionName === undefined)
            throw new core_1.JoshError({
                message: 'A collection name must be provided if using this class without Josh.',
                identifier: MongoProvider.Identifiers.InitMissingCollectionName
            });
        this._collection = (0, MongoDoc_1.generateMongoDoc)(enforceCollectionName ? collectionName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : collectionName);
        if (typeof authentication === 'string')
            this.connectionURI = authentication;
        else {
            const { user, password, dbName, host, port } = {
                user: authentication.user ?? MongoProvider.defaultAuthentication.user,
                password: authentication.password ?? MongoProvider.defaultAuthentication.password,
                dbName: authentication.dbName ?? MongoProvider.defaultAuthentication.dbName,
                host: authentication.host ?? MongoProvider.defaultAuthentication.host,
                port: authentication.port ?? MongoProvider.defaultAuthentication.port
            };
            this.connectionURI = `mongodb://${user?.length && password?.length ? `${user}:${password}@` : ''}${host}:${port}/${dbName}`;
        }
        this._client = await mongoose_1.default.connect(this.connectionURI);
        return context;
    }
    async close() {
        return this.client.disconnect();
    }
    [core_1.Method.AutoKey](payload) {
        payload.data = (0, uuid_1.v4)();
        return payload;
    }
    async [core_1.Method.Clear](payload) {
        await this.collection.deleteMany({});
        return payload;
    }
    async [core_1.Method.Dec](payload) {
        const { key, path } = payload;
        const { data } = await this.get({ key, method: core_1.Method.Get, path });
        if (data === undefined) {
            payload.error = new MongoProviderError_1.MongoProviderError({
                identifier: MongoProvider.Identifiers.DecMissingData,
                message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                method: core_1.Method.Dec
            });
            return payload;
        }
        if (!(0, utilities_2.isNumber)(data)) {
            payload.error = new MongoProviderError_1.MongoProviderError({
                identifier: MongoProvider.Identifiers.DecInvalidType,
                message: path.length === 0 ? `The data at "${key}" must be of type "number".` : `The data at "${key}.${path.join('.')}" must be of type "number".`,
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
            await this.collection.deleteOne({ key });
            return payload;
        }
        if ((await this.has({ method: core_1.Method.Has, key, path, data: false })).data) {
            const { data } = await this.get({ method: core_1.Method.Get, key, path: [] });
            (0, utilities_1.deleteFromObject)(data, path);
            await this.set({ method: core_1.Method.Set, key, path: [], value: data });
            return payload;
        }
        return payload;
    }
    async [core_1.Method.Ensure](payload) {
        const { key } = payload;
        if (!(await this.has({ key, method: core_1.Method.Has, data: false, path: [] })).data)
            await this.set({ key, value: payload.defaultValue, method: core_1.Method.Set, path: [] });
        payload.data = (await this.get({ key, method: core_1.Method.Get, path: [] })).data;
        return payload;
    }
    async [core_1.Method.Every](payload) {
        if ((await this.size({ method: core_1.Method.Size, data: 0 })).data === 0) {
            payload.data = true;
            return payload;
        }
        if ((0, core_1.isEveryByHookPayload)(payload)) {
            const { hook } = payload;
            for (const value of (await this.values({ method: core_1.Method.Values, data: [] })).data) {
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
            for (const [key, value] of Object.entries((await this.getAll({ method: core_1.Method.GetAll, data: {} })).data)) {
                const filterValue = await hook(value);
                if (!filterValue)
                    continue;
                payload.data[key] = value;
            }
        }
        if ((0, core_1.isFilterByValuePayload)(payload)) {
            const { path, value } = payload;
            if (!(0, utilities_2.isPrimitive)(value)) {
                payload.error = new MongoProviderError_1.MongoProviderError({
                    identifier: MongoProvider.Identifiers.FilterInvalidValue,
                    message: 'The "value" must be a primitive type.',
                    method: core_1.Method.Filter
                });
                return payload;
            }
            for (const [key, storedValue] of Object.entries((await this.getAll({ method: core_1.Method.GetAll, data: {} })).data))
                if (value === (path.length === 0 ? storedValue : (0, utilities_1.getFromObject)(storedValue, path)))
                    payload.data[key] = storedValue;
        }
        return payload;
    }
    async [core_1.Method.Find](payload) {
        if ((0, core_1.isFindByHookPayload)(payload)) {
            const { hook } = payload;
            for (const value of (await this.values({ method: core_1.Method.Values, data: [] })).data) {
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
                payload.error = new MongoProviderError_1.MongoProviderError({
                    identifier: MongoProvider.Identifiers.FindInvalidValue,
                    message: 'The "value" must be of type primitive.',
                    method: core_1.Method.Find
                });
                return payload;
            }
            for (const storedValue of (await this.values({ method: core_1.Method.Values, data: [] })).data) {
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
        const doc = await this.collection.findOne({ key });
        if (!doc) {
            payload.data = undefined;
            return payload;
        }
        Reflect.set(payload, 'data', doc.value);
        if (path.length > 0)
            payload.data = (0, utilities_1.getFromObject)(payload.data, path);
        return payload;
    }
    async [core_1.Method.GetAll](payload) {
        const docs = (await this.collection.find({})) || [];
        for (const doc of docs)
            Reflect.set(payload.data, doc.key, doc.value);
        return payload;
    }
    async [core_1.Method.GetMany](payload) {
        const { keys } = payload;
        const docs = (await this.collection.find({ key: { $in: keys } })) || [];
        for (const doc of docs)
            Reflect.set(payload.data, doc.key, doc.value);
        return payload;
    }
    async [core_1.Method.Has](payload) {
        const { key, path } = payload;
        let isThere;
        if (path.length === 0) {
            isThere = await this.collection.exists({ key });
        }
        else {
            isThere = await this.collection.exists({ key, [`value.${path.join('.')}`]: { $exists: true } });
        }
        payload.data = isThere;
        return payload;
    }
    async [core_1.Method.Inc](payload) {
        const { key, path } = payload;
        const { data } = await this.get({ method: core_1.Method.Get, key, path });
        if (data === undefined) {
            payload.error = new MongoProviderError_1.MongoProviderError({
                identifier: MongoProvider.Identifiers.IncMissingData,
                message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                method: core_1.Method.Inc
            });
            return payload;
        }
        if (!(0, utilities_2.isNumber)(data)) {
            payload.error = new MongoProviderError_1.MongoProviderError({
                identifier: MongoProvider.Identifiers.IncInvalidType,
                message: path.length === 0 ? `The data at "${key}" must be of type "number".` : `The data at "${key}.${path.join('.')}" must be of type "number".`,
                method: core_1.Method.Inc
            });
            return payload;
        }
        await this.set({ method: core_1.Method.Set, key, path, value: data + 1 });
        return payload;
    }
    async [core_1.Method.Keys](payload) {
        const docs = (await this.collection.find({})) || [];
        for (const doc of docs)
            payload.data.push(doc.key);
        return payload;
    }
    async [core_1.Method.Map](payload) {
        if ((0, core_1.isMapByHookPayload)(payload)) {
            const { hook } = payload;
            // @ts-expect-error 2345
            for (const value of (await this.values({ method: core_1.Method.Values, data: [] })).data)
                payload.data.push(await hook(value));
        }
        if ((0, core_1.isMapByPathPayload)(payload)) {
            const { path } = payload;
            for (const value of (await this.values({ method: core_1.Method.Values, data: [] })).data)
                payload.data.push((path.length === 0 ? value : (0, utilities_1.getFromObject)(value, path)));
        }
        return payload;
    }
    async [core_1.Method.Math](payload) {
        const { key, path, operator, operand } = payload;
        let { data } = await this.get({ method: core_1.Method.Get, key, path });
        if (data === undefined) {
            payload.error = new MongoProviderError_1.MongoProviderError({
                identifier: MongoProvider.Identifiers.MathMissingData,
                message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                method: core_1.Method.Math
            });
            return payload;
        }
        if (!(0, utilities_2.isNumber)(data)) {
            payload.error = new MongoProviderError_1.MongoProviderError({
                identifier: MongoProvider.Identifiers.MathInvalidType,
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
            for (const [key, value] of Object.entries((await this.getAll({ method: core_1.Method.GetAll, data: {} })).data)) {
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
                payload.error = new MongoProviderError_1.MongoProviderError({
                    identifier: MongoProvider.Identifiers.PartitionInvalidValue,
                    message: 'The "value" must be a primitive type.',
                    method: core_1.Method.Partition
                });
                return payload;
            }
            for (const [key, storedValue] of Object.entries((await this.getAll({ method: core_1.Method.GetAll, data: {} })).data))
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
            payload.error = new MongoProviderError_1.MongoProviderError({
                identifier: MongoProvider.Identifiers.PushMissingData,
                message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                method: core_1.Method.Push
            });
            return payload;
        }
        if (!Array.isArray(data)) {
            payload.error = new MongoProviderError_1.MongoProviderError({
                identifier: MongoProvider.Identifiers.PushInvalidType,
                message: path.length === 0 ? `The data at "${key}" must be an array.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                method: core_1.Method.Push
            });
            return payload;
        }
        data.push(value);
        await this.set({ method: core_1.Method.Set, key, path, value: data });
        return payload;
    }
    async [core_1.Method.Random](payload) {
        const docs = (await this.collection.aggregate([{ $sample: { size: 1 } }])) || [];
        payload.data = docs.length > 0 ? docs[0].value : undefined;
        return payload;
    }
    async [core_1.Method.RandomKey](payload) {
        const docs = (await this.collection.aggregate([{ $sample: { size: 1 } }])) || [];
        payload.data = docs.length > 0 ? docs[0].key : undefined;
        return payload;
    }
    async [core_1.Method.Remove](payload) {
        if ((0, core_1.isRemoveByHookPayload)(payload)) {
            const { key, path, hook } = payload;
            const { data } = await this.get({ method: core_1.Method.Get, key, path });
            if (data === undefined) {
                payload.error = new MongoProviderError_1.MongoProviderError({
                    identifier: MongoProvider.Identifiers.RemoveMissingData,
                    message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                    method: core_1.Method.Remove
                });
                return payload;
            }
            if (!Array.isArray(data)) {
                payload.error = new MongoProviderError_1.MongoProviderError({
                    identifier: MongoProvider.Identifiers.RemoveInvalidType,
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
                payload.error = new MongoProviderError_1.MongoProviderError({
                    identifier: MongoProvider.Identifiers.RemoveMissingData,
                    message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                    method: core_1.Method.Remove
                });
                return payload;
            }
            if (!Array.isArray(data)) {
                payload.error = new MongoProviderError_1.MongoProviderError({
                    identifier: MongoProvider.Identifiers.RemoveInvalidType,
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
        await this.collection.findOneAndUpdate({
            key: { $eq: key }
        }, {
            $set: { [`${path.length > 0 ? `value.${path.join('.')}` : 'value'}`]: value }
        }, {
            upsert: true
        });
        return payload;
    }
    async [core_1.Method.SetMany](payload) {
        const { keys, value } = payload;
        for (const key of keys)
            await this.set({ key, value, path: [], method: core_1.Method.Set });
        return payload;
    }
    async [core_1.Method.Size](payload) {
        payload.data = (await this.collection.countDocuments({})) ?? payload.data;
        return payload;
    }
    async [core_1.Method.Some](payload) {
        if ((0, core_1.isSomeByHookPayload)(payload)) {
            const { hook } = payload;
            for (const value of (await this.values({ method: core_1.Method.Values, data: [] })).data) {
                const someValue = await hook(value);
                if (!someValue)
                    continue;
                payload.data = true;
                break;
            }
        }
        if ((0, core_1.isSomeByValuePayload)(payload)) {
            const { path, value } = payload;
            for (const storedValue of (await this.values({ method: core_1.Method.Values, data: [] })).data) {
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
        const docs = (await this.collection.find({})) || [];
        // @ts-expect-error 2345
        for (const doc of docs)
            payload.data.push(doc.value);
        return payload;
    }
    get client() {
        if ((0, utilities_2.isNullOrUndefined)(this._client))
            throw new core_1.JoshError({
                message: 'Client is not connected, most likely due to `init` not being called.',
                identifier: MongoProvider.Identifiers.NotConnected
            });
        return this._client;
    }
    get collection() {
        if ((0, utilities_2.isNullOrUndefined)(this._collection))
            throw new core_1.JoshError({
                message: 'Client is not connected, most likely due to `init` not being called.',
                identifier: MongoProvider.Identifiers.NotConnected
            });
        return this._collection;
    }
}
exports.MongoProvider = MongoProvider;
MongoProvider.defaultAuthentication = { dbName: 'josh', host: 'localhost', port: 27017 };
(function (MongoProvider) {
    let Identifiers;
    (function (Identifiers) {
        Identifiers["DecInvalidType"] = "decInvalidType";
        Identifiers["DecMissingData"] = "decMissingData";
        Identifiers["FilterInvalidValue"] = "filterInvalidValue";
        Identifiers["FindInvalidValue"] = "findInvalidValue";
        Identifiers["IncInvalidType"] = "incInvalidType";
        Identifiers["IncMissingData"] = "incMissingData";
        Identifiers["InitMissingCollectionName"] = "initMissingCollectionName";
        Identifiers["NotConnected"] = "notConnected";
        Identifiers["MathInvalidType"] = "mathInvalidType";
        Identifiers["MathMissingData"] = "mathMissingData";
        Identifiers["PartitionInvalidValue"] = "partitionInvalidValue";
        Identifiers["PushInvalidType"] = "pushInvalidType";
        Identifiers["PushMissingData"] = "pushMissingData";
        Identifiers["RemoveInvalidType"] = "removeInvalidType";
        Identifiers["RemoveMissingData"] = "removeMissingData";
    })(Identifiers = MongoProvider.Identifiers || (MongoProvider.Identifiers = {}));
})(MongoProvider = exports.MongoProvider || (exports.MongoProvider = {}));
//# sourceMappingURL=MongoProvider.js.map