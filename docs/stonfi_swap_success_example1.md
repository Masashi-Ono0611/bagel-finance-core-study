# Stonfiスワップ成功例1：TON→STON

## トランザクション概要
- ハッシュ: 0b29454e…e62a3a80
- 日時: 2025年3月19日 03:09:01
- 所要時間: 35秒
- 結果: 成功

## トランザクションフロー

### 1. ユーザーウォレットからジェットンウォレットへの送信
- 送信元: `0QAD_0u9…pQHCKnD7` (wallet_v4r2)
- 送信先: `0:9d0b66f5186d6c6b26d8c42c117c4aabe1694e7b1b1021c61c7cc60e6e4ff8ef` (jetton_wallet)
- 送信額: 0.250001 TON
- オペレーションコード: Jetton Transfer (0x0f8a7ea5)
- クエリID: 134
- 送信内容:
  - 送信額: 1000 (jetton amount)
  - 送信先: `0:6c1b1f40ac00d4ad1101df85be82182c0a005286f7d4af826f96efb4286737dd` (Stonfiルーター)
  - フォワード額: 0.2 TON
  - フォワードペイロード: StonfiSwap (0x25938561)
    - トークンウォレット: `0:39439d779c6b9f296f43ed19ff5adf67ca5eff356269d37ae96daa4471cf2c9f`
    - 最小出力額: 1
    - 送信先アドレス: `0:03ff4bbd870b4db0910369b9888d37cbf5fd7e826adc865924a72723a501c22a`

### 2. ジェットンウォレットからStonfiルーターへの送信
- 送信元: `kQCdC2b1…bk_477vs` (jetton_wallet)
- 送信先: `kQBsGx9A…KGc33a1n` (stonfi_router)
- 送信額: 0.1965748 TON
- オペレーションコード: Jetton Notify (0x7362d09c)
- クエリID: 134
- 送信内容:
  - 送信額: 50001000
  - 送信元: `0:03ff4bbd870b4db0910369b9888d37cbf5fd7e826adc865924a72723a501c22a`
  - フォワードペイロード: StonfiSwap (0x25938561)

### 3. Stonfiルーターからプールへの送信
- 送信元: `kQBsGx9A…KGc33a1n` (stonfi_router)
- 送信先: `kQAuOC6M…wfVfI_Tn` (jetton_master, stonfi_pool)
- 送信額: 0.191232 TON
- オペレーションコード: Stonfi Swap (0x25938561)
- クエリID: 134
- 送信内容:
  - 送信先アドレス: `0:03ff4bbd870b4db0910369b9888d37cbf5fd7e826adc865924a72723a501c22a`
  - 送信元アドレス: `0:9d0b66f5186d6c6b26d8c42c117c4aabe1694e7b1b1021c61c7cc60e6e4ff8ef`
  - ジェットン額: 50001000
  - 最小出力額: 1

### 4. プールからStonfiルーターへの送信
- 送信元: `kQAuOC6M…wfVfI_Tn` (jetton_master, stonfi_pool)
- 送信先: `kQBsGx9A…KGc33a1n` (stonfi_router)
- 送信額: 0.185912 TON
- オペレーションコード: Stonfi Payment Request (0xf93bb43f)
- クエリID: 134
- 送信内容:
  - オーナー: `0:03ff4bbd870b4db0910369b9888d37cbf5fd7e826adc865924a72723a501c22a`
  - 終了コード: 3326308581
  - パラメータ:
    - 出力額0: 0
    - トークン0アドレス: `0:9d0b66f5186d6c6b26d8c42c117c4aabe1694e7b1b1021c61c7cc60e6e4ff8ef`
    - 出力額1: 6368970
    - トークン1アドレス: `0:39439d779c6b9f296f43ed19ff5adf67ca5eff356269d37ae96daa4471cf2c9f`

### 5. Stonfiルーターからジェットンウォレットへの送信
- 送信元: `kQBsGx9A…KGc33a1n` (stonfi_router)
- 送信先: `kQA5Q513…cc8sny5f` (jetton_wallet)
- 送信額: 0.1798752 TON
- オペレーションコード: Jetton Transfer (0x0f8a7ea5)
- クエリID: 134
- 送信内容:
  - 送信額: 6368970
  - 送信先: `0:03ff4bbd870b4db0910369b9888d37cbf5fd7e826adc865924a72723a501c22a`
  - 応答先: `0:03ff4bbd870b4db0910369b9888d37cbf5fd7e826adc865924a72723a501c22a`
  - フォワード額: 0
  - フォワードペイロード: StonfiSwapOk (3326308581)

### 6. ジェットンウォレットからユーザーウォレットへの送信
- 送信元: `kQAplu6E…6mzDK0Is` (jetton_wallet)
- 送信先: `kQAD_0u9…pQHCKnD7` (wallet_v4r2)
- 送信額: 0.1721996 TON
- オペレーションコード: Jetton Internal Transfer (0x178d4519)
- クエリID: 134
- 送信内容:
  - 送信額: 6368970
  - 送信元: `0:6c1b1f40ac00d4ad1101df85be82182c0a005286f7d4af826f96efb4286737dd`
  - 応答先: `0:03ff4bbd870b4db0910369b9888d37cbf5fd7e826adc865924a72723a501c22a`
  - フォワード額: 0
  - フォワードペイロード: StonfiSwapOk (3326308581)

### 7. 最終的な余剰額の返金
- 送信元: `kQAplu6E…6mzDK0Is` (jetton_wallet)
- 送信先: `0QAD_0u9…pQHCKnD7` (wallet_v4r2)
- 送信額: 0.1567996 TON
- オペレーションコード: Excess (0xd53276db)
- クエリID: 134

## 重要なポイント
1. スワップは「ジェットントークン転送」として開始される
2. ルーターアドレス: `0:6c1b1f40ac00d4ad1101df85be82182c0a005286f7d4af826f96efb4286737dd`
3. スワップ操作コード: 0x25938561 (StonfiSwap)
4. 成功コード: 3326308581 (StonfiSwapOk)
5. トークンウォレットアドレスが明示的に指定されている

## 生のトランザクションデータ
```
signature: 143628834cb27c41ed6f60a81a84c01516a88629b24518d64de76a3721f0c118bad0b227a07d011fb443b67f77575c103645067dfc8b737bf78b5d560e851102
subwallet_id: 698983191
valid_until: 1742324998
seqno: 150
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
          grams: "250001000"
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
              query_id: 134
              amount: "1000"
              destination: 0:6c1b1f40ac00d4ad1101df85be82182c0a005286f7d4af826f96efb4286737dd
              response_destination: ""
              custom_payload: null
              forward_ton_amount: "200000000"
              forward_payload:
                is_right: true
                value:
                  sum_type: StonfiSwap
                  op_code: 630424929
                  value:
                    token_wallet: 0:39439d779c6b9f296f43ed19ff5adf67ca5eff356269d37ae96daa4471cf2c9f
                    min_out: "1"
                    to_address: 0:03ff4bbd870b4db0910369b9888d37cbf5fd7e826adc865924a72723a501c22a
                    referral_address: null
```
