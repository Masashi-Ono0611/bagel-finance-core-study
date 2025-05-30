export abstract class Op {
    static transfer = 0xf8a7ea5;
    static transfer_notification = 0x7362d09c;
    static internal_transfer = 0x178d4519;
    static excesses = 0xd53276db;
    static burn = 0x595f07bc;
    static burn_notification = 0x7bdd97de;

    static mint = 21;

    static provide_wallet_address = 0x2c76b973;
    static take_wallet_address = 0xd1735400;

    static change_admin = 0x3f9a72c4;
    static change_content = 0x1d5e8b3f;

    // original
    static deposit = 0x3a8f7c12;
    static change_vault_data = 0xf1b32984;
    static send_admin_message = 0x78d5e3af;
    static change_code_and_data = 0xc4a0912f;
    
    // DEX operations
    // DeDust
    static dedust_ton_swap = 0xea06185d;
    static dedust_jetton_swap = 0xe3a0d482;
    // Stonfi
    static stonfi_ton_swap = 0xea06185e; // DeDustのハッシュ+1
    static stonfi_jetton_swap = 0xe3a0d483; // DeDustのハッシュ+1
}

export abstract class Errors {
    static not_admin = 73;
    static unauthorized_burn = 74;
    static discovery_fee_not_matched = 75;
    static invalid_deposit_body = 400;
    static min_exchange_amount = 401;
    static invalid_ton_amount = 402;
    static not_enough_gas = 403;
    static non_basket_token = 404;
    static invalid_vault_data = 405;
    static unexpected = 999;
    static wrong_op = 0xffff;
}

// DEXタイプの定数
export abstract class DexType {
    static DEDUST = 0;
    static STONFI = 1;
}

// DEXアドレス定数
// 特殊文字を含むアドレスを使用する場合の注意点：
// 1. チェックサムエラーが発生する可能性があります
// 2. 必ずAddressHelperクラスを使用して安全に解析してください
// 3. 新しい特殊アドレスを追加する場合は、AddressHelperクラスのADDRESS_HEX_MAPに
//    アドレスとそのバイナリ表現を追加してください

export const DEDUST_ROUTER_MAINNET = 'EQDa4VOnTYlLvDJ0gZjNYm5PXfSmmtL6Vs6A_CZEtXCNICq_';
export const DEDUST_ROUTER_TESTNET = 'EQDa4VOnTYlLvDJ0gZjNYm5PXfSmmtL6Vs6A_CZEtXCNICq_'; // DeDustはtestnet未対応なので仮にメインネットアドレスを使用

export const STONFI_ROUTER_MAINNET = 'EQBfBWT7X2BHg9tXAxzhz2aKiNTU1tpt5NsiK0uSDW_YAJ67'; //他で指定がない場合のみこれを使用
export const STONFI_ROUTER_TESTNET = 'kQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4Tp6n'; //他で指定がない場合のみこれを使用

// StonFiのプロキシTONアドレス
export const STONFI_PROXY_TON_MAINNET = 'EQD53PbC8CrHjHgwB8EE6QRBbX5KwNvXHvqZWCEKAweH3JVG';
export const STONFI_PROXY_TON_TESTNET = 'kQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffAw5'; // Testnetでの動作確認済

// ネットワークごとのアドレスマップ
export const DEDUST_ROUTER_ADDRESS = {
    'mainnet': DEDUST_ROUTER_MAINNET,
    'testnet': DEDUST_ROUTER_TESTNET
};

export const STONFI_ROUTER_ADDRESS = {
    'mainnet': STONFI_ROUTER_MAINNET,
    'testnet': STONFI_ROUTER_TESTNET
};

export const STONFI_PROXY_TON_ADDRESS = {
    'mainnet': STONFI_PROXY_TON_MAINNET,
    'testnet': STONFI_PROXY_TON_TESTNET
};
