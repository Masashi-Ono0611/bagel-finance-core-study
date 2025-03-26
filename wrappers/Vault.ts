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
    jettonWalletAddress: Address;
    dedustPoolAddress: Address;
    dedustJettonVaultAddress: Address;
    jettonMasterAddress: Address;
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
    dedustTonVaultAddress: Address;
    baskets: Basket[];
};

function basketsToDict(baskets: Basket[]) {
    const dictBaskets = Dictionary.empty(Dictionary.Keys.Uint(8), Dictionary.Values.Cell());
    for (let i = 0; i < baskets.length; i++) {
        const basket = baskets[i];
        const dedust = beginCell()
            .storeAddress(basket.dedustPoolAddress)
            .storeAddress(basket.dedustJettonVaultAddress)
            .endCell();
        dictBaskets.set(
            i,
            beginCell()
                .storeCoins(basket.weight)
                .storeAddress(basket.jettonWalletAddress)
                .storeRef(dedust)
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
        .storeAddress(config.dedustTonVaultAddress)
        .storeDict(basketsToDict(config.baskets))
        .storeDict(waitingsDict)
        .storeDict(excessesDict)
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

    static depositMessage(eachAmount: bigint[]) {
        const builder = beginCell().storeUint(Op.deposit, 32).storeUint(0, 64);
        for (const amount of eachAmount) {
            builder.storeCoins(amount);
        }
        return builder.endCell();
    }
    async sendDeposit(provider: ContractProvider, via: Sender, eachAmount: bigint[], value: bigint = toNano('0.05')) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Vault.depositMessage(eachAmount),
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

    static changeVaultDataMessage(stopped: boolean, dedustTonVaultAddress: Address, baskets: Basket[]) {
        return beginCell()
            .storeUint(Op.change_vault_data, 32)
            .storeUint(0, 64)
            .storeBit(stopped)
            .storeUint(baskets.length, 8)
            .storeAddress(dedustTonVaultAddress)
            .storeDict(basketsToDict(baskets))
            .endCell();
    }
    async sendChangeVaultData(
        provider: ContractProvider,
        via: Sender,
        stopped: boolean,
        dedustTonVaultAddress: Address,
        baskets: Basket[],
        value: bigint = toNano('0.05'),
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Vault.changeVaultDataMessage(stopped, dedustTonVaultAddress, baskets),
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
        const res = await provider.get('get_vault_data', []);
        const stopped = res.stack.readBoolean();
        const numBaskets = res.stack.readNumber();
        const dedustTonVaultAddress = res.stack.readAddress();
        const basketsCell = res.stack.readCell();
        const basketsDict = Dictionary.loadDirect(Dictionary.Keys.Uint(8), Dictionary.Values.Cell(), basketsCell);
        const baskets = [];
        for (const value of basketsDict.values()) {
            const slice = value.beginParse();
            const weight = slice.loadCoins();
            const jettonWalletAddress = slice.loadAddress();
            const dedust = slice.loadRef();
            const dedustSlice = dedust.beginParse();
            const dedustPoolAddress = dedustSlice.loadAddress();
            const dedustJettonVaultAddress = dedustSlice.loadAddress();
            const jettonMasterAddress = slice.loadAddress();
            baskets.push({
                weight,
                jettonWalletAddress,
                dedustPoolAddress,
                dedustJettonVaultAddress,
                jettonMasterAddress,
            });
        }
        return { stopped, numBaskets, dedustTonVaultAddress, baskets };
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
}
