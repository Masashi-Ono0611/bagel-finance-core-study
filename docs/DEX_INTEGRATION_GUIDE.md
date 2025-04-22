# DEXインテグレーションガイド

このドキュメントは、Bagel Financeのスマートコントラクトに新しいDEX（分散型取引所）を統合する際の方針と注意点をまとめたものです。現在、DeDustとStonfiの2つのDEXが統合されています。

## 目次

1. [ストレージの構造](#ストレージの構造)
2. [アプリ側からVaultに送るメッセージの設計](#アプリ側からvaultに送るメッセージの設計)
3. [名称変更と命名規則](#名称変更と命名規則)
4. [特殊アドレスの取り扱い](#特殊アドレスの取り扱い)
5. [新しいDEXの追加方法](#新しいdexの追加方法)
6. [テスト方法](#テスト方法)

## ストレージの構造

### Vaultのストレージ構造

Vaultコントラクトは、複数のDEXをサポートするために以下のようなストレージ構造を持っています：

```
Vault Storage
├── admin_address: Address
├── jetton_wallet_code: Cell
├── dex_ton_vault_address: Address (DEXルーターアドレス)
├── content: Cell (Jettonメタデータ)
├── total_supply: Int
├── mintable: Bool
├── baskets: Dictionary<Int, Basket>
└── waitings: Dictionary<Address, Waiting>
```

### バスケットの構造

各バスケットは以下の情報を持ちます：

```typescript
export type Basket = {
    // DEX共通フィールド
    weight: bigint;
    jettonMasterAddress: Address;
    jettonWalletAddress: Address;    // StonFiの場合はデプロイ時に設定、DeDustの場合はinitVault時に設定
    // DeDust用フィールド
    dexPoolAddress: Address;         // DeDustでのトークンペア別のプールアドレス(StonFiの場合は互換性のためにdexRouterAddressと同じ値をダミーで設定）
    dexJettonVaultAddress: Address;   // DeDustでのトークンペア別のJettonVaultアドレス（StonFiの場合は互換性のためにdexProxyTonAddressと同じ値をダミーで設定）
    // StonFi V1用追加フィールド
    dexRouterAddress?: Address;      // StonFi V1のルーターアドレス
    dexProxyTonAddress?: Address;    // StonFi V1のプロキシTONアドレス
    // DEX共通フィールド
    dexType?: number;                // DEXタイプ（0=DeDust, 1=Stonfi）
};
```

### DEXタイプの定義

DEXタイプは`Constants.ts`で定義されています：

```typescript
export abstract class DexType {
    static DEDUST = 0;
    static STONFI = 1;
    // 新しいDEXを追加する場合はここに定義
}
```

## アプリ側からVaultに送るメッセージの設計

### メッセージの種類

Vaultコントラクトは以下のメッセージを受け付けます：

1. **Mint操作**
   - OP: `op::mint()`
   - 目的: 新しいインデックストークンを発行
   - パラメータ: 
     - `query_id`: Int
     - `jetton_amount`: Int (発行するJetton量)
     - `sender`: Address (送信者アドレス)

2. **Burn操作**
   - OP: `op::burn_notification()`
   - 目的: インデックストークンを焼却して基礎トークンを取得
   - パラメータ:
     - `query_id`: Int
     - `jetton_amount`: Int (焼却するJetton量)
     - `sender`: Address (送信者アドレス)

3. **管理操作**
   - OP: `op::change_vault_data()`
   - 目的: Vaultの設定を変更（管理者のみ）
   - パラメータ:
     - `query_id`: Int
     - `new_vault_data`: Cell (新しいVaultデータ)

### DEXタイプに応じたメッセージの違い

DEXタイプによって、内部的なメッセージの処理が異なります：

1. **DeDust**
   - TONスワップメッセージ: `op::dedust_ton_swap()`
   - Jettonスワップメッセージ: `op::dedust_jetton_swap()`
   - プール操作: DeDust独自のプールインターフェース

2. **Stonfi**
   - TONスワップメッセージ: `op::stonfi_ton_swap()`
   - Jettonスワップメッセージ: `op::stonfi_jetton_swap()`
   - プール操作: Stonfi独自のプールインターフェース
   - 特徴: プロキシTONアドレスを使用したTONスワップをサポート

アプリ側からは、これらの違いを意識する必要はありません。Vaultコントラクトが適切なDEXに対応するメッセージを送信します。

## 名称変更と命名規則

### 変数名の命名規則

DEX統合に関連する変数名は、以下の命名規則に従っています：

1. **DEXタイプ関連**
   - `dexType`: DEXの種類を示す整数値
   - `primaryDexType`: バスケットの主要なDEXタイプ

2. **アドレス関連**
   - `dexTonVaultAddress`: DEXのルーターアドレス
   - `dexPoolAddress`: DEXのプールアドレス
   - `dexJettonVaultAddress`: DEXのJettonVaultアドレス

3. **変数名の変更点**
   - 旧: `dedustPoolAddress` → 新: `dexPoolAddress`
   - 旧: `dedustJettonVaultAddress` → 新: `dexJettonVaultAddress`
   - 新規: `dexRouterAddress` (StonFi V1用)
   - 新規: `dexProxyTonAddress` (StonFi V1用)

### インターフェース定義

`BasketTemplate`インターフェースは、複数のDEXをサポートするために拡張されました：

```typescript
interface BasketTemplate {
    // DEX共通フィールド
    weight: string;
    jettonMasterAddress: string;
    jettonWalletAddress?: string;    // StonFiの場合はデプロイ時に設定、DeDustの場合はinitVault時に設定
    // DeDust用フィールド
    dexPoolAddress?: string;         // DeDustでのトークンペア別のプールアドレス(StonFiの場合は互換性のためにdexRouterAddressと同じ値をダミーで設定）
    dexJettonVaultAddress?: string;   // DeDustでのトークンペア別のJettonVaultアドレス（StonFiの場合は互換性のためにdexProxyTonAddressと同じ値をダミーで設定）
    // StonFi V1用追加フィールド
    dexRouterAddress?: string;       // StonFi V1のルーターアドレス
    dexProxyTonAddress?: string;     // StonFi V1のプロキシTONアドレス
    // DEX共通フィールド
    dexType?: number;                // DEXタイプ（0=DeDust, 1=Stonfi）
}
```

## 特殊アドレスの取り扱い

### 特殊文字を含むアドレス

TONブロックチェーンのアドレスには、特殊文字（ハイフンなど）を含むものがあります。これらのアドレスは標準的な`Address.parse()`メソッドでは正しく解析できない場合があります。

例: `EQBsGx9ArADUrREB34W-ghgsCgBShvfUr4Jvlu-0KGc33Rbt`（ハイフンを含む）

### AddressHelperクラス

特殊文字を含むアドレスを安全に解析するために、`AddressHelper`クラスが提供されています：

```typescript
// 使用例
import { AddressHelper } from '../utils/AddressHelper';

// 安全なアドレス解析
const address = AddressHelper.getAddressSafe(specialAddress, fallbackAddress);
```

### 新しい特殊アドレスの追加方法

新しい特殊アドレスを追加する場合は、`AddressHelper.ts`の`ADDRESS_HEX_MAP`に追加します：

```typescript
private static readonly ADDRESS_HEX_MAP: Record<string, string> = {
    // 既存のエントリ
    'EQBsGx9ArADUrREB34W-ghgsCgBShvfUr4Jvlu-0KGc33Rbt': '0:6c1b1f40ac00d4ad1101df85be821832c0a005286f7d4af826f96efb428673dd',
    
    // 新しいエントリを追加
    'EQAbc-123_XYZ': '0:abc123xyz...',
};
```

## 新しいDEXの追加方法

新しいDEXを追加する手順は以下の通りです：

1. **DEXタイプの定義**
   - `Constants.ts`にDEXタイプを追加

   ```typescript
   export abstract class DexType {
       static DEDUST = 0;
       static STONFI = 1;
       static NEW_DEX = 2; // 新しいDEXを追加
   }
   ```

2. **DEXアドレスの定義**
   - `Constants.ts`にDEXのルーターアドレスを追加

   ```typescript
   export const NEW_DEX_ROUTER_MAINNET = 'EQ...';
   export const NEW_DEX_ROUTER_TESTNET = 'EQ...';
   ```

3. **BasketTemplateの拡張**
   - 新しいDEX用のフィールドを追加

   ```typescript
   interface BasketTemplate {
       // 既存のフィールド
       newDexPoolAddress?: string; // 新しいDEX用
   }
   ```

4. **deployVault.tsの実装**
   - DEXタイプに応じたルーターアドレスの選択ロジック

   ```typescript
   // DEXタイプの選択
   const dexTypeChoice = await ui.choose(
       `Select DEX type for Basket ${index + 1}:`,
       ['DeDust', 'Stonfi'],
       (v: string) => v
   );
   const dexType = dexTypeChoice === 'DeDust' ? DexType.DEDUST : DexType.STONFI;
   
   // DEXタイプに応じたプロンプトメッセージを変更
   const dexName = dexType === DexType.DEDUST ? 'DeDust' : 'Stonfi';
   
   // StonFi V1の場合は追加フィールドも設定
   if (dexType === DexType.STONFI) {
       const dexRouterAddress = Address.parse(await ui.input(`Enter StonFi Router Address for Basket ${index + 1}: `));
       const dexProxyTonAddress = Address.parse(await ui.input(`Enter StonFi Proxy TON Address for Basket ${index + 1}: `));
       
       // 返却値にStonFi用フィールドを追加
   }
   ```

5. **Vault.tsの実装**
   - DEXタイプに応じたメッセージ処理ロジック
   - Basketの定義にStonFi V1用のフィールドを追加

   ```typescript
   export type Basket = {
       weight: bigint;
       jettonWalletAddress: Address;
       // DEX共通フィールド
       dexPoolAddress: Address;         // DEXプールアドレス
       dexJettonVaultAddress: Address;   // DEXのJettonVaultアドレス
       // StonFi V1用追加フィールド
       dexRouterAddress?: Address;      // StonFi V1のルーターアドレス
       dexProxyTonAddress?: Address;    // StonFi V1のプロキシTONアドレス
       jettonMasterAddress: Address;
       dexType?: number;                // DEXタイプ（0=DeDust, 1=Stonfi）
   };
   ```

## テスト方法

### テストネットでのテスト

1. **Vaultのデプロイ**
   ```bash
   npx blueprint run
   # deployVaultを選択
   # テストネットを選択
   # テンプレートを選択（例: 'Stonfi testnet 2baskets V2'）
   ```

2. **Vaultの初期化**
   ```bash
   npx blueprint run
   # initVaultを選択
   # テストネットを選択
   # デプロイしたVaultアドレスを入力
   ```

3. **トークンのデポジット**
   ```bash
   npx blueprint run
   # depositToVaultを選択
   # デポジットする金額を入力
   ```

4. **トークンのバーン（リディーム）**
   ```bash
   npx blueprint run
   # burnFromVaultを選択
   # バーンする金額を入力
   ```

### メインネットでのテスト

メインネットでのテストは、テストネットでの検証が完了した後に行ってください。手順はテストネットと同様ですが、ネットワーク選択で「mainnet」を選びます。

## 注意点とベストプラクティス

1. **アドレス解析**
   - 特殊文字を含むアドレスには必ず`AddressHelper`クラスを使用
   - `Address.parse()`の代わりに`AddressHelper.getAddressSafe()`を使用

2. **DEXタイプの取り扱い**
   - DEXタイプは常に整数値として扱う
   - 文字列での比較は避け、`DexType`クラスの定数を使用

3. **バックワードコンパティビリティ**
   - 既存のDEXとの互換性を維持
   - 新しいDEXを追加しても既存の機能が壊れないように注意

4. **エラーハンドリング**
   - DEX操作のエラーを適切に処理
   - フォールバックメカニズムを実装

## 参考資料

- [TON Documentation](https://ton.org/docs)
- [DeDust Documentation](https://docs.dedust.io/)
- [Stonfi Documentation](https://docs.stonfi.io/)
- [TON Blockchain Explorer (Tonviewer)](https://tonviewer.com/)
- [TON Testnet Explorer](https://testnet.tonviewer.com/)
