import { NetworkProvider } from '@ton/blueprint';
import { TonClient, toNano, Address } from '@ton/ton';
import { DEX, pTON } from '@ston-fi/sdk';

/**
 * Stonfi SDKを使用したスワップテスト用スクリプト（DEX v2.2版）
 * 
 * このスクリプトは、Stonfi公式SDKを使用してTONからJettonへのスワップを実行します。
 * DEX v2.2とpTON v2.1を使用しています。
 * メインネットとテストネットの両方に対応しています。
 * 
 * 使用方法:
 * npx blueprint run testStonfiSdkSwap_DEXv2
 * 
 * 注意:
 * 2025/04/17時点でDEXv2では、環境によらずSwapがうまくできない場合があります。
 * テスト目的でのみ使用してください。
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
      routerAddress: 'EQCiypoBWNIEPlarBp04UePyEj5zH0ZDHxuRNqJ1WQx3FCY-', // Router v2.2 mainnet
      proxyTonAddress: 'EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o83S', // pTON v2.1 mainnet
      askJettonAddress: 'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO', // STON
      minAskAmount: toNano('0.1'), // 最小受け取り量 0.1 STON
      tokenName: 'STON',
      explorerUrl: 'https://tonviewer.com'
    },
    testnet: {
      endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
      routerAddress: 'kQAFpeGFJQA9KqiCxXZ8J4l__vSYAxFSirSOvPHn6SSX4ztn', // Router v2.2.0 testnet
      proxyTonAddress: 'kQACS30DNoUQ7NfApPvzh7eBmSZ9L4ygJ-lkNWtba8TQT-Px', // pTON v2.1.0 testnet
      askJettonAddress: 'kQDLvsZol3juZyOAVG8tWsJntOxeEZWEaWCbbSjYakQpuYN5', // TestRED
      minAskAmount: '1', // 最小受け取り量
      tokenName: 'TestRED',
      explorerUrl: 'https://testnet.tonviewer.com'
    }
  };
  
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

  // Stonfi Routerの初期化
  const router = client.open(DEX.v2_2.Router.CPI.create(networkConfig.routerAddress));

  // pTONの初期化
  const proxyTon = pTON.v2_1.create(networkConfig.proxyTonAddress);

  // スワップパラメータの固定値
  const offerAmount = toNano('1'); // 1 TONをスワップ
  const queryId = 12345; // クエリID
  
  // スワップパラメータの設定
  await ui.write('\nスワップパラメータの設定:');
  await ui.write(`- TON送信量: 1 TON`);
  await ui.write(`- 最小受け取り量: ${networkConfig.minAskAmount.toString()} ${networkConfig.tokenName}`);
  await ui.write(`- ターゲットトークン: ${networkConfig.tokenName}`);
  await ui.write(`- DEXバージョン: v2.2`);
  await ui.write(`- ネットワーク: ${network}`);
  await ui.write(`- ルーターアドレス: ${networkConfig.routerAddress}`);
  await ui.write(`- プロキシTONアドレス: ${networkConfig.proxyTonAddress}`);
  
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