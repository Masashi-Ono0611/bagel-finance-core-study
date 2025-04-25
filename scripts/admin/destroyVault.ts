import { Address, beginCell } from '@ton/core';
import { Vault } from '../../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { toNano } from '@ton/core';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    console.log('\n⚠️ Vaultデストラクションツール ⚠️');
    console.log('------------------------------');
    console.log('\n警告: このアクションはVaultを破壊し、残っているTONを転送します。');
    console.log('この操作は元に戻すことができません。十分に注意して進めてください！\n');
    
    // Vaultアドレスの入力
    const vaultAddr = await ui.inputAddress('破壊するVaultアドレス: ');
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    
    // 現在のVaultデータを取得して確認
    console.log('\n破壊前のVault情報を取得中...');
    try {
        const jettonData = await vault.getJettonData();
        const vaultData = await vault.getVaultData();
        
        console.log('\nVault情報:');
        console.log('--------------------');
        console.log(`管理者アドレス: ${jettonData.adminAddress}`);
        console.log(`ステータス: ${vaultData.stopped ? '停止中' : 'アクティブ'}`);
        console.log(`バスケット数: ${vaultData.numBaskets}`);
        console.log(`総供給量: ${jettonData.totalSupply}`);
        console.log(`クエリーベースの超過ガス辞書: ${vaultData.dict_query_excess_gas ? '利用可能' : '利用不可'}`);
        
        if (vaultData.baskets.length > 0) {
            console.log('\n⚠️ 警告: このVaultにはアクティブなバスケットが定義されています！');
            
            // バスケット情報の表示
            console.log('\nバスケット情報:');
            vaultData.baskets.forEach((basket, index) => {
                console.log(`\nバスケット ${index + 1}:`);
                console.log(`  重み: ${basket.weight}`);
                console.log(`  JettonMasterアドレス: ${basket.jettonMasterAddress}`);
                console.log(`  JettonWalletアドレス: ${basket.jettonWalletAddress}`);
                
                // DEXタイプに応じた情報表示
                if (basket.dexType === 1) { // StonFi
                    console.log(`  DEXタイプ: StonFi`);
                    console.log(`  StonFiルーターアドレス: ${basket.dexRouterAddress || 'なし'}`);
                    console.log(`  StonFiプロキシTONアドレス: ${basket.dexProxyTonAddress || 'なし'}`);
                } else { // DeDust または不明
                    console.log(`  DEXタイプ: ${basket.dexType === 0 ? 'DeDust' : '不明'}`);
                    console.log(`  DEXプールアドレス: ${basket.dexPoolAddress || 'なし'}`);
                    console.log(`  DEX JettonVaultアドレス: ${basket.dexJettonVaultAddress || 'なし'}`);
                }
            });
            
            if (jettonData.totalSupply > 0) {
                console.log('\n⚠️ 重大な警告: このVaultにはアクティブな供給量があります！');
                console.log('⚠️ 続行すると、ユーザーがトークンにアクセスできなくなる可能性があります！\n');
            }
        }
        
        // 待機リクエストの数を確認
        const waitingKeys = Array.from(vaultData.dict_waitings.keys());
        if (waitingKeys.length > 0) {
            console.log(`⚠️ 警告: ${waitingKeys.length}件の保留中リクエストが失われます！`);
        }
    } catch (error) {
        console.warn('Vaultデータの完全な取得ができませんでした:', error instanceof Error ? error.message : String(error));
        console.log('⚠️ Vaultの状態を完全に確認できません。破壊は非常に危険です！\n');
        
        const proceedAnyway = await ui.choose(
            'Vaultの状態を確認できません。それでも続行しますか？',
            ['いいえ、操作をキャンセルします', 'はい、自己責任で続行します'],
            (v) => v
        );
        
        if (proceedAnyway === 'いいえ、操作をキャンセルします') {
            console.log('ユーザーによって操作がキャンセルされました。');
            return;
        }
    }
    
    // 送金先アドレスの設定
    const defaultAddr = Address.parse('0QB-re93kxeCoDDQ66RUZuG382uIAg3bhiFCzrlaeBTN6psR');
    console.log(`\n⚠️ 残りのTON残高を受け取るアドレスを選択してください:`);
    console.log(`デフォルトアドレス（VMLA_W5_Testnet）: ${defaultAddr.toString()}`);
    
    const addressChoice = await ui.choose(
        '送金先アドレスの選択:',
        ['デフォルトアドレスを使用する', '別のアドレスを入力する'],
        (v) => v
    );
    
    let toAddr;
    if (addressChoice === 'デフォルトアドレスを使用する') {
        toAddr = defaultAddr;
        console.log(`デフォルトアドレスを使用します: ${toAddr.toString()}`);
    } else {
        toAddr = await ui.inputAddress('送金先アドレスを入力してください: ');
    }
    
    // 実行確認
    const confirmOperation = await ui.choose(
        '\n⚠️ 最終確認が必要です: Vaultの破壊を続行しますか？',
        ['いいえ、操作をキャンセルします', 'はい、破壊を続行します'],
        (v) => v
    );
    
    if (confirmOperation === 'いいえ、操作をキャンセルします') {
        console.log('ユーザーによって操作がキャンセルされました。');
        return;
    }
    
    // ガス量の設定（固定値：0.05 TON）
    const gasAmount = toNano('0.05');
    console.log('\nデフォルトのガス量 0.05 TONを使用します。');
    
    console.log(`\n⚠️ ${Number(gasAmount) / 1e9} TONのガスで破壊メッセージを送信しています...`);
    console.log(`⚠️ アドレス ${vaultAddr.toString()} のVaultが破壊されます。`);
    console.log(`⚠️ 残りの残高はアドレス ${toAddr.toString()} に送金されます`);
    
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
        
        console.log('\n✅ 破壊メッセージが正常に送信されました！');
        console.log('⚠️ Vaultは破壊されています。このプロセスは元に戻すことができません。');
    } catch (error) {
        console.error('\n❌ 破壊中にエラーが発生しました:', error instanceof Error ? error.message : String(error));
        console.log('ウォレットを確認して、必要に応じて再試行してください。');
    }
}
