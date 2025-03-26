import { Address } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { compile } from '@ton/blueprint';
import { getJettonWalletAddr } from '../utils/Common';
import { getTonClient } from '../utils/TonClient';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const vaultAddr = await ui.inputAddress('Input vault address: ');
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    const jettonData = await vault.getJettonData();
    const tonClient = getTonClient('mainnet');

    await vault.sendChangeCodeAndData(
        provider.sender(),
        await compile('Vault'),
        {
            adminAddress: jettonData.adminAddress,
            content: jettonData.content,
            walletCode: jettonData.walletCode,
            dedustTonVaultAddress: Address.parse('EQDa4VOnTYlLvDJ0gZjNYm5PXfSmmtL6Vs6A_CZEtXCNICq_'),
            baskets: [
                {
                    weight: 1000000000n,
                    jettonWalletAddress: await getJettonWalletAddr(
                        tonClient,
                        Address.parse('EQDPdq8xjAhytYqfGSX8KcFWIReCufsB9Wdg0pLlYSO_h76w'),
                        vault.address,
                    ),
                    dedustPoolAddress: Address.parse('EQBWsAdyAg-8fs3G-m-eUBCXZuVaOldF5-tCMJBJzxQG7nLX'),
                    dedustJettonVaultAddress: Address.parse('EQCRjILmJD0ZD7y6POFyicCx20PoypkEwHJ64AMJ7vwkXGjm'),
                    jettonMasterAddress: Address.parse('EQDPdq8xjAhytYqfGSX8KcFWIReCufsB9Wdg0pLlYSO_h76w'),
                },
                {
                    weight: 1000000000n,
                    jettonWalletAddress: await getJettonWalletAddr(
                        tonClient,
                        Address.parse('EQDNhy-nxYFgUqzfUzImBEP67JqsyMIcyk2S5_RwNNEYku0k'),
                        vault.address,
                    ),
                    dedustPoolAddress: Address.parse('EQCHFiQM_TTSIiKhUCmWSN4aPSTqxJ4VSBEyDFaZ4izyq95Y'),
                    dedustJettonVaultAddress: Address.parse('EQACpR7Dc3393EVHkZ-7pg7zZMB5j7DAh2NNteRzK2wPGqk1'),
                    jettonMasterAddress: Address.parse('EQDNhy-nxYFgUqzfUzImBEP67JqsyMIcyk2S5_RwNNEYku0k'),
                },
            ],
        },
        jettonData.totalSupply,
    );
}
