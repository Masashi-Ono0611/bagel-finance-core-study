import { Address, Cell, toNano } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { compile, NetworkProvider } from '@ton/blueprint';
import { jettonContentToCell, onchainContentToCell } from '../utils/JettonHelpers';

const baskets = [
    {
        weight: 60000000000000n,
        jettonWalletAddress: Address.parse('kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy'),
        dedustPoolAddress: Address.parse('EQCHFiQM_TTSIiKhUCmWSN4aPSTqxJ4VSBEyDFaZ4izyq95Y'),
        dedustJettonVaultAddress: Address.parse('EQAYqo4u7VF0fa4DPAebk4g9lBytj2VFny7pzXR0trjtXQaO'),
        jettonMasterAddress: Address.parse('kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy'),
    },
    {
        weight: 40000000000000n,
        jettonWalletAddress: Address.parse('kQASjhpVEP4ainWIuapeo0kc6Sm6w_OHGG-t-768lQiSw0mL'),
        dedustPoolAddress: Address.parse('EQCHFiQM_TTSIiKhUCmWSN4aPSTqxJ4VSBEyDFaZ4izyq95Y'),
        dedustJettonVaultAddress: Address.parse('EQAYqo4u7VF0fa4DPAebk4g9lBytj2VFny7pzXR0trjtXQaO'),
        jettonMasterAddress: Address.parse('kQASjhpVEP4ainWIuapeo0kc6Sm6w_OHGG-t-768lQiSw0mL'),
    }

];

const contentUri = 'https://bagel-finance.s3.ap-northeast-1.amazonaws.com/json/b-star-metadata.json';

const contentJson = {
    name: 'TONPlus',
    symbol: 'TON+',
    decimals: '9',
    image: 'https://bagel-finance.s3.ap-northeast-1.amazonaws.com/images/icons/b-star.png',
    description: 'TONPlus',
};

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    let content: Cell;
    const typeInput = await ui.choose('Select Jetton content type.', ['Onchain', 'Offchain'], (v) => v);
    if (typeInput === 'Onchain') {
        let name = await ui.input('Input Jetton name: ');
        const symbol = await ui.input('Input Jetton symbol: ');
        const description = await ui.input('Input Jetton description: ');
        const image = await ui.input('Input Jetton image: ');
        let decimals = await ui.input('Input Jetton decimals (default: 9): ');
        if (decimals === '') {
            decimals = '9';
        }
        content = onchainContentToCell({
            name,
            symbol,
            description,
            image,
            decimals,
        });
    } else {
        const uri = await ui.input('Input Jetton content URI: ');
        content = jettonContentToCell(uri);
    }

    const vault = provider.open(
        Vault.createFromConfig(
            {
                adminAddress: provider.sender()?.address!,
                content,
                walletCode: await compile('JettonWallet'),
                dedustTonVaultAddress: Address.parse('EQDa4VOnTYlLvDJ0gZjNYm5PXfSmmtL6Vs6A_CZEtXCNICq_'),
                baskets,
            },
            await compile('Vault'),
        ),
    );

    await vault.sendDeploy(provider.sender(), toNano('0.1'));

    await provider.waitForDeploy(vault.address);
}
