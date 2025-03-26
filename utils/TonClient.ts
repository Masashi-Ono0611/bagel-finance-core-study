import { TonClient } from '@ton/ton';

export function getTonClient(network: 'mainnet' | 'testnet') {
    return new TonClient({
        endpoint:
            network === 'mainnet'
                ? 'https://toncenter.com/api/v2/jsonRPC'
                : 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey:
            network === 'mainnet'
                ? 'a548fc361485e4d5668f3fb71b2ef7467db084b2fa4816d7b2366790b05a87c1'
                : '9ddcd69ada64b6190b44a1fbb9f1e14ffd175a8b4ddd8b643edf96f5e7321102',
    });
}
