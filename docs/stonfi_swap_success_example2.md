# Stonfiスワップ成功例2：TON→METAUXv5

## トランザクション概要
- ハッシュ: b0075628…0497e8e9
- 日時: 2025年2月26日 15:53:13
- 所要時間: 41秒
- 結果: 成功

## トランザクションフロー

### 1. ユーザーウォレットからジェットンウォレットへの送信
- 送信元: `0QDoYfn4…VDkTpv6e` (wallet_v4r2)
- 送信先: `0:9d0b66f5186d6c6b26d8c42c117c4aabe1694e7b1b1021c61c7cc60e6e4ff8ef` (jetton_wallet)
- 送信額: 0.315 TON
- オペレーションコード: Jetton Transfer (0x0f8a7ea5)
- クエリID: 0
- 送信内容:
  - 送信額: 100000000 (jetton amount)
  - 送信先: `0:6c1b1f40ac00d4ad1101df85be82182c0a005286f7d4af826f96efb4286737dd` (Stonfiルーター)
  - 応答先: `0:e861f9f8eb14c3afa3d41b6e0069495766f8bcdce9c72cd5fb939520543913a6`
  - フォワード額: 0.215 TON
  - フォワードペイロード: StonfiSwap (0x25938561)
    - トークンウォレット: `0:0a9e2694b94c19313476c9e73f03925a2102a293094adfe01df9ab709b5cb9ba`
    - 最小出力額: 1
    - 送信先アドレス: `0:e861f9f8eb14c3afa3d41b6e0069495766f8bcdce9c72cd5fb939520543913a6`

### 2. ジェットンウォレットからStonfiルーターへの送信
- 送信元: `kQCdC2b1…bk_477vs` (jetton_wallet)
- 送信先: `kQBsGx9A…KGc33a1n` (stonfi_router)
- 送信額: 0.211574 TON
- オペレーションコード: Jetton Notify (0x7362d09c)
- クエリID: 0
- 送信内容:
  - 送信額: 100000000
  - 送信元: `0:e861f9f8eb14c3afa3d41b6e0069495766f8bcdce9c72cd5fb939520543913a6`
  - フォワードペイロード: StonfiSwap (0x25938561)

### 3. Stonfiルーターからプールへの送信
- 送信元: `kQBsGx9A…KGc33a1n` (stonfi_router)
- 送信先: `kQAtws0o…WOKmNET7` (jetton_master, stonfi_pool)
- 送信額: 0.2062416 TON
- オペレーションコード: Stonfi Swap (0x25938561)
- クエリID: 0
- 送信内容:
  - 送信先アドレス: `0:e861f9f8eb14c3afa3d41b6e0069495766f8bcdce9c72cd5fb939520543913a6`
  - 送信元アドレス: `0:9d0b66f5186d6c6b26d8c42c117c4aabe1694e7b1b1021c61c7cc60e6e4ff8ef`
  - ジェットン額: 100000000
  - 最小出力額: 1

### 4. プールからStonfiルーターへの送信
- 送信元: `kQAtws0o…WOKmNET7` (jetton_master, stonfi_pool)
- 送信先: `kQBsGx9A…KGc33a1n` (stonfi_router)
- 送信額: 0.200928 TON
- オペレーションコード: Stonfi Payment Request (0xf93bb43f)
- クエリID: 0
- 送信内容:
  - オーナー: `0:e861f9f8eb14c3afa3d41b6e0069495766f8bcdce9c72cd5fb939520543913a6`
  - 終了コード: 3326308581
  - パラメータ:
    - 出力額0: 1359
    - トークン0アドレス: `0:0a9e2694b94c19313476c9e73f03925a2102a293094adfe01df9ab709b5cb9ba`
    - 出力額1: 0
    - トークン1アドレス: `0:9d0b66f5186d6c6b26d8c42c117c4aabe1694e7b1b1021c61c7cc60e6e4ff8ef`

