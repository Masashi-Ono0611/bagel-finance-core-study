import { Address, Cell, toNano } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { compile, NetworkProvider } from '@ton/blueprint';
import { jettonContentToCell, onchainContentToCell } from '../utils/JettonHelpers';

// 1. Jettonコンテンツ関連の関数
async function getJettonContent(ui: any): Promise<Cell> {
    const typeInput = await ui.choose('Select Jetton content type.', ['Onchain', 'Offchain'], (v: string) => v);
    
    if (typeInput === 'Onchain') {
        let name = await ui.input('Input Jetton name: ');
        const symbol = await ui.input('Input Jetton symbol: ');
        const description = await ui.input('Input Jetton description: ');
        const image = await ui.input('Input Jetton image: ');
        let decimals = await ui.input('Input Jetton decimals (default: 9): ');
        if (decimals === '') {
            decimals = '9';
        }
        return onchainContentToCell({
            name,
            symbol,
            description,
            image,
            decimals,
        });
    } else {
        const uri = await ui.input('Input Jetton content URI: ');
        return jettonContentToCell(uri);
    }
}

// 2. バスケット設定関連の関数
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

// 3. メイン処理
export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    // 3.1 Jettonコンテンツの設定
    const content = await getJettonContent(ui);

    // 3.2 バスケットの設定
    const baskets = await getBaskets(ui);

    // 3.3 Vaultのデプロイ
    // DeDust TON Vaultアドレスは、DeDustのメインプールアドレスで固定
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


