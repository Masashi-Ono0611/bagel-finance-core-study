import { Vault } from '../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { Address } from '@ton/core';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // Prompt for contract address
    const vaultAddress = await ui.input('Vault contract address:');
    
    try {
        // Open the contract using the provider directly
        const vault = provider.open(Vault.createFromAddress(Address.parse(vaultAddress)));
        
        ui.write('Fetching counter data...');
        
        // Get vault data to display basket count
        const vaultData = await vault.getVaultData();
        ui.write(`Basket count (num_baskets): ${vaultData.numBaskets}`);
        ui.write('----------------');
        
        // Get internal transfer counters (new implementation)
        const counters = await vault.getInternalTransferCounters();
        
        if (counters.length === 0) {
            ui.write('No counters found.');
            return;
        }
        
        ui.write('Current counters:');
        ui.write('----------------');
        
        // Display each counter
        for (const counter of counters) {
            ui.write(`Query ID: ${counter.queryId.toString()}`);
            ui.write(`Count: ${counter.count}`);
            ui.write(`User: ${counter.userAddress.toString()}`);
            ui.write(`Status: ${counter.count < vaultData.numBaskets ? 'Gas being stored' : 
                      counter.count === vaultData.numBaskets ? 'Ready for fixed refund' : 'Gas flowing naturally'}`);
            ui.write('----------------');
        }
        
        ui.write(`Total counters: ${counters.length}`);
        
    } catch (error: any) {
        ui.write(`Error: ${error.message || error}`);
    }
}
