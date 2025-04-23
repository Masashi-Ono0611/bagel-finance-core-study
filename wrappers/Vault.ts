import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Dictionary,
    Sender,
    SendMode,
    toNano,
} from '@ton/core';
import { Op } from '../utils/Constants';

export type Basket = {
    weight: bigint;
    jettonWalletAddress: Address;    // 動的に設定されるJettonウォレットアドレス（DeDustとStonFi共通）
    // DEX共通フィールド
    dexPoolAddress: Address;         // DEXプールアドレス（DeDustの場合はトークンペア別のプール、StonFiの場合はルーターアドレス）
    dexJettonVaultAddress: Address;   // DEXのJettonVaultアドレス（DeDustの場合は実際のVault、StonFiの場合はダミー）
    // StonFi V1用追加フィールド
    dexRouterAddress?: Address;      // StonFi V1のルーターアドレス
    dexProxyTonAddress?: Address;    // StonFi V1のプロキシTONアドレス
    dexJettonWalletOnRouterAddress?: Address; // StonFi V1のルーター上のJettonウォレットアドレス
    jettonMasterAddress: Address;
    dexType?: number;                // DEXタイプ（0=DeDust, 1=Stonfi）
};

export type Waiting = {
    user: bigint;
    balances: { tokenIdx: number; balance: bigint | undefined }[];
};

type Excess = {
    queryId: bigint;
    address: Address;
};

type VaultConfig = {
    adminAddress: Address;
    content: Cell;
    walletCode: Cell;
    dexTonVaultAddress: Address; // DEX（DeDust/Stonfi）TON vault address
    baskets: Basket[];
};

function basketsToDict(baskets: Basket[]) {
    const dictBaskets = Dictionary.empty(Dictionary.Keys.Uint(8), Dictionary.Values.Cell());
    for (let i = 0; i < baskets.length; i++) {
        const basket = baskets[i];
        
        // DEXタイプの設定（指定がない場合はデフォルトで0（DeDust））
        const dexType = basket.dexType !== undefined ? basket.dexType : 0;
        
        // DEX情報を含むセルを作成
        let dexData;
        if (dexType === 0) { // DeDust
            dexData = beginCell()
                // DEXタイプを2ビットで格納（0=DeDust）
                .storeUint(dexType, 2)
                .storeAddress(basket.dexPoolAddress)
                .storeAddress(basket.dexJettonVaultAddress)
                .endCell();
        } else if (dexType === 1) { // StonFi
            dexData = beginCell()
                // DEXタイプを2ビットで格納（1=Stonfi）
                .storeUint(dexType, 2)
                .storeAddress(basket.dexRouterAddress) // StonFiルーターアドレス
                .storeAddress(basket.dexProxyTonAddress) // StonFiプロキシTONアドレス
                .storeAddress(basket.dexJettonWalletOnRouterAddress) // StonFiルーター上のJettonウォレットアドレス
                .endCell();
        } else {
            // 不明なDEXタイプの場合はデフォルトでDeDustとして扱う
            dexData = beginCell()
                .storeUint(0, 2) // デフォルトで0（DeDust）
                .storeAddress(basket.dexPoolAddress)
                .storeAddress(basket.dexJettonVaultAddress)
                .endCell();
        }
            
        dictBaskets.set(
            i,
            beginCell()
                .storeCoins(basket.weight)
                .storeAddress(basket.jettonWalletAddress)
                .storeRef(dexData) // DEXデータを参照として格納
                .storeAddress(basket.jettonMasterAddress)
                .endCell(),
        );
    }
    return dictBaskets;
}

export function vaultConfigToCell(config: VaultConfig): Cell {
    const waitingsDict = Dictionary.empty(
        Dictionary.Keys.BigUint(256),
        Dictionary.Values.Dictionary(Dictionary.Keys.Uint(8), Dictionary.Values.Cell()),
    );
    const excessesDict = Dictionary.empty(Dictionary.Keys.Uint(64), Dictionary.Values.Address());
    const jettonData = beginCell()
        .storeCoins(0)
        .storeAddress(config.adminAddress)
        .storeRef(config.content)
        .storeRef(config.walletCode)
        .endCell();
    return beginCell()
        .storeRef(jettonData)
        .storeBit(true)
        .storeUint(config.baskets.length, 8)
        .storeAddress(config.dexTonVaultAddress)
        .storeDict(basketsToDict(config.baskets))
        .storeDict(waitingsDict)
        .storeCoins(0)  // accumulated_gas初期値を0に設定
        .endCell();
}

