import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import { Vault, Basket, Waiting } from '../wrappers/Vault';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Errors, Op } from '../utils/Constants';
import { JettonWallet } from '../wrappers/JettonWallet';
import { JettonMinter } from '../wrappers/JettonMinter';
import { getJettonWalletAddr } from '../utils/Common';
import { jettonContentToCell } from '../utils/JettonHelpers';
import { getTonClient } from '../utils/TonClient';

const GAS_PER_SWAP = 100000000n;
const GAS_PER_MINT_SEND = 50000000n;
const INDEX_UNIT = 1000000000n;

const contentUrl = 'https://bagel-finance.s3.ap-northeast-1.amazonaws.com/b-star-metadata.json';

const weights = [1000000000n, 500000000n, 2000000000n];
const newWeights = [500000000n, 100000000n];

function expectBaskets(baskets: Basket[], expectedBaskets: Basket[]) {
    expect(baskets.length).toBe(expectedBaskets.length);
    for (const [idx, basket] of baskets.entries()) {
        const expectedBasket = expectedBaskets[idx];
        expect(basket.weight).toBe(expectedBasket.weight);
        expect(basket.jettonWalletAddress).toEqualAddress(expectedBasket.jettonWalletAddress);
        expect(basket.dedustPoolAddress).toEqualAddress(expectedBasket.dedustPoolAddress);
        expect(basket.dedustJettonVaultAddress).toEqualAddress(expectedBasket.dedustJettonVaultAddress);
        expect(basket.jettonMasterAddress).toEqualAddress(expectedBasket.jettonMasterAddress);
    }
}

function expectWaitings(waitings: Waiting[], expectedWaitings: Waiting[]) {
    expect(waitings.length).toBe(expectedWaitings.length);
    for (const [idx, waiting] of waitings.entries()) {
        const expectedWaiting = expectedWaitings[idx];
        expect(waiting.user).toBe(expectedWaiting.user);
        for (const [idx, balance] of waiting.balances.entries()) {
            const expectedBalance = expectedWaiting.balances[idx];
            expect(balance.tokenIdx).toBe(expectedBalance.tokenIdx);
            expect(balance.balance).toBe(expectedBalance.balance);
        }
    }
}

function sliceHash(address: Address) {
    const cell = beginCell().storeAddress(address).endCell();
    const hash = cell.hash();
    return BigInt('0x' + hash.toString('hex'));
}

