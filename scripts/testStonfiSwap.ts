import { Address, beginCell, toNano, Cell } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { AddressHelper } from '../utils/AddressHelper';
import { STONFI_ROUTER_TESTNET } from '../utils/Constants';
import { getTonClient } from '../utils/TonClient';

/**
 * Stonfiテストネットでのスワップテスト用スクリプト
 * 
 * このスクリプトは、Stonfiテストネットでシンプルなスワップ操作を実行します。
 * Tonkeeperでメッセージ承認が可能です。
 * 
 * 使用方法:
 * npx blueprint run testStonfiSwap
 */

export async function run(provider: NetworkProvider) {
  const ui = provider.ui();
  
  // Get network from provider
  const network = provider.network() === 'custom' ? 'mainnet' : provider.network();
  const tonClient = getTonClient(network as 'mainnet' | 'testnet');
  
  // ユーザーの入力を取得
  const swapAmountStr = await ui.input('スワップ金額（TON）: ');
  const swapAmount = toNano(swapAmountStr || '0.1');
  
  // ウォレットアドレスの取得
  const sender = provider.sender();
  if (!sender) {
    await ui.write('エラー: ウォレットが接続されていません。');
    return;
  }
  
  // Blueprintの仕様に合わせてアドレスを取得
  const senderAddress = sender.address;
  if (!senderAddress) {
    await ui.write('エラー: ウォレットアドレスを取得できませんでした。');
    return;
  }
  
  await ui.write(`ウォレットアドレス: ${senderAddress.toString()}`);

  // Stonfiルーターアドレスの取得
  const stonfiRouterAddress = AddressHelper.getStonfiTestnetRouterAddress();
  await ui.write(`Stonfiルーターアドレス: ${stonfiRouterAddress.toString()}`);

  // スワップパラメータの設定
  const queryId = Math.floor(Math.random() * 10000000000); // ランダムなクエリID
  const deadline = Math.floor(Date.now() / 1000) + 300; // 現在時刻 + 5分

  // cross_swap_bodyの作成
  const crossSwapBody = beginCell()
    .storeCoins(0) // min_out: 最小受け取り量（0 = 制限なし）
    .storeAddress(senderAddress) // receiver: 受け取りアドレス
    .storeCoins(toNano('0.05')) // fwd_gas: 転送用ガス
    .storeMaybeRef(null) // custom_payload: カスタムペイロード（なし）
    .storeCoins(toNano('0.05')) // refund_fwd_gas: 返金用ガス
    .storeMaybeRef(null) // refund_payload: 返金時のペイロード（なし）
    .storeUint(0, 16) // ref_fee: リファラル手数料（0%）
    .storeAddress(null) // ref_address: リファラルアドレス（なし）
    .endCell();

  // スワップメッセージの作成
  const swapMessage = beginCell()
    .storeUint(0x6664de2a, 32) // swap op code
    .storeUint(BigInt(queryId), 64) // query_id
    .storeAddress(stonfiRouterAddress) // token_wallet1: 対象トークンウォレット
    .storeAddress(senderAddress) // refund_address: 返金先アドレス
    .storeAddress(senderAddress) // excesses_address: 余剰金送付先アドレス
    .storeUint(BigInt(deadline), 64) // tx_deadline: 取引期限
    .storeRef(crossSwapBody) // cross_swap_body: スワップ詳細
    .endCell();

  await ui.write('スワップメッセージの作成完了');
  await ui.write(`- オペレーションコード: 0x6664de2a`);
  await ui.write(`- クエリID: ${queryId}`);
  await ui.write(`- スワップ金額: ${swapAmount.toString()} TON`);
  await ui.write(`- 取引期限: ${new Date(deadline * 1000).toLocaleString()}`);

  await ui.write('\nスワップメッセージのバイナリデータ:');
  await ui.write(swapMessage.toBoc().toString('base64'));

  // ユーザーに確認
  const options = ['はい', 'いいえ'];
  const confirmed = await ui.choose('このトランザクションを送信しますか？', options, (v) => v);
  if (confirmed !== 'はい') {
    await ui.write('トランザクションはキャンセルされました。');
    return;
  }

  // トランザクションの送信
  await ui.write('Stonfiルーターにトランザクションを送信しています...');
  
  // 実際のトランザクション送信
  const totalAmount = BigInt(swapAmount.toString()) + BigInt(toNano('0.1').toString()); // スワップ金額 + ガス代
  
  await sender.send({
    to: stonfiRouterAddress,
    value: totalAmount,
    body: swapMessage,
  });

  await ui.write('トランザクションが送信されました。');
  await ui.write(`トランザクションの詳細はエクスプローラーで確認できます: https://testnet.tonviewer.com/address/${stonfiRouterAddress.toString()}`);
}
