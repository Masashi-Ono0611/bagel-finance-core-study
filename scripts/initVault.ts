import { Vault } from '../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { getTonClient } from '../utils/TonClient';
import { getJettonWalletAddr } from '../utils/Common';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // 1. Select network first to ensure correct client configuration
    const network = await ui.choose('Which network do you want to use?', ['mainnet', 'testnet'], (v) => v);
    const tonClient = getTonClient(network as 'mainnet' | 'testnet');

    // 2. Get vault address and fetch data
    const vaultAddr = await ui.inputAddress('Input vault address: ');
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    const res = await vault.getVaultData();
    const newBaskets = await Promise.all(
        res.baskets.map(async (basket) => ({
            weight: basket.weight,
            jettonWalletAddress: await getJettonWalletAddr(tonClient, basket.jettonMasterAddress, vaultAddr),
            dedustPoolAddress: basket.dedustPoolAddress,
            dedustJettonVaultAddress: basket.dedustJettonVaultAddress,
            jettonMasterAddress: basket.jettonMasterAddress,
        })),
    );
    await vault.sendChangeVaultData(provider.sender(), false, res.dedustTonVaultAddress, newBaskets);
}
