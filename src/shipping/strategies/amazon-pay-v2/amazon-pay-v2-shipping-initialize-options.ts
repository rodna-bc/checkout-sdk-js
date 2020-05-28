/**
 * A set of options that are required to initialize the shipping step of
 * checkout in order to support Amazon Pay.
 *
 * When Amazon Pay is initialized, a widget will be inserted into the DOM. The
 * widget has a list of shipping addresses for the customer to choose from.
 */
export default interface AmazonPayV2ShippingInitializeOptions {
    /**
     * This walletButton is used to set an event listener, provide an element ID if you want
     * users to be able to select a different shipping address by clicking on a button.
     * It should be an HTML element.
     */
    walletButton?: string;
}
