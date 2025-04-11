import { Address, beginCell } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { toNano } from '@ton/core';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    console.log('\n⚠️ VAULT DESTRUCTION TOOL ⚠️');
    console.log('------------------------------');
    console.log('\nWARNING: This action will destroy a Vault and transfer any remaining TON.');
    console.log('This operation CANNOT be undone. Proceed with extreme caution!\n');
    
    // Vaultアドレスの入力
    const vaultAddr = await ui.inputAddress('Vault address to destroy: ');
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    
    // 現在のVaultデータを取得して確認
    console.log('\nFetching vault information before destruction...');
    try {
        const jettonData = await vault.getJettonData();
        const vaultData = await vault.getVaultData();
        const accumulatedGasTON = Number(vaultData.accumulatedGas) / 1e9;
        
        console.log('\nVault Information:');
        console.log('--------------------');
        console.log(`Admin Address: ${jettonData.adminAddress}`);
        console.log(`Status: ${vaultData.stopped ? 'Stopped' : 'Active'}`);
        console.log(`Number of Baskets: ${vaultData.numBaskets}`);
        console.log(`Total Supply: ${jettonData.totalSupply}`);
        console.log(`Accumulated Gas: ${vaultData.accumulatedGas} nanoTON (${accumulatedGasTON.toFixed(9)} TON)`);
        
        if (vaultData.baskets.length > 0) {
            console.log('\n⚠️ WARNING: This vault has active baskets defined!');
            if (jettonData.totalSupply > 0) {
                console.log('⚠️ CRITICAL WARNING: This vault has active supply!');
                console.log('⚠️ Users may lose access to their tokens if you proceed!\n');
            }
        }
        
        // 待機リクエストの数を確認
        const waitingKeys = Array.from(vaultData.dict_waitings.keys());
        if (waitingKeys.length > 0) {
            console.log(`⚠️ WARNING: ${waitingKeys.length} pending requests will be lost!`);
        }
    } catch (error) {
        console.warn('Could not fetch complete vault data:', error instanceof Error ? error.message : String(error));
        console.log('⚠️ Cannot fully verify vault state. Destruction is highly risky!\n');
        
        const proceedAnyway = await ui.choose(
            'Unable to verify vault state. Still want to proceed?',
            ['No, cancel operation', 'Yes, proceed at my own risk'],
            (v) => v
        );
        
        if (proceedAnyway === 'No, cancel operation') {
            console.log('Operation cancelled by user.');
            return;
        }
    }
    
    // 送金先アドレスの入力
    console.log('\n⚠️ Specify the address to receive any remaining TON balance:');
    const toAddr = await ui.inputAddress('Destination address for remaining TON: ');
    
    // 実行確認
    const confirmOperation = await ui.choose(
        '\n⚠️ Final Confirmation Required: Proceed with vault destruction?',
        ['No, cancel operation', 'Yes, proceed with destruction'],
        (v) => v
    );
    
    if (confirmOperation === 'No, cancel operation') {
        console.log('Operation cancelled by user.');
        return;
    }
    
    // ガス量のカスタマイズオプション
    let gasAmount = toNano('0.05'); // デフォルトは0.05 TON
    
    const customGas = await ui.choose(
        'Use custom gas amount for destruction?',
        ['No (Use default 0.05 TON)', 'Yes (Custom)'],
        (v) => v
    );
    
    if (customGas === 'Yes (Custom)') {
        console.log('\nEnter custom gas amount in TON:');
        console.log(' 0.1 = 0.1 TON');
        console.log(' 0.05 = 0.05 TON');
        const gasValue = parseFloat(await ui.input('Enter gas amount in TON: '));
        
        if (!isNaN(gasValue) && gasValue > 0) {
            gasAmount = toNano(gasValue.toString());
        } else {
            console.log('Invalid gas amount, using default 0.05 TON');
        }
    }
    
    console.log(`\n⚠️ Sending destruction message with ${Number(gasAmount) / 1e9} TON of gas...`);
    console.log(`⚠️ Vault at ${vaultAddr.toString()} will be destroyed.`);
    console.log(`⚠️ Any remaining balance will be sent to ${toAddr.toString()}`);
    
    try {
        // 破壊メッセージの送信
        const body = beginCell().endCell();
        await vault.sendAdminMessage(
            provider.sender(),
            beginCell()
                .storeUint(0x18, 6)
                .storeAddress(toAddr)
                .storeCoins(gasAmount)
                .storeUint(0, 107)
                .storeRef(body)
                .endCell(),
            160,
        );
        
        console.log('\n✅ Destruction message sent successfully!');
        console.log('⚠️ The vault is being destroyed. This process cannot be reversed.');
    } catch (error) {
        console.error('\n❌ Error during destruction:', error instanceof Error ? error.message : String(error));
        console.log('Please check your wallet and try again if necessary.');
    }
}
