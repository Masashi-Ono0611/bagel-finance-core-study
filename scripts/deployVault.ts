import { Address, Cell, toNano } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { compile, NetworkProvider } from '@ton/blueprint';
import { jettonContentToCell, onchainContentToCell } from '../utils/JettonHelpers';

async function inputBasket(ui: any, index: number) {
    console.log(`\nEntering details for Basket ${index + 1}:`);
    console.log(`Note: Weight uses 9 decimals. For example:`);
    console.log(`- 60000000000000 = 0.60 (60%)`);
    console.log(`- 40000000000000 = 0.40 (40%)`);
    let weightInput = await ui.input(`Enter weight for Basket ${index + 1}: `);
    while (!weightInput) {
        console.log('Weight is required. Please enter a valid number.');
        weightInput = await ui.input(`Enter weight for Basket ${index + 1}: `);
    }
    const weight = BigInt(weightInput);
    const jettonAddress = Address.parse(await ui.input(`Enter Jetton Address for Basket ${index + 1} (used for both Wallet and Master): `));
    const dedustPoolAddress = Address.parse(await ui.input(`Enter DeDust Pool Address for Basket ${index + 1}: `));
    const dedustJettonVaultAddress = Address.parse(await ui.input(`Enter DeDust Jetton Vault Address for Basket ${index + 1}: `));

    return {
        weight,
        jettonWalletAddress: jettonAddress,
        dedustPoolAddress,
        dedustJettonVaultAddress,
        jettonMasterAddress: jettonAddress
    };
}

async function getBaskets(ui: any) {
    const basketCount = parseInt(await ui.input('How many baskets do you want to configure? ')) || 2;
    const baskets = [];
    
    for (let i = 0; i < basketCount; i++) {
        baskets.push(await inputBasket(ui, i));
    }
    
    return baskets;
}

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    let content: Cell;
    const typeInput = await ui.choose('Select Jetton content type.', ['Onchain', 'Offchain'], (v) => v);
    if (typeInput === 'Onchain') {
        let name = await ui.input('Input Jetton name: ');
        const symbol = await ui.input('Input Jetton symbol: ');
        const description = await ui.input('Input Jetton description: ');
        const image = await ui.input('Input Jetton image: ');
        let decimals = await ui.input('Input Jetton decimals (default: 9): ');
        if (decimals === '') {
            decimals = '9';
        }
        content = onchainContentToCell({
            name,
            symbol,
            description,
            image,
            decimals,
        });
    } else {
        const uri = await ui.input('Input Jetton content URI: ');
        content = jettonContentToCell(uri);
    }

    const baskets = await getBaskets(ui);

    const vault = provider.open(
        Vault.createFromConfig(
            {
                adminAddress: provider.sender()?.address!,
                content,
                walletCode: await compile('JettonWallet'),
                dedustTonVaultAddress: Address.parse('EQDa4VOnTYlLvDJ0gZjNYm5PXfSmmtL6Vs6A_CZEtXCNICq_'),
                baskets,
            },
            await compile('Vault'),
        ),
    );

    await vault.sendDeploy(provider.sender(), toNano('0.1'));

    await provider.waitForDeploy(vault.address);
}
