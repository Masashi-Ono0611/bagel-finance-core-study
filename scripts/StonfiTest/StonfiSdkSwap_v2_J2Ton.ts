import { NetworkProvider } from '@ton/blueprint';
import { TonClient, toNano, Address } from '@ton/ton';
import { DEX, pTON } from '@ston-fi/sdk';

/**
 * Stonfi SDKを使用したJetton→TONスワップテスト用スクリプト（DEX v2.2版）
 * 
 * このスクリプトは、Stonfi公式SDKを使用してJettonからTONへのスワップを実行します。
 * DEX v2.2とpTON v2.1を使用しています。
 * メインネットとテストネットの両方に対応しています。
 * 
 * 使用方法:
 * npx blueprint run testStonfiSdkSwap_JettonToTon
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
      offerJettonAddress: 'EQB4zZusHsbU2vVTPqjhlokIOoiZhEdCMT703CWEzhTOo__X', // X Empire
      askJettonAddress: 'EQB4zZusHsbU2vVTPqjhlokIOoiZhEdCMT703CWEzhTOo__X', // X Empire
      minAskAmount: toNano('0.1'), // 最小受け取り量 0.1 X Empire
      tokenName: 'X Empire',
      explorerUrl: 'https://tonviewer.com'
    },
    testnet: {
      endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
      routerAddress: 'kQCS4UEa5UaJLzOyyKieqQOQ2P9M-7kXpkO5HnP3Bv250Xj9', // Router v2 testnet
      proxyTonAddress: 'kQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o3ZY', // pTON v2 testnet
      offerJettonAddress: 'kQDBhbVXAF0Xur1dYBxA6tCiUV-14LEn_KZgVimTiV67dE85', //Tether USD USD₮
      minAskAmount: '1', // 最小受け取り量
      tokenName: 'Tether USD USD₮',
      explorerUrl: 'https://testnet.tonviewer.com'
    }
  };
  
  // メインネットとテストネットの両方でハードコードされたアドレスを使用
  await ui.write(`選択されたネットワーク: ${network}`);
  await ui.write(`使用するJettonアドレス: ${isMainnet ? config.mainnet.offerJettonAddress + ' (jUSDT)' : config.testnet.offerJettonAddress + ' (TestRED)'}`);

  
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

  // スワップ量をハードコード
  const amount = '0.000006935'; // 0.006935 Jetton
  await ui.write(`スワップするJetton量: ${amount}`);

  
  const offerAmount = toNano(amount); // Jetton量をnano単位に変換
  const queryId = Math.floor(Math.random() * 1000000); // ランダムなqueryId
  
  // スワップパラメータの設定
  await ui.write('\nスワップパラメータの設定:');
  await ui.write(`- Jetton送信量: ${amount} ${isMainnet ? 'Jetton' : 'TestRED'}`);
  await ui.write(`- 最小受け取り量: ${networkConfig.minAskAmount} TON`);
  await ui.write(`- DEXバージョン: v2.2`);
  await ui.write(`- ネットワーク: ${network}`);
  await ui.write(`- ルーターアドレス: ${networkConfig.routerAddress}`);
  await ui.write(`- プロキシTONアドレス: ${networkConfig.proxyTonAddress}`);
  await ui.write(`- 対象Jettonアドレス: ${networkConfig.offerJettonAddress}`);
  
  // 自動的に実行
  await ui.write('スワップを自動的に実行します...');


  try {
    // スワップトランザクションパラメータの取得
    await ui.write('\nスワップトランザクションパラメータを取得中...');
    
    // デバッグ情報を表示
    await ui.write(`デバッグ情報:`);
    await ui.write(`- ユーザーウォレットアドレス: ${senderAddress.toString()}`);
    await ui.write(`- 対象Jettonアドレス: ${networkConfig.offerJettonAddress}`);
    
    const txParams = await router.getSwapJettonToTonTxParams({
      userWalletAddress: senderAddress.toString(),
      offerJettonAddress: networkConfig.offerJettonAddress,
      offerAmount: offerAmount,
      minAskAmount: networkConfig.minAskAmount,
      proxyTon: proxyTon,
      queryId: queryId,
    });
    
    await ui.write('\nトランザクションパラメータの取得完了！');
    await ui.write(`- 送信先アドレス: ${txParams.to}`);
    await ui.write(`- 送信額: ${txParams.value.toString()} TON`);
    
    // 自動的に送信
    await ui.write('トランザクションを自動的に送信します...');

    
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
