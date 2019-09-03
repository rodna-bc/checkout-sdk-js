import { InternalAddress } from '../../address';

export default interface AmazonPayRemoteCheckout {
    referenceId?: string;
    billing?: {
        address?: InternalAddress | false;
        paymentMethodNotAllowed?: boolean;
    };
    shipping?: {
        address?: InternalAddress | false;
    };
    settings?: {
        billing: string;
        billingMessage: string;
        customer: string;
        payment: string;
        provider: string;
        shipping: string;
    };
}