### 5. Stonfiルーターからジェットンウォレットへの送信
- 送信元: `kQBsGx9A…KGc33a1n` (stonfi_router)
- 送信先: `kQAKniaU…m1y5uqAQ` (jetton_wallet_v1)
- 送信額: 0.1949208 TON
- オペレーションコード: Jetton Transfer (0x0f8a7ea5)
- クエリID: 0
- 送信内容:
  - 送信額: 1359
  - 送信先: `0:e861f9f8eb14c3afa3d41b6e0069495766f8bcdce9c72cd5fb939520543913a6`
  - 応答先: `0:e861f9f8eb14c3afa3d41b6e0069495766f8bcdce9c72cd5fb939520543913a6`
  - フォワード額: 0
  - フォワードペイロード: StonfiSwapOk (3326308581)

### 6. ジェットンウォレットからユーザーウォレットへの送信
- 送信元: `kQAyhCnl…Kqq8STYX` (jetton_wallet_v1)
- 送信先: `0QDoYfn4…VDkTpv6e` (wallet_v4r2)
- 送信額: 0.1873588 TON
- オペレーションコード: Jetton Internal Transfer (0x178d4519)
- クエリID: 0
- 送信内容:
  - 送信額: 1359
  - 送信元: `0:6c1b1f40ac00d4ad1101df85be82182c0a005286f7d4af826f96efb4286737dd`
  - 応答先: `0:e861f9f8eb14c3afa3d41b6e0069495766f8bcdce9c72cd5fb939520543913a6`
  - フォワード額: 0
  - フォワードペイロード: StonfiSwapOk (3326308581)

### 7. 最終的な余剰額の返金
- 送信元: `kQAyhCnl…Kqq8STYX` (jetton_wallet_v1)
- 送信先: `0QDoYfn4…VDkTpv6e` (wallet_v4r2)
- 送信額: 0.1669588 TON
- オペレーションコード: Excess (0xd53276db)
- クエリID: 0

## 重要なポイント
1. スワップは「ジェットントークン転送」として開始される
2. ルーターアドレス: `0:6c1b1f40ac00d4ad1101df85be82182c0a005286f7d4af826f96efb4286737dd`
3. スワップ操作コード: 0x25938561 (StonfiSwap)
4. 成功コード: 3326308581 (StonfiSwapOk)
5. トークンウォレットアドレスが明示的に指定されている
6. クエリIDは0を使用

## 生のトランザクションデータ
```
signature: 0e7fe4a24a5d6a6bc63c5d85710a22c903b365e905b522144759e3b45d645ac23f3e2e38dbee5716131a0c148aa2dd1b87936703245b50da240cf113814f3206
subwallet_id: 698983191
valid_until: 1740556451
seqno: 130
op: 0
payload:
  - mode: 3
    message:
      sum_type: MessageInternal
      message_internal:
        ihr_disabled: true
        bounce: true
        bounced: false
        src: ""
        dest: 0:9d0b66f5186d6c6b26d8c42c117c4aabe1694e7b1b1021c61c7cc60e6e4ff8ef
        value:
          grams: "315000000"
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
              amount: "100000000"
              destination: 0:6c1b1f40ac00d4ad1101df85be82182c0a005286f7d4af826f96efb4286737dd
              response_destination: 0:e861f9f8eb14c3afa3d41b6e0069495766f8bcdce9c72cd5fb939520543913a6
              custom_payload: null
              forward_ton_amount: "215000000"
              forward_payload:
                is_right: true
                value:
                  sum_type: StonfiSwap
                  op_code: 630424929
                  value:
                    token_wallet: 0:0a9e2694b94c19313476c9e73f03925a2102a293094adfe01df9ab709b5cb9ba
                    min_out: "1"
                    to_address: 0:e861f9f8eb14c3afa3d41b6e0069495766f8bcdce9c72cd5fb939520543913a6
                    referral_address: null
```
