# Stonfiスワップ成功例3：TON→jt268311

## トランザクション概要
- ハッシュ: 316a5e15…ed3f1b54
- 日時: 2025年2月17日 16:26:40
- 所要時間: 28秒
- 結果: 成功

## トランザクションフロー

### 1. ユーザーウォレットからジェットンウォレットへの送信
- 送信元: `0QAn0AtW…I7X3Imp-` (wallet_v4r2)
- 送信先: `0:9d0b66f5186d6c6b26d8c42c117c4aabe1694e7b1b1021c61c7cc60e6e4ff8ef` (jetton_wallet)
- 送信額: 0.205 TON
- オペレーションコード: Jetton Transfer (0x0f8a7ea5)
- クエリID: 0
- 送信内容:
  - 送信額: 20000000 (jetton amount)
  - 送信先: `0:6c1b1f40ac00d4ad1101df85be82182c0a005286f7d4af826f96efb4286737dd` (Stonfiルーター)
  - 応答先: `0:27d00b566cb1ff3ec764a74616195feb9fa1538fa66b8f6af5b2cb8c23b5f722`
  - フォワード額: 0.185 TON
  - フォワードペイロード: StonfiSwap (0x25938561)
    - トークンウォレット: `0:858c9a7022edcc80a3b2748b11ba819122abc1396fb83e46f80da3b707b83d9f`
    - 最小出力額: 0
    - 送信先アドレス: `0:27d00b566cb1ff3ec764a74616195feb9fa1538fa66b8f6af5b2cb8c23b5f722`

### 2. ジェットンウォレットからStonfiルーターへの送信
- 送信元: `kQCdC2b1…bk_477vs` (jetton_wallet)
- 送信先: `kQBsGx9A…KGc33a1n` (stonfi_router)
- 送信額: 0.181578 TON
- オペレーションコード: Jetton Notify (0x7362d09c)
- クエリID: 0
- 送信内容:
  - 送信額: 20000000
  - 送信元: `0:27d00b566cb1ff3ec764a74616195feb9fa1538fa66b8f6af5b2cb8c23b5f722`
  - フォワードペイロード: StonfiSwap (0x25938561)

### 3. Stonfiルーターからプールへの送信
- 送信元: `kQBsGx9A…KGc33a1n` (stonfi_router)
- 送信先: `kQBnrdoN…YZHCkiM9` (jetton_master, stonfi_pool)
- 送信額: 0.1762488 TON
- オペレーションコード: Stonfi Swap (0x25938561)
- クエリID: 0
- 送信内容:
  - 送信先アドレス: `0:27d00b566cb1ff3ec764a74616195feb9fa1538fa66b8f6af5b2cb8c23b5f722`
  - 送信元アドレス: `0:9d0b66f5186d6c6b26d8c42c117c4aabe1694e7b1b1021c61c7cc60e6e4ff8ef`
  - ジェットン額: 20000000
  - 最小出力額: 0

### 4. プールからStonfiルーターへの送信
- 送信元: `kQBnrdoN…YZHCkiM9` (jetton_master, stonfi_pool)
- 送信先: `kQBsGx9A…KGc33a1n` (stonfi_router)
- 送信額: 0.1709192 TON
- オペレーションコード: Stonfi Payment Request (0xf93bb43f)
- クエリID: 0
- 送信内容:
  - オーナー: `0:27d00b566cb1ff3ec764a74616195feb9fa1538fa66b8f6af5b2cb8c23b5f722`
  - 終了コード: 3326308581
  - パラメータ:
    - 出力額0: 794430234265530
    - トークン0アドレス: `0:858c9a7022edcc80a3b2748b11ba819122abc1396fb83e46f80da3b707b83d9f`
    - 出力額1: 0
    - トークン1アドレス: `0:9d0b66f5186d6c6b26d8c42c117c4aabe1694e7b1b1021c61c7cc60e6e4ff8ef`

