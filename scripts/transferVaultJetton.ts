import { Address, beginCell } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { Op } from '../utils/Constants';

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
    const toAddr = Address.parse(
        await ui.input('Enter destination address: ')
    );

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

    await vault.sendAdminMessage(
        provider.sender(),
        beginCell()
            .storeUint(0x18, 6)
            .storeAddress(jettonWalletAddr)
            .storeCoins(50000000)
            .storeUint(1, 107)
            .storeRef(body)
            .endCell(),
        1,
    );
}
