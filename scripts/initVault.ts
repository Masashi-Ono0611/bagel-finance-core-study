import { Vault } from '../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { getTonClient } from '../utils/TonClient';
import { getJettonWalletAddr } from '../utils/Common';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // Get network from provider
    const network = provider.network() === 'custom' ? 'mainnet' : provider.network();
    const tonClient = getTonClient(network as 'mainnet' | 'testnet');

    // 2. Get vault address and fetch data
    const vaultAddr = await ui.inputAddress('Input vault address: ');
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    const res = await vault.getVaultData();

    console.log('\nCurrent Basket Configuration:');
    console.log('--------------------');
    res.baskets.forEach((basket, index) => {
        console.log(`\nBasket ${index + 1}:`);
        console.log(`weight: ${basket.weight}`);
        console.log(`jettonWalletAddress: ${basket.jettonWalletAddress}`);
        console.log(`dedustPoolAddress: ${basket.dedustPoolAddress}`);
        console.log(`dedustJettonVaultAddress: ${basket.dedustJettonVaultAddress}`);
        console.log(`jettonMasterAddress: ${basket.jettonMasterAddress}`);
    });

    const newBaskets = await Promise.all(
        res.baskets.map(async (basket) => ({
            weight: basket.weight,
            jettonWalletAddress: await getJettonWalletAddr(tonClient, basket.jettonMasterAddress, vaultAddr),
            dedustPoolAddress: basket.dedustPoolAddress,
            dedustJettonVaultAddress: basket.dedustJettonVaultAddress,
            jettonMasterAddress: basket.jettonMasterAddress,
        })),
    );

    console.log('\nNew Basket Configuration:');
    console.log('--------------------');
    newBaskets.forEach((basket, index) => {
        console.log(`\nBasket ${index + 1}:`);
        console.log(`weight: ${basket.weight}`);
        console.log(`jettonWalletAddress: ${basket.jettonWalletAddress}`);
        console.log(`dedustPoolAddress: ${basket.dedustPoolAddress}`);
        console.log(`dedustJettonVaultAddress: ${basket.dedustJettonVaultAddress}`);
        console.log(`jettonMasterAddress: ${basket.jettonMasterAddress}`);

        // Highlight if there are any changes
        if (basket.jettonWalletAddress.toString() !== res.baskets[index].jettonWalletAddress.toString()) {
            console.log('\n*** jettonWalletAddress has been updated ***');
            console.log(`Old: ${res.baskets[index].jettonWalletAddress}`);
            console.log(`New: ${basket.jettonWalletAddress}`);
        }
    });

    await vault.sendChangeVaultData(provider.sender(), false, res.dedustTonVaultAddress, newBaskets);
}
