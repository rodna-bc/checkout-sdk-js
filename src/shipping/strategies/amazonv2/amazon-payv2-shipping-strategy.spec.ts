import { createFormPoster, FormPoster } from '@bigcommerce/form-poster';
import { createRequestSender, RequestSender } from '@bigcommerce/request-sender';

import { createCheckoutStore, CheckoutStore } from '../../../checkout';
import { getCheckoutStoreState } from '../../../checkout/checkouts.mock';
import { InvalidArgumentError, MissingDataError } from '../../../common/error/errors';
import { PaymentMethod, PaymentMethodActionCreator, PaymentMethodRequestSender } from '../../../payment';
import { getAmazonPayv2 } from '../../../payment/payment-methods.mock';
import { createAmazonPayv2PaymentProcessor, AmazonPayv2PaymentProcessor } from '../../../payment/strategies/amazon-payv2';
import { ShippingInitializeOptions } from '../../shipping-request-options';

import AmazonPayv2ShippingStrategy from './amazon-payv2-shipping-strategy';

describe('AmazonPayv2ShippingStrategy', () => {
    let amazonPayv2PaymentProcessor: AmazonPayv2PaymentProcessor;
    let container: HTMLDivElement;
    let editShippingButton: HTMLDivElement;
    let formPoster: FormPoster;
    let paymentMethodActionCreator: PaymentMethodActionCreator;
    let paymentMethodMock: PaymentMethod;
    let requestSender: RequestSender;
    let store: CheckoutStore;
    let strategy: AmazonPayv2ShippingStrategy;

    beforeEach(() => {
        store = createCheckoutStore(getCheckoutStoreState());
        amazonPayv2PaymentProcessor = createAmazonPayv2PaymentProcessor(store);
        requestSender = createRequestSender();
        formPoster = createFormPoster();

        const paymentMethodRequestSender: PaymentMethodRequestSender = new PaymentMethodRequestSender(requestSender);
        paymentMethodActionCreator = new PaymentMethodActionCreator(paymentMethodRequestSender);
        paymentMethodMock = { ...getAmazonPayv2(), initializationData: { paymentToken: undefined } };

        container = document.createElement('div');
        container.setAttribute('id', 'container');
        document.body.appendChild(container);

        editShippingButton = document.createElement('div');
        editShippingButton.setAttribute('id', 'edit-ship-address-button');
        document.body.appendChild(editShippingButton);

        jest.spyOn(store, 'dispatch');

        jest.spyOn(amazonPayv2PaymentProcessor, 'initialize')
            .mockReturnValue(Promise.resolve());

        jest.spyOn(amazonPayv2PaymentProcessor, 'deinitialize')
            .mockReturnValue(Promise.resolve());

        jest.spyOn(amazonPayv2PaymentProcessor, 'createButton')
            .mockReturnValue(container);

        jest.spyOn(amazonPayv2PaymentProcessor, 'bindButton')
            .mockImplementation(() => {});

        jest.spyOn(formPoster, 'postForm')
            .mockImplementation((_url, _data, callback = () => {}) => callback());

        jest.spyOn(paymentMethodActionCreator, 'loadPaymentMethod')
            .mockResolvedValue(store.getState());

        jest.spyOn(store.getState().paymentMethods, 'getPaymentMethod')
            .mockReturnValue(paymentMethodMock);

        strategy = new AmazonPayv2ShippingStrategy(
            store,
            paymentMethodActionCreator,
            amazonPayv2PaymentProcessor
        );
    });

    afterEach(() => {
        document.body.removeChild(container);
        if (editShippingButton.parentElement === document.body) {
            document.body.removeChild(editShippingButton);
        } else {
            const shippingButton = document.getElementById('edit-ship-address-button');
            if (shippingButton) {
                document.body.removeChild(shippingButton);
            }
        }
    });

    it('creates an instance of AmazonPayv2ShippingStrategy', () => {
        expect(strategy).toBeInstanceOf(AmazonPayv2ShippingStrategy);
    });

    describe('#initialize()', () => {
        let initializeOptions: ShippingInitializeOptions;
        const paymentToken = 'abc123';
        const shippingId = 'edit-ship-address-button';

        beforeEach(() => {
            initializeOptions = { methodId: 'amazonpay' };
        });

        it('dispatches update shipping when clicking previously binded buttons', async () => {
            paymentMethodMock.initializationData.paymentToken = paymentToken;

            await strategy.initialize(initializeOptions);

            const editButton = document.getElementById(shippingId);
            if (editButton) {
                editButton.click();
            }

            jest.spyOn(store, 'dispatch');

            expect(store.dispatch).toHaveBeenCalled();
        });

        it('creates the signin button if no paymentToken is present on initializationData', async () => {
            await strategy.initialize(initializeOptions);

            expect(amazonPayv2PaymentProcessor.bindButton).not.toHaveBeenCalled();
            expect(amazonPayv2PaymentProcessor.initialize).toHaveBeenCalledWith(paymentMethodMock.id);
        });

        it('fails to initialize the strategy if no PaymentMethod is supplied', async () => {
            jest.spyOn(store.getState().paymentMethods, 'getPaymentMethod').mockReturnValue(undefined);

            await expect(strategy.initialize(initializeOptions)).rejects.toThrow(MissingDataError);
        });

        it('fails to initialize the strategy if no methodid is supplied', async () => {
            initializeOptions = { methodId: '' };

            await expect(strategy.initialize(initializeOptions)).rejects.toThrow(InvalidArgumentError);
        });

        it('binds edit buttons if paymentToken is present on initializationData', async () => {
            paymentMethodMock.initializationData.paymentToken = paymentToken;

            await strategy.initialize(initializeOptions);

            expect(amazonPayv2PaymentProcessor.createButton).not.toHaveBeenCalled();
            expect(amazonPayv2PaymentProcessor.initialize).toHaveBeenCalledWith(paymentMethodMock.id);
            expect(amazonPayv2PaymentProcessor.bindButton).toHaveBeenCalledWith(`#${shippingId}`, paymentToken);
        });

        it('does not initialize the paymentProcessor if no options.methodId are provided', () => {
            initializeOptions.methodId = '';

            expect(strategy.initialize(initializeOptions)).rejects.toThrow(InvalidArgumentError);
            expect(amazonPayv2PaymentProcessor.initialize).not.toHaveBeenCalled();
        });

        it('does not initialize the paymentProcessor if payment method is missing', () => {
            jest.spyOn(store.getState().paymentMethods, 'getPaymentMethod')
                .mockReturnValue(undefined);

            expect(strategy.initialize(initializeOptions)).rejects.toThrow(MissingDataError);
            expect(amazonPayv2PaymentProcessor.initialize).not.toHaveBeenCalled();
        });

        it('does not bind edit billing address button if button do not exist', async () => {
            document.body.removeChild(editShippingButton);
            paymentMethodMock.initializationData.paymentToken = paymentToken;

            await strategy.initialize(initializeOptions);

            expect(amazonPayv2PaymentProcessor.createButton).not.toHaveBeenCalled();
            expect(amazonPayv2PaymentProcessor.initialize).toHaveBeenCalledWith(paymentMethodMock.id);
            expect(amazonPayv2PaymentProcessor.bindButton).not.toHaveBeenCalledWith(`#${shippingId}`, paymentToken);

            document.body.appendChild(editShippingButton);
        });
    });

    describe('#selectOption()', () => {
        it('does not finalize order if order is not created', async () => {
            await strategy.selectOption();

            expect(await strategy.deinitialize()).toEqual(store.getState());
        });
    });

    describe('#updateAddress()', () => {
        it('does not finalize order if order is not created', async () => {
            await strategy.updateAddress();

            expect(await strategy.deinitialize()).toEqual(store.getState());
        });
    });

    describe('#deinitialize()', () => {
        let initializeOptions: ShippingInitializeOptions;

        beforeEach(async () => {
            initializeOptions = { methodId: 'amazonpay' };
            await strategy.initialize(initializeOptions);
        });

        it('expect to deinitialize the payment processor', async () => {
            await strategy.deinitialize();

            expect(amazonPayv2PaymentProcessor.deinitialize).toHaveBeenCalled();
        });

        it('deinitializes strategy', async () => {
            await strategy.deinitialize();

            expect(await strategy.deinitialize()).toEqual(store.getState());
        });
    });
});
