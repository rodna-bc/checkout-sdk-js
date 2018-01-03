import { isEqual } from 'lodash';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import deepFreeze from './deep-freeze';
import noopActionTransformer from './noop-action-transformer';
import noopStateTransformer from './noop-state-transformer';
import 'rxjs/add/observable/merge';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/scan';

/**
 * @implements {ReadableDataStore}
 * @implements {DispatchableDataStore}
 */
export default class DataStore {
    /**
     * @param {Reducer} reducer
     * @param {State} [initialState={}]
     * @param {Object} [options={}]
     * @param {boolean} [options.shouldWarnMutation=true]
     * @param {function(state: State): TransformedState} [options.stateTransformer=noopStateTransformer]
     * @param {function(action: Observable<Action<T>>): Observable<Action<T>>} [options.actionTransformer=noopActionTransformer]
     * @return {void}
     * @template State, TransformedState
     */
    constructor(reducer, initialState = {}, options = {}) {
        this._options = {
            shouldWarnMutation: true,
            stateTransformer: noopStateTransformer,
            actionTransformer: noopActionTransformer,
            ...options,
        };
        this._state$ = new BehaviorSubject(initialState);
        this._notification$ = new Subject();
        this._dispatchers = {};
        this._dispatchQueue$ = new Subject()
            .mergeMap((dispatcher$) => dispatcher$.concatMap((action$) => action$))
            .filter((action) => action.type);

        this._dispatchQueue$
            .scan((state, action) => reducer(state, action), initialState)
            .distinctUntilChanged(isEqual)
            .map((state) => this._options.shouldWarnMutation === false ? state : deepFreeze(state))
            .map((state) => this._options.stateTransformer(state))
            .subscribe(this._state$);

        this.dispatch({ type: 'INIT' });
    }

    /**
     * @param {Action<T>|Observable<Action<T>>} action
     * @param {Object} [options]
     * @return {Promise<TransformedState>}
     * @template T
     */
    dispatch(action, options) {
        if (action instanceof Observable) {
            return this._dispatchObservableAction(action, options);
        }

        return this._dispatchAction(action);
    }

    /**
     * @return {TransformedState}
     */
    getState() {
        return this._state$.getValue();
    }

    /**
     * @return {void}
     */
    notifyState() {
        this._notification$.next(this.getState());
    }

    /**
     * @param {function(state: TransformedState): void} subscriber
     * @param {...function(state: TransformedState): any} [filters]
     * @return {function(): void}
     */
    subscribe(subscriber, ...filters) {
        let state$ = this._state$;

        if (filters.length > 0) {
            state$ = state$.distinctUntilChanged((stateA, stateB) =>
                filters.every((filter) => isEqual(filter(stateA), filter(stateB)))
            );
        }

        const subscriptions = [
            state$.subscribe(subscriber),
            this._notification$.subscribe(subscriber),
        ];

        return () => subscriptions.forEach((subscription) => subscription.unsubscribe());
    }

    /**
     * @private
     * @param {Action<T>} action
     * @return {Promise<TransformedState>}
     * @template T
     */
    _dispatchAction(action) {
        return this._dispatchObservableAction(action.error ? Observable.throw(action) : Observable.of(action));
    }

    /**
     * @private
     * @param {Observable<Action<T>>} action$
     * @param {Object} [options]
     * @return {Promise<TransformedState>}
     * @template T
     */
    _dispatchObservableAction(action$, options = {}) {
        return new Promise((resolve, reject) => {
            let action;
            let error;

            this._getDispatcher(options.queueId).next(
                this._options.actionTransformer(action$)
                    .catch((value) => {
                        error = value;

                        return Observable.of(value);
                    })
                    .do({
                        next: (value) => {
                            action = value;
                        },
                        complete: () => {
                            if (error) {
                                reject(error instanceof Error ? error : error.payload);
                            } else if (action.error) {
                                reject(action.payload);
                            } else {
                                resolve(this.getState());
                            }
                        },
                    })
            );
        });
    }

    /**
     * @private
     * @param {string} [queueId='default']
     * @return {Subject<Action<T>>}
     */
    _getDispatcher(queueId = 'default') {
        if (!this._dispatchers[queueId]) {
            this._dispatchers[queueId] = new Subject();

            this._dispatchQueue$.next(this._dispatchers[queueId]);
        }

        return this._dispatchers[queueId];
    }
}
