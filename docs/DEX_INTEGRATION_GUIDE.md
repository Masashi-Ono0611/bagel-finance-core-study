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

```
Basket
├── weight: Int (重み、9桁の小数点を使用)
├── jetton_wallet_address: Address (Jettonウォレットアドレス)
├── jetton_master_address: Address (JettonマスターアドレスまたはMinter)
├── dex_pool_address: Address (DEXプールアドレス)
├── dex_jetton_vault_address: Address (DEXのJettonVaultアドレス)
└── dex_type: Int (DEXタイプ、0=DeDust, 1=Stonfi)
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
   - スワップメッセージ: `op::swap_ton()`
   - プール操作: DeDust独自のプールインターフェース

2. **Stonfi**
   - スワップメッセージ: `op::swap()`
   - プール操作: Stonfi独自のプールインターフェース

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

3. **旧変数名からの変更点**
   - 旧: `dedustPoolAddress` → 新: `dexPoolAddress`
   - 旧: `dedustJettonVaultAddress` → 新: `dexJettonVaultAddress`

### インターフェース定義

`BasketTemplate`インターフェースは、複数のDEXをサポートするために拡張されました：

```typescript
interface BasketTemplate {
    weight: string;
    jettonMasterAddress: string;
    dedustPoolAddress?: string;      // DeDust用
    dedustJettonVaultAddress?: string; // DeDust用
    stonfiPoolAddress?: string;      // Stonfi用
    dexType?: number;                // DEXタイプ
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

4. **deployVault.tsの修正**
   - DEXタイプに応じたルーターアドレスの選択ロジックを追加

   ```typescript
   else if (primaryDexType === DexType.NEW_DEX) {
       // 新しいDEXの場合
       if (network === 'testnet') {
           dexTonVaultAddress = AddressHelper.getAddressSafe(NEW_DEX_ROUTER_TESTNET);
       } else {
           dexTonVaultAddress = Address.parse(NEW_DEX_ROUTER_MAINNET);
       }
   }
   ```

5. **Vault.tsの修正**
   - DEXタイプに応じたメッセージ処理ロジックを追加

## テスト方法

### テストネットでのテスト

1. **Vaultのデプロイ**
   ```bash
   npx blueprint run
   # deployVaultを選択
   # テストネットを選択
   # DEXタイプを選択（DeDustまたはStonfi）
   ```

2. **Vaultの初期化**
   ```bash
   npx blueprint run
   # initVaultを選択
   # テストネットを選択
   # デプロイしたVaultアドレスを入力
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
