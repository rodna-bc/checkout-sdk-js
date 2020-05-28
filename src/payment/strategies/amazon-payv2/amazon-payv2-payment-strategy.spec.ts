import { createClient as createPaymentClient } from '@bigcommerce/bigpay-client';
import { createAction, createErrorAction } from '@bigcommerce/data-store';
import { createFormPoster, FormPoster } from '@bigcommerce/form-poster';
import { createRequestSender, RequestSender } from '@bigcommerce/request-sender';
import { createScriptLoader } from '@bigcommerce/script-loader';
import { of, Observable } from 'rxjs';

import { createCheckoutStore, CheckoutRequestSender, CheckoutStore, CheckoutValidator } from '../../../checkout';
import { getCheckoutStoreState } from '../../../checkout/checkouts.mock';
import { InvalidArgumentError, MissingDataError, NotInitializedError, RequestError } from '../../../common/error/errors';
import { getResponse } from '../../../common/http-request/responses.mock';
import { FinalizeOrderAction, OrderActionCreator, OrderActionType, OrderRequestBody, OrderRequestSender, SubmitOrderAction } from '../../../order';
import { OrderFinalizationNotRequiredError } from '../../../order/errors';
import { getOrderRequestBody } from '../../../order/internal-orders.mock';
import { createPaymentStrategyRegistry, PaymentActionCreator, PaymentMethod, PaymentMethodActionCreator } from '../../../payment';
import { getAmazonPayv2 } from '../../../payment/payment-methods.mock';
import { AmazonPayv2PaymentProcessor } from '../../../payment/strategies/amazon-payv2';
import { getPaymentMethodMockUndefinedMerchant } from '../../../payment/strategies/amazon-payv2/amazon-payv2.mock';
import { createSpamProtection, PaymentHumanVerificationHandler, SpamProtectionActionCreator, SpamProtectionRequestSender } from '../../../spam-protection';
import { PaymentArgumentInvalidError } from '../../errors';
import { PaymentActionType, SubmitPaymentAction } from '../../payment-actions';
import PaymentMethodRequestSender from '../../payment-method-request-sender';
import { PaymentInitializeOptions } from '../../payment-request-options';
import PaymentRequestSender from '../../payment-request-sender';
import PaymentRequestTransformer from '../../payment-request-transformer';
import PaymentStrategyActionCreator from '../../payment-strategy-action-creator';
import { PaymentStrategyActionType } from '../../payment-strategy-actions';
import { getErrorPaymentResponseBody } from '../../payments.mock';

import AmazonPayv2PaymentInitializeOptions from './amazon-payv2-payment-initialize-options';
import AmazonPayv2PaymentStrategy from './amazon-payv2-payment-strategy';
import createAmazonPayv2PaymentProcessor from './create-amazon-payv2-payment-processor';

