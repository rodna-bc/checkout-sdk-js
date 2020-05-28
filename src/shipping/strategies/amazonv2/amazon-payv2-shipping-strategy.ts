import { createAction } from '@bigcommerce/data-store';

import { CheckoutStore, InternalCheckoutSelectors } from '../../../checkout';
import { InvalidArgumentError, MissingDataError, MissingDataErrorType } from '../../../common/error/errors';
import { PaymentMethod, PaymentMethodActionCreator } from '../../../payment';
import { AmazonPayv2PaymentProcessor } from '../../../payment/strategies/amazon-payv2';
import { ShippingInitializeOptions } from '../../shipping-request-options';
import { ShippingStrategyActionType } from '../../shipping-strategy-actions';
import ShippingStrategy from '../shipping-strategy';

export default class AmazonPayv2ShippingStrategy implements ShippingStrategy {
    private _paymentMethod?: PaymentMethod;

    constructor(
        private _store: CheckoutStore,
        private _paymentMethodActionCreator: PaymentMethodActionCreator,
        private _amazonPayv2PaymentProcessor: AmazonPayv2PaymentProcessor
    ) {}

    updateAddress(): Promise<InternalCheckoutSelectors> {
        return Promise.resolve(this._store.getState());
    }

    selectOption(): Promise<InternalCheckoutSelectors> {
        return Promise.resolve(this._store.getState());
    }

    async initialize(options: ShippingInitializeOptions): Promise<InternalCheckoutSelectors> {
        const { methodId } = options;

        if (!methodId) {
            throw new InvalidArgumentError('Unable to proceed because "options.amazonv2" argument is not provided.');
        }

        const state = await this._store.dispatch(this._paymentMethodActionCreator.loadPaymentMethod(methodId));
        this._paymentMethod = state.paymentMethods.getPaymentMethod(methodId);

        if (!this._paymentMethod) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        const { paymentToken } = this._paymentMethod.initializationData;

        await this._amazonPayv2PaymentProcessor.initialize(methodId);

        if (paymentToken) {
            this._bindEditButton('ship', paymentToken);
        }

        return this._store.getState();
    }

    async deinitialize(): Promise<InternalCheckoutSelectors> {
        await this._amazonPayv2PaymentProcessor.deinitialize();

        return Promise.resolve(this._store.getState());
    }

    private _bindEditButton(type: string, sessionId: string): void {
        const id = `#edit-${type}-address-button`;
        const button = document.querySelector(id);

        if (!button) {
            return;
        }

        const clone = button.cloneNode(true);
        button.replaceWith(clone);

        clone.addEventListener('click', () => this._showLoadingSpinner());

        this._amazonPayv2PaymentProcessor.bindButton(id, sessionId);
    }

    private _showLoadingSpinner(): Promise<InternalCheckoutSelectors> {
        const methodId = this._paymentMethod && this._paymentMethod.id;

        return this._store.dispatch(
            createAction(ShippingStrategyActionType.UpdateAddressRequested, undefined, { methodId })
        );
    }
}
