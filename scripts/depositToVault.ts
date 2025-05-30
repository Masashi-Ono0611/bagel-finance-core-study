import { Address, toNano } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { DexType } from '../utils/Constants';

/**
 * Vaultへのデポジットを実行するスクリプト
 * 
 * 使用方法:
 * npx blueprint run depositToVault
 * 
 * 注意:
 * - 金額はnanoTONで指定（1 TON = 1,000,000,000 nanoTON）
 * - 各バスケットへの振り分け金額はバスケットのweightから自動計算されます
 * - Tonkeeperウォレットが接続されます
 */

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // Vaultアドレスの入力
    const vaultAddressStr = await ui.input('Vaultアドレスを入力してください:');
    const vaultAddress = Address.parse(vaultAddressStr);
    console.log(`Vault アドレス: ${vaultAddress.toString()}`);
    
    // Vaultの情報を取得
    const vault = provider.open(Vault.createFromAddress(vaultAddress));
    
    try {
        // Vaultのデータを取得してバスケット数を確認
        const vaultData = await vault.getVaultData();
        const numBaskets = vaultData.baskets.length;
        console.log(`Vaultには${numBaskets}個のバスケットがあります`);
        
        // DEXタイプを確認（Vault全体で同じDEXタイプを使用）
        const primaryDexType = vaultData.baskets[0].dexType;
        let dexTypeStr = 'Unknown';
        if (primaryDexType === DexType.DEDUST) {
            dexTypeStr = 'DeDust';
        } else if (primaryDexType === DexType.STONFI) {
            dexTypeStr = 'StonFi';
        }
        console.log(`Vaultは${dexTypeStr}タイプのDEXを使用しています`);
        
        // 各バスケットの情報を表示
        console.log('\nバスケット情報:');
        vaultData.baskets.forEach((basket, index) => {
            console.log(`バスケット ${index + 1}:`);
            console.log(`  重み: ${basket.weight.toString()} (${Number(basket.weight) / 1e9 * 100}%)`);
            console.log(`  Jettonマスターアドレス: ${basket.jettonMasterAddress.toString()}`);
            
            if (basket.jettonWalletAddress) {
                console.log(`  Jettonウォレットアドレス: ${basket.jettonWalletAddress.toString()}`);
            }
            
            // DEXタイプに応じて表示するフィールドを変更
            if (primaryDexType === DexType.DEDUST) {
                // DeDustの場合
                if (basket.dexPoolAddress) {
                    console.log(`  DeDustプールアドレス: ${basket.dexPoolAddress.toString()}`);
                }
                if (basket.dexJettonVaultAddress) {
                    console.log(`  DeDust JettonVaultアドレス: ${basket.dexJettonVaultAddress.toString()}`);
                }
            } else if (primaryDexType === DexType.STONFI) {
                // StonFiの場合
                if (basket.dexRouterAddress) {
                    console.log(`  StonFiルーターアドレス: ${basket.dexRouterAddress.toString()}`);
                }
                if (basket.dexProxyTonAddress) {
                    console.log(`  StonFiプロキシTONアドレス: ${basket.dexProxyTonAddress.toString()}`);
                }
            }
        });
        
        // 全体のデポジット金額の設定
        // デフォルトは1 TON（1,000,000,000 nanoTON）
        const DEFAULT_DEPOSIT_AMOUNT = toNano('1'); // 1 TON
        
        // デフォルト値を使用するか確認
        const useDefault = await ui.choose('デポジット金額にデフォルト値（1 TON）を使用しますか？', ['はい', 'いいえ（手動入力）'], (v) => v);
        
        let totalAmount: bigint;
        if (useDefault === 'はい') {
            totalAmount = DEFAULT_DEPOSIT_AMOUNT;
            console.log(`デフォルト金額を使用します: ${totalAmount} nanoTON (${Number(totalAmount) / 1e9} TON)`);
        } else {
            // 手動入力の場合
            const totalAmountStr = await ui.input('デポジットするTON金額を入力してください（nanoTON単位）:');
            totalAmount = BigInt(totalAmountStr);
        }
        
        // 各バスケットの重みの合計を計算
        const totalWeight = vaultData.baskets.reduce((sum, basket) => sum + basket.weight, 0n);
        
        // 各バスケットへの振り分け金額を計算
        const eachAmount: bigint[] = [];
        let allocatedAmount = 0n;
        
        console.log('\n各バスケットへの振り分け金額:');
        for (let i = 0; i < numBaskets - 1; i++) { // 最後のバスケット以外を計算
            const basket = vaultData.baskets[i];
            const amount = (totalAmount * basket.weight) / totalWeight;
            eachAmount.push(amount);
            allocatedAmount += amount;
            console.log(`バスケット ${i + 1} (${Number(basket.weight) / 1e9 * 100}%): ${amount} nanoTON`);
        }
        
        // 最後のバスケットは端数処理の誤差を考慮して計算
        const lastAmount = totalAmount - allocatedAmount;
        eachAmount.push(lastAmount);
        const lastBasket = vaultData.baskets[numBaskets - 1];
        console.log(`バスケット ${numBaskets} (${Number(lastBasket.weight) / 1e9 * 100}%): ${lastAmount} nanoTON`);
        
        // 定数定義
        const GAS_PER_SWAP = toNano('0.1');       // 100000000
        const GAS_PER_MINT_SEND = toNano('0.05'); // 50000000
        
        // gas_deposit関数の実装
        const gasDeposit = (numBaskets: number): bigint => {
            return BigInt(numBaskets) * 3200000n + 1400000n;
        };
        
        // ガス計算
        const gasPerBasket = GAS_PER_SWAP + GAS_PER_MINT_SEND;
        const gas = gasPerBasket * BigInt(numBaskets) + gasDeposit(numBaskets);
        
        // 合計送金額の計算
        const totalValue = totalAmount + gas;
        
        // ガス代の内訳を表示
        console.log(`\nガス代の内訳:`);
        console.log(`基本ガス代 (gasDeposit): ${gasDeposit(numBaskets)} nanoTON (${Number(gasDeposit(numBaskets)) / 1e9} TON)`);
        console.log(`スワップガス代 (GAS_PER_SWAP × ${numBaskets}): ${GAS_PER_SWAP * BigInt(numBaskets)} nanoTON (${Number(GAS_PER_SWAP * BigInt(numBaskets)) / 1e9} TON)`);
        console.log(`ミント送信ガス代 (GAS_PER_MINT_SEND × ${numBaskets}): ${GAS_PER_MINT_SEND * BigInt(numBaskets)} nanoTON (${Number(GAS_PER_MINT_SEND * BigInt(numBaskets)) / 1e9} TON)`);
        console.log(`合計ガス代: ${gas} nanoTON (${Number(gas) / 1e9} TON)`);
        
        console.log(`\n合計デポジット金額: ${totalAmount} nanoTON (${Number(totalAmount) / 1e9} TON)`);
        console.log(`合計送金額: ${totalValue} nanoTON (${Number(totalValue) / 1e9} TON)`);
        
        // 最小交換金額のチェック
        const MIN_EXCHANGE_AMOUNT = toNano('1'); // 1000000000
        if (totalAmount < MIN_EXCHANGE_AMOUNT) {
            console.log(`\n警告: デポジット金額が最小交換金額(${MIN_EXCHANGE_AMOUNT} nanoTON = ${Number(MIN_EXCHANGE_AMOUNT) / 1e9} TON)未満です。`);
            console.log('トランザクションが失敗する可能性があります。');
        }
        
        // 確認
        const confirm = await ui.choose('デポジットを実行しますか？', ['はい', 'いいえ'], (v) => v);
        if (confirm === 'いいえ') {
            console.log('デポジットをキャンセルしました');
            return;
        }
        
        // Mint量の設定
        // デフォルトのMint量を1.45 INDEXに設定
        const DEFAULT_MINT_AMOUNT = toNano('1.45'); // 1.45 INDEX = 1,450,000,000 nanoINDEX
        let requestedMintAmount: bigint | undefined = DEFAULT_MINT_AMOUNT; // デフォルト値を初期化

        // StonFiタイプの場合のみMint量の設定を表示
        if (primaryDexType === DexType.STONFI) {
            console.log('\nStonFiタイプのVaultではMint量を指定できます');
            console.log(`デフォルトのMint量: ${DEFAULT_MINT_AMOUNT} nanoINDEX (${Number(DEFAULT_MINT_AMOUNT) / 1e9} INDEX)`);
            const useMintAmount = await ui.choose('Mint量を指定しますか？', ['はい', 'いいえ（デフォルト値を使用）'], (v) => v);
            
            if (useMintAmount === 'はい') {
                // Mint量の入力方法を選択
                const mintAmountOption = await ui.choose(
                    'Mint量の指定方法を選択してください：', 
                    ['TON単位で指定', 'INDEX単位で指定（1 INDEX = 1,000,000,000 nanoINDEX）'], 
                    (v) => v
                );
                
                if (mintAmountOption === 'TON単位で指定') {
                    // TON単位でのMint量を入力
                    const mintAmountTON = await ui.input('Mint量をTON単位で入力してください：');
                    requestedMintAmount = toNano(mintAmountTON);
                } else {
                    // INDEX単位でのMint量を入力
                    const mintAmountINDEX = await ui.input('Mint量をINDEX単位で入力してください：');
                    requestedMintAmount = toNano(mintAmountINDEX); // INDEXもTONと同じ単位系を使用
                }
                
                console.log(`指定されたMint量: ${requestedMintAmount} nanoINDEX (${Number(requestedMintAmount) / 1e9} INDEX)`);
            } else {
                console.log(`デフォルトのMint量が使用されます: ${DEFAULT_MINT_AMOUNT} nanoINDEX (${Number(DEFAULT_MINT_AMOUNT) / 1e9} INDEX)`);
            }
        } else {
            // DeDustタイプの場合はMint量を指定しない
            requestedMintAmount = undefined;
        }

        // デポジットの実行
        console.log('Vaultへのデポジットを実行中...');
        await vault.sendDeposit(provider.sender(), eachAmount, totalValue, requestedMintAmount);
        
        // 完了メッセージの表示
        console.log('デポジット完了！');
        console.log('トランザクションはTonkeeperウォレットで確認できます。');
        
        console.log('デポジットが正常に完了しました！');
    } catch (error) {
        console.error('エラーが発生しました:', error);
    }
}
