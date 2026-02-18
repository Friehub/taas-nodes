import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { execSync } from 'child_process';

const program = new Command();

program
    .name('friehub-challenger')
    .description('Shield the Truth: A permissionless challenger node for the TaaS protocol.')
    .version('1.0.0');

program.command('start')
    .description('Start monitoring the TruthOracle for proposals')
    .option('-r, --rpc <url>', 'Blockchain RPC URL', process.env.RPC_URL || 'https://polygon-rpc.com')
    .option('-o, --oracle <address>', 'TruthOracle Contract Address', process.env.ORACLE_ADDRESS)
    .action((options) => {
        if (!options.oracle) {
            console.error(chalk.red(' Error: TruthOracle address is required. Use --oracle or set ORACLE_ADDRESS env var.'));
            process.exit(1);
        }

        console.log(chalk.bold.green(' Starting FrieHub Challenger...'));

        // Set env vars for the indexer
        process.env.RPC_URL = options.rpc;
        process.env.ORACLE_ADDRESS = options.oracle;

        // Launch the core service
        require('./index');
    });

program.command('verify')
    .description('Manually verify a specific proposal outcome')
    .argument('<queryId>', 'The Query ID to verify')
    .action((queryId: string) => {
        console.log(chalk.blue(` Manually verifying QueryID: ${queryId}... (Not implemented yet)`));
    });

program.parse(process.argv);