describe('Vault', () => {
    let code: Cell;
    beforeAll(async () => {
        code = await compile('Vault');
    });
    const tonClient = getTonClient('mainnet');

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let user: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let dedustTonVault: SandboxContract<TreasuryContract>;
    let newDedustTonVault: SandboxContract<TreasuryContract>;
    let dedustJettonVaults: SandboxContract<TreasuryContract>[];
    let newDedustJettonVaults: SandboxContract<TreasuryContract>[];
    let dedustPools: SandboxContract<TreasuryContract>[];
    let newDedustPools: SandboxContract<TreasuryContract>[];
    let jettonMasters: SandboxContract<JettonMinter>[];
    let newJettonMasters: SandboxContract<JettonMinter>[];
    let jettonWallets: SandboxContract<TreasuryContract>[];
    let newJettonWallets: SandboxContract<TreasuryContract>[];
    let baskets: Basket[];
    let newBaskets: Basket[];
    let vault: SandboxContract<Vault>;
    let vaultJettonWallet: SandboxContract<JettonWallet>;
    let userJettonWallet: SandboxContract<JettonWallet>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        user = await blockchain.treasury('user');
        user2 = await blockchain.treasury('user2');
        dedustTonVault = await blockchain.treasury('dedustTonVault');
        newDedustTonVault = await blockchain.treasury('newDedustTonVault');
        dedustJettonVaults = await Promise.all(
            weights.map(async (_, idx) => await blockchain.treasury(`dedustJettonVault-${idx}`)),
        );
        newDedustJettonVaults = await Promise.all(
            newWeights.map(async (_, idx) => await blockchain.treasury(`newDedustJettonVaultAddresses-${idx}`)),
        );
        dedustPools = await Promise.all(
            weights.map(async (_, idx) => await blockchain.treasury(`dedustPoolAddresses-${idx}`)),
        );
        newDedustPools = await Promise.all(
            newWeights.map(async (_, idx) => await blockchain.treasury(`newDedustPoolAddresses-${idx}`)),
        );
        jettonMasters = await Promise.all(
            weights.map(async (_, idx) =>
                blockchain.openContract(
                    JettonMinter.createFromConfig(
                        {
                            admin: (await blockchain.treasury(`jettonMaster-${idx}`)).address,
                            content: beginCell().endCell(),
                            wallet_code: await compile('JettonWallet'),
                        },
                        await compile('JettonWallet'),
                    ),
                ),
            ),
        );
        newJettonMasters = await Promise.all(
            newWeights.map(async (_, idx) =>
                blockchain.openContract(
                    JettonMinter.createFromConfig(
                        {
                            admin: (await blockchain.treasury(`newJettonMaster-${idx}`)).address,
                            content: beginCell().endCell(),
                            wallet_code: await compile('JettonWallet'),
                        },
                        await compile('JettonWallet'),
                    ),
                ),
            ),
        );
        jettonWallets = await Promise.all(
            weights.map(async (_, idx) => await blockchain.treasury(`jettonWallet-${idx}`)),
        );
        newJettonWallets = await Promise.all(
            newWeights.map(async (_, idx) => await blockchain.treasury(`newJettonWallet-${idx}`)),
        );
        baskets = weights.map((weight, idx) => ({
            weight,
            jettonWalletAddress: jettonWallets[idx].address,
            dedustPoolAddress: dedustPools[idx].address,
            dedustJettonVaultAddress: dedustJettonVaults[idx].address,
            jettonMasterAddress: jettonMasters[idx].address,
            decimal: 9,
        }));
        newBaskets = newWeights.map((weight, idx) => ({
            weight,
            jettonWalletAddress: newJettonWallets[idx].address,
            dedustPoolAddress: newDedustPools[idx].address,
            dedustJettonVaultAddress: newDedustJettonVaults[idx].address,
            jettonMasterAddress: newJettonMasters[idx].address,
            decimal: 9,
        }));
        vault = blockchain.openContract(
            Vault.createFromConfig(
                {
                    adminAddress: deployer.address,
                    content: jettonContentToCell(contentUrl),
                    walletCode: await compile('JettonWallet'),
                    dedustTonVaultAddress: dedustTonVault.address,
                    baskets,
                },
                code,
            ),
        );
        vaultJettonWallet = blockchain.openContract(
            JettonWallet.createFromConfig(
                {
                    ownerAddress: vault.address,
                    jettonMinterAddress: vault.address,
                    code: await compile('JettonWallet'),
                },
                await compile('JettonWallet'),
            ),
        );
        userJettonWallet = blockchain.openContract(
            JettonWallet.createFromConfig(
                {
                    ownerAddress: user.address,
                    jettonMinterAddress: vault.address,
                    code: await compile('JettonWallet'),
                },
                await compile('JettonWallet'),
            ),
        );

        const deployResult = await vault.sendDeploy(deployer.getSender(), toNano('0.05'));
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: vault.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and Vault are ready to use
    });

    it('should change admin', async () => {
        const beforeAdminAddress = await vault.getAdminAddress();
        expect(beforeAdminAddress).toEqualAddress(deployer.address);

        const result = await vault.sendChangeAdmin(deployer.getSender(), user.address);
        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: vault.address,
            success: true,
            op: Op.change_admin,
        });

        const afterAdminAddress = await vault.getAdminAddress();
        expect(afterAdminAddress).toEqualAddress(user.address);
    });

    it('should reject change_admin if sender is not admin', async () => {
        const beforeAdminAddress = await vault.getAdminAddress();
        expect(beforeAdminAddress).toEqualAddress(deployer.address);

        const result = await vault.sendChangeAdmin(user.getSender(), user.address);
        expect(result.transactions).toHaveTransaction({
            from: user.address,
            to: vault.address,
            success: false,
            op: Op.change_admin,
            exitCode: Errors.not_admin,
        });

        const afterAdminAddress = await vault.getAdminAddress();
        expect(afterAdminAddress).toEqualAddress(deployer.address);
    });

    it('should change vault data', async () => {
        const beforeVaultData = await vault.getVaultData();
        expect(beforeVaultData.stopped).toBe(true);
        expect(beforeVaultData.numBaskets).toBe(baskets.length);
        expect(beforeVaultData.dedustTonVaultAddress).toEqualAddress(dedustTonVault.address);
        expectBaskets(beforeVaultData.baskets, baskets);

        const result = await vault.sendChangeVaultData(
            deployer.getSender(),
            false,
            newDedustTonVault.address,
            newBaskets,
        );
        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: vault.address,
            success: true,
            op: Op.change_vault_data,
        });

        const afterVaultData = await vault.getVaultData();
        expect(afterVaultData.stopped).toBe(false);
        expect(afterVaultData.numBaskets).toBe(newBaskets.length);
        expect(afterVaultData.dedustTonVaultAddress).toEqualAddress(newDedustTonVault.address);
        expectBaskets(afterVaultData.baskets, newBaskets);
    });

    it('should reject change_vault_data if sender is not admin', async () => {
        const beforeVaultData = await vault.getVaultData();
        expect(beforeVaultData.stopped).toBe(true);
        expect(beforeVaultData.numBaskets).toBe(baskets.length);
        expect(beforeVaultData.dedustTonVaultAddress).toEqualAddress(dedustTonVault.address);
        expectBaskets(beforeVaultData.baskets, baskets);

        const result = await vault.sendChangeVaultData(user.getSender(), false, newDedustTonVault.address, newBaskets);
        expect(result.transactions).toHaveTransaction({
            from: user.address,
            to: vault.address,
            success: false,
            op: Op.change_vault_data,
            exitCode: Errors.not_admin,
        });

        const afterVaultData = await vault.getVaultData();
        expect(afterVaultData.stopped).toBe(true);
        expect(afterVaultData.numBaskets).toBe(baskets.length);
        expect(afterVaultData.dedustTonVaultAddress).toEqualAddress(dedustTonVault.address);
        expectBaskets(afterVaultData.baskets, baskets);
    });

    it('should reject deposit if TON is not enough', async () => {
        const numTokens = weights.length;
        const exchangeAmount = 99999999n;
        const gasPerToken = GAS_PER_SWAP + GAS_PER_MINT_SEND;
        const ton = exchangeAmount + gasPerToken * BigInt(numTokens);
        const eachAmount = [20000000n, 30000000n, 49999999n];
        const result = await vault.sendDeposit(user.getSender(), eachAmount, ton);
        expect(result.transactions).toHaveTransaction({
            from: user.address,
            to: vault.address,
            success: false,
            op: Op.deposit,
            exitCode: Errors.min_exchange_amount,
        });
    });

    it('should reject deposit if TON amount is invalid', async () => {
        const numTokens = weights.length;
        const exchangeAmount = 100000000n;
        const gasPerToken = GAS_PER_SWAP + GAS_PER_MINT_SEND;
        const ton = exchangeAmount + gasPerToken * BigInt(numTokens);
        const eachAmount = [30000000n, 30000000n, 50000000n];
        const result = await vault.sendDeposit(user.getSender(), eachAmount, ton);
        expect(result.transactions).toHaveTransaction({
            from: user.address,
            to: vault.address,
            success: false,
            op: Op.deposit,
            exitCode: Errors.invalid_ton_amount,
        });
    });

    it('should reject deposit if each TON amount is lacking', async () => {
        const numTokens = weights.length;
        const exchangeAmount = 100000000n;
        const gasPerToken = GAS_PER_SWAP + GAS_PER_MINT_SEND;
        const ton = exchangeAmount + gasPerToken * BigInt(numTokens);
        const eachAmount = [50000000n, 50000000n];
        const result = await vault.sendDeposit(user.getSender(), eachAmount, ton);
        expect(result.transactions).toHaveTransaction({
            from: user.address,
            to: vault.address,
            success: false,
            op: Op.deposit,
            exitCode: Errors.invalid_deposit_body,
        });
    });

    it('should reject deposit if each TON amount is excess', async () => {
        const numTokens = weights.length;
        const exchangeAmount = 100000000n;
        const gasPerToken = GAS_PER_SWAP + GAS_PER_MINT_SEND;
        const ton = exchangeAmount + gasPerToken * BigInt(numTokens);
        const eachAmount = [20000000n, 30000000n, 30000000n, 20000000n];
        const result = await vault.sendDeposit(user.getSender(), eachAmount, ton);
        expect(result.transactions).toHaveTransaction({
            from: user.address,
            to: vault.address,
            success: false,
            op: Op.deposit,
            exitCode: Errors.invalid_deposit_body,
        });
    });

    // !!! important !!!
    // change deadline:Timestamp and send mode in swap_dedust_ton() before test
    it('should send swap messages to DeDust (Mint)', async () => {
        const numTokens = weights.length;
        const exchangeAmount = 1000000000n;
        const gasPerToken = GAS_PER_SWAP + GAS_PER_MINT_SEND;
        const ton = exchangeAmount + gasPerToken * BigInt(numTokens) + 100000000n;
        const eachAmount = [200000000n, 300000000n, 500000000n];
        const result = await vault.sendDeposit(user.getSender(), eachAmount, ton);
        expect(result.transactions).toHaveTransaction({
            from: user.address,
            to: vault.address,
            success: true,
            op: Op.deposit,
        });
        for (const [idx, dedustPool] of dedustPools.entries()) {
            const swapAmount = eachAmount[idx];
            const customPayload = beginCell().storeAddress(user.address).endCell();
            const swapParams = beginCell()
                .storeUint(0, 32)
                .storeAddress(vault.address)
                .storeAddress(null)
                .storeMaybeRef(customPayload)
                .storeMaybeRef(null)
                .endCell();
            const body = beginCell()
                .storeUint(Op.dedust_ton_swap, 32)
                .storeUint(0, 64)
                .storeCoins(swapAmount)
                .storeAddress(dedustPool.address)
                .storeUint(0, 1)
                .storeCoins(0)
                .storeMaybeRef(null)
                .storeRef(swapParams)
                .endCell();
            // expect(result.transactions).toHaveTransaction({
            //     from: vault.address,
            //     to: dedustTonVault.address,
            //     success: true,
            //     value: swapAmount + gasPerToken,
            //     body: body,
            // });
        }
    });

    it('should ignore non-basket token transfer notifications', async () => {
        const gas = GAS_PER_MINT_SEND * BigInt(weights.length);
        const tempJettonWallet = await blockchain.treasury('tempJettonWallet');
        const result = await vault.sendTransferNotification(
            tempJettonWallet.getSender(),
            1000000000n,
            dedustJettonVaults[0].address,
            user.address,
            gas,
        );
        expect(result.transactions).toHaveTransaction({
            from: tempJettonWallet.address,
            to: vault.address,
            success: false,
            exitCode: Errors.non_basket_token,
        });
    });

    it('should reject transfer_notification if TON is not enough', async () => {
        const jettonIdx = 0;
        const gas = GAS_PER_MINT_SEND * BigInt(weights.length);
        const result = await vault.sendTransferNotification(
            jettonWallets[jettonIdx].getSender(),
            1000000000n,
            dedustJettonVaults[jettonIdx].address,
            user.address,
            gas - 1n,
        );
        expect(result.transactions).toHaveTransaction({
            from: jettonWallets[jettonIdx].address,
            to: vault.address,
            success: false,
            op: Op.transfer_notification,
            exitCode: Errors.not_enough_gas,
        });
        const waitings = await vault.getWaitings();
        const expectedWaitings: Waiting[] = [];
        expectWaitings(waitings, expectedWaitings);
    });

    it('should store user to waiting list when received from DeDust', async () => {
        const jettonIdx = 0;
        const gas = GAS_PER_MINT_SEND * BigInt(weights.length);
        const result = await vault.sendTransferNotification(
            jettonWallets[jettonIdx].getSender(),
            1000000000n,
            dedustJettonVaults[jettonIdx].address,
            user.address,
            gas,
        );
        expect(result.transactions).toHaveTransaction({
            from: jettonWallets[jettonIdx].address,
            to: vault.address,
            success: true,
            op: Op.transfer_notification,
        });
        const waitings = await vault.getWaitings();
        const expectedWaitings: Waiting[] = [
            { user: sliceHash(user.address), balances: [{ tokenIdx: 0, balance: 1000000000n }] },
        ];
        expectWaitings(waitings, expectedWaitings);
    });

    it('should store user to waiting list when received directory from user', async () => {
        const jettonIdx = 0;
        const gas = GAS_PER_MINT_SEND * BigInt(weights.length);
        const result = await vault.sendTransferNotification(
            jettonWallets[jettonIdx].getSender(),
            1000000000n,
            user.address,
            null,
            gas,
        );
        expect(result.transactions).toHaveTransaction({
            from: jettonWallets[jettonIdx].address,
            to: vault.address,
            success: true,
            op: Op.transfer_notification,
        });
        const waitings = await vault.getWaitings();
        const expectedWaitings: Waiting[] = [
            { user: sliceHash(user.address), balances: [{ tokenIdx: 0, balance: 1000000000n }] },
        ];
        expectWaitings(waitings, expectedWaitings);
    });

    it('should store to waiting list (two different people)', async () => {
        const depositAmount = 1000000000n;
        const jettonIdx = 0;
        const gas = GAS_PER_MINT_SEND * BigInt(weights.length);
        const result = await vault.sendTransferNotification(
            jettonWallets[jettonIdx].getSender(),
            depositAmount,
            dedustJettonVaults[jettonIdx].address,
            user.address,
            gas,
        );
        expect(result.transactions).toHaveTransaction({
            from: jettonWallets[jettonIdx].address,
            to: vault.address,
            success: true,
            op: Op.transfer_notification,
        });
        const waitings = await vault.getWaitings();
        const expectedWaitings: Waiting[] = [
            { user: sliceHash(user.address), balances: [{ tokenIdx: jettonIdx, balance: depositAmount }] },
        ];
        expectWaitings(waitings, expectedWaitings);

        const depositAmount2 = 20000000n;
        const jettonIdx2 = 0;
        const result2 = await vault.sendTransferNotification(
            jettonWallets[jettonIdx2].getSender(),
            depositAmount2,
            dedustJettonVaults[jettonIdx2].address,
            user2.address,
            gas,
        );
        expect(result2.transactions).toHaveTransaction({
            from: jettonWallets[jettonIdx2].address,
            to: vault.address,
            success: true,
            op: Op.transfer_notification,
        });
        const waitings2 = await vault.getWaitings();
        expectedWaitings.push({
            user: sliceHash(user2.address),
            balances: [{ tokenIdx: jettonIdx2, balance: depositAmount2 }],
        });
        expectWaitings(waitings2, expectedWaitings);
    });

    it('should mint index token (no extra amount of each jetton)', async () => {
        let expectedWaitings: Waiting[] = [];
        for (const [idx, weight] of weights.entries()) {
            const gas = GAS_PER_MINT_SEND * BigInt(weights.length);
            const result = await vault.sendTransferNotification(
                jettonWallets[idx].getSender(),
                weight,
                dedustJettonVaults[idx].address,
                user.address,
                gas,
            );
            expect(result.transactions).toHaveTransaction({
                from: jettonWallets[idx].address,
                to: vault.address,
                success: true,
                op: Op.transfer_notification,
            });
            if (expectedWaitings.length === 0) {
                expectedWaitings.push({
                    user: sliceHash(user.address),
                    balances: [{ tokenIdx: idx, balance: weight }],
                });
            } else {
                expectedWaitings[0].balances.push({ tokenIdx: idx, balance: weight });
            }
            if (expectedWaitings[0].balances.length === weights.length) {
                expectedWaitings = [];
                const body = beginCell()
                    .storeUint(Op.internal_transfer, 32)
                    .storeUint(0, 64)
                    .storeCoins(1000000000)
                    .storeAddress(vault.address)
                    .storeAddress(user.address)
                    .storeCoins(0)
                    .storeUint(0, 1)
                    .endCell();
                expect(result.transactions).toHaveTransaction({
                    from: vault.address,
                    to: userJettonWallet.address,
                    success: true,
                    // value: GAS_PER_MINT,
                    body,
                });
                expect(result.transactions.length).toBe(4);
            }
            const waitings = await vault.getWaitings();
            expectWaitings(waitings, expectedWaitings);
        }
    });

    it('should mint index token (extra amount of each jetton)', async () => {
        let expectedWaitings: Waiting[] = [];
        const exactAmountIdx = 0;
        for (const [idx, weight] of weights.entries()) {
            const extraAmount = 1000n;
            const jettonAmount = idx === exactAmountIdx ? weight : weight + extraAmount;
            const gas = GAS_PER_MINT_SEND + 20000000n;
            const result = await vault.sendTransferNotification(
                jettonWallets[idx].getSender(),
                jettonAmount,
                dedustJettonVaults[idx].address,
                user.address,
                gas,
            );
            expect(result.transactions).toHaveTransaction({
                from: jettonWallets[idx].address,
                to: vault.address,
                success: true,
                op: Op.transfer_notification,
            });
            if (expectedWaitings.length === 0) {
                expectedWaitings.push({
                    user: sliceHash(user.address),
                    balances: [{ tokenIdx: idx, balance: jettonAmount }],
                });
            } else {
                expectedWaitings[0].balances.push({ tokenIdx: idx, balance: jettonAmount });
            }
            if (expectedWaitings[0].balances.length === weights.length) {
                expectedWaitings = [];
                const body = beginCell()
                    .storeUint(Op.internal_transfer, 32)
                    .storeUint(0, 64)
                    .storeCoins(1000000000)
                    .storeAddress(vault.address)
                    .storeAddress(user.address)
                    .storeCoins(0)
                    .storeUint(0, 1)
                    .endCell();
                expect(result.transactions).toHaveTransaction({
                    from: vault.address,
                    to: userJettonWallet.address,
                    success: true,
                    // value: GAS_PER_MINT,
                    body,
                });
                // expect(result.transactions.length).toBe(7);
                for (const [idx, wallet] of jettonWallets.entries()) {
                    if (idx !== exactAmountIdx) {
                        const body = beginCell()
                            .storeUint(Op.transfer, 32)
                            .storeUint(0, 64)
                            .storeCoins(extraAmount)
                            .storeAddress(user.address)
                            .storeAddress(user.address)
                            .storeUint(0, 1)
                            .storeCoins(0)
                            .storeUint(0, 1)
                            .endCell();
                        expect(result.transactions).toHaveTransaction({
                            from: vault.address,
                            to: wallet.address,
                            success: true,
                            // value: GAS_PER_SEND,
                            body,
                        });
                    }
                }
            }
            const waitings = await vault.getWaitings();
            expectWaitings(waitings, expectedWaitings);
        }
        const balance = await userJettonWallet.getJettonBalance();
        expect(balance).toBe(1000000000n);
        const totalSupply = await vault.getTotalSupply();
        expect(totalSupply).toBe(1000000000n);
    });

    it('should reject burn if TON is not enough', async () => {
        let expectedWaitings: Waiting[] = [];
        for (const [idx, weight] of weights.entries()) {
            const gas = GAS_PER_MINT_SEND + GAS_PER_MINT_SEND * BigInt(weights.length);
            const result = await vault.sendTransferNotification(
                jettonWallets[idx].getSender(),
                weight,
                dedustJettonVaults[idx].address,
                user.address,
                gas,
            );
            expect(result.transactions).toHaveTransaction({
                from: jettonWallets[idx].address,
                to: vault.address,
                success: true,
                op: Op.transfer_notification,
            });
            if (expectedWaitings.length === 0) {
                expectedWaitings.push({
                    user: sliceHash(user.address),
                    balances: [{ tokenIdx: idx, balance: weight }],
                });
            } else {
                expectedWaitings[0].balances.push({ tokenIdx: idx, balance: weight });
            }
            if (expectedWaitings[0].balances.length === weights.length) {
                expectedWaitings = [];
                const body = beginCell()
                    .storeUint(Op.internal_transfer, 32)
                    .storeUint(0, 64)
                    .storeCoins(1000000000)
                    .storeAddress(vault.address)
                    .storeAddress(user.address)
                    .storeCoins(0)
                    .storeUint(0, 1)
                    .endCell();
                expect(result.transactions).toHaveTransaction({
                    from: vault.address,
                    to: userJettonWallet.address,
                    success: true,
                    // value: GAS_PER_MINT,
                    body,
                });
            }
            const waitings = await vault.getWaitings();
            expectWaitings(waitings, expectedWaitings);
        }
        const beforeBalance = await userJettonWallet.getJettonBalance();
        expect(beforeBalance).toBe(1000000000n);
        const beforeTotalSupply = await vault.getTotalSupply();
        expect(beforeTotalSupply).toBe(1000000000n);
        const gasPerToken = GAS_PER_SWAP + GAS_PER_MINT_SEND;
        const gas = gasPerToken * BigInt(weights.length);
        const burnAmount = 1000000000n;
        const result = await userJettonWallet.sendBurn(
            user.getSender(),
            gas,
            burnAmount,
            user.address,
            beginCell().endCell(),
        );
        expect(result.transactions).toHaveTransaction({
            from: userJettonWallet.address,
            to: vault.address,
            success: false,
            op: Op.burn_notification,
            exitCode: Errors.not_enough_gas,
        });
        const afterBalance = await userJettonWallet.getJettonBalance();
        expect(afterBalance).toBe(1000000000n);
        const afterTotalSupply = await vault.getTotalSupply();
        expect(afterTotalSupply).toBe(1000000000n);
    });

    // !!! important !!!
    // change deadline:Timestamp in vault.fc before test
    it.only('should send swap messages to DeDust (Redeem)', async () => {
        let expectedWaitings: Waiting[] = [];
        const exactAmountIdx = 0;
        for (const [idx, weight] of weights.entries()) {
            const extraAmount = 1000n;
            const jettonAmount = idx === exactAmountIdx ? weight : weight + extraAmount;
            const gas = GAS_PER_MINT_SEND + 20000000n;
            const result = await vault.sendTransferNotification(
                jettonWallets[idx].getSender(),
                jettonAmount,
                dedustJettonVaults[idx].address,
                user.address,
                gas,
            );
            expect(result.transactions).toHaveTransaction({
                from: jettonWallets[idx].address,
                to: vault.address,
                success: true,
                op: Op.transfer_notification,
            });
            if (expectedWaitings.length === 0) {
                expectedWaitings.push({
                    user: sliceHash(user.address),
                    balances: [{ tokenIdx: idx, balance: jettonAmount }],
                });
            } else {
                expectedWaitings[0].balances.push({ tokenIdx: idx, balance: jettonAmount });
            }
            if (expectedWaitings[0].balances.length === weights.length) {
                expectedWaitings = [];
                const body = beginCell()
                    .storeUint(Op.internal_transfer, 32)
                    .storeUint(0, 64)
                    .storeCoins(1000000000)
                    .storeAddress(vault.address)
                    .storeAddress(user.address)
                    .storeCoins(0)
                    .storeUint(0, 1)
                    .endCell();
                expect(result.transactions).toHaveTransaction({
                    from: vault.address,
                    to: userJettonWallet.address,
                    success: true,
                    // value: GAS_PER_MINT,
                    body,
                });
                // expect(result.transactions.length).toBe(7);
                for (const [idx, wallet] of jettonWallets.entries()) {
                    if (idx !== exactAmountIdx) {
                        const body = beginCell()
                            .storeUint(Op.transfer, 32)
                            .storeUint(0, 64)
                            .storeCoins(extraAmount)
                            .storeAddress(user.address)
                            .storeAddress(user.address)
                            .storeUint(0, 1)
                            .storeCoins(0)
                            .storeUint(0, 1)
                            .endCell();
                        expect(result.transactions).toHaveTransaction({
                            from: vault.address,
                            to: wallet.address,
                            success: true,
                            // value: GAS_PER_SEND,
                            body,
                        });
                    }
                }
            }
            const waitings = await vault.getWaitings();
            expectWaitings(waitings, expectedWaitings);
        }
        const balance = await userJettonWallet.getJettonBalance();
        expect(balance).toBe(1000000000n);
        const totalSupply = await vault.getTotalSupply();
        expect(totalSupply).toBe(1000000000n);

        console.log((await blockchain.getContract(vault.address)).balance);
        const burnAmount = 1000000000n;
        const gasPerToken = GAS_PER_SWAP + GAS_PER_MINT_SEND;
        const gas = gasPerToken * BigInt(weights.length) + 50000000n;
        const result = await userJettonWallet.sendBurn(
            user.getSender(),
            gas,
            burnAmount,
            user.address,
            beginCell().endCell(),
        );
        expect(result.transactions).toHaveTransaction({
            from: userJettonWallet.address,
            to: vault.address,
            success: true,
            op: Op.burn_notification,
        });
        for (const [idx, weight] of weights.entries()) {
            const body = beginCell()
                .storeUint(Op.transfer, 32)
                .storeUint(0, 64)
                .storeCoins((burnAmount * weight) / INDEX_UNIT)
                .endCell();
            expect(result.transactions).toHaveTransaction({
                from: vault.address,
                to: jettonWallets[idx].address,
                success: true,
                // value: GAS_PER_SWAP,
                // body,
            });
        }
        const afterBalance = await userJettonWallet.getJettonBalance();
        expect(afterBalance).toBe(0n);
        const afterTotalSupply = await vault.getTotalSupply();
        expect(afterTotalSupply).toBe(0n);
        console.log((await blockchain.getContract(vault.address)).balance);
    });

    it('should change code and data', async () => {
        const jettonData = await vault.getJettonData();
        const result = await vault.sendChangeCodeAndData(deployer.getSender(), await compile('Vault'), {
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
        });
        expect(result.transactions).toHaveTransaction({ op: Op.change_code_and_data, success: true });
    });
});
