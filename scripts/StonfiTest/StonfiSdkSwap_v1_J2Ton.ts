import { NetworkProvider } from '@ton/blueprint';
import { TonClient, toNano, Address } from '@ton/ton';
import { DEX, pTON } from '@ston-fi/sdk';

/**
 * Stonfi SDKを使用したスワップテスト用スクリプト（DEX v1版 - JettonからTON）
 * 
 * このスクリプトは、Stonfi公式SDKのDEX v1を使用してJettonからTONへのスワップを実行します。
 * メインネットとテストネットの両方に対応しています。
 * 
 * 使用方法:
 * npx blueprint run testStonfiSdkSwap_v1_J2Ton
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
      offerJettonAddress: '', // コンソールから入力
      minAskAmount: '100000000', // 最小受け取り量（0.1 TON = 100000000 nanoTON）
      tokenName: 'Jetton',
      explorerUrl: 'https://tonviewer.com'
    },
    testnet: {
      endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
      // offerJettonAddress: 'kQBqtvcqnOUQrNN5JLb42AZtNiP7hsFvVNCOqiKUEoNYGkgv', // APR16
      offerJettonAddress: 'kQBig-ypUlf0m1GUzzuJOSM1JU4Gq1IgNbT9Spsw3EQ5ivO7', // Antony
      // offerJettonAddress: 'kQBig-ypUlf0m1GUzzuJOSM1JU4Gq1IgNbT9Spsw3EQ5ivO7', // Antony
      minAskAmount: '100000000', // 最小受け取り量（0.1 TON = 100000000 nanoTON）
      tokenName: 'Jetton',
      explorerUrl: 'https://testnet.tonviewer.com'
    }
  };
  
  // トークンアドレスを入力してもらう
  let jettonAddress;
  if (isMainnet) {
    jettonAddress = await ui.input('スワップするJettonのアドレスを入力してください（例: EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO）：');
    if (!jettonAddress) {
      await ui.write('アドレスが入力されていないため、デフォルトのSTONアドレスを使用します。');
      jettonAddress = 'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO'; // デフォルトのSTONアドレス
    }
    config.mainnet.offerJettonAddress = jettonAddress;
  } else {
    jettonAddress = await ui.input('スワップするJettonのアドレスを入力してください（例: kQBig-ypUlf0m1GUzzuJOSM1JU4Gq1IgNbT9Spsw3EQ5ivO7）：');
    if (!jettonAddress) {
      await ui.write('アドレスが入力されていないため、デフォルトのAntonyアドレスを使用します。');
      jettonAddress = 'kQBig-ypUlf0m1GUzzuJOSM1JU4Gq1IgNbT9Spsw3EQ5ivO7'; // デフォルトのAntonyアドレス
    }
    config.testnet.offerJettonAddress = jettonAddress;
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

  try {
    // TonClientの初期化
    const client = new TonClient({
      endpoint: networkConfig.endpoint,
    });

    // DEX v1 Routerの初期化
    const router = client.open(new DEX.v1.Router());

    // スワップパラメータの初期設定
    await ui.write('\nスワップパラメータの設定:');
    await ui.write(`- スワップするJettonアドレス: ${networkConfig.offerJettonAddress}`);
    // nanoTON単位からTON単位に変換して表示
    const minAskAmountInTon = (Number(networkConfig.minAskAmount) / 1_000_000_000).toFixed(1);
    await ui.write(`- 最小受け取り量: ${minAskAmountInTon} TON`);
    await ui.write(`- DEXバージョン: v1`);
    await ui.write(`- ネットワーク: ${network}`);
    
    // ユーザーに確認
    const options = ['はい', 'いいえ'];
    const confirmed = await ui.choose('スワップを実行しますか？', options, (v) => v);
    if (confirmed !== 'はい') {
      await ui.write('スワップはキャンセルされました。');
      return;
    }

    // スワップトランザクションパラメータの取得
    await ui.write('\nスワップトランザクションパラメータを取得中...');
    
    // スワップパラメータの設定
    const amountInput = await ui.input(`スワップする${networkConfig.tokenName}の量を入力してください（例: 0.1）：`);
    const offerAmount = toNano(amountInput || '0.1'); // デフォルトは0.1 Jetton
    const queryId = 12345; // クエリID
    
    await ui.write(`- スワップ量: ${amountInput || '0.1'} ${networkConfig.tokenName}`);

    const txParams = await router.getSwapJettonToTonTxParams({
      userWalletAddress: senderAddress.toString(),
      offerJettonAddress: networkConfig.offerJettonAddress,
      offerAmount: offerAmount,
      proxyTon: new pTON.v1(),
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
    await ui.write(`成功すると、ウォレットに TON が届きます。`);
    
  } catch (error) {
    await ui.write(`エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    
    // エラーの詳細を表示
    if (error instanceof Error && error.stack) {
      await ui.write('スタックトレース:');
      await ui.write(error.stack);
    }
  }
}