export class Vault implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Vault(address);
    }

    static createFromConfig(config: VaultConfig, code: Cell, workchain = 0) {
        const data = vaultConfigToCell(config);
        const init = { code, data };
        return new Vault(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    static mintMessage(
        from: Address,
        to: Address,
        jetton_amount: bigint,
        forward_ton_amount: bigint,
        total_ton_amount: bigint,
        query_id: number | bigint = 0,
    ) {
        const mintMsg = beginCell()
            .storeUint(Op.internal_transfer, 32)
            .storeUint(0, 64)
            .storeCoins(jetton_amount)
            .storeAddress(null)
            .storeAddress(from) // Response addr
            .storeCoins(forward_ton_amount)
            .storeMaybeRef(null)
            .endCell();

        return beginCell()
            .storeUint(Op.mint, 32)
            .storeUint(query_id, 64) // op, queryId
            .storeAddress(to)
            .storeCoins(total_ton_amount)
            .storeCoins(jetton_amount)
            .storeRef(mintMsg)
            .endCell();
    }
    async sendMint(
        provider: ContractProvider,
        via: Sender,
        to: Address,
        jetton_amount: bigint,
        forward_ton_amount: bigint,
        total_ton_amount: bigint,
    ) {
        if (total_ton_amount <= forward_ton_amount) {
            throw new Error('Total ton amount should be > forward amount');
        }
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Vault.mintMessage(this.address, to, jetton_amount, forward_ton_amount, total_ton_amount),
            value: total_ton_amount + toNano('0.015'),
        });
    }

    static depositMessage(eachAmount: bigint[], requestedMintAmount?: bigint) {
        const builder = beginCell().storeUint(Op.deposit, 32).storeUint(0, 64);
        
        // 各バスケットのスワップ量を追加
        for (const amount of eachAmount) {
            builder.storeCoins(amount);
        }
        
        // Mint量が指定されている場合は追加
        if (requestedMintAmount !== undefined) {
            builder.storeCoins(requestedMintAmount);
        }
        
        return builder.endCell();
    }
    async sendDeposit(
        provider: ContractProvider, 
        via: Sender, 
        eachAmount: bigint[], 
        value: bigint = toNano('0.05'),
        requestedMintAmount?: bigint
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Vault.depositMessage(eachAmount, requestedMintAmount),
            value,
        });
    }

    static transferNotificationMessage(amountJetton: bigint, fromAddress: Address, userAddress: Address | null = null) {
        let customPayload = null;
        if (userAddress) {
            customPayload = beginCell().storeAddress(userAddress).endCell();
        }
        return beginCell()
            .storeUint(Op.transfer_notification, 32)
            .storeUint(0, 64)
            .storeCoins(amountJetton)
            .storeAddress(fromAddress)
            .storeMaybeRef(customPayload)
            .endCell();
    }
    async sendTransferNotification(
        provider: ContractProvider,
        via: Sender,
        amountJetton: bigint,
        fromAddress: Address,
        userAddress: Address | null = null,
        value: bigint = toNano('0.05'),
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Vault.transferNotificationMessage(amountJetton, fromAddress, userAddress),
            value: value,
        });
    }

    /* provide_wallet_address#2c76b973 query_id:uint64 owner_address:MsgAddress include_address:Bool = InternalMsgBody;
     */
    static discoveryMessage(owner: Address, include_address: boolean) {
        return beginCell()
            .storeUint(Op.provide_wallet_address, 32)
            .storeUint(0, 64) // op, queryId
            .storeAddress(owner)
            .storeBit(include_address)
            .endCell();
    }
    async sendDiscovery(
        provider: ContractProvider,
        via: Sender,
        owner: Address,
        include_address: boolean,
        value: bigint = toNano('0.05'),
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Vault.discoveryMessage(owner, include_address),
            value,
        });
    }

    static changeAdminMessage(newOwner: Address) {
        return beginCell()
            .storeUint(Op.change_admin, 32)
            .storeUint(0, 64) // op, queryId
            .storeAddress(newOwner)
            .endCell();
    }
    async sendChangeAdmin(provider: ContractProvider, via: Sender, newOwner: Address, value: bigint = toNano('0.05')) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Vault.changeAdminMessage(newOwner),
            value,
        });
    }

    static changeContentMessage(content: Cell) {
        return beginCell()
            .storeUint(Op.change_content, 32)
            .storeUint(0, 64) // op, queryId
            .storeRef(content)
            .endCell();
    }
    async sendChangeContent(provider: ContractProvider, via: Sender, content: Cell, value: bigint = toNano('0.05')) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Vault.changeContentMessage(content),
            value,
        });
    }

    static changeVaultDataMessage(
        stopped: boolean, 
        dexTonVaultAddress: Address, 
        baskets: Basket[],
        waitingsDict: Dictionary<bigint, Dictionary<number, Cell>> = Dictionary.empty(
            Dictionary.Keys.BigUint(256),
            Dictionary.Values.Dictionary(Dictionary.Keys.Uint(8), Dictionary.Values.Cell()),
        ),
        accumulatedGas: bigint = 0n
    ) {
        return beginCell()
            .storeUint(Op.change_vault_data, 32)
            .storeUint(0, 64)
            .storeBit(stopped)
            .storeUint(baskets.length, 8)
            .storeAddress(dexTonVaultAddress)
            .storeDict(basketsToDict(baskets))
            .storeDict(waitingsDict)
            .storeCoins(accumulatedGas)
            .endCell();
    }
    async sendChangeVaultData(
        provider: ContractProvider,
        via: Sender,
        stopped: boolean,
        dexTonVaultAddress: Address,
        baskets: Basket[],
        waitingsDict?: Dictionary<bigint, Dictionary<number, Cell>>,
        accumulatedGas: bigint = 0n,
        value: bigint = toNano('0.05'),
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Vault.changeVaultDataMessage(stopped, dexTonVaultAddress, baskets, waitingsDict, accumulatedGas),
            value,
        });
    }

    static changeCodeAndDataMessage(code: Cell, config: VaultConfig) {
        return beginCell()
            .storeUint(Op.change_code_and_data, 32)
            .storeUint(0, 64)
            .storeRef(code)
            .storeRef(vaultConfigToCell(config))
            .endCell();
    }
    async sendChangeCodeAndData(
        provider: ContractProvider,
        via: Sender,
        code: Cell,
        config: VaultConfig,
        value: bigint = toNano('0.05'),
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Vault.changeCodeAndDataMessage(code, config),
            value,
        });
    }

    static sendAdminMessageMessage(msg: Cell, mode: number) {
        return beginCell()
            .storeUint(Op.send_admin_message, 32)
            .storeUint(0, 64)
            .storeRef(msg)
            .storeUint(mode, 8)
            .endCell();
    }
    async sendAdminMessage(
        provider: ContractProvider,
        via: Sender,
        msg: Cell,
        mode: number,
        value: bigint = toNano('0.05'),
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Vault.sendAdminMessageMessage(msg, mode),
            value,
        });
    }

    async getWalletAddress(provider: ContractProvider, owner: Address): Promise<Address> {
        const res = await provider.get('get_wallet_address', [
            { type: 'slice', cell: beginCell().storeAddress(owner).endCell() },
        ]);
        return res.stack.readAddress();
    }

    async getJettonData(provider: ContractProvider) {
        const res = await provider.get('get_jetton_data', []);
        const totalSupply = res.stack.readBigNumber();
        const mintable = res.stack.readBoolean();
        const adminAddress = res.stack.readAddress();
        const content = res.stack.readCell();
        const walletCode = res.stack.readCell();
        return {
            totalSupply,
            mintable,
            adminAddress,
            content,
            walletCode,
        };
    }

    async getTotalSupply(provider: ContractProvider) {
        const res = await this.getJettonData(provider);
        return res.totalSupply;
    }

    async getAdminAddress(provider: ContractProvider) {
        const res = await this.getJettonData(provider);
        return res.adminAddress;
    }

    async getContent(provider: ContractProvider) {
        const res = await this.getJettonData(provider);
        return res.content;
    }

    async getVaultData(provider: ContractProvider) {
        try {
            const res = await provider.get('get_vault_data', []);
            const stopped = res.stack.readBoolean();
            const numBaskets = res.stack.readNumber();
            const dexTonVaultAddress = res.stack.readAddress();
            
            // バスケットセルの読み込み - エラーハンドリング強化
            let basketsCell;
            try {
                basketsCell = res.stack.readCell();
            } catch (e) {
                console.log('バスケットセルの読み込みエラー。空の辞書を使用します。', e);
                basketsCell = beginCell().storeDict(Dictionary.empty()).endCell();
            }
            
            // dict_waitingsセルの読み込み - エラーハンドリング強化
            let waitingsCell;
            try {
                waitingsCell = res.stack.readCell();
            } catch (e) {
                console.log('waitingsセルの読み込みエラー。空の辞書を使用します。', e);
                waitingsCell = beginCell().storeDict(Dictionary.empty()).endCell();
            }
            
            // accumulated_gasの読み込み - エラーハンドリング強化
            let accumulatedGas = 0n;
            try {
                // スタックにまだデータが残っているか確認
                accumulatedGas = res.stack.readBigNumber();
            } catch (e) {
                // スタックが空の場合はデフォルト値を使用
                console.log('accumulated_gasの読み込みエラー。デフォルト値0を使用します。', e);
            }
            
            // 各辞書のロード - エラーハンドリング強化
            let basketsDict;
            try {
                basketsDict = Dictionary.loadDirect(Dictionary.Keys.Uint(8), Dictionary.Values.Cell(), basketsCell);
            } catch (e) {
                console.log('バスケット辞書のロードエラー。空の辞書を使用します。', e);
                basketsDict = Dictionary.empty(Dictionary.Keys.Uint(8), Dictionary.Values.Cell());
            }
            
            let dict_waitings;
            try {
                dict_waitings = Dictionary.loadDirect(
                    Dictionary.Keys.BigUint(256),
                    Dictionary.Values.Dictionary(Dictionary.Keys.Uint(8), Dictionary.Values.Cell()),
                    waitingsCell
                );
            } catch (e) {
                console.log('waitings辞書のロードエラー。空の辞書を使用します。', e);
                dict_waitings = Dictionary.empty(
                    Dictionary.Keys.BigUint(256),
                    Dictionary.Values.Dictionary(Dictionary.Keys.Uint(8), Dictionary.Values.Cell())
                );
            }
            
            // バスケット情報の解析
            const baskets = [];
            for (const value of basketsDict.values()) {
                try {
                    const slice = value.beginParse();
                    const weight = slice.loadCoins();
                    const jettonWalletAddress = slice.loadAddress();
                    const dexData = slice.loadRef();
                    let dexSlice = dexData.beginParse(); // letで宣言して再代入可能にする
                    
                    // DEXタイプ情報を読み込む
                    let dexType;
                    try {
                        // DEXタイプを2ビットで読み込む
                        dexType = dexSlice.loadUint(2);
                    } catch (e) {
                        // 古いフォーマットの場合はデフォルトでDeDust
                        console.log('DEXタイプ情報が見つかりません。デフォルトでDeDustを使用します。', e);
                        dexType = 0; // DeDust
                        
                        // スライスをリセットして再読み込み
                        dexSlice = dexData.beginParse();
                    }
                    
                    // DEXタイプに応じて異なるフィールドを読み込む
                    let dexPoolAddress;
                    let dexJettonVaultAddress;
                    let dexRouterAddress;
                    let dexProxyTonAddress;
                    let dexJettonWalletOnRouterAddress;
                    
                    // デバッグ情報を追加
                    console.log(`バスケットデータ解析: DEXタイプ=${dexType} (${dexType === 0 ? 'DeDust' : dexType === 1 ? 'StonFi' : '不明'})`);                    
                    
                    try {
                        // デバッグ用にスライスの内容をコピー
                        const debugSlice = dexSlice.clone();
                        console.log(`dexSliceのビット数: ${debugSlice.remainingBits}`);
                        
                        if (dexType === 0) { // DeDust
                            dexPoolAddress = dexSlice.loadAddress();
                            console.log(`DeDustプールアドレス: ${dexPoolAddress}`);
                            dexJettonVaultAddress = dexSlice.loadAddress();
                            console.log(`DeDust Jetton Vaultアドレス: ${dexJettonVaultAddress}`);
                            // StonFi用のフィールドはnullに設定
                            dexRouterAddress = null;
                            dexProxyTonAddress = null;
                        } else if (dexType === 1) { // StonFi
                            try {
                                // StonFiの場合、コントラクトのストレージ構造に合わせて読み込む
                                // まずdexPoolAddressの位置からdexRouterAddressを読み込む
                                dexRouterAddress = dexSlice.loadAddress();
                                console.log(`StonFiルーターアドレス: ${dexRouterAddress}`);
                                
                                // 次にdexJettonVaultAddressの位置からdexProxyTonAddressを読み込む
                                if (dexSlice.remainingBits >= 267) { // アドレスに必要なビット数
                                    dexProxyTonAddress = dexSlice.loadAddress();
                                    console.log(`StonFiプロキシTONアドレス: ${dexProxyTonAddress}`);
                                    
                                    // dexJettonWalletOnRouterAddressを読み込む
                                    if (dexSlice.remainingBits >= 267) { // アドレスに必要なビット数
                                        dexJettonWalletOnRouterAddress = dexSlice.loadAddress();
                                        console.log(`StonFiルーター上のJettonウォレットアドレス: ${dexJettonWalletOnRouterAddress}`);
                                    } else {
                                        console.log('StonFiルーター上のJettonウォレットアドレスが見つかりません');
                                        dexJettonWalletOnRouterAddress = null;
                                    }
                                } else {
                                    console.log('StonFiプロキシTONアドレスが見つかりません');
                                    dexProxyTonAddress = null;
                                    dexJettonWalletOnRouterAddress = null;
                                }
                            } catch (e) {
                                console.error('StonFiアドレスの読み込みエラー:', e);
                                dexRouterAddress = null;
                                dexProxyTonAddress = null;
                            }
                            
                            // StonFiではプールアドレスとJettonVaultアドレスは使用しない
                            // しかし、ストレージ構造の互換性のために、dexRouterAddressとdexProxyTonAddressを
                            // dexPoolAddressとdexJettonVaultAddressとしても設定する
                            dexPoolAddress = dexRouterAddress;
                            dexJettonVaultAddress = dexProxyTonAddress;
                        } else {
                            // 不明なDEXタイプの場合はデフォルト値を設定
                            console.log(`不明なDEXタイプ: ${dexType}`);
                            dexPoolAddress = dexSlice.loadAddress();
                            dexJettonVaultAddress = dexSlice.loadAddress();
                        }
                    } catch (e) {
                        console.error('バスケットデータ解析エラー:', e);
                        dexPoolAddress = null;
                        dexJettonVaultAddress = null;
                        dexRouterAddress = null;
                        dexProxyTonAddress = null;
                    }
                    
                    const jettonMasterAddress = slice.loadAddress();
                    
                    // 新しいフィールド名を使用してバスケットを作成
                    const basketData: any = {
                        weight,
                        jettonWalletAddress,
                        jettonMasterAddress,
                        dexType, // DEXタイプ情報を追加
                    };
                    
                    // DEXタイプに応じて適切なフィールドを設定
                    if (dexType === 0) { // DeDust
                        basketData.dexPoolAddress = dexPoolAddress;
                        basketData.dexJettonVaultAddress = dexJettonVaultAddress;
                        basketData.dexRouterAddress = null;
                        basketData.dexProxyTonAddress = null;
                        basketData.dexJettonWalletOnRouterAddress = null;
                    } else if (dexType === 1) { // StonFi
                        // StonFiの場合、dexPoolAddressとdexJettonVaultAddressの位置に
                        // dexRouterAddressとdexProxyTonAddressが格納されている可能性がある
                        basketData.dexRouterAddress = dexRouterAddress;
                        basketData.dexProxyTonAddress = dexProxyTonAddress;
                        basketData.dexJettonWalletOnRouterAddress = dexJettonWalletOnRouterAddress;
                        basketData.dexPoolAddress = null;
                        basketData.dexJettonVaultAddress = null;
                    } else {
                        // 不明なDEXタイプの場合はすべてのフィールドを設定
                        basketData.dexPoolAddress = dexPoolAddress;
                        basketData.dexJettonVaultAddress = dexJettonVaultAddress;
                        basketData.dexRouterAddress = null;
                        basketData.dexProxyTonAddress = null;
                        basketData.dexJettonWalletOnRouterAddress = null;
                    }
                    

                    baskets.push(basketData);
                } catch (e) {
                    console.log('バスケット項目の解析エラー。この項目はスキップします。', e);
                }
            }
            
            return { stopped, numBaskets, dexTonVaultAddress, baskets, dict_waitings, accumulatedGas };
        } catch (error) {
            console.error('Error in getVaultData:', error);
            throw error;
        }
    }

    async getWaitings(provider: ContractProvider): Promise<Waiting[]> {
        const res = await provider.get('get_waitings', []);
        const waitingsCell = res.stack.readCellOpt();
        const waitingsDict = Dictionary.loadDirect(
            Dictionary.Keys.BigUint(256),
            Dictionary.Values.Dictionary(Dictionary.Keys.Uint(8), Dictionary.Values.Cell()),
            waitingsCell,
        );
        const waitings = [];
        for (const waitingKey of waitingsDict.keys()) {
            const balancesDict = waitingsDict.get(waitingKey);
            const balances = [];
            for (const balanceKey of balancesDict!.keys()) {
                const balancesCell = balancesDict!.get(balanceKey)!;
                balances.push({
                    tokenIdx: balanceKey,
                    balance: balancesCell.beginParse().loadCoins(),
                });
            }
            waitings.push({ user: waitingKey, balances });
        }
        return waitings;
    }

    async getExcesses(provider: ContractProvider): Promise<Excess[]> {
        const res = await provider.get('get_excesses', []);
        const excessesCell = res.stack.readCellOpt();
        const excessesDict = Dictionary.loadDirect(
            Dictionary.Keys.BigUint(256),
            Dictionary.Values.Address(),
            excessesCell,
        );
        const excesses = [];
        for (const key of excessesDict.keys()) {
            excesses.push({ queryId: key, address: excessesDict.get(key)! });
        }
        return excesses;
    }

    // Get activities with timestamps - for v3 implementation
    async getActivities(provider: ContractProvider): Promise<{ queryId: bigint; timestamp: number; userAddress: Address; elapsed: number }[]> {
        const res = await provider.get('get_excesses', []);
        const activitiesCell = res.stack.readCellOpt();
        if (!activitiesCell) {
            return [];
        }
        
        // Load dictionary with 64-bit keys and cell values
        const activitiesDict = Dictionary.loadDirect(
            Dictionary.Keys.BigUint(64),
            Dictionary.Values.Cell(),
            activitiesCell,
        );
        
        const activities = [];
        const currentTime = Math.floor(Date.now() / 1000); // 現在のUNIXタイムスタンプ（秒）
        
        // Use keys() and get() instead of entries() which may not exist on this Dictionary type
        for (const queryId of activitiesDict.keys()) {
            const activityCell = activitiesDict.get(queryId);
            if (activityCell) {
                // Parse activity cell - it contains timestamp (32 bits) and user address
                const slice = activityCell.beginParse();
                const timestamp = slice.loadUint(32);
                const userAddress = slice.loadAddress();
                const elapsed = currentTime - timestamp; // 経過時間（秒）
                
                activities.push({ queryId, timestamp, userAddress, elapsed });
            }
        }
        
        return activities;
    }
}