### 5. Stonfiルーターからジェットンウォレットへの送信
- 送信元: `kQBsGx9A…KGc33a1n` (stonfi_router)
- 送信先: `kQCFjJpw…B7g9nxAh` (jetton_wallet)
- 送信額: 0.164896 TON
- オペレーションコード: Jetton Transfer (0x0f8a7ea5)
- クエリID: 0
- 送信内容:
  - 送信額: 794430234265530
  - 送信先: `0:27d00b566cb1ff3ec764a74616195feb9fa1538fa66b8f6af5b2cb8c23b5f722`
  - 応答先: `0:27d00b566cb1ff3ec764a74616195feb9fa1538fa66b8f6af5b2cb8c23b5f722`
  - フォワード額: 0
  - フォワードペイロード: StonfiSwapOk (3326308581)

### 6. ジェットンウォレットからユーザーウォレットへの送信
- 送信元: `kQCM504t…GCstsX0b` (jetton_wallet)
- 送信先: `0QAn0AtW…I7X3Imp-` (wallet_v4r2)
- 送信額: 0.1474596 TON
- オペレーションコード: Jetton Internal Transfer (0x178d4519)
- クエリID: 0
- 送信内容:
  - 送信額: 794430234265530
  - 送信元: `0:6c1b1f40ac00d4ad1101df85be82182c0a005286f7d4af826f96efb4286737dd`
  - 応答先: `0:27d00b566cb1ff3ec764a74616195feb9fa1538fa66b8f6af5b2cb8c23b5f722`
  - フォワード額: 0
  - フォワードペイロード: StonfiSwapOk (3326308581)

### 7. 最終的な余剰額の返金
- 送信元: `kQCM504t…GCstsX0b` (jetton_wallet)
- 送信先: `0QAn0AtW…I7X3Imp-` (wallet_v4r2)
- 送信額: 0.1154596 TON
- オペレーションコード: Excess (0xd53276db)
- クエリID: 0

## 重要なポイント
1. スワップは「ジェットントークン転送」として開始される
2. ルーターアドレス: `0:6c1b1f40ac00d4ad1101df85be82182c0a005286f7d4af826f96efb4286737dd`
3. スワップ操作コード: 0x25938561 (StonfiSwap)
4. 成功コード: 3326308581 (StonfiSwapOk)
5. トークンウォレットアドレスが明示的に指定されている
6. クエリIDは0を使用
7. 最小出力額も0を使用（他の例では1）

## 生のトランザクションデータ
```
signature: 2e0159e5843dffb8aaa2c11112c290d46b93dd222fb5c4b5c47fcf6262f303ca9df063dd8a264144a262f1922b8493dcd6d934c5c282ea2298c837d2196ff508
subwallet_id: 698983191
valid_until: 1739780856
seqno: 903
op: 0
payload:
  - mode: 1
    message:
      sum_type: MessageInternal
      message_internal:
        ihr_disabled: true
        bounce: true
        bounced: false
        src: ""
        dest: 0:9d0b66f5186d6c6b26d8c42c117c4aabe1694e7b1b1021c61c7cc60e6e4ff8ef
        value:
          grams: "205000000"
          other: {}
        ihr_fee: "0"
        fwd_fee: "0"
        created_lt: 0
        created_at: 0
        init: null
        body:
          is_right: true
          value:
            sum_type: JettonTransfer
            op_code: 260734629
            value:
              query_id: 0
              amount: "20000000"
              destination: 0:6c1b1f40ac00d4ad1101df85be82182c0a005286f7d4af826f96efb4286737dd
              response_destination: 0:27d00b566cb1ff3ec764a74616195feb9fa1538fa66b8f6af5b2cb8c23b5f722
              custom_payload: null
              forward_ton_amount: "185000000"
              forward_payload:
                is_right: true
                value:
                  sum_type: StonfiSwap
                  op_code: 630424929
                  value:
                    token_wallet: 0:858c9a7022edcc80a3b2748b11ba819122abc1396fb83e46f80da3b707b83d9f
                    min_out: "0"
                    to_address: 0:27d00b566cb1ff3ec764a74616195feb9fa1538fa66b8f6af5b2cb8c23b5f722
                    referral_address: null
```
