import { Address, Cell, toNano } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { compile, NetworkProvider } from '@ton/blueprint';
import { jettonContentToCell, onchainContentToCell } from '../utils/JettonHelpers';

// バスケットテンプレート定義
interface BasketTemplate {
    weight: string;
    jettonMasterAddress: string;
    dedustPoolAddress: string;
    dedustJettonVaultAddress: string;
}

interface VaultTemplate {
    image: string;
    decimals: string;
    baskets: BasketTemplate[];
}

// 定義済みテンプレート
const templates: Record<string, VaultTemplate> = {
    '2baskets index template': {
        image: 'https://bagel-finance.s3.ap-northeast-1.amazonaws.com/images/ton-plus-index.png',
        decimals: '9',
        baskets: [
            {
                weight: '600000000',
                jettonMasterAddress: 'EQDPdq8xjAhytYqfGSX8KcFWIReCufsB9Wdg0pLlYSO_h76w',
                dedustPoolAddress: 'EQBWsAdyAg-8fs3G-m-eUBCXZuVaOldF5-tCMJBJzxQG7nLX',
                dedustJettonVaultAddress: 'EQCRjILmJD0ZD7y6POFyicCx20PoypkEwHJ64AMJ7vwkXGjm'
            }, //hTON
            {
                weight: '400000000',
                jettonMasterAddress: 'EQB0SoxuGDx5qjVt0P_bPICFeWdFLBmVopHhjgfs0q-wsTON',
                dedustPoolAddress: 'EQABt8YegyD7VJnZdFVwom8wwqp0E0X8tN2Y6NhrDmbrnSXP',
                dedustJettonVaultAddress: 'EQCKfS6qMSigCc93CKzv-pBJow2w9TEyadDVZVIR8U-d-iVj'
            } //wsTON
        ]
    },
    '3baskets index template': {
        image: 'https://bagel-finance.s3.ap-northeast-1.amazonaws.com/images/ton-plus-index.png',
        decimals: '9',
        baskets: [
            {
                weight: '340000000',
                jettonMasterAddress: 'EQDPdq8xjAhytYqfGSX8KcFWIReCufsB9Wdg0pLlYSO_h76w',
                dedustPoolAddress: 'EQBWsAdyAg-8fs3G-m-eUBCXZuVaOldF5-tCMJBJzxQG7nLX',
                dedustJettonVaultAddress: 'EQCRjILmJD0ZD7y6POFyicCx20PoypkEwHJ64AMJ7vwkXGjm'
            }, //hTON
            {
                weight: '330000000',
                jettonMasterAddress: 'EQCqC6EhRJ_tpWngKxL6dV0k6DSnRUrs9GSVkLbfdCqsj6TE',
                dedustPoolAddress: 'EQBcXOgImwib9hI7vRLuBtTbMp3EES1rKiqyr8c2WtcRH2eO',
                dedustJettonVaultAddress: 'EQB2PfLwzabJO1cMtarDdcIdW8l78IvH2Y8r396Fno-TNnf7'
            },//STAKED
            {
                weight: '330000000',
                jettonMasterAddress: 'EQB0SoxuGDx5qjVt0P_bPICFeWdFLBmVopHhjgfs0q-wsTON',
                dedustPoolAddress: 'EQABt8YegyD7VJnZdFVwom8wwqp0E0X8tN2Y6NhrDmbrnSXP',
                dedustJettonVaultAddress: 'EQCKfS6qMSigCc93CKzv-pBJow2w9TEyadDVZVIR8U-d-iVj'
            }//wsTON
        ]
    },
    // 他のテンプレートもここに追加できます
};

