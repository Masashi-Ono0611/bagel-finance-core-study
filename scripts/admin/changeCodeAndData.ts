import { Address, toNano } from '@ton/core';
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
    console.log('IMPORTANT: Use the same scale as other Vaults (10^8 order, not 10^13)');

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
    
    // 現在のVaultデータを取得して表示
    console.log('\nFetching current vault information...');
    try {
        const vaultData = await vault.getVaultData();
        const accumulatedGasTON = Number(vaultData.accumulatedGas) / 1e9;
        
        console.log('\nCurrent Vault Information:');
        console.log('--------------------');
        console.log(`Status: ${vaultData.stopped ? 'Stopped' : 'Active'}`);
        console.log(`Number of Baskets: ${vaultData.numBaskets}`);
        console.log(`DeDust TON Vault Address: ${vaultData.dedustTonVaultAddress}`);
        console.log(`Accumulated Gas: ${vaultData.accumulatedGas} nanoTON (${accumulatedGasTON.toFixed(9)} TON)`);
        
        // 待機リクエストの数を表示
        const waitingKeys = Array.from(vaultData.dict_waitings.keys());
        console.log(`Pending Requests: ${waitingKeys.length}`);
        
        // 現在のバスケット情報を表示
        if (vaultData.baskets.length > 0) {
            console.log('\nCurrent Baskets:');
            for (let i = 0; i < vaultData.baskets.length; i++) {
                const basket = vaultData.baskets[i];
                console.log(`Basket ${i + 1}:`);
                console.log(`  Weight: ${basket.weight}`);
                console.log(`  Jetton Wallet: ${basket.jettonWalletAddress}`);
                console.log(`  Jetton Master: ${basket.jettonMasterAddress}`);
                console.log(`  DeDust Pool: ${basket.dedustPoolAddress}`);
                console.log(`  DeDust Jetton Vault: ${basket.dedustJettonVaultAddress}`);
            }
        }
        
        console.log('\nPreparing to update Vault configuration...');
    } catch (error) {
        console.warn('Could not fetch current vault data:', error instanceof Error ? error.message : String(error));
        console.log('Continuing with code and data update anyway...');
    }

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

    // 変更予定のデータを表示
    console.log('\nNew Configuration to be Applied:');
    console.log('--------------------');
    console.log(`Admin Address: ${jettonData.adminAddress}`);
    console.log(`DeDust TON Vault Address: ${dedustTonVaultAddress}`);
    console.log(`Number of Baskets: ${baskets.length}`);
    
    for (let i = 0; i < baskets.length; i++) {
        const basket = baskets[i];
        console.log(`\nBasket ${i + 1}:`);
        console.log(`  Weight: ${basket.weight}`);
        console.log(`  Jetton Wallet: ${basket.jettonWalletAddress}`);
        console.log(`  Jetton Master: ${basket.jettonMasterAddress}`);
        console.log(`  DeDust Pool: ${basket.dedustPoolAddress}`);
        console.log(`  DeDust Jetton Vault: ${basket.dedustJettonVaultAddress}`);
    }
    
    // ガス量のカスタマイズオプション
    let gasAmount = toNano('0.5'); // デフォルトは0.5 TON
    
    const customGas = await ui.choose(
        '\nUse custom gas amount for this update?',
        ['No (Use default 0.5 TON)', 'Yes (Custom)'],
        (v) => v
    );
    
    if (customGas === 'Yes (Custom)') {
        console.log('\nEnter custom gas amount:');
        console.log('Examples:');
        console.log('  1.0 = 1.0 TON');
        console.log('  0.5 = 0.5 TON');
        console.log('  0.2 = 0.2 TON');
        const gasValue = parseFloat(await ui.input('Enter gas amount in TON: '));
        
        if (!isNaN(gasValue) && gasValue > 0) {
            gasAmount = toNano(gasValue.toString());
            console.log(`Using custom gas amount: ${gasValue} TON`);
        } else {
            console.log('Invalid gas amount, using default 0.5 TON');
        }
    } else {
        console.log('Using default gas amount: 0.5 TON');
    }
    
    // 実行確認
    const confirmUpdate = await ui.choose(
        '\nProceed with Vault update?',
        ['Yes, update the Vault', 'No, cancel the operation'],
        (v) => v
    );
    
    if (confirmUpdate === 'No, cancel the operation') {
        console.log('Operation cancelled by user.');
        return;
    }
    
    console.log('\nSending Change Code and Data transaction...');
    
    try {
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
            gasAmount
        );
        
        console.log('\nTransaction sent successfully!');
        console.log('The Vault code and data are being updated. This may take a few moments to complete.');
        console.log('You can check the transaction status in TON Explorer.');
    } catch (error) {
        console.error('\nError during update:', error instanceof Error ? error.message : String(error));
        console.log('Please check your wallet and try again.');
    }
}
