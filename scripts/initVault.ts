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
    
    // デバッグ用の一時的な変数
    let jettonData;
    let vaultData;
    
    try {
        // まず基本的なgetJettonDataを試してみる
        console.log('Trying to get jetton data first...');
        jettonData = await vault.getJettonData();
        console.log('Jetton data:', jettonData);
        
        // 次にgetVaultDataを試す
        console.log('\nNow trying to get vault data...');
        vaultData = await vault.getVaultData();
        console.log('Vault data:', vaultData);
    } catch (error) {
        console.error('Error fetching data:', error);
        return;
    }
    
    // データ取得に成功した場合のみ続行
    if (!vaultData) {
        console.error('Failed to get vault data');
        return;
    }

    console.log('\nCurrent Basket Configuration:');
    console.log('--------------------');
    vaultData.baskets.forEach((basket, index) => {
        console.log(`\nBasket ${index + 1}:`);
        console.log(`weight: ${basket.weight}`);
        console.log(`jettonWalletAddress: ${basket.jettonWalletAddress}`);
        console.log(`dedustPoolAddress: ${basket.dedustPoolAddress}`);
        console.log(`dedustJettonVaultAddress: ${basket.dedustJettonVaultAddress}`);
        console.log(`jettonMasterAddress: ${basket.jettonMasterAddress}`);
    });

    const newBaskets = await Promise.all(
        vaultData.baskets.map(async (basket: any) => ({
            weight: basket.weight,
            jettonWalletAddress: await getJettonWalletAddr(tonClient, basket.jettonMasterAddress, vaultAddr),
            dedustPoolAddress: basket.dedustPoolAddress,
            dedustJettonVaultAddress: basket.dedustJettonVaultAddress,
            jettonMasterAddress: basket.jettonMasterAddress,
        })),
    );

    console.log('\nNew Basket Configuration:');
    console.log('--------------------');
    newBaskets.forEach((basket: any, index: number) => {
        console.log(`\nBasket ${index + 1}:`);
        console.log(`weight: ${basket.weight}`);
        console.log(`jettonWalletAddress: ${basket.jettonWalletAddress}`);
        console.log(`dedustPoolAddress: ${basket.dedustPoolAddress}`);
        console.log(`dedustJettonVaultAddress: ${basket.dedustJettonVaultAddress}`);
        console.log(`jettonMasterAddress: ${basket.jettonMasterAddress}`);

        // Highlight if there are any changes
        if (basket.jettonWalletAddress.toString() !== vaultData.baskets[index].jettonWalletAddress.toString()) {
            console.log('\n*** jettonWalletAddress has been updated ***');
            console.log(`Old: ${vaultData.baskets[index].jettonWalletAddress}`);
            console.log(`New: ${basket.jettonWalletAddress}`);
        }
    });

    // dict_waitingsとaccumulated_gasを処理
    // dict_waitingsは元のものを保持
    const waitingsDict = vaultData.dict_waitings;
    
    // accumulated_gasも元の値を維持
    const accumulatedGas = vaultData.accumulatedGas || 0n;
    
    console.log('\nMaintaining accumulated gas value:', accumulatedGas.toString());
    
    await vault.sendChangeVaultData(
        provider.sender(), 
        false, 
        vaultData.dedustTonVaultAddress, 
        newBaskets,
        waitingsDict,
        accumulatedGas
    );
    
    console.log('\nVault data updated successfully!');
    console.log('accumulated_gas value:', accumulatedGas.toString());
}
