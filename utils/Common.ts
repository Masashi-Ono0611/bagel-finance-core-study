import { Address, JettonMaster, TonClient } from '@ton/ton';

export async function getJettonWalletAddr(tonClient: TonClient, masterAddr: Address, ownerAddr: Address) {
    const openedMaster = tonClient.open(JettonMaster.create(masterAddr));
    const walletAddr = await openedMaster.getWalletAddress(ownerAddr);
    return walletAddr;
}
