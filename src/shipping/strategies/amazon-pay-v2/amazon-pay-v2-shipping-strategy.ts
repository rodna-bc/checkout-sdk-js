import { createAction } from '@bigcommerce/data-store';

import { ConsignmentActionCreator } from '../..';
import { CheckoutStore, InternalCheckoutSelectors } from '../../../checkout';
import { InvalidArgumentError, MissingDataError, MissingDataErrorType } from '../../../common/error/errors';
import { PaymentMethod, PaymentMethodActionCreator } from '../../../payment';
import { AmazonPayV2ChangeActionType, AmazonPayV2PaymentProcessor } from '../../../payment/strategies/amazon-pay-v2';
import { ShippingInitializeOptions, ShippingRequestOptions } from '../../shipping-request-options';
import { ShippingStrategyActionType } from '../../shipping-strategy-actions';
import ShippingStrategy from '../shipping-strategy';

export default class AmazonPayV2ShippingStrategy implements ShippingStrategy {
    private _paymentMethod?: PaymentMethod;

    constructor(
        private _store: CheckoutStore,
        private _consignmentActionCreator: ConsignmentActionCreator,
        private _paymentMethodActionCreator: PaymentMethodActionCreator,
        private _amazonPayV2PaymentProcessor: AmazonPayV2PaymentProcessor
    ) {}

    updateAddress(): Promise<InternalCheckoutSelectors> {
        return Promise.resolve(this._store.getState());
    }

    selectOption(optionId: string, options?: ShippingRequestOptions): Promise<InternalCheckoutSelectors> {
        return this._store.dispatch(
            this._consignmentActionCreator.selectShippingOption(optionId, options)
        );
    }

    async initialize(options: ShippingInitializeOptions): Promise<InternalCheckoutSelectors> {
        const { amazonpay, methodId } = options;

        if (!amazonpay || !methodId) {
            throw new InvalidArgumentError('Unable to proceed because "options.amazonpay" argument is not provided.');
        }

        const state = await this._store.dispatch(this._paymentMethodActionCreator.loadPaymentMethod(methodId));
        this._paymentMethod = state.paymentMethods.getPaymentMethod(methodId);

        if (!this._paymentMethod) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        await this._amazonPayV2PaymentProcessor.initialize(methodId);

        const { paymentToken } = this._paymentMethod.initializationData;
        const buttonId = amazonpay.walletButton;

        if (paymentToken && buttonId) {
            this._bindEditButton(buttonId, paymentToken, 'changeAddress');
        }

        return this._store.getState();
    }

    async deinitialize(): Promise<InternalCheckoutSelectors> {
        await this._amazonPayV2PaymentProcessor.deinitialize();

        return Promise.resolve(this._store.getState());
    }

    private _bindEditButton(id: string, sessionId: string, changeAction: AmazonPayV2ChangeActionType): void {
        const button = document.getElementById(id);

        if (!button) {
            return;
        }

        const clone = button.cloneNode(true);
        button.replaceWith(clone);

        clone.addEventListener('click', () => this._showLoadingSpinner());

        this._amazonPayV2PaymentProcessor.bindButton(id, sessionId, changeAction);
    }

    private _showLoadingSpinner(): Promise<InternalCheckoutSelectors> {
        const methodId = this._paymentMethod && this._paymentMethod.id;

        return this._store.dispatch(
            createAction(ShippingStrategyActionType.UpdateAddressRequested, undefined, { methodId })
        );
    }
}
