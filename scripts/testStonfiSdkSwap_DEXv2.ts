import { NetworkProvider } from '@ton/blueprint';
import { TonClient, toNano, Address } from '@ton/ton';
import { DEX, pTON } from '@ston-fi/sdk';

/**
 * Stonfi SDKを使用したスワップテスト用スクリプト
 * 
 * このスクリプトは、Stonfi公式SDKを使用してTONからJettonへのスワップを実行します。
 * 
 * 使用方法:
 * npx blueprint run testStonfiSdkSwap
 */

export async function run(provider: NetworkProvider) {
  const ui = provider.ui();
  
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
    endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
  });

  // Stonfi Routerの初期化（testnet用のアドレス）
  const routerAddress = 'kQAFpeGFJQA9KqiCxXZ8J4l__vSYAxFSirSOvPHn6SSX4ztn'; // CPI Router v2.2.0 testnet
  const router = client.open(DEX.v2_2.Router.CPI.create(routerAddress));

  // pTONの初期化（testnet用のアドレス）
  const proxyTonAddress = 'kQACS30DNoUQ7NfApPvzh7eBmSZ9L4ygJ-lkNWtba8TQT-Px'; // pTON v2.1.0 testnet
  const proxyTon = pTON.v2_1.create(proxyTonAddress);

  // スワップパラメータの固定値
  const askJettonAddress = 'kQDLvsZol3juZyOAVG8tWsJntOxeEZWEaWCbbSjYakQpuYN5'; // TestRED
  const offerAmount = toNano('1'); // 1 TONをスワップ
  const minAskAmount = '1'; // 最小受け取り量
  const queryId = 12345; // クエリID
  
  // スワップパラメータの設定
  await ui.write('\nスワップパラメータの設定:');
  await ui.write(`- TON送信量: 1 TON`);
  await ui.write(`- 最小受け取り量: ${minAskAmount} TestRED`);
  await ui.write(`- ターゲットトークン: TestRED`);
  await ui.write(`- ルーターアドレス: ${routerAddress}`);
  await ui.write(`- プロキシTONアドレス: ${proxyTonAddress}`);
  
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
      askJettonAddress: askJettonAddress,
      minAskAmount: minAskAmount,
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
    await ui.write(`トランザクションの詳細はエクスプローラーで確認できます: https://testnet.tonviewer.com/address/${senderAddress.toString()}`);
    await ui.write('\n注意: スワップ結果を確認するには、あなたのウォレットアドレスのトランザクション履歴を確認してください。');
    await ui.write(`成功すると、ウォレットに TestRED が届きます。`);
    
  } catch (error) {
    await ui.write(`エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    
    // エラーの詳細を表示
    if (error instanceof Error && error.stack) {
      await ui.write('スタックトレース:');
      await ui.write(error.stack);
    }
  }
}