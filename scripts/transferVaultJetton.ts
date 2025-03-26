import { Address, beginCell } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { Op } from '../utils/Constants';

const vaultAddr = Address.parse('EQDtIA-1fOVXjdDDE_IoR1mk_Yd0Tyui5pUk-n32FKE93RlL');
const jettonWalletAddr = Address.parse('EQAL9PHxGbAwdUirLG-HQ-LLwXFNAiopZNB8QL3pD2C8VLSg');
const toAddr = Address.parse('UQBiFrKh7RHaCxywz6VBjZNBN_p896AoA9KM11b1E9r7Y_cP');
const responseAddr = Address.parse('UQCcSoPv2JbPHBMLeo6C6N6or0XYrpEO_kcFc1RYU_SWCjKY');

const amount = 10797583;

export async function run(provider: NetworkProvider) {
    const vault = provider.open(Vault.createFromAddress(vaultAddr));

    const body = beginCell()
        .storeUint(Op.transfer, 32)
        .storeUint(0, 64)
        .storeCoins(amount)
        .storeAddress(toAddr)
        .storeAddress(responseAddr)
        .storeUint(0, 1)
        .storeCoins(0)
        .storeUint(0, 1)
        .endCell();

    await vault.sendAdminMessage(
        provider.sender(),
        beginCell()
            .storeUint(0x18, 6)
            .storeAddress(jettonWalletAddr)
            .storeCoins(50000000)
            .storeUint(1, 107)
            .storeRef(body)
            .endCell(),
        1,
    );
}
