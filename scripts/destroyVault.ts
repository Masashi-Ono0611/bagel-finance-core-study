import { beginCell } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const vaultAddr = await ui.inputAddress('Input vault address: ');
    const toAddr = await ui.inputAddress('Which address do you want to send remaining vault TON?');
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    const body = beginCell().endCell();
    await vault.sendAdminMessage(
        provider.sender(),
        beginCell()
            .storeUint(0x18, 6)
            .storeAddress(toAddr)
            .storeCoins(50000000)
            .storeUint(0, 107)
            .storeRef(body)
            .endCell(),
        160,
    );
}
