import { NetworkProvider } from '@ton/blueprint';
import { TonClient, toNano, Address } from '@ton/ton';
import { DEX, pTON } from '@ston-fi/sdk';

/**
 * StonFi DEXプール情報取得スクリプト
 * 
 * このスクリプトは、StonFi DEXのプール情報を取得します。
 * メインネットとテストネットの両方に対応しています。
 * 
 * 使用方法:
 * npx blueprint run getStonfiPool
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
      // routerAddress: 'EQCiypoBWNIEPlarBp04UePyEj5zH0ZDHxuRNqJ1WQx3FCY-', // Router v2.2 mainnet
      routerAddress: 'EQDAPye7HAPAAl4WXpz5jOCdhf2H9h9QkkzRQ-6K5usiuQeC', // Router
      // proxyTonAddress: 'EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o83S', // pTON v2.1 mainnet
      proxyTonAddress: 'EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o83S', // pTON 
      // token0Address: 'EQB4zZusHsbU2vVTPqjhlokIOoiZhEdCMT703CWEzhTOo__X', // X Empire
      token0Address: 'EQCdb8hvMDDZcqpPGH-cCj3iMuom9P57mMyrdoHNNyXHM9Fs', // ESIM
      explorerUrl: 'https://tonviewer.com'
    },
    testnet: {
      endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
      routerAddress: 'kQCS4UEa5UaJLzOyyKieqQOQ2P9M-7kXpkO5HnP3Bv250Xj9', // Router
      proxyTonAddress: 'kQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o3ZY', // pTON
      token0Address: 'kQDBhbVXAF0Xur1dYBxA6tCiUV-14LEn_KZgVimTiV67dE85', //Tether USD USD₮
      explorerUrl: 'https://testnet.tonviewer.com'
    }
  };
  
  // 選択されたネットワーク設定を使用
  const networkConfig = isMainnet ? config.mainnet : config.testnet;
  
  await ui.write(`ネットワーク: ${network}`);
  await ui.write(`ルーターアドレス: ${networkConfig.routerAddress}`);
  await ui.write(`プロキシTONアドレス: ${networkConfig.proxyTonAddress}`);
  await ui.write(`トークン0アドレス: ${networkConfig.token0Address}`);

  try {
    // TonClientの初期化
    const client = new TonClient({
      endpoint: networkConfig.endpoint,
      //apiKey: 'eaf8725b861e302dc04f0792cb275e127fba57239773ee2df9781de29d96ed41' // Mainnet
      apiKey: '971520e50f890676682322b352d054f77d4dd9aedab2c0681be2dd70c8a63333' // Testnet
    });

    // DEXバージョンを選択（テストネットではv2.1を試す）
    const dexVersion = isMainnet ? DEX.v2_2 : DEX.v2_1;
    
    // Stonfi Routerの初期化
    await ui.write('\nルーターを初期化しています...');
    const router = client.open(dexVersion.Router.CPI.create(networkConfig.routerAddress));
    
    // pTONバージョンを選択
    const ptonVersion = isMainnet ? pTON.v2_1 : pTON.v2_1;
    
    // pTONの初期化
    await ui.write('pTONを初期化しています...');
    const proxyTon = ptonVersion.create(networkConfig.proxyTonAddress);
    
    // pTONアドレスの取得
    const ptonAddress = proxyTon.address;
    await ui.write(`pTONアドレス: ${ptonAddress}`);
    
    // プール情報の取得
    await ui.write('\nプール情報を取得しています...');
    
    // ランダムなクエリID（より安全な通信のため）
    const queryId = Math.floor(Math.random() * 1000000000000);
    
    try {
      // プールの取得
      const pool = client.open(await router.getPool({
        token0: networkConfig.token0Address,
        token1: ptonAddress
      }));
      
      // プール情報の表示
      await ui.write('\nプール情報:');
      await ui.write(`- プールアドレス: ${pool.address.toString()}`);
      
      // プールの詳細情報を取得
      try {
        const poolData = await pool.getPoolData();
        await ui.write(`- リザーブ0: ${poolData.reserve0.toString()}`);
        await ui.write(`- リザーブ1: ${poolData.reserve1.toString()}`);
        await ui.write(`- トータルサプライ: ${poolData.totalSupplyLP.toString()}`);
        await ui.write(`- LP手数料: ${poolData.lpFee.toString()}`);
        await ui.write(`- プロトコル手数料: ${poolData.protocolFee.toString()}`);
        
        // 価格情報の計算
        const price0 = Number(poolData.reserve1) / Number(poolData.reserve0);
        const price1 = Number(poolData.reserve0) / Number(poolData.reserve1);
        
        await ui.write(`\n価格情報:`);
        await ui.write(`- ${isMainnet ? 'jUSDT' : 'TestRED'}/pTON: ${price0.toFixed(6)}`);
        await ui.write(`- pTON/${isMainnet ? 'jUSDT' : 'TestRED'}: ${price1.toFixed(6)}`);
        
      } catch (error) {
        await ui.write(`プール詳細情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // エクスプローラーリンクの表示
      await ui.write(`\nプールの詳細はエクスプローラーで確認できます: ${networkConfig.explorerUrl}/address/${pool.address.toString()}`);
      
    } catch (error) {
      await ui.write(`プールの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      
      // エラーの詳細を表示
      if (error instanceof Error && error.stack) {
        await ui.write('スタックトレース:');
        await ui.write(error.stack);
      }
    }
    
  } catch (error) {
    await ui.write(`エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    
    // エラーの詳細を表示
    if (error instanceof Error && error.stack) {
      await ui.write('スタックトレース:');
      await ui.write(error.stack);
    }
  }
}
