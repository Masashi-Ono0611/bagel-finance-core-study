import { Address, Cell, toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { Vault } from '../wrappers/Vault';
import { jettonContentToCell, onchainContentToCell } from '../utils/JettonHelpers';
import { AddressHelper } from '../utils/AddressHelper';
import { 
    DexType, 
    DEDUST_ROUTER_MAINNET, 
    DEDUST_ROUTER_TESTNET, 
    STONFI_ROUTER_MAINNET, 
    STONFI_ROUTER_TESTNET 
} from '../utils/Constants';

// バスケットテンプレート定義
interface BasketTemplate {
    weight: string;
    jettonMasterAddress: string;
    dedustPoolAddress?: string;
    dedustJettonVaultAddress?: string;
    stonfiPoolAddress?: string; // StonfiプールアドレスはDeDustと構造が異なる
    dexType?: number; // DEXタイプ（0=DeDust, 1=Stonfi）
}

interface VaultTemplate {
    image: string;
    decimals: string;
    baskets: BasketTemplate[];
}

// 定義済みテンプレート
const templates: Record<string, VaultTemplate> = {
    'DeDust mainnet 2baskets': {
        image: 'https://bagel-finance.s3.ap-northeast-1.amazonaws.com/images/ton-plus-index.png',
        decimals: '9',
        baskets: [
            {
                weight: '600000000',
                jettonMasterAddress: 'EQDPdq8xjAhytYqfGSX8KcFWIReCufsB9Wdg0pLlYSO_h76w',
                dedustPoolAddress: 'EQBWsAdyAg-8fs3G-m-eUBCXZuVaOldF5-tCMJBJzxQG7nLX',
                dedustJettonVaultAddress: 'EQCRjILmJD0ZD7y6POFyicCx20PoypkEwHJ64AMJ7vwkXGjm',
                dexType: DexType.DEDUST
            }, //hTON
            {
                weight: '400000000',
                jettonMasterAddress: 'EQB0SoxuGDx5qjVt0P_bPICFeWdFLBmVopHhjgfs0q-wsTON',
                dedustPoolAddress: 'EQABt8YegyD7VJnZdFVwom8wwqp0E0X8tN2Y6NhrDmbrnSXP',
                dedustJettonVaultAddress: 'EQCKfS6qMSigCc93CKzv-pBJow2w9TEyadDVZVIR8U-d-iVj',
                dexType: DexType.DEDUST
            } //wsTON
        ]
    },
    'DeDust mainnet 3baskets': {
        image: 'https://bagel-finance.s3.ap-northeast-1.amazonaws.com/images/ton-plus-index.png',
        decimals: '9',
        baskets: [
            {
                weight: '340000000',
                jettonMasterAddress: 'EQDPdq8xjAhytYqfGSX8KcFWIReCufsB9Wdg0pLlYSO_h76w',
                dedustPoolAddress: 'EQBWsAdyAg-8fs3G-m-eUBCXZuVaOldF5-tCMJBJzxQG7nLX',
                dedustJettonVaultAddress: 'EQCRjILmJD0ZD7y6POFyicCx20PoypkEwHJ64AMJ7vwkXGjm',
                dexType: DexType.DEDUST
            }, //hTON
            {
                weight: '330000000',
                jettonMasterAddress: 'EQCqC6EhRJ_tpWngKxL6dV0k6DSnRUrs9GSVkLbfdCqsj6TE',
                dedustPoolAddress: 'EQBcXOgImwib9hI7vRLuBtTbMp3EES1rKiqyr8c2WtcRH2eO',
                dedustJettonVaultAddress: 'EQB2PfLwzabJO1cMtarDdcIdW8l78IvH2Y8r396Fno-TNnf7',
                dexType: DexType.DEDUST
            },//STAKED
            {
                weight: '330000000',
                jettonMasterAddress: 'EQB0SoxuGDx5qjVt0P_bPICFeWdFLBmVopHhjgfs0q-wsTON',
                dedustPoolAddress: 'EQABt8YegyD7VJnZdFVwom8wwqp0E0X8tN2Y6NhrDmbrnSXP',
                dedustJettonVaultAddress: 'EQCKfS6qMSigCc93CKzv-pBJow2w9TEyadDVZVIR8U-d-iVj',
                dexType: DexType.DEDUST
            }//wsTON
        ]
    },
    'DeDust testnet 2baskets': {
        image: 'https://bagel-finance.s3.ap-northeast-1.amazonaws.com/images/ton-plus-index.png',
        decimals: '9',
        baskets: [
            {
                weight: '600000000',
                jettonMasterAddress: 'kQDZF8LaqYGxBqACM-oA6w8cpIPwzMAimn4TFhNKsfPMtGHw',
                dedustPoolAddress: 'EQBWsAdyAg-8fs3G-m-eUBCXZuVaOldF5-tCMJBJzxQG7nLX',//仮の値
                dedustJettonVaultAddress: 'EQCRjILmJD0ZD7y6POFyicCx20PoypkEwHJ64AMJ7vwkXGjm',//仮の値
                dexType: DexType.DEDUST
            }, //APR14002
            {
                weight: '400000000',
                jettonMasterAddress: 'kQDLvsZol3juZyOAVG8tWsJntOxeEZWEaWCbbSjYakQpuYN5',
                dedustPoolAddress: 'EQABt8YegyD7VJnZdFVwom8wwqp0E0X8tN2Y6NhrDmbrnSXP',//仮の値
                dedustJettonVaultAddress: 'EQCKfS6qMSigCc93CKzv-pBJow2w9TEyadDVZVIR8U-d-iVj',//仮の値
                dexType: DexType.DEDUST
            } //TRT
        ]
    },
    'Stonfi testnet 2baskets': {
        image: 'https://bagel-finance.s3.ap-northeast-1.amazonaws.com/images/ton-plus-index.png',
        decimals: '9',
        baskets: [
            {
                weight: '600000000',
                jettonMasterAddress: 'kQDZF8LaqYGxBqACM-oA6w8cpIPwzMAimn4TFhNKsfPMtGHw',
                stonfiPoolAddress: 'kQBMHZC2j9xT-wnbzuDmIVjkE2j39n91LsjV7-7vlWS302WR', // StonFiプールアドレス（例）
                dexType: DexType.STONFI
            }, //APR14002
            {
                weight: '400000000',
                jettonMasterAddress: 'kQDLvsZol3juZyOAVG8tWsJntOxeEZWEaWCbbSjYakQpuYN5',
                stonfiPoolAddress: 'kQB6PDvbGUx0UBqFxql00Rnmq1D02_dXVCWCGzCzXv6y9zrE', // テストネットで見つけたStonFiプールアドレス
                dexType: DexType.STONFI
            } //TRT
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
    
    // DEXタイプの選択
    const dexTypeChoice = await ui.choose(
        `Select DEX type for Basket ${index + 1}:`,
        ['DeDust', 'Stonfi'],
        (v: string) => v
    );
    const dexType = dexTypeChoice === 'DeDust' ? DexType.DEDUST : DexType.STONFI;
    
    // DEXタイプに応じたプロンプトメッセージを変更
    const dexName = dexType === DexType.DEDUST ? 'DeDust' : 'Stonfi';
    
    const jettonMasterAddress = Address.parse(await ui.input(`Enter Jetton Master Address for Basket ${index + 1}: `));
    const dedustPoolAddress = Address.parse(await ui.input(`Enter ${dexName} Pool Address for Basket ${index + 1}: `));
    const dedustJettonVaultAddress = Address.parse(await ui.input(`Enter ${dexName} Jetton Vault Address for Basket ${index + 1}: `));

    // Note: jettonWalletAddress will be determined during initVault
    // Here we use a placeholder address that will be replaced
    const placeholderWalletAddress = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');

    return {
        weight,
        jettonWalletAddress: placeholderWalletAddress, // This will be set during initVault
        dedustPoolAddress,
        dedustJettonVaultAddress,
        jettonMasterAddress,
        dexType
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
            
            // プレースホルダーウォレットアドレス
            const placeholderWalletAddress = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');
            
            // DEXタイプの設定（テンプレートに指定がない場合はデフォルトでDeDust）
            const dexType = templateBasket.dexType !== undefined ? templateBasket.dexType : DexType.DEDUST;
            
            // DEXタイプに応じて必要なアドレスを取得
            if (dexType === DexType.DEDUST) {
                // DeDustの場合
                if (!templateBasket.dedustPoolAddress || !templateBasket.dedustJettonVaultAddress) {
                    throw new Error(`Basket ${i + 1} is configured as DeDust but missing required DeDust addresses`);
                }
                
                const dedustPoolAddress = Address.parse(templateBasket.dedustPoolAddress);
                console.log(`Enter DeDust Pool Address for Basket ${i + 1}: ${templateBasket.dedustPoolAddress}`);
                
                const dedustJettonVaultAddress = Address.parse(templateBasket.dedustJettonVaultAddress);
                console.log(`Enter DeDust Jetton Vault Address for Basket ${i + 1}: ${templateBasket.dedustJettonVaultAddress}`);
                
                baskets.push({
                    weight,
                    jettonWalletAddress: placeholderWalletAddress,
                    dedustPoolAddress,
                    dedustJettonVaultAddress,
                    jettonMasterAddress,
                    dexType
                });
            } else if (dexType === DexType.STONFI) {
                // Stonfiの場合
                if (!templateBasket.stonfiPoolAddress) {
                    throw new Error(`Basket ${i + 1} is configured as Stonfi but missing required Stonfi pool address`);
                }
                
                const stonfiPoolAddress = Address.parse(templateBasket.stonfiPoolAddress);
                console.log(`Enter Stonfi Pool Address for Basket ${i + 1}: ${templateBasket.stonfiPoolAddress}`);
                
                // Stonfiの場合、DeDustアドレスの代わりにStonfiアドレスを使用
                // 内部的には同じフィールドを使い回すが、コントラクト側で適切に処理される
                baskets.push({
                    weight,
                    jettonWalletAddress: placeholderWalletAddress,
                    dedustPoolAddress: stonfiPoolAddress, // Stonfiプールアドレスを格納
                    dedustJettonVaultAddress: stonfiPoolAddress, // Stonfiでは同じアドレスを使用
                    jettonMasterAddress,
                    dexType
                });
            } else {
                throw new Error(`Unknown DEX type ${dexType} for Basket ${i + 1}`);
            }
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

    // 3.3 DEXタイプに応じたルーターアドレスの取得
    // バスケットから使用されているDEXタイプを確認
    let primaryDexType = DexType.DEDUST; // デフォルトはDeDust
    
    // バスケットが存在し、少なくとも一つのDEXタイプが指定されている場合
    if (baskets.length > 0 && baskets[0].dexType !== undefined) {
        primaryDexType = baskets[0].dexType;
    }
    
    // ネットワークに応じたアドレスを選択
    const network = provider.network();
    let dexTonVaultAddress: Address;
    
    if (primaryDexType === DexType.DEDUST) {
        // DeDustの場合
        if (network === 'testnet') {
            dexTonVaultAddress = Address.parse(DEDUST_ROUTER_TESTNET);
            console.log(`テストネットのDeDustルーターを使用します: ${DEDUST_ROUTER_TESTNET}`);
        } else {
            dexTonVaultAddress = Address.parse(DEDUST_ROUTER_MAINNET);
            console.log(`メインネットのDeDustルーターを使用します: ${DEDUST_ROUTER_MAINNET}`);
        }
    } else if (primaryDexType === DexType.STONFI) {
        // Stonfiの場合
        if (network === 'testnet') {
            // 特殊文字を含むアドレスの場合は、AddressHelperを使用して安全に解析
            // バイナリ形式でアドレスを取得
            dexTonVaultAddress = AddressHelper.getStonfiTestnetRouterAddress();
            console.log(`テストネットのStonFiルーターを使用します: ${STONFI_ROUTER_TESTNET}`);
        } else {
            dexTonVaultAddress = Address.parse(STONFI_ROUTER_MAINNET);
            console.log(`メインネットのStonFiルーターを使用します: ${STONFI_ROUTER_MAINNET}`);
        }
    } else {
        // 不明なDEXタイプの場合はデフォルトでDeDustを使用
        dexTonVaultAddress = Address.parse(DEDUST_ROUTER_MAINNET);
        console.log(`不明なDEXタイプです。デフォルトでDeDustルーターを使用します: ${DEDUST_ROUTER_MAINNET}`);
    }
    
    // 3.4 Vaultのデプロイ
    const vault = provider.open(
        Vault.createFromConfig(
            {
                adminAddress: provider.sender()?.address!,
                content,
                walletCode: await compile('JettonWallet'),
                dexTonVaultAddress,
                baskets,
            },
            await compile('Vault'),
        ),
    );

    await vault.sendDeploy(provider.sender(), toNano('0.1'));
    await provider.waitForDeploy(vault.address);
}


