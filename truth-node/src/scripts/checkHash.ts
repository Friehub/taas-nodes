import { keccak256, toHex, encodeEventTopics, parseAbiItem } from 'viem';

function check() {
    const signature = 'RecipeRequested(bytes32,bytes)';
    const hash = keccak256(toHex(signature));
    console.log(`Signature: ${signature}`);
    console.log(`Hash (Method 1): ${hash}`);

    const topics = encodeEventTopics({
        abi: [parseAbiItem('event RecipeRequested(bytes32 indexed requestId, bytes recipeData)')],
        eventName: 'RecipeRequested'
    });
    console.log(`Topics (Method 2): ${JSON.stringify(topics)}`);

    const observedHash = '0x78613d2f0a5e7a1594648fc2efe3cc7f79229b65404df1d0be4cdf5ab03f50db';
    console.log(`Matches observed? ${topics[0] === observedHash}`);
}

check();
