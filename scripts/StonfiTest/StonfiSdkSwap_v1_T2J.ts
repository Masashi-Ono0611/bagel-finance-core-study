import { NetworkProvider } from '@ton/blueprint';
import { TonClient, toNano, Address } from '@ton/ton';
import { DEX, pTON } from '@ston-fi/sdk';

/**
 * Stonfi SDKを使用したスワップテスト用スクリプト（DEX v1版）
 * 
 * このスクリプトは、Stonfi公式SDKのDEX v1を使用してTONからJettonへのスワップを実行します。
 * メインネットとテストネットの両方に対応しています。
 * 
 * 使用方法:
 * npx blueprint run testStonfiSdkSwap_DEXv1
 */

export async function run(provider: NetworkProvider) {
  const ui = provider.ui();
  
  // ネットワーク選択
  const network = await ui.choose('どのネットワークを使用しますか？', ['mainnet', 'testnet'], (v) => v);
  const isMainnet = network === 'mainnet';
  
  // ネットワーク設定
  const config = {
    mainnet: {
      endpoint: "https://toncenter.com/api/v2/jsonRPC",
      askJettonAddress: '', // コンソールから入力
      minAskAmount: 0,
      tokenName: 'STON',
      explorerUrl: 'https://tonviewer.com'
    },
    testnet: {
      endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
      askJettonAddress: 'kQDAjUl0H6Og8OuIZ3FpAzzrVCRW19fE2RCnp2hqVMoYGe_F', // TestUSDT
      minAskAmount: '1', // 最小受け取り量
      tokenName: 'Jetton',
      explorerUrl: 'https://testnet.tonviewer.com'
    }
  };
  
  // メインネットの場合はトークンアドレスを入力してもらう
  if (isMainnet) {
    const jettonAddress = await ui.input('スワップ対象のトークンアドレスを入力してください（例: EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO）：');
    if (jettonAddress) {
      config.mainnet.askJettonAddress = jettonAddress;
    } else {
      await ui.write('アドレスが入力されていないため、デフォルトのSTONアドレスを使用します。');
      config.mainnet.askJettonAddress = 'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO'; // デフォルトのSTONアドレス
    }
  }
  
  // 選択されたネットワーク設定を使用
  const networkConfig = isMainnet ? config.mainnet : config.testnet;
  
  // ウォレットアドレスの取得
  const sender = provider.sender();
  if (!sender) {
    await ui.write('エラー: ウォレットが接続されていません。');
    return;
  }
  
  const senderAddress = sender.address;
  if (!senderAddress) {
    await ui.write('エラー: ウォレットアドレスを取得できませんでした。');
    return;
  }
  
  await ui.write(`ウォレットアドレス: ${senderAddress.toString()}`);

  // TonClientの初期化
  const client = new TonClient({
    endpoint: networkConfig.endpoint,
  });

  // DEX v1 Routerの初期化
  const router = client.open(new DEX.v1.Router());

  // pTONの初期化
  const proxyTon = new pTON.v1();

  // スワップパラメータの固定値
  const offerAmount = toNano('0.5'); // 0.5 TONをスワップ
  const queryId = 12345; // クエリID
  
  // スワップパラメータの設定
  await ui.write('\nスワップパラメータの設定:');
  await ui.write(`- TON送信量: 0.5 TON`);
  await ui.write(`- 最小受け取り量: ${networkConfig.minAskAmount.toString()} ${networkConfig.tokenName}`);
  await ui.write(`- ターゲットトークン: ${networkConfig.tokenName}`);
  await ui.write(`- DEXバージョン: v1`);
  await ui.write(`- ネットワーク: ${network}`);
  
  // ユーザーに確認
  const options = ['はい', 'いいえ'];
  const confirmed = await ui.choose('スワップを実行しますか？', options, (v) => v);
  if (confirmed !== 'はい') {
    await ui.write('スワップはキャンセルされました。');
    return;
  }

  try {
    // スワップトランザクションパラメータの取得
    await ui.write('\nスワップトランザクションパラメータを取得中...');
    
    const txParams = await router.getSwapTonToJettonTxParams({
      userWalletAddress: senderAddress.toString(),
      proxyTon: proxyTon,
      offerAmount: offerAmount,
      askJettonAddress: networkConfig.askJettonAddress,
      minAskAmount: networkConfig.minAskAmount,
      queryId: queryId,
    });
    
    await ui.write('\nトランザクションパラメータの取得完了！');
    await ui.write(`- 送信先アドレス: ${txParams.to}`);
    await ui.write(`- 送信額: ${txParams.value.toString()} TON`);
    
    // ユーザーに最終確認
    const finalConfirm = await ui.choose('このトランザクションを送信しますか？', options, (v) => v);
    if (finalConfirm !== 'はい') {
      await ui.write('トランザクションはキャンセルされました。');
      return;
    }
    
    // トランザクションの送信
    await ui.write('\nトランザクションを送信しています...');
    
    // Blueprint環境に適した形式でトランザクションを送信
    await sender.send({
      to: txParams.to,
      value: txParams.value,
      body: txParams.body,
    });
    
    await ui.write('トランザクションが送信されました！');
    await ui.write(`トランザクションの詳細はエクスプローラーで確認できます: ${networkConfig.explorerUrl}/address/${senderAddress.toString()}`);
    await ui.write('\n注意: スワップ結果を確認するには、あなたのウォレットアドレスのトランザクション履歴を確認してください。');
    await ui.write(`成功すると、ウォレットに ${networkConfig.tokenName} が届きます。`);
    
  } catch (error) {
    await ui.write(`エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    
    // エラーの詳細を表示
    if (error instanceof Error && error.stack) {
      await ui.write('スタックトレース:');
      await ui.write(error.stack);
    }
  }
}
