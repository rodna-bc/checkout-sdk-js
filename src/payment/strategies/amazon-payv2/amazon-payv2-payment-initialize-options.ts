export default interface AmazonPayv2PaymentInitializeOptions {
    /**
     * The location to insert the Amazon Pay component.
     */
    container: string;

    /**
     * This walletButton is used to set an event listener, provide an element ID if you want
     * users to be able to select a different payment method by clicking on a button.
     * It should be an HTML element.
     */
    walletButton?: string;
}
