import { AmazonPayAddressBookConstructor } from './amazon-pay-address-book';
import AmazonPayLogin from './amazon-pay-login';
import { AmazonPayLoginButtonConstructor } from './amazon-pay-login-button';
import { AmazonPayWalletConstructor } from './amazon-pay-wallet';

export default interface AmazonPayWindow extends Window {
    amazon?: {
        Login: AmazonPayLogin,
    };
    OffAmazonPayments?: {
        Button: AmazonPayLoginButtonConstructor;
        Widgets: {
            AddressBook: AmazonPayAddressBookConstructor;
            Wallet: AmazonPayWalletConstructor;
        };
        initConfirmationFlow?(sellerId: any, id: string, confirmationFlow: object): any;
    };
    onAmazonLoginReady?(): void;
    onAmazonPaymentsReady?(): void;
}
