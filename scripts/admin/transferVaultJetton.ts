import { Address, beginCell } from '@ton/core';
import { Vault } from '../../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { Op } from '../../utils/Constants';

// Default response address (Bagel Factory address on mainnet)
// This address will receive transfer notifications and can be overridden if needed
const DEFAULT_RESPONSE_ADDR = 'UQCcSoPv2JbPHBMLeo6C6N6or0XYrpEO_kcFc1RYU_SWCjKY';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    console.log('\nTransfer Jettons from Vault');
    console.log('----------------------------');

    // 1. Source Vault Address
    // The contract address that currently holds the tokens
    const vaultAddr = Address.parse(
        await ui.input('Enter source Vault address: ')
    );

    // 2. Jetton Wallet Address
    // The address of the specific Jetton type to transfer
    const jettonWalletAddr = Address.parse(
        await ui.input('Enter Jetton wallet address: ')
    );

    // 3. Destination Address
    // The wallet address that will receive the tokens
    // 環境に応じたデフォルトアドレスを設定
    const isTestnet = provider.network() === 'testnet';
    const defaultDestAddr = isTestnet 
        ? '0QB-re93kxeCoDDQ66RUZuG382uIAg3bhiFCzrlaeBTN6psR'
        : 'UQAwUvvYnPpImBfrKl3-KRYh05aNrUKTGgcarTB_yzhAtwpk';
    
    console.log(`デフォルトの送信先アドレス（${isTestnet ? 'テストネット' : 'メインネット'}）: ${defaultDestAddr}`);
    
    const addressChoice = await ui.choose(
        '送信先アドレスの選択:',
        ['デフォルトアドレスを使用する', '別のアドレスを入力する'],
        (v) => v
    );
    
    let toAddr;
    if (addressChoice === 'デフォルトアドレスを使用する') {
        toAddr = Address.parse(defaultDestAddr);
        console.log(`デフォルトアドレスを使用します: ${toAddr.toString()}`);
    } else {
        toAddr = Address.parse(
            await ui.input('送信先アドレスを入力してください: ')
        );
    }

    // 4. Response Address (Optional)
    // The address that will receive transfer notifications
    // Defaults to Bagel Factory address if not specified
    let responseAddr: Address;
    const useCustomResponse = await ui.choose(
        'Use custom response address?',
        ['No (Use Bagel Factory)', 'Yes (Custom)'],
        (v) => v
    );
    
    if (useCustomResponse === 'Yes (Custom)') {
        responseAddr = Address.parse(
            await ui.input('Enter custom response address: ')
        );
    } else {
        responseAddr = Address.parse(DEFAULT_RESPONSE_ADDR);
    }

    // 5. Transfer Amount
    console.log('\nTransfer amount must be specified in nanojettons (9 decimal places)');
    console.log('Examples:');
    console.log('  1000000000 = 1.0 Jetton');
    console.log('   500000000 = 0.5 Jetton');
    const amount = parseInt(
        await ui.input('Enter amount in nanojettons: ')
    );
    if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid transfer amount');
    }

    // Initialize Vault contract
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    
    // 転送前にコントラクトのガス情報を確認
    console.log('\nFetching vault information before transfer...');
    try {
        const vaultData = await vault.getVaultData();
        console.log('\nVault Gas Information:');
        console.log('--------------------');
        console.log(`Query-based Excess Gas Dictionary: ${vaultData.dict_query_excess_gas ? 'Available' : 'Not available'}`);
        // 注意: dict_query_excess_gasはセル型なので、直接数値として表示できません
        // 必要に応じて辞書の内容を解析して表示することができます
        
        // バスケット数を確認して表示
        console.log(`Number of Baskets: ${vaultData.numBaskets}`);
        console.log(`Vault Status: ${vaultData.stopped ? 'Stopped' : 'Active'}`);
    } catch (error) {
        console.warn('Could not fetch vault data:', error instanceof Error ? error.message : String(error));
        console.log('Continuing with transfer operation anyway...');
    }

    // Create transfer message
    const body = beginCell()
        .storeUint(Op.transfer, 32)
        .storeUint(0, 64)
        .storeCoins(amount)
        .storeAddress(toAddr)
        .storeAddress(responseAddr)
        .storeUint(0, 1)
        .storeCoins(0)
        .storeUint(0, 1)
        .endCell();

    // 転送用ガス量を設定またはカスタマイズするオプション
    let transferGas = 50000000; // デフォルトは0.05 TON
    
    const customGas = await ui.choose(
        'Use custom gas amount for transfer?',
        ['No (Use default 0.05 TON)', 'Yes (Custom)'],
        (v) => v
    );
    
    if (customGas === 'Yes (Custom)') {
        console.log('\nEnter custom gas amount in nanoTON:');
        console.log(' 100000000 = 0.1 TON');
        console.log('  50000000 = 0.05 TON');
        const gasAmount = parseInt(
            await ui.input('Enter gas amount in nanoTON: ')
        );
        if (!isNaN(gasAmount) && gasAmount > 0) {
            transferGas = gasAmount;
        } else {
            console.log('Invalid gas amount, using default 0.05 TON');
        }
    }
    
    console.log(`\nSending transfer with ${transferGas / 1e9} TON of gas...`);
    console.log(`Transferring ${amount / 1e9} Jettons from ${vaultAddr.toString()} to ${toAddr.toString()}`);
    
    try {
        await vault.sendAdminMessage(
            provider.sender(),
            beginCell()
                .storeUint(0x18, 6)
                .storeAddress(jettonWalletAddr)
                .storeCoins(transferGas)
                .storeUint(1, 107)
                .storeRef(body)
                .endCell(),
            1,
        );
        console.log('\nTransfer message sent successfully!');
        console.log('Note: Excess gas will be accumulated in the contract and can be returned later.');
    } catch (error) {
        console.error('\nError during transfer:', error instanceof Error ? error.message : String(error));
        console.log('Please check the transaction in a TON explorer for more details.');
    }
}
