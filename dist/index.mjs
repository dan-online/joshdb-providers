import mongoose, { Schema } from 'mongoose';
import { JoshProviderError, JoshProvider, JoshError, Method, isEveryByHookPayload, isEveryByValuePayload, isFilterByHookPayload, isFilterByValuePayload, isFindByHookPayload, isFindByValuePayload, isMapByHookPayload, isMapByPathPayload, MathOperator, isPartitionByHookPayload, isPartitionByValuePayload, isRemoveByHookPayload, isRemoveByValuePayload, isSomeByHookPayload, isSomeByValuePayload } from '@joshdb/core';
import { deleteFromObject, getFromObject } from '@realware/utilities';
import { isNumber, isPrimitive, isNullOrUndefined } from '@sapphire/utilities';

const MongoDocSchema = new Schema({
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true }
});

function generateMongoDoc(collectionName) {
    return mongoose.model('MongoDoc', MongoDocSchema, collectionName);
}

class MongoProviderError extends JoshProviderError {
    /**
     * The name for this error.
     */
    get name() {
        return 'MongoProviderError';
    }
}

class MongoProvider extends JoshProvider {
    constructor(options) {
        super(options);
    }
    async init(context) {
        context = await super.init(context);
        const { collectionName = context.name, enforceCollectionName, authentication = MongoProvider.defaultAuthentication } = this.options;
        if (collectionName === undefined)
            throw new JoshError({
                message: 'A collection name must be provided if using this class without Josh.',
                identifier: MongoProvider.Identifiers.InitMissingCollectionName
            });
        this._collection = generateMongoDoc(enforceCollectionName ? collectionName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : collectionName);
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
        this._client = await mongoose.connect(this.connectionURI);
        return context;
    }
    async close() {
        return this.client.disconnect();
    }
    [Method.AutoKey](payload) {
        payload.data = new mongoose.Types.ObjectId().toString();
        return payload;
    }
    async [Method.Clear](payload) {
        await this.collection.deleteMany({});
        return payload;
    }
    async [Method.Dec](payload) {
        const { key, path } = payload;
        const { data } = await this.get({ key, method: Method.Get, path });
        if (data === undefined) {
            payload.error = new MongoProviderError({
                identifier: MongoProvider.CommonIdentifiers.DecMissingData,
                message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                method: Method.Dec
            });
            return payload;
        }
        if (!isNumber(data)) {
            payload.error = new MongoProviderError({
                identifier: MongoProvider.CommonIdentifiers.DecInvalidType,
                message: path.length === 0 ? `The data at "${key}" must be of type "number".` : `The data at "${key}.${path.join('.')}" must be of type "number".`,
                method: Method.Dec
            });
            return payload;
        }
        await this.set({ method: Method.Set, key, path, value: data - 1 });
        return payload;
    }
    async [Method.Delete](payload) {
        const { key, path } = payload;
        if (path.length === 0) {
            await this.collection.deleteOne({ key });
            return payload;
        }
        if ((await this.has({ method: Method.Has, key, path, data: false })).data) {
            const { data } = await this.get({ method: Method.Get, key, path: [] });
            deleteFromObject(data, path);
            await this.set({ method: Method.Set, key, path: [], value: data });
            return payload;
        }
        return payload;
    }
    async [Method.Ensure](payload) {
        const { key } = payload;
        if (!(await this.has({ key, method: Method.Has, data: false, path: [] })).data)
            await this.set({ key, value: payload.defaultValue, method: Method.Set, path: [] });
        payload.data = (await this.get({ key, method: Method.Get, path: [] })).data;
        return payload;
    }
    async [Method.Every](payload) {
        if ((await this.size({ method: Method.Size, data: 0 })).data === 0) {
            payload.data = true;
            return payload;
        }
        if (isEveryByHookPayload(payload)) {
            const { hook } = payload;
            for (const value of (await this.values({ method: Method.Values, data: [] })).data) {
                const everyValue = await hook(value);
                if (everyValue)
                    continue;
                payload.data = false;
            }
        }
        if (isEveryByValuePayload(payload)) {
            const { path, value } = payload;
            for (const key of (await this.keys({ method: Method.Keys, data: [] })).data) {
                const { data } = await this.get({ method: Method.Get, key, path });
                if (value === data)
                    continue;
                payload.data = false;
            }
        }
        return payload;
    }
    async [Method.Filter](payload) {
        if (isFilterByHookPayload(payload)) {
            const { hook } = payload;
            for (const [key, value] of Object.entries((await this.getAll({ method: Method.GetAll, data: {} })).data)) {
                const filterValue = await hook(value);
                if (!filterValue)
                    continue;
                payload.data[key] = value;
            }
        }
        if (isFilterByValuePayload(payload)) {
            const { path, value } = payload;
            if (!isPrimitive(value)) {
                payload.error = new MongoProviderError({
                    identifier: MongoProvider.CommonIdentifiers.FilterInvalidValue,
                    message: 'The "value" must be a primitive type.',
                    method: Method.Filter
                });
                return payload;
            }
            for (const [key, storedValue] of Object.entries((await this.getAll({ method: Method.GetAll, data: {} })).data))
                if (value === (path.length === 0 ? storedValue : getFromObject(storedValue, path)))
                    payload.data[key] = storedValue;
        }
        return payload;
    }
    async [Method.Find](payload) {
        if (isFindByHookPayload(payload)) {
            const { hook } = payload;
            for (const value of (await this.values({ method: Method.Values, data: [] })).data) {
                const foundValue = await hook(value);
                if (!foundValue)
                    continue;
                payload.data = value;
                break;
            }
        }
        if (isFindByValuePayload(payload)) {
            const { path, value } = payload;
            if (!isPrimitive(value)) {
                payload.error = new MongoProviderError({
                    identifier: MongoProvider.CommonIdentifiers.FindInvalidValue,
                    message: 'The "value" must be of type primitive.',
                    method: Method.Find
                });
                return payload;
            }
            for (const storedValue of (await this.values({ method: Method.Values, data: [] })).data) {
                if (payload.data !== undefined)
                    break;
                if (value === (path.length === 0 ? storedValue : getFromObject(storedValue, path)))
                    payload.data = storedValue;
            }
        }
        return payload;
    }
    async [Method.Get](payload) {
        const { key, path } = payload;
        const doc = await this.collection.findOne({ key });
        if (!doc) {
            payload.data = undefined;
            return payload;
        }
        Reflect.set(payload, 'data', doc.value);
        if (path.length > 0)
            payload.data = getFromObject(payload.data, path);
        return payload;
    }
    async [Method.GetAll](payload) {
        const docs = (await this.collection.find({})) || [];
        for (const doc of docs)
            Reflect.set(payload.data, doc.key, doc.value);
        return payload;
    }
    async [Method.GetMany](payload) {
        const { keys } = payload;
        const docs = (await this.collection.find({ key: { $in: keys } })) || [];
        for (const doc of docs)
            Reflect.set(payload.data, doc.key, doc.value);
        return payload;
    }
    async [Method.Has](payload) {
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
    async [Method.Inc](payload) {
        const { key, path } = payload;
        const { data } = await this.get({ method: Method.Get, key, path });
        if (data === undefined) {
            payload.error = new MongoProviderError({
                identifier: MongoProvider.CommonIdentifiers.IncMissingData,
                message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                method: Method.Inc
            });
            return payload;
        }
        if (!isNumber(data)) {
            payload.error = new MongoProviderError({
                identifier: MongoProvider.CommonIdentifiers.IncInvalidType,
                message: path.length === 0 ? `The data at "${key}" must be of type "number".` : `The data at "${key}.${path.join('.')}" must be of type "number".`,
                method: Method.Inc
            });
            return payload;
        }
        await this.set({ method: Method.Set, key, path, value: data + 1 });
        return payload;
    }
    async [Method.Keys](payload) {
        const docs = (await this.collection.find({})) || [];
        for (const doc of docs)
            payload.data.push(doc.key);
        return payload;
    }
    async [Method.Map](payload) {
        if (isMapByHookPayload(payload)) {
            const { hook } = payload;
            // @ts-expect-error 2345
            for (const value of (await this.values({ method: Method.Values, data: [] })).data)
                payload.data.push(await hook(value));
        }
        if (isMapByPathPayload(payload)) {
            const { path } = payload;
            for (const value of (await this.values({ method: Method.Values, data: [] })).data)
                payload.data.push((path.length === 0 ? value : getFromObject(value, path)));
        }
        return payload;
    }
    async [Method.Math](payload) {
        const { key, path, operator, operand } = payload;
        let { data } = await this.get({ method: Method.Get, key, path });
        if (data === undefined) {
            payload.error = new MongoProviderError({
                identifier: MongoProvider.CommonIdentifiers.MathMissingData,
                message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                method: Method.Math
            });
            return payload;
        }
        if (!isNumber(data)) {
            payload.error = new MongoProviderError({
                identifier: MongoProvider.CommonIdentifiers.MathInvalidType,
                message: path.length === 0 ? `The data at "${key}" must be a number.` : `The data at "${key}.${path.join('.')}" must be a number.`,
                method: Method.Math
            });
            return payload;
        }
        switch (operator) {
            case MathOperator.Addition:
                data += operand;
                break;
            case MathOperator.Subtraction:
                data -= operand;
                break;
            case MathOperator.Multiplication:
                data *= operand;
                break;
            case MathOperator.Division:
                data /= operand;
                break;
            case MathOperator.Remainder:
                data %= operand;
                break;
            case MathOperator.Exponent:
                data **= operand;
                break;
        }
        await this.set({ method: Method.Set, key, path, value: data });
        return payload;
    }
    async [Method.Partition](payload) {
        if (isPartitionByHookPayload(payload)) {
            const { hook } = payload;
            for (const [key, value] of Object.entries((await this.getAll({ method: Method.GetAll, data: {} })).data)) {
                const filterValue = await hook(value);
                if (filterValue)
                    payload.data.truthy[key] = value;
                else
                    payload.data.falsy[key] = value;
            }
        }
        if (isPartitionByValuePayload(payload)) {
            const { path, value } = payload;
            if (!isPrimitive(value)) {
                payload.error = new MongoProviderError({
                    identifier: MongoProvider.CommonIdentifiers.PartitionInvalidValue,
                    message: 'The "value" must be a primitive type.',
                    method: Method.Partition
                });
                return payload;
            }
            for (const [key, storedValue] of Object.entries((await this.getAll({ method: Method.GetAll, data: {} })).data))
                if (value === (path.length === 0 ? storedValue : getFromObject(storedValue, path)))
                    payload.data.truthy[key] = storedValue;
                else
                    payload.data.falsy[key] = storedValue;
        }
        return payload;
    }
    async [Method.Push](payload) {
        const { key, path, value } = payload;
        const { data } = await this.get({ method: Method.Get, key, path });
        if (data === undefined) {
            payload.error = new MongoProviderError({
                identifier: MongoProvider.CommonIdentifiers.PushMissingData,
                message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                method: Method.Push
            });
            return payload;
        }
        if (!Array.isArray(data)) {
            payload.error = new MongoProviderError({
                identifier: MongoProvider.CommonIdentifiers.PushInvalidType,
                message: path.length === 0 ? `The data at "${key}" must be an array.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                method: Method.Push
            });
            return payload;
        }
        data.push(value);
        await this.set({ method: Method.Set, key, path, value: data });
        return payload;
    }
    async [Method.Random](payload) {
        const docs = (await this.collection.aggregate([{ $sample: { size: 1 } }])) || [];
        payload.data = docs.length > 0 ? docs[0].value : undefined;
        return payload;
    }
    async [Method.RandomKey](payload) {
        const docs = (await this.collection.aggregate([{ $sample: { size: 1 } }])) || [];
        payload.data = docs.length > 0 ? docs[0].key : undefined;
        return payload;
    }
    async [Method.Remove](payload) {
        if (isRemoveByHookPayload(payload)) {
            const { key, path, hook } = payload;
            const { data } = await this.get({ method: Method.Get, key, path });
            if (data === undefined) {
                payload.error = new MongoProviderError({
                    identifier: MongoProvider.CommonIdentifiers.RemoveMissingData,
                    message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                    method: Method.Remove
                });
                return payload;
            }
            if (!Array.isArray(data)) {
                payload.error = new MongoProviderError({
                    identifier: MongoProvider.CommonIdentifiers.RemoveInvalidType,
                    message: path.length === 0 ? `The data at "${key}" must be an array.` : `The data at "${key}.${path.join('.')}" must be an array.`,
                    method: Method.Remove
                });
                return payload;
            }
            const filterValues = await Promise.all(data.map(hook));
            await this.set({ method: Method.Set, key, path, value: data.filter((_, index) => !filterValues[index]) });
        }
        if (isRemoveByValuePayload(payload)) {
            const { key, path, value } = payload;
            const { data } = await this.get({ method: Method.Get, key, path });
            if (data === undefined) {
                payload.error = new MongoProviderError({
                    identifier: MongoProvider.CommonIdentifiers.RemoveMissingData,
                    message: path.length === 0 ? `The data at "${key}" does not exist.` : `The data at "${key}.${path.join('.')}" does not exist.`,
                    method: Method.Remove
                });
                return payload;
            }
            if (!Array.isArray(data)) {
                payload.error = new MongoProviderError({
                    identifier: MongoProvider.CommonIdentifiers.RemoveInvalidType,
                    message: path.length === 0 ? `The data at "${key}" must be an array.` : `The data at "${key}.${path.join('.')}" must be an array.`,
                    method: Method.Remove
                });
                return payload;
            }
            await this.set({ method: Method.Set, key, path, value: data.filter((storedValue) => value !== storedValue) });
        }
        return payload;
    }
    async [Method.Set](payload) {
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
    async [Method.SetMany](payload) {
        const { data } = payload;
        for (const [{ key, path }, value] of data)
            await this.set({ method: Method.Set, key, path, value });
        return payload;
    }
    async [Method.Size](payload) {
        payload.data = (await this.collection.countDocuments({})) ?? payload.data;
        return payload;
    }
    async [Method.Some](payload) {
        if (isSomeByHookPayload(payload)) {
            const { hook } = payload;
            for (const value of (await this.values({ method: Method.Values, data: [] })).data) {
                const someValue = await hook(value);
                if (!someValue)
                    continue;
                payload.data = true;
                break;
            }
        }
        if (isSomeByValuePayload(payload)) {
            const { path, value } = payload;
            for (const storedValue of (await this.values({ method: Method.Values, data: [] })).data) {
                if (path.length !== 0 && value !== getFromObject(storedValue, path))
                    continue;
                if (isPrimitive(storedValue) && value === storedValue)
                    continue;
                payload.data = true;
            }
        }
        return payload;
    }
    async [Method.Update](payload) {
        const { key, path, hook } = payload;
        const { data } = await this.get({ method: Method.Get, key, path });
        if (data === undefined)
            return payload;
        Reflect.set(payload, 'data', await hook(data));
        await this.set({ method: Method.Set, key, path, value: payload.data });
        return payload;
    }
    async [Method.Values](payload) {
        const docs = (await this.collection.find({})) || [];
        // @ts-expect-error 2345
        for (const doc of docs)
            payload.data.push(doc.value);
        return payload;
    }
    get client() {
        if (isNullOrUndefined(this._client))
            throw new JoshError({
                message: 'Client is not connected, most likely due to `init` not being called.',
                identifier: MongoProvider.Identifiers.NotConnected
            });
        return this._client;
    }
    get collection() {
        if (isNullOrUndefined(this._collection))
            throw new JoshError({
                message: 'Client is not connected, most likely due to `init` not being called.',
                identifier: MongoProvider.Identifiers.NotConnected
            });
        return this._collection;
    }
}
MongoProvider.defaultAuthentication = { dbName: 'josh', host: 'localhost', port: 27017 };
(function (MongoProvider) {
    (function (Identifiers) {
        Identifiers["InitMissingCollectionName"] = "initMissingCollectionName";
        Identifiers["NotConnected"] = "notConnected";
    })(MongoProvider.Identifiers || (MongoProvider.Identifiers = {}));
})(MongoProvider || (MongoProvider = {}));

const version = '[VI]{version}[/VI]';

export { MongoDocSchema, MongoProvider, MongoProviderError, generateMongoDoc, version };
//# sourceMappingURL=index.mjs.map
