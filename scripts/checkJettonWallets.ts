import { Address, TonClient, beginCell } from '@ton/ton';
import { NetworkProvider } from '@ton/blueprint';
import { Vault } from '../wrappers/Vault';
import { DexType } from '../utils/Constants';

// リクエスト間の遅延を追加する関数
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Jettonマスターアドレスとオーナーアドレスから対応するJettonウォレットアドレスを取得する
 * 失敗した場合は最大3回までリトライする
 */
async function getJettonWalletAddr(client: TonClient, jettonMaster: string, owner: string): Promise<string> {
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
        try {
            const jettonMasterAddress = Address.parse(jettonMaster);
            const ownerAddress = Address.parse(owner);
            
            // Jettonマスターコントラクトからウォレットアドレスを取得
            const { stack } = await client.runMethod(
                jettonMasterAddress,
                'get_wallet_address',
                [{ type: 'slice', cell: beginCell().storeAddress(ownerAddress).endCell() }]
            );
            
            const jettonWalletAddress = stack.readAddress().toString();
            return jettonWalletAddress;
        } catch (error) {
            retries++;
            console.error(`Jettonウォレットアドレスの取得に失敗 (${retries}/${maxRetries}): ${error}`);
            
            if (retries < maxRetries) {
                // 次のリトライまで待機（指数バックオフ）
                const waitTime = 1000 * Math.pow(2, retries); // 2秒、4秒、8秒...
                console.log(`${waitTime}ms後にリトライします...`);
                await sleep(waitTime);
            }
        }
    }
    
    return 'エラー: アドレスを取得できませんでした';
}

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // ネットワーク選択
    const network = await ui.choose('どのネットワークを使用しますか？', ['mainnet', 'testnet'], (v) => v);
    
    // TONクライアントの初期化（APIキーがあれば設定するとよい）
    const tonClient = new TonClient({
        endpoint: network === 'mainnet' ? 'https://toncenter.com/api/v2/jsonRPC' : 'https://testnet.toncenter.com/api/v2/jsonRPC',
        // apiKey: 'あなたのAPIキー' // APIキーがあれば追加
    });
    
    // Vaultアドレスの入力
    const vaultAddrStr = await ui.input('Vaultアドレスを入力してください:');
    if (!vaultAddrStr) {
        await ui.write('アドレスが入力されていません。');
        return;
    }
    
    try {
        // Vaultアドレスのパース
        const vaultAddr = Address.parse(vaultAddrStr);
        await ui.write(`\nVaultアドレス: ${vaultAddr.toString()}`);
        
        // Vaultデータの取得
        const vault = provider.open(Vault.createFromAddress(vaultAddr));
        const vaultData = await vault.getVaultData();
        
        await ui.write(`バスケット数: ${vaultData.baskets.length}`);
        
        // 各バスケットの情報を表示（バスケット間に遅延を追加）
        for (let i = 0; i < vaultData.baskets.length; i++) {
            const basket = vaultData.baskets[i];
            
            // バスケット間に1秒の遅延を追加（APIレート制限対策）
            if (i > 0) await sleep(1000);
            
            await ui.write(`\n=== バスケット ${i+1} ===`);
            await ui.write(`重み: ${basket.weight.toString()}`);
            await ui.write(`JettonMasterアドレス: ${basket.jettonMasterAddress.toString()}`);
            
            // 現在のJettonウォレットアドレス
            const currentWalletAddr = basket.jettonWalletAddress.toString();
            await ui.write(`現在のJettonウォレットアドレス: ${currentWalletAddr}`);
            
            // 計算したJettonウォレットアドレス（APIレート制限に注意）
            await ui.write(`計算中...`);
            const calculatedWalletAddr = await getJettonWalletAddr(
                tonClient, 
                basket.jettonMasterAddress.toString(), 
                vaultAddr.toString()
            );
            await ui.write(`計算したJettonウォレットアドレス: ${calculatedWalletAddr}`);
            
            // アドレスが一致するか確認
            if (calculatedWalletAddr.startsWith('エラー')) {
                await ui.write(`アドレス一致: ❓ 確認できません`);
            } else {
                const isMatch = currentWalletAddr === calculatedWalletAddr;
                await ui.write(`アドレス一致: ${isMatch ? '✅ 一致' : '❌ 不一致'}`);
            }
            
            // DEXタイプの表示（シンプルに）
            const dexTypeStr = basket.dexType === DexType.DEDUST ? 'DeDust' : 
                               basket.dexType === DexType.STONFI ? 'StonFi' : '不明';
            await ui.write(`DEXタイプ: ${dexTypeStr} (${basket.dexType})`);
        }
        
    } catch (error) {
        await ui.write(`エラーが発生しました: ${error}`);
    }
}
