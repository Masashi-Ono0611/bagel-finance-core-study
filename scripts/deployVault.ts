import { Address, Cell, toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { Vault, Basket } from '../wrappers/Vault';
import { jettonContentToCell, onchainContentToCell } from '../utils/JettonHelpers';
import { AddressHelper } from '../utils/AddressHelper';
import { 
    DexType, 
    DEDUST_ROUTER_MAINNET, 
    DEDUST_ROUTER_TESTNET, 
    STONFI_ROUTER_MAINNET, 
    STONFI_ROUTER_TESTNET,
    STONFI_PROXY_TON_MAINNET,
    STONFI_PROXY_TON_TESTNET
} from '../utils/Constants';

// バスケットテンプレート定義
interface BasketTemplate {
    // DEX共通フィールド
    weight: string;
    jettonMasterAddress: string;
    jettonWalletAddress?: string;    // 互換性のために残しているが、実際には使用されない（DeDustとStonFiともにinitVault時に動的に設定される）
    // DeDust用フィールド
    dexPoolAddress?: string;         // DeDustでのトークンペア別のプールアドレス(StonFiの場合は互換性のためにdexRouterAddressと同じ値をダミーで設定）
    dexJettonVaultAddress?: string;   // DeDustでのトークンペア別のJettonVaultアドレス（StonFiの場合は互換性のためにdexProxyTonAddressと同じ値をダミーで設定）
    // StonFi V1用追加フィールド
    dexRouterAddress?: string;       // StonFi V1のルーターアドレス
    dexProxyTonAddress?: string;     // StonFi V1のプロキシTONアドレス
    dexJettonWalletOnRouterAddress?: string; // StonFi V1のルーター上のJettonウォレットアドレス
    // DEX共通フィールド
    dexType?: number;                // DEXタイプ（0=DeDust, 1=Stonfi）
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
                dexPoolAddress: 'EQBWsAdyAg-8fs3G-m-eUBCXZuVaOldF5-tCMJBJzxQG7nLX',
                dexJettonVaultAddress: 'EQCRjILmJD0ZD7y6POFyicCx20PoypkEwHJ64AMJ7vwkXGjm',
                dexType: DexType.DEDUST
            }, //hTON
            {
                weight: '400000000',
                jettonMasterAddress: 'EQB0SoxuGDx5qjVt0P_bPICFeWdFLBmVopHhjgfs0q-wsTON',
                dexPoolAddress: 'EQABt8YegyD7VJnZdFVwom8wwqp0E0X8tN2Y6NhrDmbrnSXP',
                dexJettonVaultAddress: 'EQCKfS6qMSigCc93CKzv-pBJow2w9TEyadDVZVIR8U-d-iVj',
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
                dexPoolAddress: 'EQBWsAdyAg-8fs3G-m-eUBCXZuVaOldF5-tCMJBJzxQG7nLX',
                dexJettonVaultAddress: 'EQCRjILmJD0ZD7y6POFyicCx20PoypkEwHJ64AMJ7vwkXGjm',
                dexType: DexType.DEDUST
            }, //hTON
            {
                weight: '330000000',
                jettonMasterAddress: 'EQCqC6EhRJ_tpWngKxL6dV0k6DSnRUrs9GSVkLbfdCqsj6TE',
                dexPoolAddress: 'EQBcXOgImwib9hI7vRLuBtTbMp3EES1rKiqyr8c2WtcRH2eO',
                dexJettonVaultAddress: 'EQB2PfLwzabJO1cMtarDdcIdW8l78IvH2Y8r396Fno-TNnf7',
                dexType: DexType.DEDUST
            },//STAKED
            {
                weight: '330000000',
                jettonMasterAddress: 'EQB0SoxuGDx5qjVt0P_bPICFeWdFLBmVopHhjgfs0q-wsTON',
                dexPoolAddress: 'EQABt8YegyD7VJnZdFVwom8wwqp0E0X8tN2Y6NhrDmbrnSXP',
                dexJettonVaultAddress: 'EQCKfS6qMSigCc93CKzv-pBJow2w9TEyadDVZVIR8U-d-iVj',
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
                dexPoolAddress: 'EQBWsAdyAg-8fs3G-m-eUBCXZuVaOldF5-tCMJBJzxQG7nLX',//仮の値
                dexJettonVaultAddress: 'EQCRjILmJD0ZD7y6POFyicCx20PoypkEwHJ64AMJ7vwkXGjm',//仮の値
                dexType: DexType.DEDUST
            }, //APR14002
            {
                weight: '400000000',
                jettonMasterAddress: 'kQDLvsZol3juZyOAVG8tWsJntOxeEZWEaWCbbSjYakQpuYN5',
                dexPoolAddress: 'EQABt8YegyD7VJnZdFVwom8wwqp0E0X8tN2Y6NhrDmbrnSXP',//仮の値
                dexJettonVaultAddress: 'EQCKfS6qMSigCc93CKzv-pBJow2w9TEyadDVZVIR8U-d-iVj',//仮の値
                dexType: DexType.DEDUST
            } //TRT
        ]
    },
    'Stonfi testnet 2baskets v3': {
        image: 'https://bagel-finance.s3.ap-northeast-1.amazonaws.com/images/ton-plus-index.png',
        decimals: '9',
        baskets: [
            {
                weight: '50000000',
                jettonMasterAddress: 'kQBqtvcqnOUQrNN5JLb42AZtNiP7hsFvVNCOqiKUEoNYGkgv',
                dexJettonWalletOnRouterAddress: 'kQBKQIkwBe_d50vACml6Ymh9iCdoCz-0OdCrxDTKPRdDHz6C', 
                // 使用するルーターに紐づくJettonAddress
                // https://testnet.tonviewer.com/kQBKQIkwBe_d50vACml6Ymh9iCdoCz-0OdCrxDTKPRdDHz6C
                dexRouterAddress: 'kQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4Tp6n', 
                dexProxyTonAddress: 'kQARULUYsmJq1RiZ-YiH-IJLcAZUVkVff-KBPwEmmaQGHx0I',
                //pTONのJettonMasterAddressではなく、使用するルーターに紐づくJettonAddressを使用する
                dexType: DexType.STONFI
            }, //APR16
            {
                weight: '950000000',
                jettonMasterAddress: 'kQBig-ypUlf0m1GUzzuJOSM1JU4Gq1IgNbT9Spsw3EQ5ivO7',
                dexJettonWalletOnRouterAddress: 'kQD7thS_LboHHlgFXJ2tQfnsXuOWctAtNVLkh1u2rijx7Ey-', 
                // 使用するルーターに紐づくJettonAddress
                // https://testnet.tonviewer.com/kQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4Tp6n/jetton/kQBig-ypUlf0m1GUzzuJOSM1JU4Gq1IgNbT9Spsw3EQ5ivO7
                dexRouterAddress: 'kQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4Tp6n', 
                dexProxyTonAddress: 'kQARULUYsmJq1RiZ-YiH-IJLcAZUVkVff-KBPwEmmaQGHx0I',
                //pTONのJettonMasterAddressではなく、使用するルーターに紐づくJettonAddressを使用する
                dexType: DexType.STONFI
            }, //Antony
        ]
    },
    'Stonfi testnet 3baskets': {
        image: 'https://bagel-finance.s3.ap-northeast-1.amazonaws.com/images/ton-plus-index.png',
        decimals: '9',
        baskets: [
            {
                weight: '4000',
                jettonMasterAddress: 'kQDLvsZol3juZyOAVG8tWsJntOxeEZWEaWCbbSjYakQpuYN5',
                dexJettonWalletOnRouterAddress: 'kQAVqalPYw0U1cPNtL6n92AEItXW5LUVKMtX0IDEZ5KsD_td', 
                // 使用するルーターに紐づくJettonAddress
                // https://testnet.tonviewer.com/kQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4Tp6n/jetton/kQDLvsZol3juZyOAVG8tWsJntOxeEZWEaWCbbSjYakQpuYN5
                dexRouterAddress: 'kQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4Tp6n', 
                dexProxyTonAddress: 'kQARULUYsmJq1RiZ-YiH-IJLcAZUVkVff-KBPwEmmaQGHx0I',
                //pTONのJettonMasterAddressではなく、使用するルーターに紐づくJettonAddressを使用する
                dexType: DexType.STONFI
            }, //TRT
            {
                weight: '470998000',
                jettonMasterAddress: 'kQBqtvcqnOUQrNN5JLb42AZtNiP7hsFvVNCOqiKUEoNYGkgv',
                dexJettonWalletOnRouterAddress: 'kQBKQIkwBe_d50vACml6Ymh9iCdoCz-0OdCrxDTKPRdDHz6C', 
                // 使用するルーターに紐づくJettonAddress
                // https://testnet.tonviewer.com/kQBKQIkwBe_d50vACml6Ymh9iCdoCz-0OdCrxDTKPRdDHz6C
                dexRouterAddress: 'kQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4Tp6n', 
                dexProxyTonAddress: 'kQARULUYsmJq1RiZ-YiH-IJLcAZUVkVff-KBPwEmmaQGHx0I',
                //pTONのJettonMasterAddressではなく、使用するルーターに紐づくJettonAddressを使用する
                dexType: DexType.STONFI
            }, //APR16
            {
                weight: '528998000',
                jettonMasterAddress: 'kQBig-ypUlf0m1GUzzuJOSM1JU4Gq1IgNbT9Spsw3EQ5ivO7',
                dexJettonWalletOnRouterAddress: 'kQD7thS_LboHHlgFXJ2tQfnsXuOWctAtNVLkh1u2rijx7Ey-', 
                // 使用するルーターに紐づくJettonAddress
                // https://testnet.tonviewer.com/kQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4Tp6n/jetton/kQBig-ypUlf0m1GUzzuJOSM1JU4Gq1IgNbT9Spsw3EQ5ivO7
                dexRouterAddress: 'kQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4Tp6n', 
                dexProxyTonAddress: 'kQARULUYsmJq1RiZ-YiH-IJLcAZUVkVff-KBPwEmmaQGHx0I',
                //pTONのJettonMasterAddressではなく、使用するルーターに紐づくJettonAddressを使用する
                dexType: DexType.STONFI
            }, //Antony
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
    //console.log(`IMPORTANT: Use the same scale as other Vaults (10^8 order, not 10^13)`);
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
    const dexPoolAddress = Address.parse(await ui.input(`Enter ${dexName} Pool Address for Basket ${index + 1}: `));
    const dexJettonVaultAddress = Address.parse(await ui.input(`Enter ${dexName} Jetton Vault Address for Basket ${index + 1}: `));

    // Note: jettonWalletAddress will be determined during initVault
    // Here we use a placeholder address that will be replaced
    const placeholderWalletAddress = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');

    // StonFi V1の場合は追加フィールドも設定
    if (dexType === DexType.STONFI) {
        const dexRouterAddress = Address.parse(await ui.input(`Enter StonFi Router Address for Basket ${index + 1}: `));
        const dexProxyTonAddress = Address.parse(await ui.input(`Enter StonFi Proxy TON Address for Basket ${index + 1}: `));
        
        return {
            weight,
            jettonWalletAddress: placeholderWalletAddress,
            dexPoolAddress,
            dexJettonVaultAddress,
            dexRouterAddress,
            dexProxyTonAddress,
            jettonMasterAddress,
            dexType
        };
    }

    return {
        weight,
        jettonWalletAddress: placeholderWalletAddress,
        dexPoolAddress,
        dexJettonVaultAddress,
        jettonMasterAddress,
        dexType
    };
}

async function getBaskets(ui: any, templateData?: VaultTemplate, isMainnet: boolean = false): Promise<Basket[]> {
    if (templateData) {
        const basketCount = templateData.baskets.length;
        console.log(`Using template with ${basketCount} baskets`);
        
        const baskets: Basket[] = [];
        for (let i = 0; i < basketCount; i++) {
            const templateBasket = templateData.baskets[i];
            
            console.log(`\nEntering details for Basket ${i + 1}:`);
            // テンプレートから値を使用
            const weight = BigInt(templateBasket.weight);
            const jettonMasterAddress = Address.parse(templateBasket.jettonMasterAddress);
            
            // プレースホルダーウォレットアドレス
            const placeholderWalletAddress = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');
            
            // DEXタイプの設定（テンプレートに指定がない場合はデフォルトでDeDust）
            const dexType = templateBasket.dexType !== undefined ? templateBasket.dexType : DexType.DEDUST;
            
            // DEXタイプに応じて必要なアドレスを取得
            if (dexType === DexType.DEDUST) {
                // DeDustの場合
                if (!templateBasket.dexPoolAddress || !templateBasket.dexJettonVaultAddress) {
                    throw new Error(`Basket ${i + 1} is configured as DeDust but missing required DEX addresses`);
                }
                
                const dexPoolAddress = Address.parse(templateBasket.dexPoolAddress);
                console.log(`Enter DEX Pool Address for Basket ${i + 1}: ${templateBasket.dexPoolAddress}`);
                
                const dexJettonVaultAddress = Address.parse(templateBasket.dexJettonVaultAddress);
                console.log(`Enter DEX Jetton Vault Address for Basket ${i + 1}: ${templateBasket.dexJettonVaultAddress}`);
                
                baskets.push({
                    weight,
                    jettonWalletAddress: placeholderWalletAddress,
                    dexPoolAddress,
                    dexJettonVaultAddress,
                    jettonMasterAddress,
                    dexType
                });
            } else if (dexType === DexType.STONFI) {
                // StonFi V1の場合
                const stonfiRouterAddress = isMainnet ? STONFI_ROUTER_MAINNET : STONFI_ROUTER_TESTNET;
                const dexRouterAddress = templateBasket.dexRouterAddress ? 
                    Address.parse(templateBasket.dexRouterAddress) : 
                    Address.parse(stonfiRouterAddress);
                
                const dexProxyTonAddress = templateBasket.dexProxyTonAddress ? 
                    Address.parse(templateBasket.dexProxyTonAddress) : 
                    Address.parse(isMainnet ? STONFI_PROXY_TON_MAINNET : STONFI_PROXY_TON_TESTNET);
                
                // StonFi V1の場合も、ダミーのdedustPoolAddressとdedustJettonVaultAddressを設定する
                // これはストレージの互換性のために必要
                const dummyPoolAddress = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');
                const dummyJettonVaultAddress = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');
                
                // StonFiの場合もプレースホルダーアドレスを設定（initVault時に動的に設定される）
                const jettonWalletAddress = placeholderWalletAddress;
                
                // dexJettonWalletOnRouterAddressをテンプレートから直接取得
                const dexJettonWalletOnRouterAddress = templateBasket.dexJettonWalletOnRouterAddress ? 
                    Address.parse(templateBasket.dexJettonWalletOnRouterAddress) : 
                    placeholderWalletAddress;
                
                baskets.push({
                    weight,
                    jettonWalletAddress, // プレースホルダーアドレス（initVault時に動的に設定される）
                    dexRouterAddress, // StonFi V1用のルーターアドレス
                    dexProxyTonAddress, // StonFi V1用のプロキシアドレス
                    dexJettonWalletOnRouterAddress, // StonFi V1用のルーター上のJettonウォレットアドレス
                    dexPoolAddress: dummyPoolAddress, // ダミーのプールアドレス
                    dexJettonVaultAddress: dummyJettonVaultAddress, // ダミーのJettonVaultアドレス
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
        const baskets: Basket[] = [];
        
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

    // ネットワーク情報の取得
    const network = provider.network();
    const isMainnet = network !== 'testnet';
    
    // 3.2 バスケットの設定
    const baskets = await getBaskets(ui, selectedTemplate, isMainnet);

    // 3.3 DEXタイプに応じたルーターアドレスの取得
    // バスケットから使用されているDEXタイプを確認
    let primaryDexType = DexType.DEDUST; // デフォルトはDeDust
    
    // バスケットが存在し、少なくとも一つのDEXタイプが指定されている場合
    if (baskets.length > 0 && baskets[0].dexType !== undefined) {
        primaryDexType = baskets[0].dexType;
    }
    
    // ネットワークに応じたアドレスを選択
    let dexTonVaultAddress: Address;
    
    if (primaryDexType === DexType.DEDUST) {
        // DeDustの場合
        if (network === 'testnet') {
            dexTonVaultAddress = Address.parse(DEDUST_ROUTER_TESTNET);
            //console.log(`テストネットのDeDustルーターを使用します: ${DEDUST_ROUTER_TESTNET}`);
        } else {
            dexTonVaultAddress = Address.parse(DEDUST_ROUTER_MAINNET);
            //console.log(`メインネットのDeDustルーターを使用します: ${DEDUST_ROUTER_MAINNET}`);
        }
    } else if (primaryDexType === DexType.STONFI) {
        // Stonfiの場合
        // バスケットからルーターアドレスを取得
        if (baskets.length > 0 && baskets[0].dexRouterAddress) {
            // バスケットからルーターアドレスを使用
            dexTonVaultAddress = baskets[0].dexRouterAddress;
            //console.log(`バスケットから取得したStonFiルーターアドレスを使用します: ${dexTonVaultAddress.toString()}`);
        } else {
            // バスケットにルーターアドレスが指定されていない場合はデフォルト値を使用
            if (network === 'testnet') {
                try {
                    // 直接アドレス文字列を使用して解析する
                    dexTonVaultAddress = Address.parse(STONFI_ROUTER_TESTNET);
                } catch (error) {
                    console.warn(`アドレスの解析に失敗しました。AddressHelperを使用します。`);
                    // バイナリ形式でアドレスを取得
                    dexTonVaultAddress = AddressHelper.getStonfiTestnetRouterAddress();
                }
                console.log(`テストネットのStonFiルーターを使用します: ${STONFI_ROUTER_TESTNET}`);
            } else {
                dexTonVaultAddress = Address.parse(STONFI_ROUTER_MAINNET);
                //console.log(`メインネットのStonFiルーターを使用します: ${STONFI_ROUTER_MAINNET}`);
            }
            //  console.log(`実際に使用されるアドレス: ${dexTonVaultAddress.toString()}`);
        }
    } else {
        // 不明なDEXタイプの場合はデフォルトでDeDustを使用
        dexTonVaultAddress = Address.parse(DEDUST_ROUTER_MAINNET);
        console.log(`不明なDEXタイプです。デフォルトでDeDustルーターを使用します: ${DEDUST_ROUTER_MAINNET}`);
    }
    
    // Vault設定の全体像を表示
    const vaultConfig = {
        adminAddress: provider.sender()?.address!,
        content,
        walletCode: await compile('JettonWallet'),
        dexTonVaultAddress,
        baskets,
    };
    
    console.log('\nVault設定の全体像:');
    console.log('--------------------');
    console.log(`管理者アドレス: ${vaultConfig.adminAddress.toString()}`);
    console.log(`DEXアドレス: ${vaultConfig.dexTonVaultAddress.toString()}`);
    console.log('バスケット:');
    
    for (let i = 0; i < vaultConfig.baskets.length; i++) {
        const basket = vaultConfig.baskets[i];
        console.log(`\nバスケット ${i + 1}:`);
        console.log(`  重み: ${basket.weight}`);
        console.log(`  JettonMasterアドレス: ${basket.jettonMasterAddress.toString()}`);
        console.log(`  DEXタイプ: ${basket.dexType === 0 ? 'DeDust' : basket.dexType === 1 ? 'StonFi' : '不明'}`);
        
        if (basket.dexType === 1) { // StonFi
            if (basket.jettonWalletAddress) {
                console.log(`  Jettonウォレットアドレス: ${basket.jettonWalletAddress.toString()}`);
            }
            if (basket.dexRouterAddress) {
                console.log(`  StonFiルーターアドレス: ${basket.dexRouterAddress.toString()}`);
            }
            if (basket.dexProxyTonAddress) {
                console.log(`  StonFiプロキシTONアドレス: ${basket.dexProxyTonAddress.toString()}`);
            }
            if (basket.dexJettonWalletOnRouterAddress) {
                console.log(`  StonFiルーター上のJettonウォレットアドレス: ${basket.dexJettonWalletOnRouterAddress.toString()}`);
            }
        } else if (basket.dexType === 0) { // DeDust
            if (basket.dexPoolAddress) {
                console.log(`  DeDustプールアドレス: ${basket.dexPoolAddress.toString()}`);
            }
            if (basket.dexJettonVaultAddress) {
                console.log(`  DeDust JettonVaultアドレス: ${basket.dexJettonVaultAddress.toString()}`);
            }
        }
    }
    
    // 3.4 Vaultのデプロイ
    const vault = provider.open(
        Vault.createFromConfig(
            vaultConfig,
            await compile('Vault'),
        ),
    );

    await vault.sendDeploy(provider.sender(), toNano('0.1'));
    await provider.waitForDeploy(vault.address);
}


