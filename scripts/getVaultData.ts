import { Address } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { JettonMinter } from '../wrappers/JettonMinter';
import { NetworkProvider } from '@ton/blueprint';
import { getTonClient } from '../utils/TonClient';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // Get network from provider
    const network = provider.network() === 'custom' ? 'mainnet' : provider.network();
    const tonClient = getTonClient(network as 'mainnet' | 'testnet');

    // Get vault address and fetch data
    const vaultAddr = await ui.inputAddress('Input vault address: ');
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    
    console.log('\nRetrieving Vault data...');
    const vaultData = await vault.getVaultData();

    // Check if vault is initialized (has baskets)
    const initialized = vaultData.baskets.length > 0;

    console.log('\nVault Information:');
    console.log('--------------------');
    console.log(`Initialized: ${initialized}`);
    console.log(`Stopped: ${vaultData.stopped}`);
    console.log(`Dedust TON Vault Address: ${vaultData.dedustTonVaultAddress}`);
    
    // 累積ガス量の表示（TON単位）
    const accumulatedGasTON = Number(vaultData.accumulatedGas) / 1e9;
    console.log(`Accumulated Gas: ${vaultData.accumulatedGas} nanoTON (${accumulatedGasTON.toFixed(9)} TON)`);
    
    console.log('\nBasket Information:');
    console.log('--------------------');
    // Get Jetton information for each basket
    for (let i = 0; i < vaultData.baskets.length; i++) {
        const basket = vaultData.baskets[i];
        console.log(`\nBasket ${i + 1}:`);
        console.log(`weight: ${basket.weight}`);
        console.log(`jettonWalletAddress: ${basket.jettonWalletAddress}`);
        console.log(`dedustPoolAddress: ${basket.dedustPoolAddress}`);
        console.log(`dedustJettonVaultAddress: ${basket.dedustJettonVaultAddress}`);
        console.log(`jettonMasterAddress: ${basket.jettonMasterAddress}`);

        // Get Jetton master data
        const jettonMaster = provider.open(JettonMinter.createFromAddress(basket.jettonMasterAddress));
        const jettonData = await jettonMaster.getJettonData();

        console.log('\nJetton Master Information:');
        console.log('--------------------');
        console.log(`Total Supply: ${jettonData.totalSupply}`);
        console.log(`Mintable: ${jettonData.mintable}`);
        console.log(`Admin Address: ${jettonData.adminAddress}`);
        console.log(`Content: ${jettonData.content}`);
    }
    
    // dict_waitingsの情報表示
    console.log('\nWaiting Requests Information:');
    console.log('--------------------');
    
    // 辞書のキーを取得
    const waitingKeys = Array.from(vaultData.dict_waitings.keys());
    console.log(`Waiting Requests Count: ${waitingKeys.length}`);
    
    if (waitingKeys.length > 0) {
        console.log('\nWaiting Users:');
        for (const key of waitingKeys) {
            console.log(`  - ${key.toString(16)}`); // 16進数でユーザーアドレスのハッシュを表示
            
            // オプション: 詳細情報の表示
            const userDict = vaultData.dict_waitings.get(key);
            if (userDict) {
                console.log('    Baskets with pending amounts:');
                // Dictionary型はMap-likeだがentriesメソッドがないのでkeys()とget()を使う
                const basketIndices = Array.from(userDict.keys());
                for (const basketIdx of basketIndices) {
                    const amount = userDict.get(basketIdx);
                    console.log(`    Basket ${basketIdx}: ${amount ? amount.toString() : 'unknown'} tokens`);
                }
            }
        }
    }
}