describe('AmazonPayv2PaymentStrategy', () => {
    let amazonPayv2PaymentProcessor: AmazonPayv2PaymentProcessor;
    let container: HTMLDivElement;
    let editMethodButton: HTMLDivElement;
    let finalizeOrderAction: Observable<FinalizeOrderAction>;
    let formPoster: FormPoster;
    let orderActionCreator: OrderActionCreator;
    let paymentHumanVerificationHandler: PaymentHumanVerificationHandler;
    let paymentActionCreator: PaymentActionCreator;
    let paymentMethodActionCreator: PaymentMethodActionCreator;
    let paymentMethodMock: PaymentMethod;
    let paymentStrategyActionCreator: PaymentStrategyActionCreator;
    let requestSender: RequestSender;
    let store: CheckoutStore;
    let strategy: AmazonPayv2PaymentStrategy;
    let submitOrderAction: Observable<SubmitOrderAction>;

    beforeEach(() => {
        store = createCheckoutStore(getCheckoutStoreState());
        amazonPayv2PaymentProcessor = createAmazonPayv2PaymentProcessor(store);
        requestSender = createRequestSender();
        formPoster = createFormPoster();

        const paymentClient = createPaymentClient(store);
        const spamProtection = createSpamProtection(createScriptLoader());
        const registry = createPaymentStrategyRegistry(store, paymentClient, requestSender, spamProtection, 'en_US');
        const paymentMethodRequestSender: PaymentMethodRequestSender = new PaymentMethodRequestSender(requestSender);
        const widgetInteractionAction = of(createAction(PaymentStrategyActionType.WidgetInteractionStarted));
        let submitPaymentAction: Observable<SubmitPaymentAction>;

        paymentHumanVerificationHandler = new PaymentHumanVerificationHandler(createSpamProtection(createScriptLoader()));

        orderActionCreator = new OrderActionCreator(
            new OrderRequestSender(createRequestSender()),
            new CheckoutValidator(new CheckoutRequestSender(createRequestSender()))
        );

        paymentStrategyActionCreator = new PaymentStrategyActionCreator(
            registry,
            orderActionCreator,
            new SpamProtectionActionCreator(spamProtection, new SpamProtectionRequestSender(requestSender))
        );

        paymentActionCreator = new PaymentActionCreator(
            new PaymentRequestSender(createPaymentClient()),
            orderActionCreator,
            new PaymentRequestTransformer(),
            paymentHumanVerificationHandler
        );

        paymentMethodActionCreator = new PaymentMethodActionCreator(paymentMethodRequestSender);

        finalizeOrderAction = of(createAction(OrderActionType.FinalizeOrderRequested));
        submitOrderAction = of(createAction(OrderActionType.SubmitOrderRequested));
        paymentMethodMock = { ...getAmazonPayv2(), initializationData: { paymentToken: undefined } };

        container = document.createElement('div');
        container.setAttribute('id', 'container');
        document.body.appendChild(container);

        editMethodButton = document.createElement('div');
        editMethodButton.setAttribute('id', 'walletButton');
        document.body.appendChild(editMethodButton);

        finalizeOrderAction = of(createAction(OrderActionType.FinalizeOrderRequested));
        submitPaymentAction = of(createAction(PaymentActionType.SubmitPaymentRequested));

        jest.spyOn(store, 'dispatch');

        jest.spyOn(amazonPayv2PaymentProcessor, 'initialize')
            .mockReturnValue(Promise.resolve());

        jest.spyOn(amazonPayv2PaymentProcessor, 'deinitialize')
            .mockReturnValue(Promise.resolve());

        jest.spyOn(amazonPayv2PaymentProcessor, 'createButton')
            .mockReturnValue(container);

        jest.spyOn(amazonPayv2PaymentProcessor, 'bindButton')
            .mockImplementation(() => {});

        jest.spyOn(orderActionCreator, 'finalizeOrder')
            .mockReturnValue(finalizeOrderAction);

        jest.spyOn(orderActionCreator, 'submitOrder')
            .mockReturnValue(submitOrderAction);

        jest.spyOn(formPoster, 'postForm')
            .mockImplementation((_url, _data, callback = () => {}) => callback());

        jest.spyOn(paymentMethodActionCreator, 'loadPaymentMethod')
            .mockResolvedValue(store.getState());

        jest.spyOn(paymentStrategyActionCreator, 'widgetInteraction')
            .mockImplementation(() => widgetInteractionAction);

        jest.spyOn(store.getState().paymentMethods, 'getPaymentMethod')
            .mockReturnValue(paymentMethodMock);

        jest.spyOn(paymentActionCreator, 'submitPayment')
            .mockReturnValue(submitPaymentAction);

        strategy = new AmazonPayv2PaymentStrategy(store,
            paymentStrategyActionCreator,
            paymentMethodActionCreator,
            orderActionCreator,
            paymentActionCreator,
            amazonPayv2PaymentProcessor
        );
    });

    afterEach(() => {
        document.body.removeChild(container);

        if (editMethodButton.parentElement === document.body) {
            document.body.removeChild(editMethodButton);
        } else {
            const shippingButton = document.getElementById('walletButton');
            if (shippingButton) {
                document.body.removeChild(shippingButton);
            }
        }
    });

    it('creates an instance of AmazonPayv2PaymentStrategy', () => {
        expect(strategy).toBeInstanceOf(AmazonPayv2PaymentStrategy);
    });

    describe('#initialize()', () => {
        let amazonpayv2InitializeOptions: AmazonPayv2PaymentInitializeOptions;
        let initializeOptions: PaymentInitializeOptions;
        const paymentToken = 'abc123';
        const changeMethodId = 'walletButton';

        beforeEach(() => {
            amazonpayv2InitializeOptions = { container: 'container', walletButton: changeMethodId };
            initializeOptions = { methodId: 'amazonpay', amazonpay: amazonpayv2InitializeOptions };
        });

        it('creates the signin button if no paymentToken is present on initializationData', async () => {
            await strategy.initialize(initializeOptions);

            expect(amazonPayv2PaymentProcessor.bindButton).not.toHaveBeenCalled();
            expect(amazonPayv2PaymentProcessor.initialize).toHaveBeenCalledWith(paymentMethodMock.id);
            expect(amazonPayv2PaymentProcessor.createButton).toHaveBeenCalledWith(`#${amazonpayv2InitializeOptions.container}`, expect.any(Object));
        });

        it('fails to initialize the strategy if no PaymentMethod is supplied', async () => {
            jest.spyOn(store.getState().paymentMethods, 'getPaymentMethod').mockReturnValue(undefined);

            await expect(strategy.initialize(initializeOptions)).rejects.toThrow(MissingDataError);
        });

        it('initialize the strategy and validates if cart contains physical items', async () => {
            jest.spyOn(store.getState().cart, 'getCart')
                .mockReturnValue({...store.getState().cart.getCart(), lineItems: {physicalItems: []}});

            await strategy.initialize(initializeOptions);

            expect(amazonPayv2PaymentProcessor.createButton).toHaveBeenCalled();
        });

        it('fails to initialize the strategy if amazonpayv2InitializeOptions invalid are provided ', async () => {
            amazonpayv2InitializeOptions = { container: 'invalid_container' };
            initializeOptions = { methodId: 'amazonpay', amazonpay: amazonpayv2InitializeOptions };

            await expect(strategy.initialize(initializeOptions)).rejects.toThrow(InvalidArgumentError);
        });

        it('fails to initialize the strategy if no methodid is supplied', async () => {
            jest.spyOn(store.getState().paymentMethods, 'getPaymentMethod').mockReturnValue(undefined);

            await expect(strategy.initialize(initializeOptions)).rejects.toThrow(MissingDataError);
        });

        it('fails to initialize the strategy if config is not initialized', async () => {
            jest.spyOn(store.getState().config, 'getStoreConfig').mockReturnValue(undefined);

            await expect(strategy.initialize(initializeOptions)).rejects.toThrow(MissingDataError);
        });

        it('fails initialize the strategy if merchantId is not supplied', async () => {
            jest.spyOn(store.getState().paymentMethods, 'getPaymentMethod').mockReturnValue(getPaymentMethodMockUndefinedMerchant());

            await expect(strategy.initialize(initializeOptions)).rejects.toThrow(MissingDataError);
        });

        it('fails to create signInButton  if get Payment method fails', async () => {
            jest.spyOn(store.getState().paymentMethods, 'getPaymentMethod').mockReturnValue(undefined);

            await expect(strategy.initialize(initializeOptions)).rejects.toThrow(MissingDataError);
        });

        it('binds edit method button if paymentToken is present on initializationData', async () => {
            paymentMethodMock.initializationData.paymentToken = paymentToken;

            await strategy.initialize(initializeOptions);

            expect(amazonPayv2PaymentProcessor.initialize).toHaveBeenCalledWith(paymentMethodMock.id);
            expect(amazonPayv2PaymentProcessor.bindButton).toHaveBeenCalledWith(changeMethodId, paymentToken, 'changePayment');
            expect(amazonPayv2PaymentProcessor.createButton).not.toHaveBeenCalled();
        });

        it('dispatches widgetInteraction when clicking previously binded edit method button', async () => {
            paymentMethodMock.initializationData.paymentToken = paymentToken;

            await strategy.initialize(initializeOptions);

            const editButton = document.getElementById(changeMethodId);

            if (editButton) {
                editButton.click();
            }

            expect(paymentStrategyActionCreator.widgetInteraction).toHaveBeenCalled();
        });

        it('does not initialize the paymentProcessor if no options.amazonpayv2 are provided', () => {
            initializeOptions.amazonpay = undefined;

            expect(strategy.initialize(initializeOptions)).rejects.toThrow(InvalidArgumentError);
            expect(amazonPayv2PaymentProcessor.initialize).not.toHaveBeenCalled();
        });

        it('does not initialize the paymentProcessor if payment method is missing', async () => {
            jest.spyOn(store.getState().paymentMethods, 'getPaymentMethod')
                .mockReturnValue(undefined);

            await expect(strategy.initialize(initializeOptions)).rejects.toThrow(MissingDataError);

            expect(amazonPayv2PaymentProcessor.initialize).not.toHaveBeenCalled();
        });

        it('does not bind edit method button if button do not exist', async () => {
            document.body.removeChild(editMethodButton);
            paymentMethodMock.initializationData.paymentToken = paymentToken;

            await strategy.initialize(initializeOptions);

            expect(amazonPayv2PaymentProcessor.initialize).toHaveBeenCalledWith(paymentMethodMock.id);
            expect(amazonPayv2PaymentProcessor.bindButton).not.toHaveBeenCalled();
            expect(amazonPayv2PaymentProcessor.createButton).not.toHaveBeenCalled();

            document.body.appendChild(editMethodButton);
        });
    });

    describe('#execute()', () => {
        let amazonpayv2InitializeOptions: AmazonPayv2PaymentInitializeOptions;
        let initializeOptions: PaymentInitializeOptions;
        let orderRequestBody: OrderRequestBody;
        const paymentToken = 'abc123';

        beforeEach(async () => {
            amazonpayv2InitializeOptions = { container: 'container' };
            initializeOptions = { methodId: 'amazonpay', amazonpay: amazonpayv2InitializeOptions };
            orderRequestBody = {
                ...getOrderRequestBody(),
                payment: {
                    methodId: 'amazonpay',
                },
            };

            await strategy.initialize(initializeOptions);
        });

        it('shows the spinner if no paymentToken is found on intializationData', async () => {
            await strategy.execute(orderRequestBody, initializeOptions);

            expect(paymentStrategyActionCreator.widgetInteraction).toHaveBeenCalled();
        });

        it('starts flow if paymentToken is found on intializationData', async () => {
            paymentMethodMock.initializationData.paymentToken = paymentToken;

            await strategy.initialize(initializeOptions);
            await strategy.execute(orderRequestBody, initializeOptions);

            expect(orderActionCreator.submitOrder).toHaveBeenCalledWith(orderRequestBody, initializeOptions);
        });

        it('fails to execute if strategy is not initialized', async () => {
            jest.spyOn(paymentStrategyActionCreator, 'widgetInteraction')
                .mockRestore();

            strategy = new AmazonPayv2PaymentStrategy(
                store,
                paymentStrategyActionCreator,
                paymentMethodActionCreator,
                orderActionCreator,
                paymentActionCreator,
                amazonPayv2PaymentProcessor
            );

            return expect(strategy.execute(orderRequestBody, initializeOptions)).rejects.toThrow(NotInitializedError);
        });

        it('fails to execute if payment method is not found', () => {
            jest.spyOn(store.getState().paymentMethods, 'getPaymentMethod')
                .mockReturnValue(undefined);

            expect(strategy.execute(orderRequestBody, initializeOptions)).rejects.toThrow(MissingDataError);
        });

        it('fails to execute if payment argument is invalid', async () => {
            orderRequestBody.payment = undefined;
            paymentMethodMock.initializationData.paymentToken = paymentToken;

            await strategy.initialize(initializeOptions);

            expect(strategy.execute(orderRequestBody, initializeOptions)).rejects.toThrow(PaymentArgumentInvalidError);
        });

        it('redirects to Amazon url', async () => {
            const error = new RequestError(getResponse({
                ...getErrorPaymentResponseBody(),
                errors: [
                    { code: 'additional_action_required' },
                ],
                provider_data: {
                    redirect_url: 'http://some-url',
                },
                status: 'error',
            }));
            window.location.replace = jest.fn();

            jest.spyOn(paymentActionCreator, 'submitPayment')
                .mockReturnValue(of(createErrorAction(PaymentActionType.SubmitPaymentFailed, error)));

            paymentMethodMock.initializationData.paymentToken = paymentToken;

            await strategy.initialize(initializeOptions);
            strategy.execute(orderRequestBody, initializeOptions);
            await new Promise(resolve => process.nextTick(resolve));

            expect(window.location.replace).toBeCalledWith('http://some-url');
        });

        it('does not redirect to Amazon url', async () => {
            const response = new RequestError(getResponse(getErrorPaymentResponseBody()));
            window.location.replace = jest.fn();

            jest.spyOn(paymentActionCreator, 'submitPayment')
                .mockReturnValue(of(createErrorAction(PaymentActionType.SubmitPaymentFailed, response)));

            paymentMethodMock.initializationData.paymentToken = paymentToken;

            await strategy.initialize(initializeOptions);
            await expect(strategy.execute(orderRequestBody, initializeOptions)).rejects.toThrow(response);
            await new Promise(resolve => process.nextTick(resolve));

            expect(window.location.replace).not.toBeCalledWith('http://some-url');
        });
    });

    describe('#finalize()', () => {
        it('throws an error to inform that order finalization is not required', async () => {
            const promise = strategy.finalize();

            return expect(promise).rejects.toBeInstanceOf(OrderFinalizationNotRequiredError);
        });
    });

    describe('#deinitialize()', () => {
        let amazonpayv2InitializeOptions: AmazonPayv2PaymentInitializeOptions;
        let initializeOptions: PaymentInitializeOptions;

        beforeEach(async () => {
            amazonpayv2InitializeOptions = { container: 'container' };
            initializeOptions = { methodId: 'amazonpay', amazonpay: amazonpayv2InitializeOptions };
            await strategy.initialize(initializeOptions);
        });

        it('expect to deinitialize the payment processor', async () => {
            await strategy.deinitialize(initializeOptions);

            expect(amazonPayv2PaymentProcessor.deinitialize).toHaveBeenCalled();

            // prevent object not found failure
            document.body.appendChild(container);
        });

        it('deinitializes strategy', async () => {
            await strategy.deinitialize();

            expect(await strategy.deinitialize()).toEqual(store.getState());

            // prevent object not found failure
            document.body.appendChild(container);
        });
    });
});