// 1. Jettonコンテンツ関連の関数
async function getJettonContent(ui: any, templateData?: VaultTemplate): Promise<Cell> {
    const typeInput = await ui.choose('Select Jetton content type.', ['Onchain', 'Offchain'], (v: string) => v);
    
    if (typeInput === 'Onchain') {
        let name = await ui.input('Input Jetton name: ');
        const symbol = await ui.input('Input Jetton symbol: ');
        const description = await ui.input('Input Jetton description: ');
        const image = templateData ? templateData.image : await ui.input('Input Jetton image: ');
        let decimals = templateData ? templateData.decimals : await ui.input('Input Jetton decimals (default: 9): ');
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
    console.log(`- 600000000 = 0.60 (60%)`);
    console.log(`- 400000000 = 0.40 (40%)`);
    console.log(`IMPORTANT: Use the same scale as other Vaults (10^8 order, not 10^13)`);
    let weightInput = await ui.input(`Enter weight for Basket ${index + 1}: `);
    while (!weightInput) {
        console.log('Weight is required. Please enter a valid number.');
        weightInput = await ui.input(`Enter weight for Basket ${index + 1}: `);
    }
    const weight = BigInt(weightInput);
    const jettonMasterAddress = Address.parse(await ui.input(`Enter Jetton Master Address for Basket ${index + 1}: `));
    const dedustPoolAddress = Address.parse(await ui.input(`Enter DeDust Pool Address for Basket ${index + 1}: `));
    const dedustJettonVaultAddress = Address.parse(await ui.input(`Enter DeDust Jetton Vault Address for Basket ${index + 1}: `));

    // Note: jettonWalletAddress will be determined during initVault
    // Here we use a placeholder address that will be replaced
    const placeholderWalletAddress = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');

    return {
        weight,
        jettonWalletAddress: placeholderWalletAddress, // This will be set during initVault
        dedustPoolAddress,
        dedustJettonVaultAddress,
        jettonMasterAddress
    };
}

async function getBaskets(ui: any, templateData?: VaultTemplate) {
    if (templateData) {
        const basketCount = templateData.baskets.length;
        console.log(`Using template with ${basketCount} baskets`);
        
        const baskets = [];
        for (let i = 0; i < basketCount; i++) {
            const templateBasket = templateData.baskets[i];
            
            console.log(`\nEntering details for Basket ${i + 1}:`);
            console.log(`Note: Weight uses 9 decimals. For example:`);
            console.log(`- 600000000 = 0.60 (60%)`);
            console.log(`- 400000000 = 0.40 (40%)`);
            console.log(`IMPORTANT: Use the same scale as other Vaults (10^8 order, not 10^13)`);
            
            // テンプレートから値を使用
            const weight = BigInt(templateBasket.weight);
            console.log(`Enter weight for Basket ${i + 1}: ${templateBasket.weight}`);
            
            const jettonMasterAddress = Address.parse(templateBasket.jettonMasterAddress);
            console.log(`Enter Jetton Master Address for Basket ${i + 1}: ${templateBasket.jettonMasterAddress}`);
            
            const dedustPoolAddress = Address.parse(templateBasket.dedustPoolAddress);
            console.log(`Enter DeDust Pool Address for Basket ${i + 1}: ${templateBasket.dedustPoolAddress}`);
            
            const dedustJettonVaultAddress = Address.parse(templateBasket.dedustJettonVaultAddress);
            console.log(`Enter DeDust Jetton Vault Address for Basket ${i + 1}: ${templateBasket.dedustJettonVaultAddress}`);
            
            // プレースホルダーウォレットアドレス
            const placeholderWalletAddress = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');
            
            baskets.push({
                weight,
                jettonWalletAddress: placeholderWalletAddress,
                dedustPoolAddress,
                dedustJettonVaultAddress,
                jettonMasterAddress
            });
        }
        
        return baskets;
    } else {
        // 通常の手動入力フロー
        const basketCount = parseInt(await ui.input('How many baskets do you want to configure? ')) || 2;
        const baskets = [];
        
        for (let i = 0; i < basketCount; i++) {
            baskets.push(await inputBasket(ui, i));
        }
        
        return baskets;
    }
}

// 3. メイン処理
export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    // テンプレート選択オプションを作成
    const templateOptions = ['[手動入力]', ...Object.keys(templates)];
    const templateChoice = await ui.choose('テンプレートを選択するか、手動入力を選んでください:', templateOptions, (v: string) => v);
    
    // 選択されたテンプレートまたはnull（手動入力の場合）
    const selectedTemplate = templateChoice === '[手動入力]' ? undefined : templates[templateChoice];

    // 3.1 Jettonコンテンツの設定
    const content = await getJettonContent(ui, selectedTemplate);

    // 3.2 バスケットの設定
    const baskets = await getBaskets(ui, selectedTemplate);

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


