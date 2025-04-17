# StonFi DEX v1とv2の比較

このドキュメントでは、StonFi DEXのバージョン1と2の主な違いと実装の詳細について説明します。

## 1. 基本的な構造と初期化の違い

### DEX v1
```typescript
// DEX v1 Routerの初期化
const router = client.open(new DEX.v1.Router());

// pTONの初期化
const proxyTon = new pTON.v1();
```

### DEX v2
```typescript
// Stonfi Routerの初期化
const router = client.open(DEX.v2_2.Router.CPI.create(networkConfig.routerAddress));

// pTONの初期化
const proxyTon = pTON.v2_1.create(networkConfig.proxyTonAddress);
```

## 2. 必要なアドレス情報

### DEX v1
- **必須パラメータ**:
  - `askJettonAddress`: 受け取りたいJettonのアドレス
  - `minAskAmount`: 最小受け取り量
  - `proxyTon`: pTONのインスタンス

- **不要パラメータ**:
  - ルーターアドレス（DEX v1ではSDK内部で固定）
  - プロキシTONアドレス（DEX v1ではSDK内部で固定）

### DEX v2
- **必須パラメータ**:
  - `routerAddress`: ルーターのアドレス
  - `proxyTonAddress`: pTONのアドレス
  - `askJettonAddress`: 受け取りたいJettonのアドレス
  - `minAskAmount`: 最小受け取り量

## 3. バージョン互換性

- **DEX v1**: pTON v1と互換性あり
- **DEX v2.2**: pTON v2.1と互換性あり
- **重要**: バージョンの組み合わせは固定で、異なるバージョン間での互換性はありません

## 4. 実装の違い

### TON→Jettonスワップの場合

両方とも同じ関数名と似たパラメータを使用していますが、内部実装が異なります：

```typescript
// 両バージョンで共通のパラメータ
const txParams = await router.getSwapTonToJettonTxParams({
  userWalletAddress: senderAddress.toString(),
  proxyTon: proxyTon,
  offerAmount: offerAmount,
  askJettonAddress: networkConfig.askJettonAddress,
  minAskAmount: networkConfig.minAskAmount,
  queryId: queryId,
});
```

### Jetton→TONスワップの場合

DEX v2では以下のようなパラメータが必要です：

```typescript
const txParams = await router.getSwapJettonToTonTxParams({
  userWalletAddress: senderAddress.toString(),
  offerJettonAddress: networkConfig.offerJettonAddress,
  offerAmount: offerAmount,
  minAskAmount: networkConfig.minAskAmount,
  proxyTon: proxyTon,
  queryId: queryId,
});
```

## 5. アドレスの形式

- **DEX v1**: アドレスの形式に特別な要件はない
- **DEX v2**: ルーターアドレスとpTONアドレスが必須で、ネットワークによって異なる

### メインネット用アドレス

```typescript
// DEX v2.2 メインネット
routerAddress: 'EQCiypoBWNIEPlarBp04UePyEj5zH0ZDHxuRNqJ1WQx3FCY-', // Router v2.2 mainnet
proxyTonAddress: 'EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o83S', // pTON v2.1 mainnet
```

### テストネット用アドレス

```typescript
// DEX v2 テストネット
routerAddress: 'kQCS4UEa5UaJLzOyyKieqQOQ2P9M-7kXpkO5HnP3Bv250Xj9', // Router v2 testnet
proxyTonAddress: 'kQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o3ZY', // pTON v2 testnet
```

## 6. 実行環境

- **DEX v1**: 2025年4月時点でも安定して動作
- **DEX v2**: 「環境によらずSwapがうまくできない場合がある」という注意書きあり

## 7. ガス料金と手数料

- **DEX v2**: より複雑な処理のため、一般的にガス料金が高い
- **DEX v1**: 比較的シンプルな処理で、ガス料金が低い

## 実装上の注意点

1. **バージョン互換性を厳守する**:
   - DEX v1 + pTON v1
   - DEX v2.2 + pTON v2.1

2. **アドレス指定**:
   - DEX v2では、ルーターアドレスとpTONアドレスを明示的に指定する必要がある
   - テストネットとメインネットで異なるアドレスを使用する

3. **エラーハンドリング**:
   - DEX v2では、より多くのエラーケースに対応する必要がある

4. **トランザクションパラメータ**:
   - 両バージョンとも、トランザクションの送信部分は同じ
   - 取得したtxParamsを使用してトランザクションを送信

## まとめ

StonFi DEX v1とv2の主な違いは初期化方法とアドレス指定の要件です。v2はより柔軟ですが、追加のパラメータが必要で、安定性に課題がある場合があります。実装する際は、適切なバージョンの組み合わせを選択し、必要なアドレスを正確に指定することが重要です。
