import { noop, some } from 'lodash';

import { CheckoutStore, InternalCheckoutSelectors } from '../../../checkout';
import { InvalidArgumentError, MissingDataError, MissingDataErrorType, NotInitializedError, NotInitializedErrorType, RequestError } from '../../../common/error/errors';
import { OrderActionCreator, OrderRequestBody } from '../../../order';
import { OrderFinalizationNotRequiredError } from '../../../order/errors';
import { AmazonPayv2PaymentProcessor, AmazonPayv2PayOptions, AmazonPayv2Placement } from '../../../payment/strategies/amazon-payv2';
import { PaymentArgumentInvalidError } from '../../errors';
import PaymentActionCreator from '../../payment-action-creator';
import PaymentMethod from '../../payment-method';
import PaymentMethodActionCreator from '../../payment-method-action-creator';
import { PaymentInitializeOptions, PaymentRequestOptions } from '../../payment-request-options';
import * as paymentStatusTypes from '../../payment-status-types';
import PaymentStrategyActionCreator from '../../payment-strategy-action-creator';
import PaymentStrategy from '../payment-strategy';

import { EditableAddressType } from './amazon-payv2';

export default class AmazonPayv2PaymentStrategy implements PaymentStrategy {

    private _walletButton?: HTMLElement;
    private _signInCustomer?: () => Promise<void>;

    constructor(
        private _store: CheckoutStore,
        private _paymentStrategyActionCreator: PaymentStrategyActionCreator,
        private _paymentMethodActionCreator: PaymentMethodActionCreator,
        private _orderActionCreator: OrderActionCreator,
        private _paymentActionCreator: PaymentActionCreator,
        private _amazonPayv2PaymentProcessor: AmazonPayv2PaymentProcessor
    ) { }

    async initialize(options: PaymentInitializeOptions): Promise<InternalCheckoutSelectors> {
        const { methodId, amazonpay } = options;

        if (!amazonpay) {
            throw new InvalidArgumentError('Unable to proceed because "options.amazonpayv2" argument is not provided.');
        }

        this._signInCustomer = amazonpay.signInCustomer;

        const state = await this._store.dispatch(this._paymentMethodActionCreator.loadPaymentMethod(methodId));
        const paymentMethod = state.paymentMethods.getPaymentMethod(methodId);

        if (!paymentMethod) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        await this._amazonPayv2PaymentProcessor.initialize(methodId);

        const { paymentToken } = paymentMethod.initializationData;

        if (paymentToken) {
            this._bindEditButton('shipping', paymentToken);
            this._bindEditButton('method', paymentToken);
        } else {
            this._walletButton = this._createSignInButton(amazonpay.container, paymentMethod);
        }

        return this._store.getState();
    }

    async execute(orderRequest: OrderRequestBody, options?: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        if (!this._signInCustomer) {
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        const { payment } = orderRequest;

        if (!payment) {
            throw new PaymentArgumentInvalidError(['payment']);
        }

        const { methodId } = payment;

        const state = await this._store.dispatch(this._paymentMethodActionCreator.loadPaymentMethod(methodId));
        const paymentMethod = state.paymentMethods.getPaymentMethod(methodId);

        if (!paymentMethod) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        const { paymentToken } = paymentMethod.initializationData;

        if (paymentToken) {
            const paymentPayload = {
                methodId,
                paymentData: { nonce: paymentToken },
            };

            await this._store.dispatch(this._orderActionCreator.submitOrder(orderRequest, options));

            try {
                return await this._store.dispatch(this._paymentActionCreator.submitPayment(paymentPayload));
            } catch (error) {
                if (!(error instanceof RequestError) || !some(error.body.errors, { code: 'three_d_secure_required' })) {
                    return Promise.reject(error);
                }

                return new Promise(() => {
                    window.location.replace(error.body.three_ds_result.acs_url);
                });
            }
        }

        return this._showLoadingSpinner(this._signInCustomer);
    }

    finalize(options?: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        const state = this._store.getState();
        const order = state.order.getOrder();
        const status = state.payment.getPaymentStatus();

        if (order && (status === paymentStatusTypes.ACKNOWLEDGE || status === paymentStatusTypes.FINALIZE)) {
            return this._store.dispatch(this._orderActionCreator.finalizeOrder(order.orderId, options));
        }

        return Promise.reject(new OrderFinalizationNotRequiredError());
    }

    async deinitialize(_options?: PaymentRequestOptions | undefined): Promise<InternalCheckoutSelectors> {
        if (this._walletButton && this._walletButton.parentNode) {
            this._walletButton.parentNode.removeChild(this._walletButton);
            this._walletButton = undefined;
        }

        if (this._signInCustomer) {
            this._signInCustomer = undefined;
        }

        await this._amazonPayv2PaymentProcessor.deinitialize();

        return Promise.resolve(this._store.getState());
    }

    private _bindEditButton(type: EditableAddressType, sessionId: string): void {
        const id = `#edit-${type}-address-button`;
        const button = document.querySelector(id);

        if (!button) {
            return;
        }

        const clone = button.cloneNode(true);
        button.replaceWith(clone);

        clone.addEventListener('click', () => this._showLoadingSpinner(() => new Promise(noop)));

        this._amazonPayv2PaymentProcessor.bindButton(id, sessionId);
    }

    private _showLoadingSpinner(callback?: () => Promise<void> | Promise<never>): Promise<InternalCheckoutSelectors> {
        return this._store.dispatch(this._paymentStrategyActionCreator.widgetInteraction(() => {

            if (callback) {
                return callback();
            }

            return Promise.reject();
        }), { queueId: 'widgetInteraction' });
    }

    private _createSignInButton(containerId: string, paymentMethod: PaymentMethod): HTMLElement {
        const container = document.querySelector(`#${containerId}`);

        if (!container) {
            throw new InvalidArgumentError('Unable to create sign-in button without valid container ID.');
        }

        const state = this._store.getState();
        const cart = state.cart.getCart();
        const config = state.config.getStoreConfig();

        if (!config) {
            throw new MissingDataError(MissingDataErrorType.MissingCheckoutConfig);
        }

        if (!paymentMethod) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        const {
            config: {
                merchantId,
                testMode,
            },
            initializationData: {
                checkoutLanguage,
                ledgerCurrency,
                checkoutSessionMethod,
                region,
                extractAmazonCheckoutSessionId,
            },
        } = paymentMethod;

        if (!merchantId) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        let productType = AmazonPayv2PayOptions.PayAndShip;

        if (cart && cart.lineItems.physicalItems.length === 0) {
            productType = AmazonPayv2PayOptions.PayOnly;
        }

        const amazonButtonOptions = {
            merchantId,
            sandbox: !!testMode,
            checkoutLanguage,
            ledgerCurrency,
            region,
            productType,
            createCheckoutSession: {
                method: checkoutSessionMethod,
                url: `${config.links.siteLink}/remote-checkout/${paymentMethod.id}/payment-session`,
                extractAmazonCheckoutSessionId,
            },
            placement: AmazonPayv2Placement.Checkout,
        };

        return this._amazonPayv2PaymentProcessor.createButton(`#${containerId}`, amazonButtonOptions);
    }
}
