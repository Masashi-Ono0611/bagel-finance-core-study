import { Address } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { compile } from '@ton/blueprint';
import { getJettonWalletAddr } from '../utils/Common';
import { getTonClient } from '../utils/TonClient';

// Default DeDust TON Vault address (mainnet)
const DEFAULT_DEDUST_TON_VAULT = 'EQDa4VOnTYlLvDJ0gZjNYm5PXfSmmtL6Vs6A_CZEtXCNICq_';

// Helper function to get basket configuration
async function inputBasket(ui: any, tonClient: any, vaultAddress: Address, index: number) {
    console.log(`\nEntering details for Basket ${index + 1}:`);
    console.log('Note: Weight uses 9 decimals. For example:');
    console.log('- 1000000000 = 1.0 (100%)');
    console.log('- 500000000 = 0.5 (50%)');

    // Get weight
    const weight = BigInt(
        await ui.input(`Enter weight for Basket ${index + 1}: `)
    );
    if (weight <= 0) {
        throw new Error('Weight must be greater than 0');
    }

    // Get Jetton Master address
    const jettonMasterAddress = Address.parse(
        await ui.input(`Enter Jetton Master address for Basket ${index + 1}: `)
    );

    // Get DeDust Pool address
    const dedustPoolAddress = Address.parse(
        await ui.input(`Enter DeDust Pool address for Basket ${index + 1}: `)
    );

    // Get DeDust Jetton Vault address
    const dedustJettonVaultAddress = Address.parse(
        await ui.input(`Enter DeDust Jetton Vault address for Basket ${index + 1}: `)
    );

    // Calculate Jetton Wallet address
    const jettonWalletAddress = await getJettonWalletAddr(
        tonClient,
        jettonMasterAddress,
        vaultAddress
    );

    return {
        weight,
        jettonWalletAddress,
        dedustPoolAddress,
        dedustJettonVaultAddress,
        jettonMasterAddress,
    };
}

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    console.log('\nChange Code and Data for Vault');
    console.log('-----------------------------');

    // 1. Source Vault Address
    const vaultAddr = Address.parse(
        await ui.input('Enter source Vault address: ')
    );
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    const jettonData = await vault.getJettonData();
    const network = provider.network() === 'custom' ? 'mainnet' : provider.network();
    const tonClient = getTonClient(network as 'mainnet' | 'testnet');

    // 3. DeDust TON Vault Address
    let dedustTonVaultAddress: Address;
    const useDefaultDedust = await ui.choose(
        'Use default DeDust TON Vault address?',
        ['Yes', 'No (Custom)'],
        (v) => v
    );

    if (useDefaultDedust === 'Yes') {
        dedustTonVaultAddress = Address.parse(DEFAULT_DEDUST_TON_VAULT);
    } else {
        dedustTonVaultAddress = Address.parse(
            await ui.input('Enter custom DeDust TON Vault address: ')
        );
    }

    // 4. Configure Baskets
    const basketCount = parseInt(
        await ui.input('How many baskets do you want to configure? ')
    );
    if (isNaN(basketCount) || basketCount <= 0) {
        throw new Error('Invalid basket count');
    }

    const baskets = [];
    for (let i = 0; i < basketCount; i++) {
        baskets.push(
            await inputBasket(ui, tonClient, vault.address, i)
        );
    }

    // 5. Send Change Code and Data
    await vault.sendChangeCodeAndData(
        provider.sender(),
        await compile('Vault'),
        {
            adminAddress: jettonData.adminAddress,
            content: jettonData.content,
            walletCode: jettonData.walletCode,
            dedustTonVaultAddress,
            baskets,
        },
        jettonData.totalSupply,
    );
}
