import { AutoKeyPayload, ClearPayload, DecPayload, DeletePayload, EnsurePayload, EveryByHookPayload, EveryByValuePayload, FilterByHookPayload, FilterByValuePayload, FindByHookPayload, FindByValuePayload, GetAllPayload, GetManyPayload, GetPayload, HasPayload, IncPayload, JoshProvider, KeysPayload, MapByHookPayload, MapByPathPayload, MathPayload, Method, PartitionByHookPayload, PartitionByValuePayload, PushPayload, RandomKeyPayload, RandomPayload, RemoveByHookPayload, RemoveByValuePayload, SetManyPayload, SetPayload, SizePayload, SomeByHookPayload, SomeByValuePayload, UpdatePayload, ValuesPayload } from '@joshdb/core';
export declare class MongoProvider<StoredValue = unknown> extends JoshProvider<StoredValue> {
    options: MongoProvider.Options;
    private connectionURI?;
    private _client?;
    private _collection?;
    constructor(options: MongoProvider.Options);
    init(context: JoshProvider.Context<StoredValue>): Promise<JoshProvider.Context<StoredValue>>;
    close(): Promise<void>;
    [Method.AutoKey](payload: AutoKeyPayload): AutoKeyPayload;
    [Method.Clear](payload: ClearPayload): Promise<ClearPayload>;
    [Method.Dec](payload: DecPayload): Promise<DecPayload>;
    [Method.Delete](payload: DeletePayload): Promise<DeletePayload>;
    [Method.Ensure](payload: EnsurePayload<StoredValue>): Promise<EnsurePayload<StoredValue>>;
    [Method.Every](payload: EveryByHookPayload<StoredValue>): Promise<EveryByHookPayload<StoredValue>>;
    [Method.Every](payload: EveryByValuePayload): Promise<EveryByValuePayload>;
    [Method.Filter](payload: FilterByHookPayload<StoredValue>): Promise<FilterByHookPayload<StoredValue>>;
    [Method.Filter](payload: FilterByValuePayload<StoredValue>): Promise<FilterByValuePayload<StoredValue>>;
    [Method.Find](payload: FindByHookPayload<StoredValue>): Promise<FindByHookPayload<StoredValue>>;
    [Method.Find](payload: FindByValuePayload<StoredValue>): Promise<FindByValuePayload<StoredValue>>;
    [Method.Get]<StoredValue>(payload: GetPayload<StoredValue>): Promise<GetPayload<StoredValue>>;
    [Method.GetAll](payload: GetAllPayload<StoredValue>): Promise<GetAllPayload<StoredValue>>;
    [Method.GetMany](payload: GetManyPayload<StoredValue>): Promise<GetManyPayload<StoredValue>>;
    [Method.Has](payload: HasPayload): Promise<HasPayload>;
    [Method.Inc](payload: IncPayload): Promise<IncPayload>;
    [Method.Keys](payload: KeysPayload): Promise<KeysPayload>;
    [Method.Map]<DataValue = StoredValue, HookValue = DataValue>(payload: MapByHookPayload<DataValue, HookValue>): Promise<MapByHookPayload<DataValue, HookValue>>;
    [Method.Map]<DataValue = StoredValue>(payload: MapByPathPayload<DataValue>): Promise<MapByPathPayload<DataValue>>;
    [Method.Math](payload: MathPayload): Promise<MathPayload>;
    [Method.Partition](payload: PartitionByHookPayload<StoredValue>): Promise<PartitionByHookPayload<StoredValue>>;
    [Method.Partition](payload: PartitionByValuePayload<StoredValue>): Promise<PartitionByValuePayload<StoredValue>>;
    [Method.Push]<Value = StoredValue>(payload: PushPayload<Value>): Promise<PushPayload<Value>>;
    [Method.Random](payload: RandomPayload<StoredValue>): Promise<RandomPayload<StoredValue>>;
    [Method.RandomKey](payload: RandomKeyPayload): Promise<RandomKeyPayload>;
    [Method.Remove]<HookValue = StoredValue>(payload: RemoveByHookPayload<HookValue>): Promise<RemoveByHookPayload<HookValue>>;
    [Method.Remove](payload: RemoveByValuePayload): Promise<RemoveByValuePayload>;
    [Method.Set]<Value = StoredValue>(payload: SetPayload<Value>): Promise<SetPayload<Value>>;
    [Method.SetMany](payload: SetManyPayload<StoredValue>): Promise<SetManyPayload<StoredValue>>;
    [Method.Size](payload: SizePayload): Promise<SizePayload>;
    [Method.Some](payload: SomeByHookPayload<StoredValue>): Promise<SomeByHookPayload<StoredValue>>;
    [Method.Some](payload: SomeByValuePayload): Promise<SomeByValuePayload>;
    [Method.Update]<HookValue = StoredValue, Value = HookValue>(payload: UpdatePayload<StoredValue, HookValue, Value>): Promise<UpdatePayload<StoredValue, HookValue, Value>>;
    [Method.Values](payload: ValuesPayload<StoredValue>): Promise<ValuesPayload<StoredValue>>;
    private get client();
    private get collection();
    static defaultAuthentication: MongoProvider.Authentication;
}
export declare namespace MongoProvider {
    interface Options {
        collectionName?: string;
        enforceCollectionName?: boolean;
        authentication?: Partial<Authentication> | string;
    }
    interface Authentication {
        user?: string;
        password?: string;
        dbName: string;
        port: number;
        host: string;
    }
    enum Identifiers {
        DecInvalidType = "decInvalidType",
        DecMissingData = "decMissingData",
        FilterInvalidValue = "filterInvalidValue",
        FindInvalidValue = "findInvalidValue",
        IncInvalidType = "incInvalidType",
        IncMissingData = "incMissingData",
        InitMissingCollectionName = "initMissingCollectionName",
        NotConnected = "notConnected",
        MathInvalidType = "mathInvalidType",
        MathMissingData = "mathMissingData",
        PartitionInvalidValue = "partitionInvalidValue",
        PushInvalidType = "pushInvalidType",
        PushMissingData = "pushMissingData",
        RemoveInvalidType = "removeInvalidType",
        RemoveMissingData = "removeMissingData"
    }
}
//# sourceMappingURL=MongoProvider.d.ts.map